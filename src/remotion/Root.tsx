import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { VideoProps } from "../lib/types";
import { KitabedahVideo, KitabedahVideoProps } from "./KitabedahVideo";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";

const defaultProps: VideoProps = {
  videoTitle: "Blueprint Demo",
  themeColor: "#38BDF8",
  totalDurationInFrames: 300,
  fps: VIDEO_FPS,
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT,
  scenes: [
    {
      sceneId: 1,
      narration: "Ini cara kerja mesin jet turbofan di ketinggian tiga puluh ribu kaki.",
      durationInFrames: 150,
      durationMs: 5000,
      mainVisual: {
        sourceType: "SEARXNG_IMAGE",
        searchQuery: "jet engine turbofan cutaway",
        cameraShot: "XRAY_WIREFRAME_SCAN",
        overlayHeadline: "TURBOFAN CORE",
        callouts: [
          { label: "KOMPRESOR TINGGI", detail: "Tekanan 40:1", x: 38, y: 44 },
          { label: "TURBIN TEKANAN TINGGI", detail: "Suhu 1700°C", x: 68, y: 62 },
        ],
      },
      cutaway: {
        enabled: true,
        triggerAtProgress: 0.5,
        sourceType: "SEARXNG_IMAGE",
        searchQuery: "jet turbine blades combustion",
        cameraShot: "KEN_BURNS_ZOOM_IN",
        graphicOverlay: {
          type: "STAT_COUNTER",
          value: "1700°C",
          label: "Combustion Chamber",
          iconName: "Flame",
        },
      },
      transitionToNext: "FLASH_CUT",
    },
  ],
};

export const SAMPLE_KITABEDAH_PROPS: KitabedahVideoProps = {
  visualStyle: "blueprint",
  blueprint: {
    videoTitle: "JALAN TOL ELEVATED",
    subtitle: "REKAYASA STRUKTUR JALAN LAYANG",
    subjectArchetype: "STRATIFIED_INFRASTRUCTURE",
    cadArchetype: "STRATIFIED_INFRASTRUCTURE",
    visualStyle: "blueprint",
    params: { length: 14, width: 4.2 },
    components: [],
    phases: [
      {
        phaseId: 1,
        title: "Pondasi Pilar Beton",
        label: "Substruktur Penahan Gempa & Bore Pile",
        duration: 4.2,
        durationInFrames: 124,
        activeStationCode: "STA-06",
        audioUrl: "/assets/demo/sample_kitabedah_phase1.mp3",
        narration: "Pilar beton prategang ini menopang seluruh beban jalan tol layang di atas kontur alam yang dinamis.",
        cameraDirection: {
          shotType: "WIDE",
          zoomMultiplier: 1.0,
          explodeFactor: 0.0,
        },
        telemetryChannels: [
          { name: "BEBAN DUKUNG", value: "4,500", unit: "TON" },
          { name: "KEDALAMAN BORE PILE", value: "28", unit: "M" },
        ],
      },
      {
        phaseId: 2,
        title: "Konstruksi Girder Tol",
        label: "Bentang Box Girder Prategang",
        duration: 6.4,
        durationInFrames: 192,
        activeStationCode: "STA-02",
        audioUrl: "/assets/demo/sample_kitabedah_phase2.mp3",
        narration: "Di atas pilar, bentang box girder baja dan beton dirangkai rapat untuk menahan getaran dan gempa bumi.",
        cameraDirection: {
          shotType: "MEDIUM",
          zoomMultiplier: 1.0,
          explodeFactor: 0.2,
        },
        telemetryChannels: [
          { name: "SPAN GIRDER", value: "40", unit: "M" },
          { name: "MUTU BETON", value: "fc 50", unit: "MPa" },
        ],
      },
      {
        phaseId: 3,
        title: "Lapisan Aspal & Marka",
        label: "Simulasi Arus Beban Puncak & Sensor",
        duration: 6.4,
        durationInFrames: 193,
        activeStationCode: "STA-01",
        audioUrl: "/assets/demo/sample_kitabedah_phase3.mp3",
        narration: "Arus kendaraan melaju lancar di atas permukaan jalan dengan pemantauan sensor lalu lintas real time.",
        cameraDirection: {
          shotType: "CLOSE",
          zoomMultiplier: 1.0,
          explodeFactor: 0.0,
        },
        telemetryChannels: [
          { name: "KAPASITAS JALAN", value: "2,400", unit: "KEND/JAM" },
          { name: "STATUS ARUS", value: "LANCAR", unit: "" },
        ],
      },
    ],
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Kitabedah"
        component={KitabedahVideo}
        durationInFrames={450} // 15 detik default @ 30fps
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={SAMPLE_KITABEDAH_PROPS}
        calculateMetadata={({ props }: { props: any }) => {
          let total = 0;
          if (props?.blueprint?.phases) {
            props.blueprint.phases.forEach((p: any) => {
              total += p.durationInFrames || Math.round((p.duration || 5) * VIDEO_FPS);
            });
          }
          return {
            durationInFrames: Math.max(1, total || 450),
          };
        }}
      />
      <Composition
        id="MainVideo"
        component={MainVideo}
        durationInFrames={300}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
      />    </>
  );
};
