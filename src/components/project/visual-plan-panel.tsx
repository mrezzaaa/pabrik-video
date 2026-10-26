import { Aperture, Move, Type } from "lucide-react";
import type { VisualPlan } from "@/lib/types";

export function VisualPlanPanel({ plan }: { plan: VisualPlan | null }) {
  if (!plan || plan.scenes.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-xs text-zinc-500">
        Visual plan belum tersedia. Agent visual akan mengisi background,
        motion, headline dan emoji per kalimat.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plan.vibe ? (
        <div className="border border-zinc-900 bg-black/30 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-500">
          VIBE // {plan.vibe}
        </div>
      ) : null}

      {plan.scenes.map((scene, index) => (
        <div
          key={scene.id}
          className="flex gap-2.5 border border-zinc-900 bg-black/30 p-2"
        >
          <div
            className="relative grid aspect-[9/16] w-14 shrink-0 place-items-center overflow-hidden border border-white/10"
            style={{ background: scene.background.value }}
          >
            <span className="text-xl">{scene.overlayEmoji}</span>
            <span className="absolute bottom-0.5 left-1 font-mono text-[7px] text-white/60">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-[11px] font-bold uppercase tracking-wide text-zinc-200">
                {scene.headline || "TANPA HEADLINE"}
              </div>
              <span className="shrink-0 font-mono text-[8px] text-zinc-600">
                {scene.startTime.toFixed(1)}-{scene.endTime.toFixed(1)}s
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                <Move className="size-2" /> {scene.motion.type} @
                {Math.round(scene.motion.intensity * 100)}%
              </span>
              <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                <Type className="size-2" /> {scene.textAnimation.type}
              </span>
              <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                <Aperture className="size-2" />{" "}
                {scene.background.type}
              </span>
            </div>

            {scene.bRollKeywords.length > 0 ? (
              <div className="mt-1.5 truncate font-mono text-[8px] uppercase tracking-[0.1em] text-zinc-600">
                B-ROLL // {scene.bRollKeywords.join(", ")}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
