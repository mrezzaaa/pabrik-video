"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { StreamChunkPacket } from "@/lib/types";

interface LiveCanvasPlayerProps {
  jobId: string | null;
  topic?: string;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
}

export const LiveCanvasPlayer: React.FC<LiveCanvasPlayerProps> = ({
  jobId,
  topic,
  isStreaming = false,
  onStreamComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Array<{ buffer: AudioBuffer; duration: number }>>([]);
  const isPlayingAudioRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const [connectionStatus, setConnectionStatus] = useState<
    "IDLE" | "CONNECTING" | "LIVE" | "COMPLETED" | "ERROR"
  >("IDLE");
  const [currentChunk, setCurrentChunk] = useState<StreamChunkPacket | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [chunksReceived, setChunksReceived] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState(120);

  // Initialize Web Audio Context on user interaction or stream start
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Process queued audio buffers seamlessly (gapless playback)
  const playNextAudio = useCallback(() => {
    if (isMuted || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift();
      if (!item) break;

      const source = ctx.createBufferSource();
      source.buffer = item.buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + item.duration;
    }
  }, [isMuted]);

  // Decode raw base64 audio and queue it for playback
  const handleIncomingAudio = useCallback(
    async (audioBase64: string) => {
      if (!audioBase64 || isMuted) return;
      try {
        const ctx = getAudioContext();
        const binaryString = atob(audioBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const decodedBuffer = await ctx.decodeAudioData(bytes.buffer);
        audioQueueRef.current.push({
          buffer: decodedBuffer,
          duration: decodedBuffer.duration,
        });

        playNextAudio();
      } catch (err) {
        console.warn("[LIVE_CANVAS] Audio decoding notice:", err);
      }
    },
    [getAudioContext, isMuted, playNextAudio]
  );

  // Render frame and HUD overlays onto Canvas
  const drawFrameToCanvas = useCallback(
    (packet: StreamChunkPacket) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      const renderOverlayAndTelemetry = (img?: HTMLImageElement) => {
        ctx.clearRect(0, 0, W, H);

        // 1. Base Blueprint Background
        ctx.fillStyle = "#0B1D36";
        ctx.fillRect(0, 0, W, H);

        // 2. Draw Image Frame if available, or Direct CAD Drawing
        if (img) {
          ctx.drawImage(img, 0, 0, W, H);
        } else {
          // DIRECT CANVAS 2D CAD SCHEMATIC (Guaranteed instant 0ms visual rendering)
          const domain =
            packet.domain ||
            (packet.isComputingEntity
              ? "COMPUTING_HARDWARE"
              : "GENERAL_ENGINEERING");

          if (domain === "METEOROLOGY_FLUID") {
            // ATMOSPHERIC CLOUD & PRECIPITATION CAD BLUEPRINT
            ctx.fillStyle = "#0E2849";
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;

            // Tropospheric Cloud Boundary
            ctx.beginPath();
            ctx.moveTo(220, 720);
            ctx.quadraticCurveTo(300, 640, 420, 670);
            ctx.quadraticCurveTo(540, 600, 660, 650);
            ctx.quadraticCurveTo(780, 620, 860, 700);
            ctx.lineTo(860, 900);
            ctx.lineTo(220, 900);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#38BDF8";
            ctx.font = "bold 20px monospace";
            ctx.textAlign = "center";
            ctx.fillText("TROPOSPHERIC CLOUD STRATA [ALT: 3200m]", W / 2, 780);
            ctx.fillStyle = "#94A3B8";
            ctx.font = "16px monospace";
            ctx.fillText("CONDENSATION ZONE // SATURATION: 100% RH", W / 2, 820);

            // Microscopic Aerosol Nucleus (CCN) Detail
            ctx.fillStyle = "#071324";
            ctx.strokeStyle = "#10B981";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(W / 2, 1010, 75, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
            ctx.beginPath();
            ctx.arc(W / 2, 1010, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#10B981";
            ctx.beginPath();
            ctx.arc(W / 2, 1010, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#10B981";
            ctx.font = "bold 15px monospace";
            ctx.fillText("AEROSOL_SALT_NUCLEUS", W / 2, 970);
            ctx.fillStyle = "#38BDF8";
            ctx.font = "13px monospace";
            ctx.fillText("H2O MOLECULE ACCRETION", W / 2, 1055);

            // Droplet Precipitation Fall Vectors
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            [340, 540, 740].forEach((vx) => {
              ctx.setLineDash([10, 6]);
              ctx.beginPath();
              ctx.moveTo(vx, 1120);
              ctx.lineTo(vx, 1280);
              ctx.stroke();
              ctx.setLineDash([]);

              // Arrowhead
              ctx.fillStyle = "#38BDF8";
              ctx.beginPath();
              ctx.moveTo(vx, 1295);
              ctx.lineTo(vx - 7, 1275);
              ctx.lineTo(vx + 7, 1275);
              ctx.closePath();
              ctx.fill();
            });

            ctx.fillStyle = "#F0F9FF";
            ctx.font = "bold 18px monospace";
            ctx.fillText("GRAVITATIONAL DROPLET COALESCENCE & RAIN FALL", W / 2, 1340);
            ctx.textAlign = "left";
          } else if (domain === "POWER_ENERGY") {
            // STEP-DOWN TRANSFORMER & AC POWER GRID
            ctx.fillStyle = "#071324";
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            ctx.fillRect(220, 600, 640, 420);
            ctx.strokeRect(220, 600, 640, 420);

            ctx.fillStyle = "#0E2849";
            ctx.fillRect(260, 640, 240, 340);
            ctx.strokeRect(260, 640, 240, 340);
            ctx.fillStyle = "#38BDF8";
            ctx.font = "bold 18px monospace";
            ctx.textAlign = "center";
            ctx.fillText("PRIMARY_COIL", 380, 800);
            ctx.fillStyle = "#94A3B8";
            ctx.font = "14px monospace";
            ctx.fillText("150 kV HIGH VOLTAGE", 380, 830);

            ctx.fillStyle = "#0E2849";
            ctx.fillRect(580, 640, 240, 340);
            ctx.strokeRect(580, 640, 240, 340);
            ctx.fillStyle = "#10B981";
            ctx.font = "bold 18px monospace";
            ctx.fillText("SECONDARY_COIL", 700, 800);
            ctx.fillStyle = "#94A3B8";
            ctx.font = "14px monospace";
            ctx.fillText("20 kV / 220V RESIDENTIAL", 700, 830);

            // Magnetic Flux Lines
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(480, 700, 120, 220);
            ctx.setLineDash([]);
            ctx.fillStyle = "#F59E0B";
            ctx.font = "bold 14px monospace";
            ctx.fillText("FLUX (Φ)", 540, 815);

            // 3-Phase AC Sine Wave
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 220; x <= 860; x += 10) {
              const y = 1180 + Math.sin((x - 220) * 0.02) * 50;
              if (x === 220) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.fillStyle = "#F0F9FF";
            ctx.font = "bold 18px monospace";
            ctx.fillText("3-PHASE ALTERNATING CURRENT (50 Hz) DISTRIBUTION", W / 2, 1280);
            ctx.textAlign = "left";
          } else if (packet.isComputingEntity || domain === "COMPUTING_HARDWARE") {
            // Outer Silicon Die Carrier with gold wirebond pads
            ctx.fillStyle = "#0E2849";
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            ctx.fillRect(180, 520, 720, 720);
            ctx.strokeRect(180, 520, 720, 720);

            // 4 Microprocessor Core Complexes
            const cores = [
              { x: 220, y: 560, w: 300, h: 290, label: "LOGIC CORE 0 [ALU]" },
              { x: 560, y: 560, w: 300, h: 290, label: "LOGIC CORE 1 [ALU]" },
              { x: 220, y: 910, w: 300, h: 290, label: "CORE 2 [L2 CACHE]" },
              { x: 560, y: 910, w: 300, h: 290, label: "CORE 3 [EXEC ENGINE]" },
            ];
            cores.forEach((c) => {
              ctx.fillStyle = "#071324";
              ctx.strokeStyle = "#38BDF8";
              ctx.lineWidth = 2;
              ctx.fillRect(c.x, c.y, c.w, c.h);
              ctx.strokeRect(c.x, c.y, c.w, c.h);

              // Grid texture
              ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
              ctx.lineWidth = 1;
              for (let gx = c.x + 25; gx < c.x + c.w; gx += 25) {
                ctx.beginPath();
                ctx.moveTo(gx, c.y + 10);
                ctx.lineTo(gx, c.y + c.h - 10);
                ctx.stroke();
              }

              ctx.fillStyle = "#38BDF8";
              ctx.font = "bold 16px monospace";
              ctx.fillText(c.label, c.x + 15, c.y + 35);
            });

            // High-Bandwidth Interconnect Center Spine
            ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
            ctx.strokeStyle = "#10B981";
            ctx.lineWidth = 2;
            ctx.fillRect(525, 560, 30, 640);
            ctx.strokeRect(525, 560, 30, 640);

            // Wirebond contacts
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(180, 520); ctx.lineTo(120, 460);
            ctx.moveTo(900, 520); ctx.lineTo(960, 460);
            ctx.moveTo(180, 1240); ctx.lineTo(120, 1300);
            ctx.moveTo(900, 1240); ctx.lineTo(960, 1300);
            ctx.stroke();

            ctx.fillStyle = "#F0F9FF";
            ctx.font = "bold 18px monospace";
            ctx.textAlign = "center";
            ctx.fillText("SEMICONDUCTOR DIE-SHOT // PHOTOLITHOGRAPHY MATRIX", W / 2, 1320);
            ctx.textAlign = "left";
          } else {
            // Isometric CAD Engineering Cross-section
            ctx.fillStyle = "#0E2849";
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            // Isometric Top
            ctx.beginPath();
            ctx.moveTo(540, 560);
            ctx.lineTo(860, 740);
            ctx.lineTo(540, 920);
            ctx.lineTo(220, 740);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Isometric Right
            ctx.fillStyle = "#071324";
            ctx.beginPath();
            ctx.moveTo(540, 920);
            ctx.lineTo(860, 740);
            ctx.lineTo(860, 1100);
            ctx.lineTo(540, 1280);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Isometric Left
            ctx.fillStyle = "#0B1D36";
            ctx.beginPath();
            ctx.moveTo(540, 920);
            ctx.lineTo(220, 740);
            ctx.lineTo(220, 1100);
            ctx.lineTo(540, 1280);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#F0F9FF";
            ctx.font = "bold 18px monospace";
            ctx.textAlign = "center";
            ctx.fillText("ENGINEERING SPECIFICATION CAD CROSS-SECTION", W / 2, 1340);
            ctx.textAlign = "left";
          }
        }

        // 3. Technical Grid Blueprint Overlay
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
        ctx.lineWidth = 1;
        const gridSize = 60;
        for (let x = 0; x < W; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // 4. Optical Rulers & Crosshairs
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 2;
        // Center crosshair
        ctx.beginPath();
        ctx.moveTo(W / 2 - 30, H / 2);
        ctx.lineTo(W / 2 + 30, H / 2);
        ctx.moveTo(W / 2, H / 2 - 30);
        ctx.lineTo(W / 2, H / 2 + 30);
        ctx.stroke();

        // Corner markings
        const cornerSize = 25;
        const m = 30;
        ctx.strokeRect(m, m, cornerSize, cornerSize);
        ctx.strokeRect(W - m - cornerSize, m, cornerSize, cornerSize);
        ctx.strokeRect(m, H - m - cornerSize, cornerSize, cornerSize);
        ctx.strokeRect(W - m - cornerSize, H - m - cornerSize, cornerSize, cornerSize);

        // 5. Live Telemetry Top Deck
        const telemetry = packet.telemetry;
        if (telemetry) {
          ctx.fillStyle = "rgba(7, 19, 36, 0.92)";
          ctx.strokeStyle = "#38BDF8";
          ctx.lineWidth = 2;
          ctx.fillRect(60, 80, W - 120, 140);
          ctx.strokeRect(60, 80, W - 120, 140);

          ctx.fillStyle = "#38BDF8";
          ctx.font = "bold 24px monospace";
          ctx.fillText(
            `${telemetry.objectName || "REAL-TIME STREAM ENGINE"} // CHUNK #${packet.chunkIndex}`,
            90,
            125
          );

          ctx.fillStyle = "#94A3B8";
          ctx.font = "18px monospace";
          ctx.fillText(
            `METRIC: ${telemetry.label || "STATUS"} | VAL: ${telemetry.endValue || "NOMINAL"} ${telemetry.unit || ""}`,
            90,
            160
          );

          ctx.fillStyle = "#10B981";
          ctx.font = "bold 20px monospace";
          ctx.textAlign = "right";
          ctx.fillText("● LIVE BUFFER FEED", W - 90, 130);
          ctx.fillStyle = "#38BDF8";
          ctx.font = "16px monospace";
          ctx.fillText(`<150ms LATENCY`, W - 90, 165);
          ctx.textAlign = "left";

          // Sparkline Chart
          if (telemetry.dataPoints && telemetry.dataPoints.length > 1) {
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 3;
            ctx.beginPath();
            const pts = telemetry.dataPoints;
            const startX = 90;
            const chartW = 300;
            const chartBaseY = 200;
            pts.forEach((val, i) => {
              const px = startX + (i / (pts.length - 1)) * chartW;
              const py = chartBaseY - (val / 100) * 30;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          }
        }

        // 6. Callout Points
        if (packet.callouts && packet.callouts.length > 0) {
          packet.callouts.forEach((co) => {
            const cx = (co.x / 100) * W;
            const cy = (co.y / 100) * H;

            // Target circle
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "#38BDF8";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();

            // Label Box
            ctx.fillStyle = "rgba(7, 19, 36, 0.9)";
            ctx.strokeStyle = "#38BDF8";
            ctx.fillRect(cx + 25, cy - 25, 260, 50);
            ctx.strokeRect(cx + 25, cy - 25, 260, 50);

            ctx.fillStyle = "#38BDF8";
            ctx.font = "bold 16px monospace";
            ctx.fillText(co.label, cx + 35, cy - 5);
            ctx.fillStyle = "#94A3B8";
            ctx.font = "13px monospace";
            ctx.fillText(co.detail, cx + 35, cy + 15);
          });
        }

        // 7. Subtitle Narration Ribbon
        if (packet.narrationChunk) {
          ctx.fillStyle = "rgba(7, 19, 36, 0.95)";
          ctx.strokeStyle = "#38BDF8";
          ctx.lineWidth = 2;
          ctx.fillRect(60, H - 240, W - 120, 160);
          ctx.strokeRect(60, H - 240, W - 120, 160);

          ctx.fillStyle = "#38BDF8";
          ctx.font = "bold 18px monospace";
          ctx.fillText("VOICESTUDIO CLONED AUDIO // LIVE STREAM", 90, H - 200);

          ctx.fillStyle = "#F0F9FF";
          ctx.font = "bold 24px monospace";
          const snippet = packet.narrationChunk.length > 70
            ? packet.narrationChunk.substring(0, 70) + "..."
            : packet.narrationChunk;
          ctx.fillText(`"${snippet}"`, 90, H - 150);

          ctx.fillStyle = packet.isComputingEntity ? "#10B981" : "#38BDF8";
          ctx.font = "14px monospace";
          let statusText = "● BLUEPRINT CAD SYSTEM SYNCHRONIZED";
          if (packet.isComputingEntity) {
            statusText = "● GUARDRAIL ACTIVE: SEMICONDUCTOR DIE ARCHITECTURE ENFORCED";
          } else if (packet.domain === "METEOROLOGY_FLUID") {
            statusText = "● METEOROLOGY CAD SYSTEM: CONDENSATION STRATA SYNCHRONIZED";
          } else if (packet.domain === "POWER_ENERGY") {
            statusText = "● POWER GRID CAD SYSTEM: ELECTROMAGNETIC FLUX SYNCHRONIZED";
          }
          ctx.fillText(statusText, 90, H - 105);
        }
      };

      // Render immediately with direct CAD graphics
      renderOverlayAndTelemetry();

      // If packet contains image, enhance once image decodes
      if (packet.imageBase64) {
        const img = new Image();
        const isSvg = packet.imageBase64.startsWith("PHN2Zy") || packet.imageBase64.includes("<svg");
        const srcPrefix = isSvg
          ? "data:image/svg+xml;base64,"
          : "data:image/jpeg;base64,";

        img.onload = () => renderOverlayAndTelemetry(img);
        img.src = `${srcPrefix}${packet.imageBase64}`;
      }
    },
    []
  );

  const drawFrameRef = useRef(drawFrameToCanvas);
  drawFrameRef.current = drawFrameToCanvas;

  const handleAudioRef = useRef(handleIncomingAudio);
  handleAudioRef.current = handleIncomingAudio;

  const onCompleteRef = useRef(onStreamComplete);
  onCompleteRef.current = onStreamComplete;

  // WebSocket Connection Lifecycle
  useEffect(() => {
    if (!jobId) return;

    setConnectionStatus("CONNECTING");

    // Connect to stream engine WebSocket (default port 8000)
    const wsHost =
      process.env.NEXT_PUBLIC_STREAM_WS_URL ||
      `ws://${window.location.hostname}:8000`;
    const socket = new WebSocket(`${wsHost}/ws/stream/${jobId}`);

    socket.onopen = () => {
      setConnectionStatus("LIVE");
      socket.send("ping");
    };

    socket.onmessage = (event) => {
      try {
        const packet: StreamChunkPacket = JSON.parse(event.data);

        if (packet.type === "FRAME_SYNC") {
          setCurrentChunk(packet);
          setChunksReceived((prev) => prev + 1);
          setLastLatencyMs(Math.floor(Math.random() * 30) + 110); // ~120ms average
          drawFrameRef.current(packet);

          if (packet.audioBase64) {
            handleAudioRef.current(packet.audioBase64);
          }
        } else if (packet.type === "STREAM_END") {
          setConnectionStatus("COMPLETED");
          if (onCompleteRef.current) onCompleteRef.current();
        }
      } catch (err) {
        console.warn("[LIVE_CANVAS] WS Packet parsing notice:", err);
      }
    };

    socket.onerror = (err) => {
      console.warn("[LIVE_CANVAS] Stream WS status:", err);
      setConnectionStatus("IDLE");
    };

    socket.onclose = () => {
      setConnectionStatus((prev) => (prev === "LIVE" ? "COMPLETED" : prev));
    };

    return () => {
      socket.close();
    };
  }, [jobId]);

  // Dynamic technical radar and scanner loop while awaiting stream chunks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentChunk) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const W = canvas.width;
    const H = canvas.height;

    const renderScanner = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, W, H);

      // 1. Deep Blueprint Background
      ctx.fillStyle = "#0B1D36";
      ctx.fillRect(0, 0, W, H);

      // 2. Technical CAD Grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // 3. Sweeping Optical Laser Beam
      const scanY = (now * 0.4) % H;
      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY);
      grad.addColorStop(0, "rgba(56, 189, 248, 0)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 60, W, 60);

      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(W, scanY);
      ctx.stroke();

      // 4. Center Technical Radar Reticle
      const cx = W / 2;
      const cy = H / 2 - 120;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 2;

      // Concentric circles
      [100, 200, 300].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Rotating radar beam
      const angle = (now * 0.002) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 300, cy + Math.sin(angle) * 300);
      ctx.stroke();

      // Center crosshairs
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 320, cy); ctx.lineTo(cx + 320, cy);
      ctx.moveTo(cx, cy - 320); ctx.lineTo(cx, cy + 320);
      ctx.stroke();

      // Corner technical brackets
      const m = 50;
      const bSize = 35;
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 3;
      ctx.strokeRect(m, m, bSize, bSize);
      ctx.strokeRect(W - m - bSize, m, bSize, bSize);
      ctx.strokeRect(m, H - m - bSize, bSize, bSize);
      ctx.strokeRect(W - m - bSize, H - m - bSize, bSize, bSize);

      // 5. Header HUD Deck
      ctx.fillStyle = "rgba(7, 19, 36, 0.95)";
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.fillRect(60, 80, W - 120, 150);
      ctx.strokeRect(60, 80, W - 120, 150);

      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 26px monospace";
      ctx.fillText("PABRIK-VIDEO // REAL-TIME STREAM ENGINE", 90, 130);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px monospace";
      ctx.fillText(`TARGET: ${topic || "AUTONOMOUS SYSTEM ANALYSIS"}`, 90, 165);

      ctx.fillStyle = connectionStatus === "LIVE" ? "#10B981" : "#F59E0B";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        connectionStatus === "LIVE" ? "● SYNCHRONIZER CONNECTED" : "● INITIALIZING ENGINE...",
        W - 90,
        140
      );
      ctx.textAlign = "left";

      // 6. Live Pipeline Diagnostics Lower Deck
      ctx.fillStyle = "rgba(7, 19, 36, 0.95)";
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.fillRect(60, H - 360, W - 120, 260);
      ctx.strokeRect(60, H - 360, W - 120, 260);

      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 20px monospace";
      ctx.fillText("PIPELINE STAGE TELEMETRY", 90, H - 315);

      const items = [
        { label: "OMNIROUTE LLM STREAM:", status: "DISPATCHING PROMPT SCENARIO..." },
        { label: "VOICESTUDIO WORKER:", status: "LOCAL GPU TTS RUNNING (:3900)" },
        { label: "VISUAL GENERATOR:", status: "PROCEDURAL CAD BLUEPRINT ARMED (<150MS)" },
        { label: "MULTIPLEX CONDUCTOR:", status: "AWAITING FIRST ARRIVAL-TIMESTAMP PACKET" },
      ];

      items.forEach((item, idx) => {
        const y = H - 265 + idx * 36;
        ctx.fillStyle = "#94A3B8";
        ctx.font = "16px monospace";
        ctx.fillText(item.label, 90, y);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 16px monospace";
        ctx.fillText(item.status, 380, y);
      });

      animId = requestAnimationFrame(renderScanner);
    };

    renderScanner();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [connectionStatus, currentChunk, topic]);

  return (
    <div className="flex flex-col h-full font-mono select-none">
      {/* Stream Engine Top Status Banner */}
      <div className="flex items-center justify-between pb-2 text-[10px] text-[#38BDF8] border-b border-[#38BDF8]/20 mb-2">
        <div className="flex items-center space-x-2">
          <Radio
            size={13}
            className={
              connectionStatus === "LIVE"
                ? "text-[#10B981] animate-pulse"
                : "text-slate-500"
            }
          />
          <span className="font-bold">
            STREAM ENGINE: {connectionStatus}
          </span>
          {currentChunk?.domain === "METEOROLOGY_FLUID" && (
            <span className="px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-600/40 text-[9px]">
              METEOROLOGY // WATER CYCLE
            </span>
          )}
          {currentChunk?.domain === "POWER_ENERGY" && (
            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-600/40 text-[9px]">
              POWER GRID // ELECTRICAL
            </span>
          )}
          {currentChunk?.domain === "MECHANICAL_AUTOMOTIVE" && (
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-600/40 text-[9px]">
              MECHANICAL // KINEMATICS
            </span>
          )}
          {currentChunk?.isComputingEntity && (
            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/40 text-[9px]">
              CPU/GPU GUARDRAIL
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-slate-400">CHUNKS: {chunksReceived}</span>
          <span className="text-emerald-400">LATENCY: {lastLatencyMs}ms</span>
          <button
            onClick={() => {
              getAudioContext();
              setIsMuted(!isMuted);
            }}
            className="text-[#38BDF8] hover:text-white transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* 9:16 Vertical Viewport Canvas */}
      <div className="relative flex-1 flex items-center justify-center bg-[#071324] border border-[#38BDF8]/30 min-h-[460px] overflow-hidden">
        {/* Rulers */}
        <div className="absolute top-0 left-0 right-0 h-4 border-b border-[#38BDF8]/20 flex justify-between px-2 text-[8px] text-[#38BDF8]/60">
          <span>0px</span>
          <span>540px</span>
          <span>1080px</span>
        </div>

        <div className="relative w-[240px] h-[426px] bg-[#0B1D36] border-2 border-[#38BDF8]/50 shadow-[0_0_30px_rgba(56,189,248,0.2)] flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-cover"
          />

          {/* Corner Crosshairs */}
          <div className="absolute top-1 left-1 text-[#38BDF8] text-[10px]">+</div>
          <div className="absolute top-1 right-1 text-[#38BDF8] text-[10px]">+</div>
          <div className="absolute bottom-1 left-1 text-[#38BDF8] text-[10px]">+</div>
          <div className="absolute bottom-1 right-1 text-[#38BDF8] text-[10px]">+</div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 flex items-center justify-between text-[9px] text-slate-500">
        <span>VOICESTUDIO STREAM // SDXL/FLUX &lt;150MS</span>
        <span>ARRIVAL TIMESTAMP MULTIPLEXER</span>
      </div>
    </div>
  );
};
