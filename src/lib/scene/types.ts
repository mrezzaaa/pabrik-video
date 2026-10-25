export type GeometryType =
  | "cylinder"
  | "box"
  | "sphere"
  | "torus"
  | "cone"
  | "plane"
  | "fan"
  | "road"
  | "pillar"
  | "chamber"; // backward compatibility

export type XRayStyle =
  | "xray-blue"
  | "xray-orange"
  | "wireframe-green"
  | "xray-blue-dark"
  | "xray-blue-light";

export type BehaviorType = "rotate" | "static" | "explode" | "cutaway";

export type Vec3 = [number, number, number];

export interface SceneNode {
  id: string;
  name?: string;
  geometry: GeometryType;
  params: Record<string, any>;
  position: Vec3;
  rotation?: Vec3;
  behavior: BehaviorType;
  axis?: "x" | "y" | "z";
  style?: XRayStyle | string;
}

export interface VideoBlueprintComponent {
  id: string;
  name?: string;
  geometryType?: GeometryType | string;
  geometry?: GeometryType | string;
  params?: Record<string, any>;
  style?: XRayStyle | string;
  position3D?: Vec3;
  position?: Vec3;
  rotation3D?: Vec3;
  rotation?: Vec3;
  behavior?: BehaviorType | string;
  axis?: "x" | "y" | "z";
}

export interface VideoBlueprintPhase {
  phaseId?: number | string;
  title?: string;
  label?: string;
  duration?: number;
  durationInFrames?: number;
  activeComponentIds?: string[];
  cameraDirection?: {
    shotType?: "WIDE" | "MEDIUM" | "CLOSE" | "MACRO" | "XRAY_SIDE";
    focusComponentIds?: string[];
    zoomMultiplier?: number;
    explodeFactor?: number;
  };
  objectState?: {
    visibleComponentIds?: string[];
    exploded?: boolean;
    cutawayEnabled?: boolean;
  };
  telemetryChannels?: Array<{
    name: string;
    value: string | number;
    unit?: string;
  }>;
}

export interface VideoBlueprint {
  videoTitle?: string;
  themeColor?: string;
  subjectArchetype?: string;
  visualStyle?: "xray" | "wireframe-green" | "blueprint";
  components: VideoBlueprintComponent[];
  phases?: VideoBlueprintPhase[];
}
