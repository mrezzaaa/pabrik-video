import React, { useMemo } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import {
  DEFAULT_BEAT_FRAMES,
  TechVideoProps,
  beatStarts,
  compileBeatsToSpec,
} from "../lib/tech-storyboard";
import { TechScene } from "./tech3d/TechScene";
import { SubtitleTrack } from "./SubtitleTrack";

const cleanPath = (p: string) => p.replace(/^\/+/, "").replace(/^public\/+/, "");

/**
 * Satu objek 3D tetap di layar sepanjang video. Tiap beat narasi hanya
 * mengubah kondisinya (wireframe/blueprint, exploded, potongan, sorotan),
 * jadi perpindahan antar beat mulus, tanpa potong-potong gambar.
 */
export const TechVideo: React.FC<TechVideoProps> = (props) => {
  const spec = useMemo(() => compileBeatsToSpec(props), [props]);
  const starts = useMemo(() => beatStarts(props.beats), [props.beats]);

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: "relative",
        backgroundColor: "#071324",
      }}
    >
      <TechScene spec={spec} />
      {props.beats.map((b, i) => (
        <Sequence
          key={b.beatId}
          from={starts[i]}
          durationInFrames={b.durationInFrames ?? DEFAULT_BEAT_FRAMES}
        >
          {b.audioUrl ? <Audio src={staticFile(cleanPath(b.audioUrl))} /> : null}
          <SubtitleTrack
            wordTimestamps={b.wordTimestamps}
            themeColor={props.themeColor}
          />
        </Sequence>
      ))}
    </div>
  );
};
