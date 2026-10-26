"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Download, FileVideo, Loader2, MonitorPlay, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectDTO } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const RemotionReelsPlayer = dynamic(
  () =>
    import("./remotion-player").then((mod) => mod.RemotionReelsPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    ),
  },
);

export function ProjectPreview({ project }: { project: ProjectDTO }) {
  const [mode, setMode] = useState<"preview" | "final">("preview");
  const hasVideo = Boolean(project.videoUrl);

  return (
    <div className="flex h-full flex-col border border-border bg-card/70">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MonitorPlay className="size-3.5 text-primary" />
          <span className="label-mono text-zinc-400">Output Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
              mode === "preview"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => setMode("final")}
            disabled={!hasVideo}
            className={cn(
              "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] disabled:opacity-35",
              mode === "final"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            MP4
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center p-3">
        <div className="relative w-full max-w-[360px] overflow-hidden border border-zinc-800 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
          <div className="aspect-[9/16] w-full">
            {mode === "final" && hasVideo ? (
              <video
                src={project.videoUrl ?? undefined}
                poster={project.thumbnailUrl ?? undefined}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : project.audioUrl ? (
              <RemotionReelsPlayer project={project} />
            ) : (
              <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#14290f,#050505_64%)] p-6 text-center">
                <div className="absolute inset-0 factory-grid opacity-40" />
                <div className="absolute left-0 top-1/3 h-px w-full animate-scan bg-primary/40" />
                <FileVideo className="size-10 text-primary/50" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                    {project.status === "RENDERING"
                      ? "Rendering MP4..."
                      : "Audio belum siap"}
                  </div>
                  <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-zinc-500">
                    {project.status === "RENDERING"
                      ? "Remotion sedang menggambar 1080×1920 frame per frame."
                      : "Preview karaoke muncul otomatis setelah stage TTS selesai."}
                  </p>
                </div>
                <Badge variant="muted">{project.status}</Badge>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.15em] text-white/70">
            <span>PV // 9:16</span>
            <span>{formatDuration(project.duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
          1080 × 1920 // 30 FPS // H.264
        </div>
        {hasVideo ? (
          <Button asChild size="sm" variant="outline">
            <a href={project.videoUrl ?? "#"} download>
              <Download className="size-3.5" /> MP4
            </a>
          </Button>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
            <Play className="size-2.5" /> Waiting render
          </span>
        )}
      </div>
    </div>
  );
}
