import { JOB_SHORT_LABELS, JOB_TYPES, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_INDEX: Record<ProjectStatus, number> = {
  QUEUED: -1,
  RESEARCHING: 0,
  SCRIPTING: 1,
  TTS_PROCESSING: 2,
  VISUAL_PLANNING: 3,
  RENDERING: 4,
  DONE: 5,
  FAILED: -2,
};

export function PipelineStrip({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const active = STATUS_INDEX[status];
  const failed = status === "FAILED";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {JOB_TYPES.map((stage, index) => {
        const done = active > index;
        const current = active === index;
        return (
          <div key={stage} className="flex flex-1 items-center gap-1">
            <div className="flex flex-1 flex-col gap-1">
              <div
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  done
                    ? "bg-primary/70"
                    : current
                      ? failed
                        ? "bg-destructive"
                        : "bg-primary animate-pulse"
                      : "bg-zinc-800",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[7px] uppercase tracking-[0.08em]",
                  done || current ? "text-zinc-400" : "text-zinc-700",
                  current && !failed && "text-primary",
                  current && failed && "text-destructive",
                )}
              >
                {JOB_SHORT_LABELS[stage]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
