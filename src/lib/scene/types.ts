export type GeometryType =
  | "fan"
  | "cylinder"
  | "cone"
  | "torus"
  | "chamber"
  | "box";

export type BehaviorType = "rotate" | "static" | "explode";

export type Vec3 = [number, number, number];

export interface SceneNode {
  id: string;
  name?: string;
  geometry: GeometryType;
  params: Record<string, any>;
  position: Vec3;
  behavior: BehaviorType;
  axis?: "x" | "y" | "z";
}

export interface VideoBlueprint {
  videoTitle?: string;
  themeColor?: string;
  components: Array<{
    id: string;
    name?: string;
    geometry: string;
    params?: Record<string, any>;
    position?: Vec3;
    behavior?: string;
    axis?: "x" | "y" | "z";
  }>;
  phases?: Array<{
    phaseId?: number | string;
    label?: string;
    fromFrame?: number;
    toFrame?: number;
    activeComponentIds: string[];
  }>;
}
