"use client";

import React from "react";
import { Download, Film, Maximize2 } from "lucide-react";

interface RenderBayProps {
  videoUrl?: string | null;
  status: string;
  topic?: string;
}

export const RenderBay: React.FC<RenderBayProps> = ({ videoUrl, status, topic }) => {
  return (
    <div className="flex flex-col h-full font-mono">
      {/* 9:16 Vertical Viewport Container with Technical Ruler Markings */}
      <div className="relative flex-1 flex items-center justify-center bg-[#071324] border border-[#38BDF8]/30 min-h-[460px] overflow-hidden">
        {/* Top Ruler */}
        <div className="absolute top-0 left-0 right-0 h-4 border-b border-[#38BDF8]/20 flex justify-between px-2 text-[8px] text-[#38BDF8]/60 select-none">
          <span>0px</span>
          <span>270px</span>
          <span>540px</span>
          <span>810px</span>
          <span>1080px</span>
        </div>

        {/* Left Ruler */}
        <div className="absolute top-4 left-0 bottom-0 w-4 border-r border-[#38BDF8]/20 flex flex-col justify-between py-2 text-[8px] text-[#38BDF8]/60 select-none">
          <span>0</span>
          <span>480</span>
          <span>960</span>
          <span>1440</span>
          <span>1920</span>
        </div>

        {/* Frame Aspect 9:16 */}
        <div className="relative w-[240px] h-[426px] bg-[#0B1D36] border-2 border-[#38BDF8]/50 shadow-[0_0_30px_rgba(56,189,248,0.15)] flex flex-col items-center justify-center overflow-hidden">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto border border-[#38BDF8]/40 flex items-center justify-center">
                <Film size={22} className="text-[#38BDF8] animate-pulse" />
              </div>
              <div className="text-[10px] text-[#38BDF8] tracking-widest uppercase font-bold">
                OPTICAL SENSOR BAY
              </div>
              <div className="text-[9px] text-slate-500">
                {status === "COMPLETED"
                  ? "VIDEO READY"
                  : status === "FAILED"
                  ? "RENDER FAILED"
                  : "AWAITING RENDER EXECUTION"}
              </div>
            </div>
          )}

          {/* Corner Crosshairs */}
          <div className="absolute top-1 left-1 text-[#38BDF8] text-[10px] select-none">+</div>
          <div className="absolute top-1 right-1 text-[#38BDF8] text-[10px] select-none">+</div>
          <div className="absolute bottom-1 left-1 text-[#38BDF8] text-[10px] select-none">+</div>
          <div className="absolute bottom-1 right-1 text-[#38BDF8] text-[10px] select-none">+</div>
        </div>
      </div>

      {/* Download Action Footer */}
      <div className="pt-3">
        {videoUrl ? (
          <a
            href={videoUrl}
            download={`pabrik-video-${Date.now()}.mp4`}
            className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs uppercase font-bold tracking-widest flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Download size={15} />
            <span>DOWNLOAD MASTER MP4</span>
          </a>
        ) : (
          <button
            disabled
            className="w-full py-2.5 bg-slate-800 text-slate-500 text-xs uppercase font-bold tracking-widest flex items-center justify-center space-x-2 cursor-not-allowed border border-slate-700"
          >
            <Download size={15} />
            <span>STANDBY FOR MP4 OUTPUT</span>
          </button>
        )}
      </div>
    </div>
  );
};
