import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type KeyStatus = "available" | "quota" | "invalid" | "paused";

export type KeyView = {
  slot: number;
  id: string;
  label: string | null;
  masked: string;
  status: KeyStatus;
  cooldownUntil: string | null;
  updatedAt: string;
};

export const MAX_KEY_SLOTS = 4;
const QUOTA_COOLDOWN_MINUTES = 60;

export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

type Row = {
  id: string;
  slot: number;
  label: string | null;
  masked: string;
  api_key: string;
  status: string;
  cooldown_until: string | null;
  updated_at: string;
};

/** Auto-heals keys whose cooldown window has passed (daily quota renewal). */
async function refreshCooldowns(): Promise<void> {
  await supabaseAdmin
    .from("gemini_keys")
    .update({ status: "available", cooldown_until: null, updated_at: new Date().toISOString() })
    .in("status", ["quota", "paused"])
    .lt("cooldown_until", new Date().toISOString());
}

function toView(row: Row): KeyView {
  return {
    id: row.id,
    slot: row.slot,
    label: row.label,
    masked: row.masked,
    status: (row.status as KeyStatus) ?? "available",
    cooldownUntil: row.cooldown_until,
    updatedAt: row.updated_at,
  };
}

export async function listKeyViews(): Promise<KeyView[]> {
  await refreshCooldowns();
  const { data, error } = await supabaseAdmin
    .from("gemini_keys")
    .select("id,slot,label,masked,api_key,status,cooldown_until,updated_at")
    .order("slot", { ascending: true });
  if (error) throw new Error("تعذّر قراءة قائمة المفاتيح");
  return ((data ?? []) as Row[]).map(toView);
}

export async function saveKey(input: {
  slot: number;
  label?: string;
  apiKey: string;
}): Promise<KeyView[]> {
  const apiKey = input.apiKey.trim();
  if (apiKey.length < 20) throw new Error("المفتاح المُدخل قصير أو غير صحيح");
  const slot = Math.min(Math.max(Math.round(input.slot), 1), MAX_KEY_SLOTS);

  const { error } = await supabaseAdmin.from("gemini_keys").upsert(
    {
      slot,
      label: input.label?.trim() || null,
      masked: maskKey(apiKey),
      api_key: apiKey,
      status: "available",
      cooldown_until: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slot" },
  );
  if (error) throw new Error("تعذّر حفظ المفتاح");
  return listKeyViews();
}

export async function removeKey(slot: number): Promise<KeyView[]> {
  const { error } = await supabaseAdmin.from("gemini_keys").delete().eq("slot", slot);
  if (error) throw new Error("تعذّر حذف المفتاح");
  return listKeyViews();
}

export async function reactivateKey(slot: number): Promise<KeyView[]> {
  const { error } = await supabaseAdmin
    .from("gemini_keys")
    .update({ status: "available", cooldown_until: null, updated_at: new Date().toISOString() })
    .eq("slot", slot);
  if (error) throw new Error("تعذّر تحديث حالة المفتاح");
  return listKeyViews();
}

async function markStatus(id: string, status: KeyStatus, cooldownMinutes?: number): Promise<void> {
  await supabaseAdmin
    .from("gemini_keys")
    .update({
      status,
      cooldown_until: cooldownMinutes
        ? new Date(Date.now() + cooldownMinutes * 60_000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /\(429\)|RESOURCE_EXHAUSTED|حد الطلبات|الحد المجاني|quota/i.test(msg);
}

function isInvalidKeyError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /\(401\)|\(403\)|API key|غير صالح/i.test(msg);
}

/**
 * Runs `attempt` with stored keys, using each key at most once per request.
 * Rotates only on quota/rate-limit or invalid-key responses; never loops.
 */
export async function withGeminiKeyRotation<T>(
  attempt: (apiKey: string) => Promise<T>,
): Promise<T> {
  let rows: Row[] = [];
  try {
    await refreshCooldowns();
    const { data } = await supabaseAdmin
      .from("gemini_keys")
      .select("id,slot,label,masked,api_key,status,cooldown_until,updated_at")
      .eq("status", "available")
      .order("slot", { ascending: true });
    rows = (data ?? []) as Row[];
  } catch {
    rows = [];
  }

  if (rows.length === 0) throw new Error("GEMINI_NO_KEYS");

  let lastError: unknown = new Error("GEMINI_ALL_EXHAUSTED");
  for (const row of rows) {
    try {
      const value = await attempt(row.api_key);
      return value;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        await markStatus(row.id, "quota", QUOTA_COOLDOWN_MINUTES);
        continue;
      }
      if (isInvalidKeyError(error)) {
        await markStatus(row.id, "invalid");
        continue;
      }
      throw error;
    }
  }
  throw new Error("GEMINI_ALL_EXHAUSTED");
  // eslint-disable-next-line no-unreachable
  void lastError;
}

export async function hasStoredKeys(): Promise<boolean> {
  try {
    const { count } = await supabaseAdmin
      .from("gemini_keys")
      .select("id", { count: "exact", head: true });
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
