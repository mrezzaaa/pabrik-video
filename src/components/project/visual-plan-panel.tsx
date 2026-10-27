import { Aperture, BarChart3, Gauge, Hash, Move, Type, Waves } from "lucide-react";
import type { VisualPlan } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  B_ROLL_IMAGE: "B-ROLL",
  SVG_COUNTER: "COUNTER",
  SVG_GAUGE: "GAUGE",
  SVG_BAR_CHART: "BAR",
  SVG_WAVEFORM: "WAVE",
};

function detailFor(scene: VisualPlan["scenes"][number]) {
  if (scene.visualType === "SVG_COUNTER") {
    return `${Math.round(scene.counter?.to ?? scene.metric?.value ?? 0)}${scene.metric?.suffix ?? ""}`;
  }
  if (scene.visualType === "SVG_GAUGE" && scene.range) {
    return `${scene.range.from}–${scene.range.to} ${scene.range.unit ?? ""}`.trim();
  }
  if (scene.visualType === "SVG_BAR_CHART" && scene.bars?.length) {
    return scene.bars
      .map((bar) => `${bar.label} ${bar.value}${bar.unit ?? ""}`)
      .join(" · ");
  }
  if (scene.visualType === "SVG_WAVEFORM") {
    return `DIP ${Math.round((scene.wave?.dip ?? 0.6) * 100)}%`;
  }
  return scene.imageSearchQuery ? `QUERY // ${scene.imageSearchQuery}` : "NO QUERY";
}

function IconFor({ type }: { type: string }) {
  if (type === "SVG_COUNTER") return <Hash className="size-3" />;
  if (type === "SVG_GAUGE") return <Gauge className="size-3" />;
  if (type === "SVG_BAR_CHART") return <BarChart3 className="size-3" />;
  if (type === "SVG_WAVEFORM") return <Waves className="size-3" />;
  return <Aperture className="size-3" />;
}

export function VisualPlanPanel({ plan }: { plan: VisualPlan | null }) {
  if (!plan || plan.scenes.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-xs text-zinc-500">
        Visual plan belum tersedia. Agent visual akan mengisi b-roll SearXNG dan
        infografis SVG per kalimat.
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
            className="relative grid aspect-[9/16] w-14 shrink-0 place-items-center overflow-hidden border border-white/10 bg-cover bg-center"
            style={{
              background: scene.background.value,
              backgroundImage: scene.imageUrl
                ? `url(${scene.imageUrl})`
                : undefined,
            }}
          >
            <span className="absolute bottom-0.5 left-1 rounded-sm bg-black/70 px-1 font-mono text-[7px] text-white/60">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-zinc-300">
                <IconFor type={scene.visualType ?? "B_ROLL_IMAGE"} />
                {TYPE_LABEL[scene.visualType ?? "B_ROLL_IMAGE"] ?? "VISUAL"}
              </div>
              <span className="shrink-0 font-mono text-[8px] text-zinc-600">
                {scene.startTime.toFixed(1)}-{scene.endTime.toFixed(1)}s
              </span>
            </div>

            <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-400">
              {detailFor(scene)}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                <Move className="size-2" /> {scene.motion.type} @
                {Math.round(scene.motion.intensity * 100)}%
              </span>
              <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                <Type className="size-2" /> {scene.textAnimation.type}
              </span>
              {scene.stageLabel ? (
                <span className="inline-flex items-center gap-1 border border-border bg-zinc-950 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                  {scene.stageLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
