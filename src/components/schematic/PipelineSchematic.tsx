"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, Loader2, AlertCircle, RotateCcw } from "lucide-react";

interface PipelineSchematicProps {
  jobId?: string | null;
  currentStage?: string | null;
  progress: number;
  status: string;
  onRetrySuccess?: () => void;
}

const STAGES = [
  { id: "01_SEARXNG_RECON", label: "01_SEARXNG_RECON", desc: "Fact Extraction" },
  { id: "02_LLM_DIRECTOR", label: "02_LLM_DIRECTOR", desc: "Storyboard Scripting" },
  { id: "03_ETHAN_TTS_SYNC", label: "03_ETHAN_TTS_SYNC", desc: "VoiceStudio Clone" },
  { id: "04_HYBRID_ASSET_DL", label: "04_HYBRID_ASSET_DL", desc: "Optical Assets" },
  { id: "05_REMOTION_RENDER", label: "05_REMOTION_RENDER", desc: "Remotion Engine" },
];

export const PipelineSchematic: React.FC<PipelineSchematicProps> = ({
  jobId,
  currentStage,
  progress,
  status,
  onRetrySuccess,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  const handleRetryFailedStage = async () => {
    if (!jobId || isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        if (onRetrySuccess) onRetrySuccess();
      } else {
        const err = await res.json();
        alert(`Gagal melanjutkan pipeline: ${err.error || "Unknown error"}`);
      }
    } catch (e: any) {
      alert(`Error retry: ${e.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Progress Bar & Retry Action */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] text-[#38BDF8]">
          <span>PIPELINE LOAD PROGRESS:</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-[#071324] border border-[#38BDF8]/30 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 relative ${
              status === "FAILED" ? "bg-[#EF4444]" : "bg-[#38BDF8]"
            }`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Retry Button if Stage Failed */}
      {status === "FAILED" && jobId && (
        <div className="p-2.5 bg-red-950/40 border border-red-500/50 rounded flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-400 text-xs">
            <AlertCircle size={14} className="shrink-0 animate-pulse" />
            <span className="text-[11px]">
              Pipeline terhenti di stage: <strong>{currentStage || "UNKNOWN"}</strong>
            </span>
          </div>
          <button
            onClick={handleRetryFailedStage}
            disabled={isRetrying}
            className="flex items-center space-x-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-[11px] font-bold rounded tracking-wider shadow transition-all disabled:opacity-50"
          >
            <RotateCcw size={12} className={isRetrying ? "animate-spin" : ""} />
            <span>{isRetrying ? "RESUMING..." : "RETRY STAGE"}</span>
          </button>
        </div>
      )}

      {/* DAG Stages */}
      <div className="space-y-2 pt-1">
        {STAGES.map((stage, idx) => {
          let stageStatus: "pending" | "active" | "completed" | "failed" = "pending";

          if (status === "FAILED") {
            if (idx === currentStageIndex) stageStatus = "failed";
            else if (idx < currentStageIndex) stageStatus = "completed";
          } else if (status === "COMPLETED") {
            stageStatus = "completed";
          } else if (currentStageIndex === idx) {
            stageStatus = "active";
          } else if (currentStageIndex > idx) {
            stageStatus = "completed";
          }

          return (
            <div
              key={stage.id}
              className={`p-2.5 border transition-all flex items-center justify-between text-xs ${
                stageStatus === "active"
                  ? "bg-[#38BDF8]/15 border-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.2)] animate-pulse"
                  : stageStatus === "completed"
                  ? "bg-[#10B981]/10 border-[#10B981]/60 text-slate-300"
                  : stageStatus === "failed"
                  ? "bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]"
                  : "bg-[#071324]/60 border-[#38BDF8]/20 text-slate-500"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {stageStatus === "completed" && (
                  <CheckCircle2 size={15} className="text-[#10B981]" />
                )}
                {stageStatus === "active" && (
                  <Loader2 size={15} className="text-[#38BDF8] animate-spin" />
                )}
                {stageStatus === "failed" && (
                  <AlertCircle size={15} className="text-[#EF4444]" />
                )}
                {stageStatus === "pending" && (
                  <Clock size={15} className="text-slate-600" />
                )}

                <div>
                  <div
                    className={`font-bold ${
                      stageStatus === "active"
                        ? "text-[#38BDF8]"
                        : stageStatus === "completed"
                        ? "text-[#F0F9FF]"
                        : ""
                    }`}
                  >
                    [{stage.label}]
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    {stage.desc}
                  </div>
                </div>
              </div>

              <div className="text-[10px] uppercase font-bold tracking-wider">
                {stageStatus}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
