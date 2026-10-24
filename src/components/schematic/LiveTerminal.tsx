"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal, Code, ArrowDown } from "lucide-react";

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
  const [autoScroll, setAutoScroll] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll only within the terminal container (never scrolling the parent window/mobile viewport)
  useEffect(() => {
    if (tab === "logs" && autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, tab, autoScroll]);

  return (
    <div className="flex flex-col h-full font-mono text-xs">
      {/* Header Bar: Tabs & Controls */}
      <div className="flex items-center justify-between border-b border-[#38BDF8]/20 mb-2 pb-1">
        <div className="flex space-x-1">
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

        {/* Auto-scroll toggle badge */}
        {tab === "logs" && (
          <button
            onClick={() => {
              const next = !autoScroll;
              setAutoScroll(next);
              if (next && containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }}
            className={`flex items-center space-x-1 px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider border rounded transition-colors ${
              autoScroll
                ? "border-[#38BDF8]/60 bg-[#38BDF8]/20 text-[#38BDF8]"
                : "border-slate-700 bg-slate-900/60 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Auto-Scroll to latest log"
          >
            <ArrowDown size={10} className={autoScroll ? "animate-bounce" : ""} />
            <span>Auto-Scroll: {autoScroll ? "ON" : "OFF"}</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div
        ref={containerRef}
        className="flex-1 bg-[#050D1A] border border-[#38BDF8]/20 overflow-y-auto max-h-[420px] rounded"
      >
        {tab === "logs" ? (
          logs.length === 0 ? (
            <div className="p-4 text-slate-600 italic text-[11px]">
              Awaiting worker activation... System telemetry idle.
            </div>
          ) : (
            <div className="w-full">
              {/* Table Header */}
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-3 py-1.5 bg-[#0A192F] border-b border-[#38BDF8]/30 text-[10px] uppercase tracking-wider font-bold text-slate-400 select-none shadow-sm">
                <div className="col-span-3 sm:col-span-2">TIMESTAMP</div>
                <div className="col-span-3 sm:col-span-3">STAGE</div>
                <div className="col-span-6 sm:col-span-7">MESSAGE</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-[#38BDF8]/10">
                {logs.map((log) => {
                  const time = new Date(log.timestamp);
                  const timeStr = isNaN(time.getTime())
                    ? log.timestamp
                    : time.toLocaleTimeString("en-GB", { hour12: false });

                  const isError = log.level === "ERROR";
                  const isWarn = log.level === "WARN";

                  return (
                    <div
                      key={log.id}
                      className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-mono items-start hover:bg-[#38BDF8]/5 transition-colors ${
                        isError ? "bg-red-950/20" : isWarn ? "bg-amber-950/20" : ""
                      }`}
                    >
                      {/* Timestamp Column */}
                      <div className="col-span-3 sm:col-span-2 text-slate-500 select-none truncate font-mono text-[10px] pt-0.5">
                        {timeStr}
                      </div>

                      {/* Stage Column */}
                      <div className="col-span-3 sm:col-span-3 font-semibold select-none truncate">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] rounded tracking-tight border ${
                            isError
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : isWarn
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30"
                          }`}
                        >
                          {log.stage}
                        </span>
                      </div>

                      {/* Message Column */}
                      <div
                        className={`col-span-6 sm:col-span-7 leading-relaxed break-words whitespace-pre-wrap ${
                          isError
                            ? "text-red-400 font-semibold"
                            : isWarn
                            ? "text-amber-300"
                            : "text-slate-200"
                        }`}
                      >
                        {log.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div className="p-3">
            <pre className="text-[11px] text-[#38BDF8] whitespace-pre-wrap font-mono">
              {storyboard
                ? JSON.stringify(storyboard, null, 2)
                : "// Storyboard JSON will appear here after [02_LLM_DIRECTOR] completes."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
