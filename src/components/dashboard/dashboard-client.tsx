"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clapperboard,
  Factory,
  Film,
  Loader2,
  Radio,
  Sparkles,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import {
  SystemStatus,
  type WorkerInfo,
} from "@/components/dashboard/system-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/components/dashboard/model-selector";
import { VoiceSelector } from "@/components/dashboard/voice-selector";
import {
  JOB_LABELS,
  JOB_TYPES,
  type JobType,
  type ProjectDTO,
} from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const SAMPLE_TOPICS = [
  "5 fakta unik kucing",
  "Mitos tidur 8 jam",
  "Bahaya skincare murah",
  "Fakta gelap media sosial",
];

type Filter = "ALL" | "ACTIVE" | "DONE" | "FAILED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "ACTIVE", label: "Produksi" },
  { key: "DONE", label: "Siap Upload" },
  { key: "FAILED", label: "Gagal" },
];

const STAGE_ICON: Record<JobType, typeof Bot> = {
  research: Radio,
  scriptwriting: Wand2,
  tts: Bot,
  "visual-planning": Clapperboard,
  render: Film,
};

export function DashboardClient({
  initialProjects,
}: {
  initialProjects: ProjectDTO[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [topic, setTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [live, setLive] = useState(true);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const update = () =>
      setClock(
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 1_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/projects/stream");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.addEventListener("projects", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ProjectDTO[];
        setProjects(data);
      } catch {
        // Ignore malformed frames, EventSource will keep retrying.
      }
    });
    return () => source.close();
  }, []);

  useEffect(() => {
    let mounted = true;
    const refreshWorker = async () => {
      try {
        const response = await fetch("/api/worker", { cache: "no-store" });
        const data = (await response.json()) as WorkerInfo;
        if (mounted) setWorkerInfo(data);
      } catch {
        if (mounted) {
          setWorkerInfo({
            worker: { online: false, lastHeartbeat: null },
            queue: {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
            },
          });
        }
      }
    };
    void refreshWorker();
    const timer = setInterval(refreshWorker, 10_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter(
        (project) => project.status !== "DONE" && project.status !== "FAILED",
      ).length,
      done: projects.filter((project) => project.status === "DONE").length,
      failed: projects.filter((project) => project.status === "FAILED").length,
    }),
    [projects],
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return projects;
    if (filter === "ACTIVE") {
      return projects.filter(
        (project) => project.status !== "DONE" && project.status !== "FAILED",
      );
    }
    if (filter === "DONE") {
      return projects.filter((project) => project.status === "DONE");
    }
    return projects.filter((project) => project.status === "FAILED");
  }, [filter, projects]);

  const latest = projects[0];

  async function createProject(nextTopic: string) {
    const clean = nextTopic.trim();
    if (clean.length < 4) {
      setError("Topik minimal 4 karakter. Contoh: 5 fakta unik kucing.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: clean,
          model: selectedModel || undefined,
          voice: selectedVoice || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal membuat project.");
      }

      setProjects((previous) => [data.project as ProjectDTO, ...previous]);
      setTopic("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Gagal membuat project.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1640px] flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="relative grid size-11 place-items-center border border-primary/40 bg-primary/10">
            <Factory className="size-5 text-primary" />
            <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-primary" />
          </div>
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-black tracking-[-0.03em]"
            >
              PABRIK<span className="text-primary">VIDEO</span>
            </Link>
            <div className="label-mono text-muted-foreground">
              FB Pro Reels Factory // v1.0
            </div>
          </div>
        </div>

        <SystemStatus info={workerInfo} />

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="label-mono text-muted-foreground">Factory Clock</div>
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {clock} WIB
            </div>
          </div>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 border border-border bg-black/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                live ? "bg-primary" : "bg-destructive",
              )}
            />
            System Check
          </a>
        </div>
      </header>

      <section className="relative rounded-md border border-border bg-[#08080a]/90">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(57,255,20,0.12),transparent_52%),radial-gradient(ellipse_at_90%_100%,rgba(255,46,147,0.07),transparent_55%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 factory-grid-fine opacity-40"
          />
          <div
            aria-hidden
            className="absolute -right-12 top-1/2 hidden -translate-y-1/2 -rotate-90 font-mono text-[110px] font-black leading-none tracking-[-0.08em] text-white/[0.025] lg:block"
          >
            PABRIK
          </div>
        </div>

        <div className="relative grid gap-0 lg:grid-cols-[1fr_390px]">
          <div className="p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                Input Station // Open
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {formatNumber(counts.all)} reels pernah diproduksi
              </span>
            </div>

            <h1 className="max-w-3xl text-[42px] font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl xl:text-7xl">
              KETIK TOPIK.
              <br />
              <span className="text-primary text-glow">PABRIK JALAN.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Satu topik masuk. Lima agent kerja: riset, naskah viral, voice
              Indonesia, visual plan, lalu render Reels 9:16 siap upload ke FB
              Pro.
            </p>

            <form
              className="mt-7"
              onSubmit={(event) => {
                event.preventDefault();
                void createProject(topic);
              }}
            >
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                    Topik &gt;
                  </span>
                  <Input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Mau bikin konten apa hari ini?"
                    maxLength={200}
                    disabled={creating}
                    className="h-16 border-zinc-700 bg-black/70 pl-[86px] text-base font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:border-primary sm:text-lg"
                  />
                </div>
                <ModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                  disabled={creating}
                />
                <VoiceSelector
                  value={selectedVoice}
                  onChange={setSelectedVoice}
                  disabled={creating}
                />
                <Button
                  type="submit"
                  size="xl"
                  disabled={creating || topic.trim().length < 4}
                  className="h-16 shrink-0 gap-3 px-6 text-xs sm:text-sm"
                >
                  {creating ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Zap className="size-5" />
                  )}
                  {creating ? "Menyalakan..." : "Bikin Pabrik Jalan!"}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="label-mono text-zinc-600">Coba:</span>
                {SAMPLE_TOPICS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setTopic(sample)}
                    className="border border-zinc-800 bg-black/30 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </form>

            {error ? (
              <div className="mt-4 flex items-start gap-2 border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Tutup error"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}
          </div>

          <aside className="border-t border-border bg-black/50 p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="label-mono text-muted-foreground">
                  Production Line
                </div>
                <div className="mt-1 text-sm font-bold uppercase tracking-wide">
                  {latest ? latest.topic.slice(0, 28) : "Standby / No Job"}
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                {latest ? latest.status : "IDLE"}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {JOB_TYPES.map((stage, index) => {
                const job = latest?.jobs.find((item) => item.type === stage);
                const Icon = STAGE_ICON[stage];
                const active = job?.status === "ACTIVE";
                const done = job?.status === "COMPLETED";
                const failed = job?.status === "FAILED";

                return (
                  <div
                    key={stage}
                    className={cn(
                      "flex items-center gap-3 border border-border/70 bg-zinc-950/60 px-3 py-2.5",
                      active && "border-primary/30 bg-primary/[0.04]",
                      failed && "border-destructive/30",
                    )}
                  >
                    <span className="font-mono text-[9px] text-zinc-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon
                      className={cn(
                        "size-3.5",
                        done
                          ? "text-primary"
                          : active
                            ? "animate-pulse text-primary"
                            : failed
                              ? "text-destructive"
                              : "text-zinc-600",
                      )}
                    />
                    <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-400">
                      {JOB_LABELS[stage]}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[8px] uppercase tracking-[0.12em]",
                        done
                          ? "text-primary"
                          : active
                            ? "text-primary"
                            : failed
                              ? "text-destructive"
                              : "text-zinc-700",
                      )}
                    >
                      {done ? "OK" : active ? "RUN" : failed ? "ERR" : "WAIT"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="border border-border bg-black/40 p-3">
                <div className="label-mono text-muted-foreground">Antrean</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {workerInfo?.queue.waiting ?? 0}
                </div>
              </div>
              <div className="border border-border bg-black/40 p-3">
                <div className="label-mono text-muted-foreground">Aktif</div>
                <div className="text-primary mt-1 font-mono text-xl font-bold tabular-nums">
                  {workerInfo?.queue.active ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
              <span>Local First</span>
              <span>No Paid API</span>
              <span>9:16</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Reels",
            value: counts.all,
            icon: Film,
            accent: "text-foreground",
          },
          {
            label: "On Production",
            value: counts.active,
            icon: Clapperboard,
            accent: "text-electric",
          },
          {
            label: "Ready Upload",
            value: counts.done,
            icon: Upload,
            accent: "text-primary",
          },
          {
            label: "Failed Job",
            value: counts.failed,
            icon: AlertTriangle,
            accent: "text-destructive",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between border border-border bg-card/60 px-4 py-3"
          >
            <div>
              <div className="label-mono text-muted-foreground">
                {stat.label}
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-2xl font-black tabular-nums",
                  stat.accent,
                )}
              >
                {String(stat.value).padStart(2, "0")}
              </div>
            </div>
            <stat.icon className={cn("size-5", stat.accent)} />
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  live ? "animate-pulse bg-primary" : "bg-destructive",
                )}
              />
              <span className="label-mono text-muted-foreground">
                {live ? "Live Output Feed" : "Feed Reconnecting"}
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              HASIL PABRIK
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((item) => {
              const count =
                item.key === "ALL"
                  ? counts.all
                  : item.key === "ACTIVE"
                    ? counts.active
                    : item.key === "DONE"
                      ? counts.done
                      : counts.failed;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                    filter === item.key
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-black/30 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300",
                  )}
                >
                  {item.label}
                  <span className="ml-1.5 text-[8px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex min-h-72 flex-col items-center justify-center gap-4 border border-dashed border-zinc-800 bg-black/25 px-6 text-center">
            <div className="grid size-16 place-items-center rounded-full border border-zinc-800 bg-zinc-950">
              <Sparkles className="size-7 text-zinc-600" />
            </div>
            <div>
              <div className="text-lg font-bold">
                {filter === "ALL"
                  ? "Pabrik masih kosong."
                  : "Belum ada output di kategori ini."}
              </div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {filter === "ALL"
                  ? "Ketik topik di Input Station, lalu biarkan 5 agent bekerja sampai MP4 muncul di sini."
                  : "Ganti filter atau mulai produksi baru dari Input Station."}
              </p>
            </div>
            {filter === "ALL" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setTopic("5 fakta unik kucing");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Isi Topik Contoh <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFilter("ALL")}>
                Lihat Semua
              </Button>
            )}
          </div>
        )}
      </section>

      <footer className="mt-12 overflow-hidden border-y border-border bg-black/40">
        <div className="flex w-max animate-ticker whitespace-nowrap py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex">
              {[
                "RESEARCH",
                "SCRIPT",
                "VOICE",
                "VISUAL",
                "RENDER",
                "UPLOAD FB PRO",
                "NO PAID API",
                "LOCAL FIRST",
                "9:16 // 1080×1920",
              ].map((label) => (
                <span key={`${copy}-${label}`} className="mx-5 flex items-center gap-5">
                  <span>{label}</span>
                  <span className="text-primary/50">{"//"}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </footer>

      <div className="mt-5 flex flex-col items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-700 sm:flex-row">
        <span>Pabrik Video // Multi-Agent Reels Engine</span>
        <span>
          Next.js 16 · Remotion 4 · BullMQ · Prisma · Omniroute
        </span>
      </div>
    </main>
  );
}
