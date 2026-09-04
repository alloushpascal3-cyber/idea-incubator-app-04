import { createServerFn } from "@tanstack/react-start";

export const listGeminiKeys = createServerFn({ method: "GET" }).handler(async () => {
  const { listKeyViews } = await import("./gemini-keys.server");
  return { keys: await listKeyViews() };
});

export const saveGeminiKey = createServerFn({ method: "POST" })
  .inputValidator((data: { slot: number; label?: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    const { saveKey } = await import("./gemini-keys.server");
    return { keys: await saveKey(data) };
  });

export const deleteGeminiKey = createServerFn({ method: "POST" })
  .inputValidator((data: { slot: number }) => data)
  .handler(async ({ data }) => {
    const { removeKey } = await import("./gemini-keys.server");
    return { keys: await removeKey(data.slot) };
  });

export const reactivateGeminiKey = createServerFn({ method: "POST" })
  .inputValidator((data: { slot: number }) => data)
  .handler(async ({ data }) => {
    const { reactivateKey } = await import("./gemini-keys.server");
    return { keys: await reactivateKey(data.slot) };
  });

export const refreshGeminiKey = createServerFn({ method: "POST" }).handler(async () => {
  const { refreshAvailableKey } = await import("./gemini-keys.server");
  return refreshAvailableKey();
});

