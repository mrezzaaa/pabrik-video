"use client";

import React from "react";
import { CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";

interface PipelineSchematicProps {
  currentStage?: string | null;
  progress: number;
  status: string;
}

const STAGES = [
  { id: "01_SEARXNG_RECON", label: "01_SEARXNG_RECON", desc: "Fact Extraction" },
  { id: "02_LLM_DIRECTOR", label: "02_LLM_DIRECTOR", desc: "Storyboard Scripting" },
  { id: "03_ETHAN_TTS_SYNC", label: "03_ETHAN_TTS_SYNC", desc: "UnlimitedTTS 1.1x" },
  { id: "04_HYBRID_ASSET_DL", label: "04_HYBRID_ASSET_DL", desc: "Optical Assets" },
  { id: "05_REMOTION_RENDER", label: "05_REMOTION_RENDER", desc: "Remotion Engine" },
];

export const PipelineSchematic: React.FC<PipelineSchematicProps> = ({
  currentStage,
  progress,
  status,
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="space-y-3 font-mono">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-[#38BDF8]">
          <span>PIPELINE LOAD PROGRESS:</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-[#071324] border border-[#38BDF8]/30 overflow-hidden relative">
          <div
            className="h-full bg-[#38BDF8] transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* DAG Stages */}
      <div className="space-y-2 pt-2">
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
