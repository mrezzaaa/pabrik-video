import React from "react";

interface SchematicPanelProps {
  title: string;
  tag: string;
  spec?: string;
  children: React.ReactNode;
  className?: string;
}

export const SchematicPanel: React.FC<SchematicPanelProps> = ({
  title,
  tag,
  spec = "SCALE: 1:1 // CAD",
  children,
  className = "",
}) => {
  return (
    <div
      className={`relative bg-[#0B1D36]/80 backdrop-blur-sm border border-[#38BDF8]/40 p-4 rounded-none flex flex-col ${className}`}
    >
      {/* Corner Crosshairs */}
      <div className="absolute top-0 left-0 -translate-x-[50%] -translate-y-[50%] text-[#38BDF8] text-xs font-mono font-bold select-none pointer-events-none">
        +
      </div>
      <div className="absolute top-0 right-0 translate-x-[50%] -translate-y-[50%] text-[#38BDF8] text-xs font-mono font-bold select-none pointer-events-none">
        +
      </div>
      <div className="absolute bottom-0 left-0 -translate-x-[50%] translate-y-[50%] text-[#38BDF8] text-xs font-mono font-bold select-none pointer-events-none">
        +
      </div>
      <div className="absolute bottom-0 right-0 translate-x-[50%] translate-y-[50%] text-[#38BDF8] text-xs font-mono font-bold select-none pointer-events-none">
        +
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#38BDF8]/20 pb-2 mb-3 select-none">
        <div className="flex items-center space-x-2">
          <span className="text-[#38BDF8] text-xs font-bold tracking-wider">
            [{tag}]
          </span>
          <span className="text-[#F0F9FF] text-xs font-semibold tracking-wide">
            {title}
          </span>
        </div>
        <span className="text-[10px] text-[#38BDF8]/60 font-mono tracking-widest uppercase">
          {spec}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
