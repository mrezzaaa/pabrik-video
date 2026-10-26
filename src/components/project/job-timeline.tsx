import {
  AlertCircle,
  Check,
  CircleDashed,
  Clapperboard,
  Film,
  Loader2,
  Radio,
  Wand2,
} from "lucide-react";
import {
  JOB_LABELS,
  JOB_TYPES,
  type JobDTO,
  type JobType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<JobType, typeof Radio> = {
  research: Radio,
  scriptwriting: Wand2,
  tts: Clapperboard,
  "visual-planning": Clapperboard,
  render: Film,
};

function duration(start: string | null, finish: string | null) {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = finish ? new Date(finish).getTime() : Date.now();
  const seconds = Math.max(0, (endMs - startMs) / 1000);
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function JobTimeline({ jobs }: { jobs: JobDTO[] }) {
  return (
    <div className="space-y-0">
      {JOB_TYPES.map((type, index) => {
        const job = jobs.find((item) => item.type === type);
        const status = job?.status ?? "PENDING";
        const Icon = ICONS[type];
        const active = status === "ACTIVE";
        const done = status === "COMPLETED";
        const failed = status === "FAILED";

        return (
          <div key={type} className="relative flex gap-3 pb-5 last:pb-0">
            {index < JOB_TYPES.length - 1 ? (
              <div
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-20px)] w-px",
                  done ? "bg-primary/35" : "bg-zinc-800",
                )}
              />
            ) : null}

            <div
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-black",
                done && "border-primary/50 text-primary",
                active && "border-primary text-primary",
                failed && "border-destructive/60 text-destructive",
                !done && !active && !failed && "border-zinc-800 text-zinc-600",
              )}
            >
              {done ? (
                <Check className="size-3.5" />
              ) : failed ? (
                <AlertCircle className="size-3.5" />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CircleDashed className="size-3.5" />
              )}
              {active ? (
                <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3 text-zinc-500" />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      active
                        ? "text-primary"
                        : failed
                          ? "text-destructive"
                          : done
                            ? "text-zinc-200"
                            : "text-zinc-500",
                    )}
                  >
                    {JOB_LABELS[type]}
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                  {status}
                </span>
              </div>

              <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {job?.attempts ? <span>TRY {job.attempts}/3</span> : null}
                {job?.startedAt ? (
                  <span>{duration(job.startedAt, job.finishedAt)}</span>
                ) : null}
              </div>

              {job?.error ? (
                <p
                  className="mt-1.5 line-clamp-3 border-l-2 border-destructive/50 bg-destructive/5 px-2 py-1 text-[10px] leading-relaxed text-destructive/90"
                  title={job.error}
                >
                  {job.error}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
