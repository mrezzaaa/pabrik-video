"use client";

import React, { useState } from "react";
import { Cpu, Play, Radio, ShieldCheck, Zap } from "lucide-react";
import { isComputingEntity } from "@/lib/prompts";

interface ModelRouterProps {
  onSubmit: (
    topic: string,
    modelId: string,
    pexelsApiKey: string,
    mode: "stream" | "batch"
  ) => Promise<void>;
  isLoading: boolean;
}

export const ModelRouter: React.FC<ModelRouterProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState("");
  const [modelId, setModelId] = useState("groq/openai/gpt-oss-120b");
  const [customModel, setCustomModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [pipelineMode, setPipelineMode] = useState<"stream" | "batch">("stream");

  // Fetch available models dynamically from OmniRoute API
  React.useEffect(() => {
    let isMounted = true;
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.models)) {
            setAvailableModels(data.models);
          }
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        if (isMounted) setIsLoadingModels(false);
      }
    };
    fetchModels();
    return () => {
      isMounted = false;
    };
  }, []);

  const isComputing = isComputingEntity(topic);

  const handleSubmit = async (e: React.FormEvent, modeOverride?: "stream" | "batch") => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    const finalModel = modelId === "custom" ? (customModel.trim() || "auto") : modelId;
    const activeMode = modeOverride || pipelineMode;
    await onSubmit(topic, finalModel, pexelsApiKey, activeMode);
  };

  const recommendedModels = [
    "groq/openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "groq/openai/gpt-oss-20b",
    "ddgw/gpt-5.4-mini",
    "zc/glm-5.3-flash",
  ];

  const filteredModels = React.useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return availableModels;
    return availableModels.filter((m) => m.toLowerCase().includes(q));
  }, [availableModels, modelSearch]);

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
      {/* Pipeline Mode Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#071324] border border-[#38BDF8]/30">
        <button
          type="button"
          onClick={() => setPipelineMode("stream")}
          className={`py-1.5 px-2 flex items-center justify-center space-x-2 text-[10px] font-mono font-bold transition-all ${
            pipelineMode === "stream"
              ? "bg-[#38BDF8] text-[#071324] shadow-[0_0_12px_rgba(56,189,248,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Radio size={12} className={pipelineMode === "stream" ? "animate-pulse" : ""} />
          <span>INSTANT REAL-TIME STREAM</span>
        </button>

        <button
          type="button"
          onClick={() => setPipelineMode("batch")}
          className={`py-1.5 px-2 flex items-center justify-center space-x-2 text-[10px] font-mono font-bold transition-all ${
            pipelineMode === "batch"
              ? "bg-[#38BDF8] text-[#071324]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Play size={12} />
          <span>BATCH REMOTION MP4</span>
        </button>
      </div>

      {/* Topic Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-[#38BDF8] uppercase tracking-wider font-bold">
            [SYS_INP_01] Video Subject / Topic
          </label>
          {isComputing && (
            <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-500/30">
              ● CPU/GPU GUARDRAIL ENGAGED
            </span>
          )}
        </div>
        <textarea
          rows={2}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Arsitektur sirkuit prosesor CPU dan wafer semikonduktor fotolitografi..."
          className="w-full bg-[#071324] border border-[#38BDF8]/40 focus:border-[#38BDF8] text-[#F0F9FF] text-xs p-2.5 outline-none rounded-none resize-none font-mono placeholder:text-slate-600"
          required
        />
      </div>

      {/* Model Router */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-[#38BDF8] uppercase tracking-wider font-bold flex items-center space-x-1.5">
              <span>[ROUTER_MODEL] OmniRoute Model</span>
              {isLoadingModels && (
                <span className="text-[9px] text-[#38BDF8] animate-pulse">
                  (loading...)
                </span>
              )}
            </label>
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search..."
              className="bg-[#050b14] border border-[#38BDF8]/30 focus:border-[#38BDF8] text-[10px] text-[#F0F9FF] px-1.5 py-0.5 outline-none font-mono placeholder:text-slate-600 w-24"
              title="Filter models by keyword"
            />
          </div>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full bg-[#071324] border border-[#38BDF8]/40 focus:border-[#38BDF8] text-[#F0F9FF] text-xs p-2 outline-none rounded-none font-mono"
          >
            {/* Top Option: Custom Model ID */}
            <option value="custom">★ Custom Model ID...</option>
            <option value="auto">auto (OmniRoute Auto-Select)</option>

            {/* Recommended Models */}
            <optgroup label="RECOMMENDED">
              {recommendedModels.map((m) => (
                <option key={`rec_${m}`} value={m}>
                  {m}
                </option>
              ))}
            </optgroup>

            {/* All Fetched OmniRoute Models */}
            {filteredModels.length > 0 && (
              <optgroup label={`OMNIROUTE MODELS (${filteredModels.length})`}>
                {filteredModels
                  .filter((m) => !recommendedModels.includes(m) && m !== "auto")
                  .map((m) => (
                    <option key={`omni_${m}`} value={m}>
                      {m}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-[#38BDF8] uppercase tracking-wider mb-1 font-bold">
            [PEXELS_KEY] B-Roll Video Key
          </label>
          <input
            type="password"
            value={pexelsApiKey}
            onChange={(e) => setPexelsApiKey(e.target.value)}
            placeholder="Optional (Fallback to SearXNG)"
            className="w-full bg-[#071324] border border-[#38BDF8]/40 focus:border-[#38BDF8] text-[#F0F9FF] text-xs p-2 outline-none rounded-none font-mono placeholder:text-slate-600"
          />
        </div>
      </div>

      {modelId === "custom" && (
        <div className="p-2.5 bg-[#050b14] border border-[#f59e0b]/50">
          <label className="block text-[11px] text-[#f59e0b] uppercase tracking-wider mb-1 font-bold">
            Specify Custom Model ID
          </label>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g. anthropic/claude-3-7-sonnet or meta-llama/llama-3.3-70b-instruct"
            className="w-full bg-[#071324] border border-[#f59e0b]/60 focus:border-[#f59e0b] text-[#F0F9FF] text-xs p-2 outline-none rounded-none font-mono placeholder:text-slate-600"
            required
            autoFocus
          />
        </div>
      )}

      {/* Voice Configuration Telemetry confirmation */}
      <div className="p-2.5 bg-[#071324] border border-[#38BDF8]/20 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={14} className="text-[#10B981]" />
          <span className="text-[#94A3B8]">AUDIO STREAM:</span>
          <span className="text-[#38BDF8] font-bold">VoiceStudio // Local Cloned</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>VOICE: <strong className="text-white">reza (aad77d68)</strong></span>
          <span>LATENCY: <strong className="text-[#10B981]">&lt;150ms</strong></span>
        </div>
      </div>

      {/* Dispatch Action Button */}
      <button
        type="submit"
        disabled={isLoading || !topic.trim()}
        className="w-full py-3 bg-[#38BDF8] hover:bg-[#7dd3fc] disabled:bg-slate-700 disabled:text-slate-400 text-[#071324] font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-[0_0_20px_rgba(56,189,248,0.3)]"
      >
        {isLoading ? (
          <>
            <Cpu className="animate-spin" size={16} />
            <span>DISPATCHING EVENT STREAM...</span>
          </>
        ) : pipelineMode === "stream" ? (
          <>
            <Radio size={16} className="text-[#071324]" />
            <span>LAUNCH INSTANT STREAM ENGINE</span>
          </>
        ) : (
          <>
            <Play size={16} fill="#071324" />
            <span>ENGAGE BATCH REMOTION SEQUENCE</span>
          </>
        )}
      </button>
    </form>
  );
};
