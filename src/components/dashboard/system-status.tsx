import { Activity, Boxes, Cpu, Radio } from "lucide-react";
import type { QueueSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WorkerInfo = {
  worker: { online: boolean; lastHeartbeat: string | null };
  queue: QueueSnapshot;
};

export function SystemStatus({
  info,
  compact = false,
}: {
  info: WorkerInfo | null;
  compact?: boolean;
}) {
  const online = info?.worker.online ?? false;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "text-[9px]" : "text-[10px]",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono uppercase tracking-[0.12em]",
          online
            ? "border-primary/35 bg-primary/10 text-primary"
            : "border-destructive/35 bg-destructive/10 text-destructive",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full bg-current",
            online && "animate-pulse",
          )}
        />
        Worker {online ? "Online" : "Offline"}
      </span>

      <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-black/40 px-2 py-1 font-mono uppercase tracking-[0.12em] text-zinc-400">
        <Radio className="size-3" />
        Queue {info?.queue.waiting ?? 0} / Active {info?.queue.active ?? 0}
      </span>

      {!compact ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-black/40 px-2 py-1 font-mono uppercase tracking-[0.12em] text-zinc-400">
            <Cpu className="size-3" /> Omniroute // auto
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-black/40 px-2 py-1 font-mono uppercase tracking-[0.12em] text-zinc-400">
            <Boxes className="size-3" /> 5 Agents
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-black/40 px-2 py-1 font-mono uppercase tracking-[0.12em] text-zinc-400">
            <Activity className="size-3" /> 9:16 // 1080p
          </span>
        </>
      ) : null}
    </div>
  );
}
