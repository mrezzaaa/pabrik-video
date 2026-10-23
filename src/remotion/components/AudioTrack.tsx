import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { PhaseTimelineBlock } from "@/schemas/video-blueprint";

interface AudioTrackProps {
  phases: PhaseTimelineBlock[];
}

function resolveAudioSrc(audioUrl: string): string {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  const cleanRelative = audioUrl.replace(/^\/+/, "");
  return staticFile(cleanRelative);
}

export const AudioTrack: React.FC<AudioTrackProps> = ({ phases }) => {
  return (
    <>
      {phases.map((phase) => {
        if (!phase.audioUrl) return null;
        const src = resolveAudioSrc(phase.audioUrl);
        if (!src) return null;

        return (
          <Sequence
            key={`audio_seq_${phase.segmentIndex}`}
            from={phase.startFrame}
            durationInFrames={phase.durationInFrames}
          >
            <Audio src={src} volume={1.0} />
          </Sequence>
        );
      })}
    </>
  );
};
