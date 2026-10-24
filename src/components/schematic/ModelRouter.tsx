"use client";

import React, { useState } from "react";
import { Cpu, Play, Settings2, ShieldCheck, Sparkles } from "lucide-react";

interface ModelRouterProps {
  onSubmit: (topic: string, modelId: string, pexelsApiKey: string) => Promise<void>;
  isLoading: boolean;
}

export const ModelRouter: React.FC<ModelRouterProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState("");
  const [modelId, setModelId] = useState("auto");
  const [customModel, setCustomModel] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    const finalModel = modelId === "custom" ? customModel : modelId;
    await onSubmit(topic, finalModel, pexelsApiKey);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Topic Input */}
      <div>
        <label className="block text-[11px] text-[#38BDF8] uppercase tracking-wider mb-1 font-bold">
          [SYS_INP_01] Video Subject / Topic
        </label>
        <textarea
          rows={2}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Kenapa kapal selam titanium bisa tahan tekanan ribuan meter di dasar palung..."
          className="w-full bg-[#071324] border border-[#38BDF8]/40 focus:border-[#38BDF8] text-[#F0F9FF] text-xs p-2.5 outline-none rounded-none resize-none font-mono placeholder:text-slate-600"
          required
        />
      </div>

      {/* Model Router */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-[#38BDF8] uppercase tracking-wider mb-1 font-bold">
            [ROUTER_MODEL] OmniRoute Model
          </label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full bg-[#071324] border border-[#38BDF8]/40 focus:border-[#38BDF8] text-[#F0F9FF] text-xs p-2 outline-none rounded-none font-mono"
          >
            <option value="auto">auto (OmniRoute Auto-Select)</option>
            <option value="gpt-4o">gpt-4o (High-Precision Director)</option>
            <option value="gpt-4o-mini">gpt-4o-mini (Fast Assembly)</option>
            <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            <option value="custom">Custom Model ID...</option>
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
        <div>
          <label className="block text-[11px] text-[#38BDF8] uppercase tracking-wider mb-1 font-bold">
            Specify Custom Model Name
          </label>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g. llama-3.3-70b-versatile"
            className="w-full bg-[#071324] border border-[#38BDF8]/40 text-[#F0F9FF] text-xs p-2 outline-none rounded-none font-mono"
            required
          />
        </div>
      )}

      {/* Voice Configuration Telemetry confirmation */}
      <div className="p-2.5 bg-[#071324] border border-[#38BDF8]/20 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={14} className="text-[#10B981]" />
          <span className="text-[#94A3B8]">TTS ENGINE:</span>
          <span className="text-[#38BDF8] font-bold">UnlimitedTTS // id-ID</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>VOICE: <strong className="text-white">Ethan</strong></span>
          <span>SPEED: <strong className="text-[#38BDF8]">1.1x</strong></span>
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
            <span>FABRICATING VIDEO ARTIFACT...</span>
          </>
        ) : (
          <>
            <Play size={16} fill="#071324" />
            <span>ENGAGE PIPELINE SEQUENCE</span>
          </>
        )}
      </button>
    </form>
  );
};
