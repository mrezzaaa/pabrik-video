import React from "react";
import { Series } from "remotion";
import { VideoProps } from "../lib/types";
import { SceneSequence } from "./SceneSequence";

export const MainVideo: React.FC<VideoProps> = ({
  themeColor = "#38BDF8",
  scenes = [],
}) => {
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: "#071324",
      }}
    >
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence
            key={scene.sceneId}
            durationInFrames={scene.durationInFrames || 150}
          >
            <SceneSequence scene={scene} themeColor={themeColor} />
          </Series.Sequence>
        ))}
      </Series>
    </div>
  );
};
