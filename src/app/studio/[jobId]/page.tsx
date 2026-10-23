"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Player } from "@remotion/player";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Download,
  Film,
  Layers,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { BedahVideoComposition } from "@/remotion/compositions/BedahVideoComposition";
import { buildDefaultCompositionProps } from "@/remotion/default-props";
import type {
  RemotionCompositionProps,
  VideoJobState,
} from "@/schemas/video-blueprint";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function StudioJobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId || "demo-tumbler-job";

  const [jobState, setJobState] = useState<VideoJobState | null>(null);
  const [compositionProps, setCompositionProps] =
    useState<RemotionCompositionProps>(() => buildDefaultCompositionProps());
  const [jsonEditorText, setJsonEditorText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isTriggeringRender, setIsTriggeringRender] = useState(false);
  const [isSavingJson, setIsSavingJson] = useState(false);

  // Sync JSON editor when compositionProps updates
  useEffect(() => {
    setJsonEditorText(JSON.stringify(compositionProps, null, 2));
  }, [compositionProps]);

  // Subscribe to SSE updates for real jobs
  useEffect(() => {
    if (jobId === "demo-tumbler-job") return;

    const es = new EventSource(`/api/jobs?jobId=${jobId}&stream=1`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as VideoJobState;
        setJobState(data);
        if (data.compositionProps) {
          setCompositionProps(data.compositionProps);
        }
      } catch {
        // ignore parse error
      }
    };
    return () => es.close();
  }, [jobId]);

  const handleApplyJsonChanges = async () => {
    setJsonError(null);
    setIsSavingJson(true);
    try {
      const parsed = JSON.parse(jsonEditorText) as RemotionCompositionProps;
      setCompositionProps(parsed);

      if (jobId !== "demo-tumbler-job") {
        await fetch("/api/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            action: "UPDATE_PROPS",
            compositionProps: parsed,
          }),
        });
      }
    } catch (err) {
      setJsonError(
        err instanceof Error ? err.message : "Format JSON tidak valid"
      );
    } finally {
      setIsSavingJson(false);
    }
  };

  const handleTriggerRender = async () => {
    if (isTriggeringRender) return;
    setIsTriggeringRender(true);
    try {
      await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          action: "TRIGGER_RENDER",
        }),
      });
    } finally {
      setIsTriggeringRender(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100">
      {/* Studio Top Bar */}
      <header className="border-b border-slate-800 bg-[#090D16]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5 font-mono">
                <ArrowLeft className="h-3.5 w-3.5" />
                Factory Dashboard
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-400">
                  REMOTION STUDIO // {jobId}
                </span>
                <Badge variant="default">
                  {compositionProps.width}x{compositionProps.height} @{" "}
                  {compositionProps.fps}FPS
                </Badge>
              </div>
              <h1 className="text-sm font-semibold text-slate-200 line-clamp-1">
                {compositionProps.topic}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {jobState?.outputMp4Url && (
              <a
                href={jobState.outputMp4Url}
                download={`${jobId}-kitabedah.mp4`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" size="sm" className="gap-1.5 font-mono">
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  Download 1080p MP4
                </Button>
              </a>
            )}

            {jobId !== "demo-tumbler-job" && (
              <Button
                size="sm"
                onClick={handleTriggerRender}
                disabled={
                  isTriggeringRender || jobState?.status === "RENDERING_MP4"
                }
                className="gap-1.5 font-mono"
              >
                {jobState?.status === "RENDERING_MP4" || isTriggeringRender ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Rendering MP4 ({jobState?.progressPercent ?? 90}%)...
                  </>
                ) : (
                  <>
                    <Film className="h-3.5 w-3.5" />
                    Render Final MP4 (Agent 5)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Progress Banner if Job is Still Running */}
        {jobState &&
          jobState.status !== "COMPLETED" &&
          jobState.status !== "READY_FOR_PREVIEW" && (
            <Card className="border-sky-500/40 bg-sky-950/20">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="flex items-center gap-2 text-sky-300 font-semibold">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    PIPELINE ACTIVE: {jobState.status}
                  </span>
                  <span className="text-sky-400 font-bold">
                    {jobState.progressPercent}%
                  </span>
                </div>
                <Progress value={jobState.progressPercent} />
              </CardContent>
            </Card>
          )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Real-Time Remotion Player Preview & Phase Timeline */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-slate-800 bg-slate-950/90 overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Play className="h-4 w-4 text-sky-400" />
                    REAL-TIME @REMOTION/PLAYER PREVIEW
                  </CardTitle>
                  <CardDescription>
                    3-Layer Kitabedah.id Architecture: IsometricStage +
                    TelemetryHUD + PopUpCallout
                  </CardDescription>
                </div>
                <Badge variant="success" className="font-mono">
                  {(compositionProps.durationInFrames / compositionProps.fps).toFixed(1)}s
                  ({compositionProps.durationInFrames} Frames)
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#090D16] shadow-2xl">
                  <Player
                    component={BedahVideoComposition}
                    inputProps={compositionProps}
                    durationInFrames={compositionProps.durationInFrames}
                    fps={compositionProps.fps}
                    compositionWidth={compositionProps.width}
                    compositionHeight={compositionProps.height}
                    style={{
                      width: "100%",
                      aspectRatio:
                        compositionProps.aspectRatioMode === "SHORTS_9_16"
                          ? "9 / 16"
                          : "16 / 9",
                      maxHeight:
                        compositionProps.aspectRatioMode === "SHORTS_9_16"
                          ? 640
                          : undefined,
                    }}
                    controls
                    loop
                  />
                </div>

                {/* 5-Phase Breakdown Cards */}
                <div className="grid grid-cols-5 gap-2">
                  {compositionProps.phases.map((p) => (
                    <div
                      key={p.segmentIndex}
                      className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5 font-mono"
                    >
                      <div className="text-[10px] font-bold text-sky-400">
                        0{p.segmentIndex + 1} // {p.phaseType}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-200 truncate mt-0.5">
                        {p.phaseTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {p.startFrame}f → {p.endFrame}f
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rendered MP4 Video Player if Completed */}
            {jobState?.outputMp4Url && (
              <Card className="border-emerald-500/40 bg-slate-950/90">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      FINAL RENDERED MP4 OUTPUT (/public/renders/{jobId}/output.mp4)
                    </CardTitle>
                    <a
                      href={jobState.outputMp4Url}
                      download={`${jobId}-kitabedah.mp4`}
                    >
                      <Button size="sm" variant="outline" className="gap-1.5 font-mono">
                        <Download className="h-3.5 w-3.5" />
                        Download MP4
                      </Button>
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <video
                    src={jobState.outputMp4Url}
                    controls
                    className="w-full rounded-lg border border-slate-800"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (5 cols): Multi-Agent Artifact & JSON Inspector */}
          <div className="lg:col-span-5">
            <Card className="border-slate-800 bg-slate-950/90 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-sky-400" />
                    MULTI-AGENT BLUEPRINT & JSON INSPECTOR
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleApplyJsonChanges}
                    disabled={isSavingJson}
                    className="h-7 gap-1.5 font-mono text-xs"
                  >
                    <Save className="h-3.5 w-3.5 text-sky-400" />
                    Apply to Player
                  </Button>
                </div>
                <CardDescription>
                  Inspeksi dan modifikasi langsung skema{" "}
                  <code>RemotionCompositionProps</code>, segmen narasi Ethan
                  1.1x, serta layer isometrik 3D.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="props">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="props">Remotion JSON</TabsTrigger>
                    <TabsTrigger value="script">Script & Callouts</TabsTrigger>
                    <TabsTrigger value="audio">TTS Audio (1.1x)</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Editable RemotionCompositionProps JSON */}
                  <TabsContent value="props" className="space-y-2">
                    {jsonError && (
                      <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 font-mono text-xs text-rose-300">
                        {jsonError}
                      </div>
                    )}
                    <textarea
                      value={jsonEditorText}
                      onChange={(e) => setJsonEditorText(e.target.value)}
                      spellCheck={false}
                      className="h-[520px] w-full rounded-lg border border-slate-800 bg-[#05080F] p-3 font-mono text-xs text-sky-200 focus:border-sky-500 focus:outline-none"
                    />
                  </TabsContent>

                  {/* Tab 2: Script Segments & Callout Specs */}
                  <TabsContent value="script">
                    <div className="h-[520px] overflow-y-auto space-y-3 pr-1">
                      {compositionProps.phases.map((phase) => {
                        const phaseCallouts = compositionProps.callouts.filter(
                          (c) =>
                            c.startFrame >= phase.startFrame &&
                            c.startFrame < phase.endFrame
                        );
                        return (
                          <div
                            key={phase.segmentIndex}
                            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2"
                          >
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="font-bold text-sky-400">
                                PHASE 0{phase.segmentIndex + 1}: {phase.phaseType}
                              </span>
                              <span className="text-slate-400">
                                Frames {phase.startFrame}–{phase.endFrame}
                              </span>
                            </div>
                            <div className="font-mono text-xs font-semibold text-amber-300">
                              {phase.onScreenHeadline}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-200">
                              “{phase.narrationText}”
                            </p>

                            {phaseCallouts.length > 0 && (
                              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                                <div className="font-mono text-[10px] text-slate-400">
                                  POP-UP CALLOUT TRIGGERS:
                                </div>
                                {phaseCallouts.map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded border border-slate-800 bg-slate-950/80 p-2 font-mono text-[11px]"
                                  >
                                    <div className="flex justify-between text-sky-300 font-bold">
                                      <span>{c.label}</span>
                                      <span>{c.value}</span>
                                    </div>
                                    <div className="text-slate-400 text-[10px]">
                                      {c.formulaOrFact} • Anchor ({c.anchor.x},{" "}
                                      {c.anchor.y}) @ Frame {c.startFrame}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Tab 3: UnlimitedTTS Audio Segments */}
                  <TabsContent value="audio">
                    <div className="h-[520px] overflow-y-auto space-y-3 pr-1">
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 font-mono text-xs">
                        <div className="flex items-center gap-2 font-bold text-sky-300">
                          <Mic className="h-4 w-4" />
                          UNLIMITEDTTS.COM CONFIGURATION
                        </div>
                        <div className="mt-1 text-slate-300">
                          Language: <strong>id-ID (Indonesian)</strong> • Voice:{" "}
                          <strong>Ethan (M3)</strong> • Speed:{" "}
                          <strong>1.1x</strong>
                        </div>
                      </div>

                      {compositionProps.phases.map((phase) => (
                        <div
                          key={phase.segmentIndex}
                          className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">
                              Segment 0{phase.segmentIndex + 1} ({phase.phaseType})
                            </span>
                            <span className="text-emerald-400">
                              {(phase.durationInFrames / compositionProps.fps).toFixed(2)}s
                              ({phase.durationInFrames} frames)
                            </span>
                          </div>
                          {phase.audioUrl ? (
                            <audio
                              src={phase.audioUrl}
                              controls
                              className="h-8 w-full"
                            />
                          ) : (
                            <div className="text-[11px] text-slate-400">
                              (Demo Preview Mode — jalankan job di Dashboard untuk
                              menyintesis file MP3 di /public/renders/[jobId]/audio/)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
