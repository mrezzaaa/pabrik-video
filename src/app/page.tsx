"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cpu,
  FileCode2,
  Film,
  Flame,
  Layers,
  Loader2,
  Mic,
  Play,
  Radio,
  Sparkles,
  Terminal,
  Video,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { VideoJobState } from "@/schemas/video-blueprint";

const PRESET_TOPICS = [
  "Kenapa duri bandeng presto bisa lunak?",
  "Kenapa air di dalam tumbler suhunya bisa awet",
  "Bagaimana kompresor AC mengubah gas freon menjadi udara dingin",
  "Mekanisme kerja baterai Lithium-Ion saat fast charging 200W",
];

const AGENT_PIPELINE_META = [
  {
    key: "deconstructor" as const,
    code: "AGENT 01",
    name: "Layman Storyboarder",
    workerFile: "deconstructor.worker.ts",
    desc: "4-Act Everyday Cutaway Storyboard & Checklist",
    icon: Cpu,
  },
  {
    key: "scriptwriter" as const,
    code: "AGENT 02",
    name: "Conversational Copywriter",
    workerFile: "scriptwriter.worker.ts",
    desc: "Punchy 4-7 Word Indonesian + Editorial Metrics + Pill Labels",
    icon: FileCode2,
  },
  {
    key: "tts" as const,
    code: "AGENT 03",
    name: "UnlimitedTTS Synchronizer",
    workerFile: "tts.worker.ts",
    desc: "id-ID • Voice: Ethan • 1.1x Speed • Word-Level Karaoke Sync",
    icon: Mic,
  },
  {
    key: "visual" as const,
    code: "AGENT 04",
    name: "Cutaway & Camera Choreographer",
    workerFile: "visual.worker.ts",
    desc: "Light-Mode 90° Cutaway SVG + Spring Camera Zoom-Ins",
    icon: Boxes,
  },
  {
    key: "renderer" as const,
    code: "AGENT 05",
    name: "Remotion Render Worker",
    workerFile: "renderer.worker.ts",
    desc: "Headless 1080x1920 @ 60fps MP4 Render (@remotion/renderer)",
    icon: Film,
  },
];

export default function FactoryDashboardPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("Kenapa duri bandeng presto bisa lunak?");
  const [aspectRatioMode, setAspectRatioMode] = useState<
    "LANDSCAPE_16_9" | "SHORTS_9_16"
  >("SHORTS_9_16");
  const [autoRenderMp4, setAutoRenderMp4] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<VideoJobState[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<VideoJobState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial job queue
  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.ok && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        if (!activeJobId && data.jobs.length > 0) {
          setActiveJobId(data.jobs[0].jobId);
          setActiveJob(data.jobs[0]);
        }
      }
    } catch {
      // ignore initial poll error
    }
  };

  useEffect(() => {
    void fetchJobs();
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to live SSE stream for the currently selected job
  useEffect(() => {
    if (!activeJobId) return;
    const es = new EventSource(`/api/jobs?jobId=${activeJobId}&stream=1`);
    es.onmessage = (ev) => {
      try {
        const updated = JSON.parse(ev.data) as VideoJobState;
        setActiveJob(updated);
        setJobs((prev) => {
          const exists = prev.some((j) => j.jobId === updated.jobId);
          if (!exists) return [updated, ...prev];
          return prev.map((j) => (j.jobId === updated.jobId ? updated : j));
        });
      } catch {
        // ignore parse error
      }
    };
    return () => {
      es.close();
    };
  }, [activeJobId]);

  const handleLaunchFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          aspectRatioMode,
          autoRenderMp4,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal membuat antrean job");
      }

      setActiveJobId(data.jobId);
      setActiveJob(data.job);
      setJobs((prev) => [data.job, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 relative overflow-x-hidden">
      {/* Isometric Engineering Grid Background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1E293B 1px, transparent 1px),
            linear-gradient(to bottom, #1E293B 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top Navigation Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 shadow-inner">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-sky-400">
                  KITABEDAH.ID ENGINE
                </span>
                <Badge variant="success">60 FPS ISOMETRIC</Badge>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                PABRIK VIDEO{" "}
                <span className="font-mono text-xs font-normal text-slate-400">
                  // AUTOMATED MULTI-AGENT VIDEO FACTORY
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="hidden md:flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-slate-300">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>OMNIROUTE :20128/v1</span>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-slate-300">
              <Mic className="h-3.5 w-3.5 text-sky-400" />
              <span>TTS: ETHAN (id-ID @ 1.1x)</span>
            </div>
            <Link href="/studio/demo-presto-job">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5 text-sky-400" />
                Instant Demo Studio (Bandeng Presto)
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Top Row: Topic Input Form & Multi-Agent DAG Architecture */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Topic Input Card */}
          <Card className="lg:col-span-7 border-sky-500/30 bg-slate-950/90 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="default" className="gap-1.5">
                  <Sparkles className="h-3 w-3" /> INPUT TOPIK BEDAH MEKANISME
                </Badge>
                <span className="font-mono text-xs text-slate-400">
                  BullMQ FlowProducer DAG
                </span>
              </div>
              <CardTitle className="text-xl pt-2">
                Generate Isometric Explanatory Video
              </CardTitle>
              <CardDescription>
                Masukkan satu kalimat topik sains/rekayasa. 5 Sub-Agent BullMQ
                akan membedah mekanisme, menyusun telemetri HUD, menyintesis
                suara Ethan 1.1x, membuat aset vektor isometrik 3D, dan merender
                MP4 1080p/60fps.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLaunchFactory} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-mono text-xs text-slate-300">
                    TOPIC PROMPT (BAHASA INDONESIA)
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: Kenapa air di dalam tumbler suhunya bisa awet"
                    className="h-12 text-base font-medium border-slate-700 focus-visible:ring-sky-400"
                  />
                </div>

                {/* Preset Topics */}
                <div className="space-y-1.5">
                  <div className="font-mono text-[11px] text-slate-400">
                    CONTOH TOPIK SIAP PAKAI:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TOPICS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTopic(preset)}
                        className="rounded-md border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-left text-xs text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format & Auto-render Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatioMode("LANDSCAPE_16_9")}
                      className={`rounded-md px-3 py-1.5 font-mono text-xs border transition ${
                        aspectRatioMode === "LANDSCAPE_16_9"
                          ? "border-sky-500 bg-sky-500/20 text-sky-300 font-semibold"
                          : "border-slate-800 bg-slate-900 text-slate-400"
                      }`}
                    >
                      1920x1080 (16:9 Landscape)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatioMode("SHORTS_9_16")}
                      className={`rounded-md px-3 py-1.5 font-mono text-xs border transition ${
                        aspectRatioMode === "SHORTS_9_16"
                          ? "border-sky-500 bg-sky-500/20 text-sky-300 font-semibold"
                          : "border-slate-800 bg-slate-900 text-slate-400"
                      }`}
                    >
                      1080x1920 (9:16 Shorts)
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-mono">
                    <input
                      type="checkbox"
                      checked={autoRenderMp4}
                      onChange={(e) => setAutoRenderMp4(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                    />
                    Auto-Render MP4 (Agent 5)
                  </label>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 font-mono">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full gap-2 font-mono text-sm tracking-wide"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        DISPATCHING BULLMQ DAG PIPELINE...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        LAUNCH 5-AGENT VIDEO FACTORY PIPELINE
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right Column: Live 5-Agent DAG Pipeline Status */}
          <Card className="lg:col-span-5 border-slate-800 bg-slate-950/90">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <CardTitle className="text-base font-mono">
                    LIVE BULLMQ DAG ORCHESTRATOR
                  </CardTitle>
                </div>
                {activeJob && (
                  <Badge
                    variant={
                      activeJob.status === "COMPLETED"
                        ? "success"
                        : activeJob.status === "FAILED"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {activeJob.status}
                  </Badge>
                )}
              </div>
              <CardDescription className="truncate">
                {activeJob
                  ? `Job ID: ${activeJob.jobId} — "${activeJob.topic}"`
                  : "Pilih atau jalankan topik untuk memantau status worker secara real-time."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {activeJob && (
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-slate-400">OVERALL PROGRESS</span>
                    <span className="text-sky-400 font-bold">
                      {activeJob.progressPercent}%
                    </span>
                  </div>
                  <Progress value={activeJob.progressPercent} />
                </div>
              )}

              {/* 5 Sub-Agent Nodes */}
              <div className="space-y-2.5">
                {AGENT_PIPELINE_META.map((agent) => {
                  const Icon = agent.icon;
                  const stepState = activeJob?.steps?.[agent.key] ?? "PENDING";

                  return (
                    <div
                      key={agent.key}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 transition ${
                        stepState === "ACTIVE"
                          ? "border-sky-500/60 bg-sky-500/10"
                          : stepState === "COMPLETED"
                            ? "border-emerald-500/35 bg-emerald-500/5"
                            : stepState === "FAILED"
                              ? "border-rose-500/40 bg-rose-500/10"
                              : "border-slate-800/90 bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                            stepState === "ACTIVE"
                              ? "border-sky-400 bg-sky-500/20 text-sky-300"
                              : stepState === "COMPLETED"
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : "border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {stepState === "ACTIVE" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : stepState === "COMPLETED" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-sky-400">
                              {agent.code}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {agent.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {agent.desc}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={
                          stepState === "COMPLETED"
                            ? "success"
                            : stepState === "ACTIVE"
                              ? "default"
                              : stepState === "FAILED"
                                ? "destructive"
                                : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {stepState}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons when Ready or Completed */}
              {activeJob && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="default"
                    className="w-full gap-2 font-mono text-xs"
                    onClick={() => router.push(`/studio/${activeJob.jobId}`)}
                  >
                    <Video className="h-4 w-4" />
                    OPEN REMOTION STUDIO & JSON INSPECTOR
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Live Worker Telemetry Logs & Active Job Queue */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Live SSE Worker Log Stream */}
          <Card className="lg:col-span-6 border-slate-800 bg-slate-950/90">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-sm font-mono">
                    REAL-TIME SSE WORKER TELEMETRY STREAM
                  </CardTitle>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {activeJob?.logs.length ?? 0} events
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto rounded-lg border border-slate-800 bg-[#05080F] p-3.5 font-mono text-xs space-y-2">
                {activeJob?.logs && activeJob.logs.length > 0 ? (
                  activeJob.logs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 border-b border-slate-900/80 pb-1.5"
                    >
                      <span className="text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                      </span>
                      <span
                        className={`shrink-0 font-bold ${
                          log.level === "SUCCESS"
                            ? "text-emerald-400"
                            : log.level === "ERROR"
                              ? "text-rose-400"
                              : "text-sky-400"
                        }`}
                      >
                        [{log.agent}]
                      </span>
                      <span className="text-slate-200 break-words">
                        {log.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    Waiting for BullMQ worker telemetry events...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active & Recent Jobs Queue Table */}
          <Card className="lg:col-span-6 border-slate-800 bg-slate-950/90">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-sm font-mono">
                    FACTORY QUEUE & COMPLETED RENDERS
                  </CardTitle>
                </div>
                <Badge variant="secondary">{jobs.length} JOBS</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-2.5 pr-1">
                {jobs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-6 text-center">
                    <p className="font-mono text-xs text-slate-400 mb-3">
                      Belum ada job di antrean Redis, atau buka Demo Studio
                      langsung.
                    </p>
                    <Link href="/studio/demo-presto-job">
                      <Button variant="outline" size="sm" className="font-mono">
                        Buka Demo Studio (Bandeng Presto 9:16)
                      </Button>
                    </Link>
                  </div>
                ) : (
                  jobs.map((job) => {
                    const isSelected = job.jobId === activeJobId;
                    return (
                      <div
                        key={job.jobId}
                        onClick={() => {
                          setActiveJobId(job.jobId);
                          setActiveJob(job);
                        }}
                        className={`cursor-pointer rounded-lg border p-3 transition ${
                          isSelected
                            ? "border-sky-500/60 bg-sky-500/10"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {job.jobId}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                job.status === "COMPLETED"
                                  ? "success"
                                  : job.status === "FAILED"
                                    ? "destructive"
                                    : "default"
                              }
                            >
                              {job.status} ({job.progressPercent}%)
                            </Badge>
                            <Link
                              href={`/studio/${job.jobId}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2.5 font-mono text-[11px]"
                              >
                                Studio
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-100 line-clamp-1">
                          {job.topic}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
