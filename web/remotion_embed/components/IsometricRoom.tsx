import React from 'react';

export const COLORS = {
  panas: "#FF3B30",
  dingin: "#0A84FF",
  highlight: "#FFD60A",
  aman: "#30D158",
  stroke: "#111111",
  bg: "#F4F5F7",
  card: "#FFFFFF",
  gray: "#8E8E93"
};

export const IsometricRoom: React.FC<{
  title?: string;
  badge?: string;
  children?: React.ReactNode;
}> = ({ title, badge = "BEDAH TEKNIS", children }) => {
  return (
    <div className="relative w-full h-full bg-[#F4F5F7] flex flex-col justify-between p-8 font-sans overflow-hidden">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#111111 1px, transparent 1px), linear-gradient(90deg, #111111 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Header Label */}
      <div className="relative z-10 flex items-center justify-between border-b-2 border-[#111111] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 rounded-full bg-[#FF3B30] border-2 border-[#111111]" />
          <span className="font-extrabold tracking-widest text-[#111111] text-2xl uppercase">
            {badge}
          </span>
        </div>
        <div className="px-4 py-1.5 bg-[#FFD60A] border-2 border-[#111111] font-black text-xl text-[#111111] rounded shadow-[3px_3px_0px_#111111]">
          ISO 30°
        </div>
      </div>

      {/* Isometric Canvas Center */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-6">
        {children}
      </div>

      {/* Lower Safe Area Warning / Footer Info */}
      <div className="relative z-10 flex flex-col items-center justify-center mb-8">
        {title && (
          <div className="bg-white border-2 border-[#111111] px-6 py-2.5 rounded-lg shadow-[4px_4px_0px_#111111] mb-4">
            <span className="text-[#111111] font-black text-2xl tracking-wide uppercase">
              {title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
