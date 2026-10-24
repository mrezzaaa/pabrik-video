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
  Monitor,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  Terminal,
  Video,
  X,
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
  "Kenapa tumbler bisa awet panas?",
  "Kenapa kucing bisa mendarat kaki duluan?",
  "Kenapa kecap susah keluar dari botol?",
  "Mekanisme fast charging baterai Lithium-Ion 200W",
  "Bagaimana kompresor AC mengubah gas freon jadi dingin?",
  "Kenapa mesin turbofan jet menghasilkan daya dorong ekstrem?",
];

const AGENT_PIPELINE_META = [
  {
    key: "deconstructor" as const,
    code: "AGENT 01",
    name: "Layman Storyboarder",
    desc: "4-Act Cutaway Storyboard & Checklist",
    icon: Cpu,
  },
  {
    key: "scriptwriter" as const,
    code: "AGENT 02",
    name: "Copywriter & Telemetry",
    desc: "Dynamic Topic Telemetry + Popups",
    icon: FileCode2,
  },
  {
    key: "tts" as const,
    code: "AGENT 03",
    name: "UnlimitedTTS Synchronizer",
    desc: "Voice: Ethan • Word-Level Sync",
    icon: Mic,
  },
  {
    key: "visual" as const,
    code: "AGENT 04",
    name: "Anatomy SVG Choreographer",
    desc: "Isometric 4-Tone Shading (Anatomy Skill)",
    icon: Boxes,
  },
  {
    key: "renderer" as const,
    code: "AGENT 05",
    name: "Remotion Render Worker",
    desc: "1080x1920 @ 30fps MP4 Engine",
    icon: Film,
  },
];

export default function FactoryDashboardPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("Kenapa tumbler bisa awet panas?");
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
      // Smooth scroll to live pipeline section
      scrollToSection("section-pipeline");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (sectionId: "section-input" | "section-pipeline" | "section-logs" | "section-queue") => {
    if (typeof window !== "undefined") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // 1. Topic Input Form Card
  const inputCardNode = (
    <Card className="border-sky-500/30 bg-slate-950/95 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="default" className="gap-1 text-[10px] sm:text-xs">
            <Sparkles className="h-3 w-3" /> INPUT TOPIK BEBAS
          </Badge>
          <span className="font-mono text-[10px] sm:text-xs text-sky-400 font-semibold">
            Anatomy SVG • 1080x1920
          </span>
        </div>
        <CardTitle className="text-base sm:text-lg pt-1">
          Generate Video Penjelasan Isometrik
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Topik apapun (“kenapa tumbler awet panas”, “kenapa kucing mendarat kaki duluan”) dibedah otomatis dengan 5 Sub-Agent, telemetri live, suara Ethan 1.1x, dan SVG isometrik.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleLaunchFactory} className="space-y-4">
          {/* Topic Prompt Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] font-semibold text-slate-300">
                TOPIK PERTANYAAN (BAHASA INDONESIA)
              </label>
              {topic && (
                <button
                  type="button"
                  onClick={() => setTopic("")}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" /> Bersihkan
                </button>
              )}
            </div>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Kenapa kecap susah keluar dari botol?"
              className="h-11 sm:h-12 text-sm sm:text-base font-medium border-slate-700 bg-slate-900/80 focus-visible:ring-sky-400"
            />
          </div>

          {/* Preset Topics (Mobile Horizontal Scrollable Chips) */}
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
              <span>CONTOH TOPIK CEPAT:</span>
              <span className="text-[10px] text-sky-400 md:hidden">geser ➔</span>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-1 px-1">
              {PRESET_TOPICS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className="shrink-0 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-left text-xs text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 active:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Format & Auto-render Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatioMode("SHORTS_9_16")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 font-mono text-xs border transition ${
                  aspectRatioMode === "SHORTS_9_16"
                    ? "border-sky-500 bg-sky-500/20 text-sky-300 font-semibold shadow-sm shadow-sky-500/20"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>9:16 Shorts</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatioMode("LANDSCAPE_16_9")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 font-mono text-xs border transition ${
                  aspectRatioMode === "LANDSCAPE_16_9"
                    ? "border-sky-500 bg-sky-500/20 text-sky-300 font-semibold shadow-sm shadow-sky-500/20"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>16:9 Landscape</span>
              </button>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer font-mono p-1">
              <input
                type="checkbox"
                checked={autoRenderMp4}
                onChange={(e) => setAutoRenderMp4(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
              />
              <span>Auto-Render MP4 Video (1080x1920 @ 30fps)</span>
            </label>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300 font-mono">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-1">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full h-12 gap-2 font-mono text-sm tracking-wide bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20 active:opacity-90 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  MEMPROSES PIPELINE...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  LAUNCH 5-AGENT GENERATOR
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  // 2. Live 5-Agent DAG Orchestrator Card
  const dagCardNode = (
    <Card className="border-slate-800 bg-slate-950/95">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <CardTitle className="text-sm sm:text-base font-mono">
              LIVE DAG ORCHESTRATOR
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
              className="font-mono text-[10px]"
            >
              {activeJob.status}
            </Badge>
          )}
        </div>
        <CardDescription className="truncate text-xs">
          {activeJob
            ? `Job: ${activeJob.jobId} — "${activeJob.topic}"`
            : "Pilih topik untuk memantau status worker secara real-time."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {activeJob ? (
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">PROGRESS KESELURUHAN</span>
              <span className="text-sky-400 font-bold">
                {activeJob.progressPercent}%
              </span>
            </div>
            <Progress value={activeJob.progressPercent} className="h-2" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-4 text-center space-y-3">
            <Activity className="h-7 w-7 text-sky-400 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Belum Ada Job Pipeline Aktif
              </h3>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Masukkan topik pertanyaan atau pilih contoh topik di tab Input untuk melihat proses 5 agent secara real-time.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => scrollToSection("section-input")}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-bold cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Mulai Buat Video
            </Button>
          </div>
        )}

        {/* 5 Sub-Agent Nodes (Compact Mobile Layout) */}
        <div className="space-y-2">
          {AGENT_PIPELINE_META.map((agent) => {
            const Icon = agent.icon;
            const stepState = activeJob?.steps?.[agent.key] ?? "PENDING";

            return (
              <div
                key={agent.key}
                className={`flex items-center justify-between gap-2.5 rounded-lg border p-2.5 transition ${
                  stepState === "ACTIVE"
                    ? "border-sky-500/60 bg-sky-500/10 shadow-sm"
                    : stepState === "COMPLETED"
                      ? "border-emerald-500/35 bg-emerald-500/5"
                      : stepState === "FAILED"
                        ? "border-rose-500/40 bg-rose-500/10"
                        : "border-slate-800/90 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-sky-400 shrink-0">
                        {agent.code}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {agent.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
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
                  className="shrink-0 text-[10px] font-mono px-2 py-0.5"
                >
                  {stepState}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Direct Studio CTA Button */}
        {activeJob && (
          <div className="pt-1">
            <Button
              variant="default"
              className="w-full h-11 gap-2 font-mono text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40"
              onClick={() => router.push(`/studio/${activeJob.jobId}`)}
            >
              <Video className="h-4 w-4 text-sky-400" />
              <span>BUKA STUDIO VIDEO PLAYER</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 3. Real-Time Worker Logs Card
  const logsCardNode = (
    <Card className="border-slate-800 bg-slate-950/95">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <CardTitle className="text-xs sm:text-sm font-mono">
              REAL-TIME WORKER LOGS
            </CardTitle>
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] text-slate-400">
            {activeJob?.logs.length ?? 0} events
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-64 overflow-y-auto rounded-lg border border-slate-800 bg-[#05080F] p-3 font-mono text-xs space-y-2">
          {activeJob?.logs && activeJob.logs.length > 0 ? (
            activeJob.logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-2 border-b border-slate-900/80 pb-1.5 leading-relaxed"
              >
                <span className="text-slate-500 shrink-0 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                </span>
                <span
                  className={`shrink-0 font-bold text-[11px] ${
                    log.level === "SUCCESS"
                      ? "text-emerald-400"
                      : log.level === "ERROR"
                        ? "text-rose-400"
                        : "text-sky-400"
                  }`}
                >
                  [{log.agent}]
                </span>
                <span className="text-slate-200 break-words text-[11px]">
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 text-xs text-center p-4">
              Menunggu event log dari BullMQ agent...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // 4. Recent Jobs Queue Card
  const queueCardNode = (
    <Card className="border-slate-800 bg-slate-950/95">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-xs sm:text-sm font-mono">
              ANTREAN & HASIL RENDER
            </CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {jobs.length} JOBS
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-64 overflow-y-auto space-y-2 pr-0.5">
          {jobs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-6 text-center space-y-3">
              <p className="font-mono text-xs text-slate-400">
                Belum ada job antrean. Coba buat video pertama Anda!
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => scrollToSection("section-input")}
                  className="font-mono text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Buat Video Sekarang
                </Button>
                <Button asChild variant="outline" size="sm" className="font-mono text-xs">
                  <Link href="/studio/demo-battery-200w">
                    Demo Studio
                  </Link>
                </Button>
              </div>
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
                    // Smooth scroll to pipeline section to see selected job details
                    scrollToSection("section-pipeline");
                  }}
                  className={`cursor-pointer rounded-lg border p-2.5 sm:p-3 transition ${
                    isSelected
                      ? "border-sky-500/60 bg-sky-500/10 shadow-sm"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[11px] font-bold text-sky-400 truncate">
                      {job.jobId}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={
                          job.status === "COMPLETED"
                            ? "success"
                            : job.status === "FAILED"
                              ? "destructive"
                              : "default"
                        }
                        className="text-[10px] font-mono px-1.5 py-0.5"
                      >
                        {job.status} ({job.progressPercent}%)
                      </Badge>
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 font-mono text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/studio/${job.jobId}`}>
                          Studio
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-200 line-clamp-1">
                    {job.topic}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 relative pb-12 sm:pb-8">
      {/* Isometric Engineering Grid Background (-z-10 prevents hit-test interception in Safari) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1E293B 1px, transparent 1px),
            linear-gradient(to bottom, #1E293B 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Mobile-First Navigation Header (Solid bg prevents Safari backdrop-filter hit-test bug) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090D16] pt-safe">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 shadow-inner shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider text-sky-400">
                  PABRIK VIDEO
                </span>
                <Badge variant="success" className="text-[9px] sm:text-[10px] px-1.5 py-0 font-mono">
                  ANATOMY ISO
                </Badge>
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Kitabedah Generator
              </h1>
            </div>
          </div>

          {/* Quick Action Badges / Demo Link */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-slate-300 text-[11px]">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>OMNIROUTE</span>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs gap-1.5 font-mono">
              <Link href="/studio/demo-battery-200w">
                <Play className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">Demo Studio</span>
                <span className="sm:hidden">Demo</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Quick-Jump Nav Bar (Sticky under header, smoothly scrolls to section) */}
        <div className="lg:hidden border-t border-slate-800/80 px-3.5 py-2 bg-[#090D16]">
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => scrollToSection("section-input")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-sky-300 active:bg-slate-800 shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>Input</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-pipeline")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-sky-300 active:bg-slate-800 shrink-0 cursor-pointer"
            >
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span>Pipeline</span>
              {activeJob && activeJob.status !== "COMPLETED" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-logs")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-sky-300 active:bg-slate-800 shrink-0 cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Logs</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-queue")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-sky-300 active:bg-slate-800 shrink-0 cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Riwayat ({jobs.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: 1 Single Page Responsive Dashboard */}
      <main className="relative z-10 mx-auto max-w-7xl px-3.5 sm:px-6 py-4 sm:py-6 pb-16">
        <div className="space-y-6">
          {/* Top Section: Input Topik Form & Live DAG Orchestrator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div id="section-input" className="lg:col-span-7 scroll-mt-28">
              {inputCardNode}
            </div>
            <div id="section-pipeline" className="lg:col-span-5 scroll-mt-28">
              {dagCardNode}
            </div>
          </div>

          {/* Bottom Section: Real-Time Worker Logs & Recent Jobs Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div id="section-logs" className="lg:col-span-6 scroll-mt-28">
              {logsCardNode}
            </div>
            <div id="section-queue" className="lg:col-span-6 scroll-mt-28">
              {queueCardNode}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
