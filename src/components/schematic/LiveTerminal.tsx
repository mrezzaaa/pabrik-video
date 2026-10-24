"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal, Code, Layers } from "lucide-react";

interface LiveTerminalProps {
  logs: Array<{
    id: string;
    stage: string;
    level: string;
    message: string;
    timestamp: string;
  }>;
  storyboard?: any;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, storyboard }) => {
  const [tab, setTab] = useState<"logs" | "storyboard">("logs");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "logs") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, tab]);

  return (
    <div className="flex flex-col h-full font-mono text-xs">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#38BDF8]/20 mb-2">
        <button
          onClick={() => setTab("logs")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 border-b-2 text-[11px] font-bold tracking-wider transition-colors ${
            tab === "logs"
              ? "border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Terminal size={13} />
          <span>STDOUT STREAM ({logs.length})</span>
        </button>
        <button
          onClick={() => setTab("storyboard")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 border-b-2 text-[11px] font-bold tracking-wider transition-colors ${
            tab === "storyboard"
              ? "border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Code size={13} />
          <span>JSON STORYBOARD</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#071324] border border-[#38BDF8]/20 p-3 overflow-y-auto max-h-[360px]">
        {tab === "logs" ? (
          <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">
                Awaiting worker activation... System telemetry idle.
              </div>
            ) : (
              logs.map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString();
                return (
                  <div key={log.id} className="flex items-start space-x-2">
                    <span className="text-slate-600 select-none">[{timeStr}]</span>
                    <span
                      className={`font-bold select-none ${
                        log.level === "ERROR"
                          ? "text-[#EF4444]"
                          : log.level === "WARN"
                          ? "text-[#F59E0B]"
                          : "text-[#38BDF8]"
                      }`}
                    >
                      [{log.stage}]
                    </span>
                    <span
                      className={`${
                        log.level === "ERROR"
                          ? "text-[#EF4444]"
                          : "text-slate-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        ) : (
          <pre className="text-[11px] text-[#38BDF8] whitespace-pre-wrap">
            {storyboard
              ? JSON.stringify(storyboard, null, 2)
              : "// Storyboard JSON will appear here after [02_LLM_DIRECTOR] completes."}
          </pre>
        )}
      </div>
    </div>
  );
};
