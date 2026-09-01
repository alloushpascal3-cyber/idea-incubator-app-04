/**
 * Human friendly (Arabic) error messages for AI/network failures.
 * Pure mapping helper — never contains or echoes API keys.
 */
export type FriendlyError = { title: string; reason: string; action: string };

const KEY_LIKE = /AIza[\w-]+|sk-[\w-]+|Bearer\s+\S+/g;

export function sanitize(text: string): string {
  return text.replace(KEY_LIKE, "•••");
}

export function classifyAiError(error: unknown): FriendlyError {
  const raw = sanitize(error instanceof Error ? error.message : String(error ?? ""));

  if (/GEMINI_NO_KEYS/.test(raw)) {
    return {
      title: "لا يوجد مفتاح Gemini متاح حالياً",
      reason: "جميع المفاتيح المضافة غير متاحة (حصة مستنفدة أو غير صالحة).",
      action: "أضف مفتاحاً جديداً أو استبدل المفاتيح من إعدادات مفاتيح Gemini.",
    };
  }
  if (/GEMINI_ALL_EXHAUSTED/.test(raw)) {
    return {
      title: "تم استنفاد كل المفاتيح المتاحة",
      reason: "كل مفتاح جرّبه النظام أعاد تجاوز الحصة أو عدم الصلاحية في هذا الطلب.",
      action: "انتظر تجدد الحصة اليومية أو أضف مفتاحاً إضافياً من الإعدادات.",
    };
  }
  if (/\(429\)|RESOURCE_EXHAUSTED|حد الطلبات|الحد المجاني|quota/i.test(raw)) {
    return {
      title: "تم الوصول إلى حد الاستخدام",
      reason: "تجاوز الحد المؤقت أو اليومي للطلبات على المفتاح المستخدم.",
      action: "سيحاول النظام تلقائياً الانتقال إلى مفتاح متاح آخر، أو انتظر قليلاً وأعد المحاولة.",
    };
  }
  if (/\(401\)|\(403\)|API key|غير صالح|invalid/i.test(raw)) {
    return {
      title: "مفتاح Gemini غير صالح أو لم يعد فعالاً",
      reason: "رفض المزوّد المفتاح المستخدم.",
      action: "يرجى استبداله من إعدادات مفاتيح Gemini.",
    };
  }
  if (/fetch failed|network|ENOTFOUND|timeout|\(5\d\d\)/i.test(raw)) {
    return {
      title: "تعذّر الاتصال بالخدمة حالياً",
      reason: "انقطاع مؤقت في الشبكة أو في خدمة التحليل.",
      action: "تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.",
    };
  }
  if (/تعذّر قراءة نتيجة التحليل/.test(raw)) {
    return {
      title: "تعذّر قراءة نتيجة التحليل",
      reason: "أعاد النموذج نتيجة غير مكتملة.",
      action: "أعد المحاولة، وإن تكرر الأمر جرّب صوراً أوضح أو نموذجاً آخر من الإعدادات.",
    };
  }
  return {
    title: "حدث خطأ غير متوقع",
    reason: "لم يتمكن النظام من تحديد سبب المشكلة.",
    action: "حاول مرة أخرى، وإذا استمرت المشكلة راجع إعدادات التطبيق.",
  };
}

export function friendlyText(error: unknown): string {
  const f = classifyAiError(error);
  return `${f.title} — ${f.reason} ${f.action}`;
}
