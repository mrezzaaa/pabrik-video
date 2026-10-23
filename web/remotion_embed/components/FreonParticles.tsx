import React from 'react';
import { useCurrentFrame } from 'remotion';

export const FreonParticles: React.FC<{
  count?: number;
  color?: string;
  speed?: number;
}> = ({ count = 16, color = "#0A84FF", speed = 1.5 }) => {
  const frame = useCurrentFrame();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const offset = (i * 360) / count;
        const progress = ((frame * speed + offset) % 300) / 300;
        const yPos = 800 - progress * 400;
        const xPos = 400 + Math.sin((frame * 0.05) + i) * 60 + (i % 4) * 80;
        const opacity = Math.sin(progress * Math.PI);

        return (
          <div
            key={i}
            className="absolute rounded-full border-2 border-[#111111]"
            style={{
              width: 14,
              height: 14,
              backgroundColor: color,
              left: `${xPos}px`,
              top: `${yPos}px`,
              opacity: opacity,
              boxShadow: '2px 2px 0px #111111',
              transform: `scale(${0.8 + opacity * 0.4})`,
            }}
          />
        );
      })}
    </div>
  );
};
