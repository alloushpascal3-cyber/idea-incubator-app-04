import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TIMEFRAMES, TIME_SLOTS, type ChartShot } from "@/lib/scalping-types";

type Props = {
  shots: ChartShot[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onPatch: (id: string, patch: Partial<ChartShot>) => void;
  disabled?: boolean;
};

export function ShotUploader({ shots, onAdd, onRemove, onPatch, disabled }: Props) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">صور الشارت</h3>
          <p className="text-[11px] text-muted-foreground">
            ارفع صورًا متتابعة لكل فريم بفاصل ≈15 ثانية — التصنيف تلقائي
          </p>
        </div>
        <label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              onAdd(e.target.files);
              e.target.value = "";
            }}
          />
          <Button asChild variant="secondary" size="sm" disabled={disabled}>
            <span>إضافة صور</span>
          </Button>
        </label>
      </div>

      {shots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          لا توجد صور بعد. الاختبار الأول يحتاج 12 صورة: 3 فريمات × 4 أزمنة.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shots.map((shot) => (
            <div key={shot.id} className="overflow-hidden rounded-xl border border-border bg-secondary/30">
              <div className="relative">
                <img src={shot.dataUrl} alt={shot.name} className="h-24 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(shot.id)}
                  className="absolute left-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="حذف الصورة"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <select
                  value={shot.timeframe}
                  onChange={(e) => onPatch(shot.id, { timeframe: e.target.value as ChartShot["timeframe"] })}
                  className="rounded-md border border-border bg-input/60 px-1 py-1 text-[11px] text-foreground"
                >
                  <option value="unknown">فريم؟</option>
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </select>
                <select
                  value={shot.slot}
                  onChange={(e) => onPatch(shot.id, { slot: e.target.value as ChartShot["slot"] })}
                  className="rounded-md border border-border bg-input/60 px-1 py-1 text-[11px] text-foreground"
                >
                  <option value="unknown">زمن؟</option>
                  {TIME_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}