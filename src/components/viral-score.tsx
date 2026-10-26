import { cn } from "@/lib/utils";
import { viralScoreLabel } from "@/lib/viral";

export function ViralScore({
  score,
  compact = false,
  className,
}: {
  score: number;
  compact?: boolean;
  className?: string;
}) {
  const color =
    score >= 85
      ? "#39FF14"
      : score >= 70
        ? "#F5FF00"
        : score >= 50
          ? "#00D4FF"
          : "#FF3B30";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]",
          className,
        )}
        style={{ color }}
      >
        <span className="inline-flex gap-0.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="h-2.5 w-1"
              style={{
                backgroundColor:
                  score >= (index + 1) * 20 ? color : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </span>
        {score > 0 ? `${score}` : "—"}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative grid size-14 place-items-center rounded-sm border"
        style={{ borderColor: `${color}55`, backgroundColor: `${color}0d` }}
      >
        <span
          className="font-mono text-xl font-bold leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="absolute -bottom-1.5 bg-card px-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
          VIRAL
        </span>
      </div>
      <div className="space-y-0.5">
        <div className="label-mono text-muted-foreground">Hook Strength</div>
        <div
          className="font-mono text-xs font-bold uppercase tracking-[0.12em]"
          style={{ color }}
        >
          {viralScoreLabel(score)}
        </div>
      </div>
    </div>
  );
}
