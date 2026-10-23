import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export const KaraokeText: React.FC<{
  words: WordTiming[];
  label?: string;
}> = ({ words, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  return (
    <div className="w-full max-w-[900px] flex flex-col items-center justify-center p-6 bg-white/95 border-4 border-[#111111] rounded-2xl shadow-[8px_8px_0px_#111111]">
      {label && (
        <div className="mb-3 px-3 py-1 bg-[#111111] text-white text-base font-extrabold tracking-wider uppercase rounded">
          {label}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-center">
        {words.map((item, idx) => {
          const isActive = currentTime >= item.start && currentTime <= item.end;
          const isPassed = currentTime > item.end;

          return (
            <span
              key={idx}
              className={`text-3xl md:text-4xl font-black tracking-tight transition-all duration-75 px-1.5 py-0.5 rounded ${
                isActive
                  ? 'bg-[#FFD60A] text-[#111111] scale-110 shadow-[2px_2px_0px_#111111] border-2 border-[#111111]'
                  : isPassed
                  ? 'text-[#111111] opacity-90'
                  : 'text-[#8E8E93] opacity-40'
              }`}
              style={{
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {item.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
