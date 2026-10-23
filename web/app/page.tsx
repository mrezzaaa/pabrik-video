"use client";

import React, { useState, useRef, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { BedahTemplate } from "../remotion_embed/compositions/BedahTemplate";
import {
  Play,
  Download,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Activity,
  Flame,
  Maximize2,
} from "lucide-react";

interface LogItem {
  node: string;
  message: string;
  timestamp: string;
  data?: any;
}

export default function PabrikBedahPage() {
  const [topic, setTopic] = useState("kenapa freon ac gak habis");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "beats" | "facts">(
    "preview",
  );
  const [serviceStatus, setServiceStatus] = useState<{
    searxng?: { online: boolean; label: string };
    piper?: { online: boolean; label: string };
    omniroute?: {
      online: boolean;
      label: string;
      activeModel: string;
      port: string;
    };
  } | null>(null);
  const [currentRunningModel, setCurrentRunningModel] = useState<string | null>(
    null,
  );

  const playerRef = useRef<PlayerRef>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const extractModelFromLogs = (logList: LogItem[]) => {
    for (let i = logList.length - 1; i >= 0; i--) {
      const m = logList[i].message?.match(/dengan\s+([^\s.]+)/i);
      if (m?.[1]) {
        const parts = m[1].split("/");
        return parts[parts.length - 1];
      }
    }
    return null;
  };

  const connectPipelineStream = (url: string) => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const sse = new EventSource(url);
    sseRef.current = sse;

    sse.addEventListener("sync", (event: any) => {
      const snapshot = JSON.parse(event.data);
      if (snapshot.topic) {
        setTopic(snapshot.topic);
      }
      if (Array.isArray(snapshot.logs)) {
        setLogs(snapshot.logs);
        setCurrentRunningModel(
          snapshot.status === "running"
            ? extractModelFromLogs(snapshot.logs)
            : null,
        );
      }
      if (snapshot.result) {
        setPipelineResult(snapshot.result);
      }
      setIsProcessing(snapshot.status === "running");
    });

    sse.addEventListener("log", (event: any) => {
      const item = JSON.parse(event.data);
      setLogs((prev) => [...prev, item]);
      const modelMatch = item.message?.match(/dengan\s+([^\s.]+)/i);
      if (modelMatch?.[1]) {
        const parts = modelMatch[1].split("/");
        setCurrentRunningModel(parts[parts.length - 1]);
      }
    });

    sse.addEventListener("complete", (event: any) => {
      const payload = JSON.parse(event.data);
      setPipelineResult(payload.result);
      setIsProcessing(false);
      setCurrentRunningModel(null);
      sse.close();
    });

    sse.addEventListener("idle", () => {
      setIsProcessing(false);
      sse.close();
    });

    sse.addEventListener("error", (err: any) => {
      console.error("SSE Error:", err);
      setIsProcessing(false);
      setCurrentRunningModel(null);
      sse.close();
    });
  };

  // Fetch real-time status for SearXNG, Piper TTS, and Omniroute
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setServiceStatus(data);
        }
      } catch {
        // ignore network error
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Resume running or completed job automatically on page load / refresh
  useEffect(() => {
    connectPipelineStream("/api/pipeline?mode=resume");
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartBedah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isProcessing) return;

    setIsProcessing(true);
    setLogs([]);
    setPipelineResult(null);

    try {
      connectPipelineStream(
        `/api/pipeline?mode=start&topic=${encodeURIComponent(topic)}`,
      );
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const beats = pipelineResult?.scriptData?.beats || [];
  const wordTimings = pipelineResult?.ttsData?.wordTimings || [];

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#111111] flex flex-col font-sans selection:bg-[#FFD60A] selection:text-[#111111]">
      {/* Top Navigation Bar */}
      <header className="border-b-4 border-[#111111] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_4px_0_#111111]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#FF3B30] border-2 border-[#111111] rounded shadow-[2px_2px_0px_#111111] flex items-center justify-center font-black text-white text-base">
            PB
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              PABRIK BEDAH{" "}
              <span className="text-xs px-2 py-0.5 bg-[#FFD60A] border border-[#111111] rounded font-bold">
                100% GRATIS
              </span>
            </h1>
            <p className="text-xs text-[#8E8E93] font-bold">
              FULL-AUTO EXPLAINER ENGINE // KITABEDAH STYLE
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center gap-2.5 text-xs font-bold border-2 border-[#111111] px-3 py-1.5 rounded-lg bg-[#E5E5EA]">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  serviceStatus?.searxng?.online
                    ? "bg-[#30D158] animate-pulse"
                    : "bg-[#FF3B30]"
                }`}
              />
              <span>{serviceStatus?.searxng?.label || "SearXNG: ..."}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  serviceStatus?.piper?.online ? "bg-[#30D158]" : "bg-[#FFD60A]"
                }`}
              />
              <span>{serviceStatus?.piper?.label || "Piper TTS: ..."}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  serviceStatus?.omniroute?.online
                    ? "bg-[#30D158] animate-pulse"
                    : "bg-[#FF3B30]"
                }`}
              />
              <span>
                {currentRunningModel
                  ? `Omniroute: ${currentRunningModel}`
                  : serviceStatus?.omniroute
                    ? `${serviceStatus.omniroute.label}${serviceStatus.omniroute.port ? ` (:${serviceStatus.omniroute.port})` : ""}`
                    : "Omniroute: Checking..."}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Stream Engine Logs (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col space-y-6">
          {/* Topic Input Card */}
          <div className="bg-white border-4 border-[#111111] rounded-2xl p-6 shadow-[8px_8px_0px_#111111]">
            <form onSubmit={handleStartBedah} className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2 text-[#111111]">
                  Input Topik Mesin / Sains / Teknologi
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: kenapa freon ac gak habis"
                    className="w-full bg-[#F4F5F7] border-3 border-[#111111] rounded-xl px-4 py-3.5 text-lg font-bold text-[#111111] focus:outline-none focus:ring-4 focus:ring-[#FFD60A] transition-all placeholder:text-gray-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)]"
                    disabled={isProcessing}
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-black uppercase px-2 py-1 bg-[#111111] text-white rounded">
                    1 FIELD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTopic("kenapa freon ac gak habis")}
                    className="text-xs font-bold px-3 py-1.5 border border-[#111111] rounded-lg bg-gray-100 hover:bg-[#FFD60A] transition"
                  >
                    AC Freon
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopic("cara kerja transmisi cvt")}
                    className="text-xs font-bold px-3 py-1.5 border border-[#111111] rounded-lg bg-gray-100 hover:bg-[#FFD60A] transition"
                  >
                    Transmisi CVT
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTopic("kenapa pesawat gak mundur sendiri")
                    }
                    className="text-xs font-bold px-3 py-1.5 border border-[#111111] rounded-lg bg-gray-100 hover:bg-[#FFD60A] transition"
                  >
                    Pesawat Terbang
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !topic.trim()}
                  className={`px-8 py-3.5 rounded-xl font-black text-lg uppercase tracking-wider flex items-center space-x-2 border-3 border-[#111111] transition-all shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none ${
                    isProcessing
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-[#FF3B30] text-white hover:bg-[#ff2417]"
                  }`}
                >
                  <Flame
                    className={`w-5 h-5 ${isProcessing ? "animate-spin" : ""}`}
                  />
                  <span>{isProcessing ? "MEMBEDAH..." : "BEDAH SEKARANG"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Streaming LangGraph Log Console */}
          <div className="bg-[#111111] border-4 border-[#111111] rounded-2xl p-5 shadow-[8px_8px_0px_#111111] flex flex-col flex-1 min-h-[380px] text-white font-mono">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#30D158]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#FFD60A]">
                  LIVE ENGINE STREAM (LANGGRAPH JS SSE)
                </span>
              </div>
              <span className="text-xs text-gray-500 font-bold">
                {logs.length} EVENT LOGS
              </span>
            </div>

            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-2.5 text-xs pr-2 scrollbar-thin scrollbar-thumb-gray-800"
            >
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 py-12">
                  <Layers className="w-10 h-10 mb-2 opacity-50" />
                  <p className="font-bold">
                    Mesin siap. Klik tombol "BEDAH SEKARANG" untuk memulai.
                  </p>
                </div>
              ) : (
                logs.map((log, index) => {
                  let badgeBg = "bg-gray-800 text-gray-300";
                  if (log.node === "research")
                    badgeBg = "bg-[#0A84FF] text-white";
                  if (log.node === "script")
                    badgeBg = "bg-[#FFD60A] text-[#111111]";
                  if (log.node === "visual")
                    badgeBg = "bg-purple-600 text-white";
                  if (log.node === "tts")
                    badgeBg = "bg-[#30D158] text-[#111111]";
                  if (log.node === "jury") badgeBg = "bg-[#FF3B30] text-white";
                  if (log.node === "render") badgeBg = "bg-pink-600 text-white";

                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-2.5 animate-fadeIn"
                    >
                      <span className="text-gray-600 select-none text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeBg}`}
                      >
                        {log.node}
                      </span>
                      <span className="text-gray-300 flex-1 leading-relaxed">
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Remotion Player 1080x1920 (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white border-4 border-[#111111] rounded-2xl p-5 shadow-[8px_8px_0px_#111111] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#111111] pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF3B30] border border-[#111111]" />
                <h2 className="font-black text-sm uppercase tracking-wider">
                  PREVIEW REMOTION 9:16 (1080x1920)
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-2.5 py-1 text-xs font-bold rounded border ${
                    activeTab === "preview"
                      ? "bg-[#FFD60A] border-[#111111]"
                      : "bg-gray-100 border-transparent"
                  }`}
                >
                  Player
                </button>
                <button
                  onClick={() => setActiveTab("beats")}
                  className={`px-2.5 py-1 text-xs font-bold rounded border ${
                    activeTab === "beats"
                      ? "bg-[#FFD60A] border-[#111111]"
                      : "bg-gray-100 border-transparent"
                  }`}
                >
                  10 Beat
                </button>
              </div>
            </div>

            {/* Video Player Frame Container (9:16 Ratio) */}
            <div className="relative w-full aspect-[9/16] max-h-[580px] bg-[#111111] border-3 border-[#111111] rounded-xl overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center">
              {activeTab === "preview" ? (
                <Player
                  ref={playerRef}
                  component={BedahTemplate}
                  numberOfSharedAudioTags={15}
                  inputProps={{
                    topic: topic.toUpperCase(),
                    beats: beats.length > 0 ? beats : undefined,
                    metric: pipelineResult?.scriptData?.metric,
                    wordTimings:
                      wordTimings.length > 0 ? wordTimings : undefined,
                    audioUrl: pipelineResult?.ttsData?.audioUrl,
                    sfxTracks: pipelineResult?.sfxTracks,
                  }}
                  durationInFrames={
                    pipelineResult?.renderData?.durationInFrames || 900
                  }
                  compositionWidth={1080}
                  compositionHeight={1920}
                  fps={30}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  controls
                  loop
                />
              ) : (
                <div className="w-full h-full bg-white p-4 overflow-y-auto text-xs space-y-3 font-mono">
                  <h3 className="font-black text-sm uppercase text-[#111111] border-b pb-1">
                    STRUKTUR 10 BEAT NASKAH
                  </h3>
                  {beats.length === 0 ? (
                    <p className="text-gray-400 py-6 text-center">
                      Jalankan bedah untuk melihat naskah 10 beat.
                    </p>
                  ) : (
                    beats.map((b: any) => (
                      <div
                        key={b.beat_number}
                        className="border-l-2 border-[#FFD60A] pl-2 py-1"
                      >
                        <span className="font-bold text-[#FF3B30]">
                          Beat {b.beat_number}: [{b.tulisan_layar}]
                        </span>
                        <p className="text-gray-800 mt-0.5">{b.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Export & Download Controls */}
            <div className="mt-5 pt-4 border-t-2 border-[#111111] flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-bold block">
                  Status Render:
                </span>
                <span className="text-xs font-black uppercase text-[#30D158]">
                  {pipelineResult ? "COMPILATION READY" : "STANDBY"}
                </span>
              </div>

              <a
                href={pipelineResult?.renderData?.videoUrl || "#"}
                download="pabrik-bedah.mp4"
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 border-2 border-[#111111] shadow-[3px_3px_0px_#111111] transition-all ${
                  pipelineResult
                    ? "bg-[#30D158] text-[#111111] hover:bg-[#28b84d]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD MP4 (1080x1920)</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
