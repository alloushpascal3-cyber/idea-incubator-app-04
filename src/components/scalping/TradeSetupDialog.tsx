import { Link } from "@tanstack/react-router";
import { Settings2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STUDY_DURATIONS, TRADE_DURATIONS } from "@/lib/scalping-types";

type Props = {
  platform: string;
  tradeDuration: number;
  studyDuration: number;
  onTradeDuration: (v: number) => void;
  onStudyDuration: (v: number) => void;
  disabled?: boolean;
};

export function TradeSetupDialog({
  platform,
  tradeDuration,
  studyDuration,
  onTradeDuration,
  onStudyDuration,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" disabled={disabled} className="gold-ring">
          <SlidersHorizontal className="size-4" />
          تهيئة الصفقة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="panel max-w-md">
        <DialogHeader>
          <DialogTitle className="gold-text text-lg">تهيئة الصفقة</DialogTitle>
          <DialogDescription className="text-xs">
            حدّد المنصة ومدة الصفقة ومدة رفع الصور قبل بدء الدراسة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[11px] text-muted-foreground">المنصة</span>
            <div className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm">
              {platform}
            </div>
          </div>

          <Group
            label="مدة الصفقة (دقيقة)"
            value={tradeDuration}
            options={[...TRADE_DURATIONS]}
            onChange={onTradeDuration}
          />
          <Group
            label="مدة رفع الصور والدراسة (ثانية)"
            value={studyDuration}
            options={[...STUDY_DURATIONS]}
            onChange={onStudyDuration}
          />

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/settings">
              <Settings2 className="size-4" />
              إعدادات التحليل المتقدمة
            </Link>
          </Button>
          <Button className="w-full" onClick={() => setOpen(false)}>
            تم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              "rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors " +
              (value === opt
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-input/40 text-muted-foreground hover:text-foreground")
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}