import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyText } from "@/lib/ai-errors";
import {
  deleteGeminiKey,
  listGeminiKeys,
  reactivateGeminiKey,
  saveGeminiKey,
} from "@/lib/gemini-keys.functions";

const SLOTS = [1, 2, 3, 4];

type KeyView = {
  slot: number;
  id: string;
  label: string | null;
  masked: string;
  status: "available" | "quota" | "invalid" | "paused";
  cooldownUntil: string | null;
  updatedAt: string;
};

const STATUS_TEXT: Record<KeyView["status"], { text: string; cls: string }> = {
  available: { text: "متاح", cls: "text-bull border-bull/40" },
  quota: { text: "Quota مستنفدة مؤقتاً", cls: "text-primary border-primary/40" },
  invalid: { text: "غير صالح", cls: "text-bear border-bear/40" },
  paused: { text: "غير متاح مؤقتاً", cls: "text-muted-foreground border-border" },
};

export function GeminiKeysPanel() {
  const list = useServerFn(listGeminiKeys);
  const save = useServerFn(saveGeminiKey);
  const remove = useServerFn(deleteGeminiKey);
  const reactivate = useServerFn(reactivateGeminiKey);

  const [keys, setKeys] = useState<KeyView[]>([]);
  const [busy, setBusy] = useState(false);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await list();
      setKeys(res.keys as KeyView[]);
    } catch (error) {
      toast.error(friendlyText(error));
    }
  }, [list]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async () => {
    if (openSlot == null) return;
    setBusy(true);
    try {
      const res = await save({ data: { slot: openSlot, label, apiKey: value } });
      setKeys(res.keys as KeyView[]);
      toast.success("تم حفظ المفتاح بنجاح");
      setOpenSlot(null);
      setLabel("");
      setValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : friendlyText(error));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<{ keys: unknown }>, ok: string) => {
    setBusy(true);
    try {
      const res = await fn();
      setKeys(res.keys as KeyView[]);
      toast.success(ok);
    } catch (error) {
      toast.error(friendlyText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          المفاتيح تُخزَّن على السيرفر فقط ولا تُعرض قيمتها كاملة أبداً.
        </p>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className="size-4" />
          تحديث الحالة
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const item = keys.find((k) => k.slot === slot);
          const status = item ? STATUS_TEXT[item.status] : null;
          return (
            <div key={slot} className="neon-frame rounded-xl bg-card/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">مفتاح {slot}</span>
                {status && (
                  <span className={"rounded-full border px-2 py-0.5 text-[10px] " + status.cls}>
                    {status.text}
                  </span>
                )}
              </div>
              {item ? (
                <>
                  <p className="mt-1 truncate text-sm">{item.label || "بدون اسم"}</p>
                  <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                    {item.masked}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setOpenSlot(slot);
                        setLabel(item.label ?? "");
                        setValue("");
                      }}
                    >
                      استبدال
                    </Button>
                    {item.status !== "available" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            () => reactivate({ data: { slot } }),
                            "تم إعادة تنشيط المفتاح",
                          )
                        }
                      >
                        تنشيط
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void act(() => remove({ data: { slot } }), "تم حذف المفتاح")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={busy}
                  onClick={() => {
                    setOpenSlot(slot);
                    setLabel("");
                    setValue("");
                  }}
                >
                  <KeyRound className="size-4" />
                  إضافة مفتاح Gemini
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={openSlot != null} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent dir="rtl" className="panel max-w-md">
          <DialogHeader>
            <DialogTitle className="gold-text">إضافة مفتاح Gemini</DialogTitle>
            <DialogDescription className="text-xs">
              يُحفظ المفتاح على السيرفر ولا يظهر في الواجهة أو السجلات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="keyLabel">اسم اختياري</Label>
              <Input
                id="keyLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: حساب رقم 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="keyValue">Gemini API Key</Label>
              <Input
                id="keyValue"
                type="password"
                dir="ltr"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="AIza..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void submit()} disabled={busy || value.trim().length < 20}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              حفظ المفتاح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
