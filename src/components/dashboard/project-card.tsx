import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Cog,
  Film,
  Mic,
  PenLine,
  Play,
  Search,
  TriangleAlert,
} from "lucide-react";
import { PipelineStrip } from "@/components/pipeline-strip";
import { StatusBadge } from "@/components/status-badge";
import { ViralScore } from "@/components/viral-score";
import { Progress } from "@/components/ui/progress";
import {
  STATUS_PROGRESS,
  type ProjectDTO,
  type ProjectStatus,
} from "@/lib/types";
import { cn, formatDuration, timeAgo } from "@/lib/utils";
import { scoreViralPotential } from "@/lib/viral";

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(155deg,#050505 0%,#0b2a12 55%,#39ff14 150%)",
  "linear-gradient(155deg,#0a0014 0%,#4a0b5c 55%,#ff2e93 145%)",
  "linear-gradient(155deg,#120000 0%,#5c0b0b 52%,#ff6a00 145%)",
  "linear-gradient(155deg,#000814 0%,#003566 52%,#00d4ff 145%)",
  "linear-gradient(155deg,#10002b 0%,#3c096c 52%,#c77dff 145%)",
  "linear-gradient(155deg,#001219 0%,#005f73 52%,#94d2bd 145%)",
];

function hash(input: string) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function placeholderFor(project: ProjectDTO) {
  return PLACEHOLDER_GRADIENTS[hash(project.id + project.topic) % PLACEHOLDER_GRADIENTS.length];
}

const STATUS_ICON = {
  QUEUED: Clock3,
  RESEARCHING: Search,
  SCRIPTING: PenLine,
  TTS_PROCESSING: Mic,
  VISUAL_PLANNING: Clapperboard,
  RENDERING: Cog,
  DONE: CheckCircle2,
  FAILED: TriangleAlert,
} satisfies Record<ProjectStatus, typeof Clock3>;

export function ProjectCard({ project }: { project: ProjectDTO }) {
  const score = scoreViralPotential({
    hook: project.hook,
    topic: project.topic,
    script: project.fullScript?.script,
    facts: project.researchData?.facts.length,
  });
  const progress = STATUS_PROGRESS[project.status];
  const failed = project.status === "FAILED";
  const StatusIcon = STATUS_ICON[project.status];

  return (
    <Link
      href={`/project/${project.id}`}
      className={cn(
        "group relative flex gap-4 overflow-hidden rounded-md border border-border bg-card/80 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card hover:shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
        failed && "hover:border-destructive/50",
      )}
    >
      <div className="relative aspect-[9/16] w-[104px] shrink-0 overflow-hidden rounded-sm border border-white/10 bg-black">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={`Thumbnail ${project.topic}`}
            fill
            unoptimized
            sizes="104px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col justify-between p-2"
            style={{ background: placeholderFor(project) }}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
              9:16
            </div>
            <StatusIcon
              className={cn(
                "size-7 text-white/75",
                failed && "text-destructive",
              )}
              strokeWidth={1.5}
            />
            <div className="font-mono text-[8px] uppercase leading-tight tracking-[0.12em] text-white/60">
              {project.topic.split(" ").slice(0, 3).join(" ")}
            </div>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.28)_0px,rgba(0,0,0,0.28)_1px,transparent_1px,transparent_4px)] opacity-40" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/65 px-1.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/80 backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <Clock3 className="size-2.5" />
            {formatDuration(project.duration)}
          </span>
          {project.videoUrl ? <Play className="size-2.5 text-primary" /> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <StatusBadge status={project.status} />
            {project.model ? (
              <span className="truncate max-w-[120px] border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-400">
                {project.model}
              </span>
            ) : null}
            {project.voice ? (
              <span className="truncate max-w-[90px] border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-primary">
                🎙️ {project.voice}
              </span>
            ) : null}
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground shrink-0"
            suppressHydrationWarning
          >
            {timeAgo(project.createdAt)}
          </span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-foreground group-hover:text-primary">
          {project.topic}
        </h3>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {project.hook ?? project.error ?? "Naskah viral sedang disiapkan..."}
        </p>

        <div className="mt-auto space-y-2 pt-3">
          <PipelineStrip status={project.status} />
          <Progress
            value={progress}
            className="h-1"
            indicatorClassName={failed ? "bg-destructive" : "bg-primary"}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
              {progress}% // {project.jobs.filter((job) => job.status === "COMPLETED").length}/5
            </span>
            <div className="flex items-center gap-2">
              <ViralScore score={score} compact />
              {project.fullScript?.sentences?.length ? (
                <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-500 sm:flex">
                  <Film className="size-2.5" />
                  {project.fullScript.sentences.length} scene
                </span>
              ) : null}
              <ArrowUpRight className="size-3.5 text-zinc-600 transition-colors group-hover:text-primary" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
