import * as THREE from "three";

export type CADArchetype =
  | "AXISYMMETRIC_MACHINE"
  | "STRATIFIED_INFRASTRUCTURE"
  | "STRUCTURAL_ARCHITECTURE"
  | "MULTI_AXIS_MECHATRONICS"
  | "CONTINUUM_PHENOMENON";

export type SubAssemblyCategory =
  | "shell"
  | "core"
  | "rotor"
  | "structure"
  | "thermal"
  | "electronics";

export interface CADHelpers {
  createCADPart: (
    geometry: THREE.BufferGeometry,
    opts?: {
      fillColor?: number;
      edgeColor?: number;
      opacity?: number;
      isShell?: boolean;
      edgeThreshold?: number;
      clippingPlanes?: THREE.Plane[];
    }
  ) => THREE.Group;
  clipPlane: THREE.Plane;
}

export interface SubAssemblySpec {
  id: string;
  label: string;
  stationCode: string;
  category: SubAssemblyCategory;
  basePosition: [number, number, number];
  explodeOffset: [number, number, number];
  rotationSpeed?: number; // radians per frame
  rotationAxis?: "x" | "y" | "z";
  metrics?: string;
  isShell?: boolean;
  buildGeometry: (group: THREE.Group, helpers: CADHelpers) => void;
}

export interface CADBlueprintPhase {
  phaseId: number | string;
  title: string;
  label?: string;
  duration?: number;
  durationInFrames?: number;
  audioUrl?: string;
  narration?: string;
  activeStationCode?: string;
  telemetryChannels?: Array<{
    name: string;
    value: string | number;
    unit?: string;
  }>;
}

export interface CADBlueprintConfig {
  videoTitle: string;
  subtitle?: string;
  archetype: CADArchetype;
  params?: Record<string, any>;
  phases: CADBlueprintPhase[];
  customAssemblies?: Array<{
    id: string;
    label: string;
    stationCode: string;
    category: SubAssemblyCategory;
    basePosition?: [number, number, number];
    explodeOffset?: [number, number, number];
    rotationSpeed?: number;
    rotationAxis?: "x" | "y" | "z";
    metrics?: string;
    isShell?: boolean;
  }>;
}
