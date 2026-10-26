"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Radio,
} from "lucide-react";
import { JobTimeline } from "@/components/project/job-timeline";
import { ProjectPreview } from "@/components/project/project-preview";
import { ResearchPanel } from "@/components/project/research-panel";
import { ScriptEditor } from "@/components/project/script-editor";
import { VisualPlanPanel } from "@/components/project/visual-plan-panel";
import { StatusBadge } from "@/components/status-badge";
import { ViralScore } from "@/components/viral-score";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  STATUS_LABELS,
  STATUS_PROGRESS,
  type JobType,
  type ProjectDTO,
} from "@/lib/types";
import { cn, formatDuration, timeAgo } from "@/lib/utils";
import { scoreViralPotential } from "@/lib/viral";

export function ProjectDetailClient({
  initialProject,
}: {
  initialProject: ProjectDTO;
}) {
  const [project, setProject] = useState(initialProject);
  const [live, setLive] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/projects/${initialProject.id}/stream`);
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.addEventListener("project", (event) => {
      try {
        setProject(JSON.parse((event as MessageEvent).data) as ProjectDTO);
      } catch {
        // ignore malformed frame
      }
    });
    return () => source.close();
  }, [initialProject.id]);

  const score = useMemo(
    () =>
      scoreViralPotential({
        hook: project.hook,
        topic: project.topic,
        script: project.fullScript?.script,
        facts: project.researchData?.facts.length,
      }),
    [project],
  );

  const failedJob = project.jobs.find((job) => job.status === "FAILED");
  const busy = project.jobs.some((job) => job.status === "ACTIVE");

  async function rerun(from?: JobType) {
    setRerunning(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from ?? failedJob?.type ?? "tts",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal rerun.");
      if (data.project) setProject(data.project as ProjectDTO);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Gagal menjadwalkan ulang.",
      );
    } finally {
      setRerunning(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    } catch {
      setActionError("Clipboard tidak tersedia.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1640px] flex-1 px-4 pb-14 pt-5 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Factory Floor
        </Link>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
              live
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            <Radio className={cn("size-2.5", live && "animate-pulse")} />
            {live ? "SSE Live" : "Reconnecting"}
          </span>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 border border-border bg-black/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:text-primary"
          >
            {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>

      <header className="mb-4 border border-border bg-card/70 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                JOB {project.id.slice(-8).toUpperCase()}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                {formatDuration(project.duration)}{" // "}
                {project.jobs.filter((job) => job.status === "COMPLETED").length}/5 STAGE
              </span>
            </div>

            <h1 className="mt-2 max-w-4xl text-2xl font-black leading-[1.05] tracking-[-0.03em] sm:text-4xl">
              {project.topic}
            </h1>

            {project.hook ? (
              <p className="mt-2 max-w-3xl border-l-2 border-primary/50 pl-3 text-sm leading-relaxed text-zinc-400">
                “{project.hook}”
              </p>
            ) : null}

            {project.error ? (
              <div className="mt-3 flex items-start gap-2 border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="line-clamp-3">{project.error}</span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <ViralScore score={score} />
            {project.videoUrl ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={project.videoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" /> Buka
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={project.videoUrl} download>
                    <Download className="size-3.5" /> Download
                  </a>
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant={failedJob ? "destructive" : "secondary"}
              onClick={() => void rerun()}
              disabled={rerunning || busy}
              title={busy ? "Pipeline masih aktif" : "Jalankan ulang stage"}
            >
              {rerunning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {failedJob ? `Retry ${failedJob.type}` : "Rerun"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Progress
            value={STATUS_PROGRESS[project.status]}
            className="h-1.5 flex-1"
            indicatorClassName={
              project.status === "FAILED" ? "bg-destructive" : "bg-primary"
            }
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            {STATUS_LABELS[project.status]}{" // "}{STATUS_PROGRESS[project.status]}%
          </span>
        </div>

        {actionError ? (
          <div className="mt-3 border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
            {actionError}
          </div>
        ) : null}
      </header>

      <div className="grid gap-3 xl:grid-cols-[290px_minmax(340px,1fr)_390px]">
        <section className="border border-border bg-card/60">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="label-mono text-zinc-400">Job Timeline</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
              {project.updatedAt ? timeAgo(project.updatedAt) : "-"}
            </span>
          </div>
          <div className="p-3">
            <JobTimeline jobs={project.jobs} />
          </div>

          <div className="space-y-2 border-t border-border p-3">
            {[
              ["Durasi", formatDuration(project.duration)],
              ["Kalimat", String(project.fullScript?.sentences.length ?? 0)],
              ["Kata", String(project.fullScript?.script.split(/\s+/).filter(Boolean).length ?? 0)],
              ["Dibuat", new Date(project.createdAt).toLocaleString("id-ID")],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em]"
              >
                <span className="text-zinc-600">{label}</span>
                <span className="text-zinc-400">{value}</span>
              </div>
            ))}
            <div className="border border-zinc-900 bg-black/30 px-2 py-1.5 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-zinc-600">
              VOICE // {process.env.NEXT_PUBLIC_VOICE_LABEL ?? "reza"} · TTS // VoiceStudio
              <br />
              MODEL // auto · QUEUE // pabrik-video-queue
            </div>
          </div>
        </section>

        <section className="order-first xl:order-none">
          <ProjectPreview project={project} />
        </section>

        <section className="border border-border bg-card/60">
          <Tabs defaultValue="script" className="gap-0">
            <div className="border-b border-border p-2.5">
              <TabsList className="w-full">
                <TabsTrigger value="script">Naskah</TabsTrigger>
                <TabsTrigger value="research">Riset</TabsTrigger>
                <TabsTrigger value="visual">Visual</TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[calc(100vh-250px)] min-h-[420px] overflow-y-auto p-3">
              <TabsContent value="script">
                <ScriptEditor project={project} onProject={setProject} />
              </TabsContent>
              <TabsContent value="research">
                <ResearchPanel data={project.researchData} />
              </TabsContent>
              <TabsContent value="visual">
                <VisualPlanPanel plan={project.visualPlan} />
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
