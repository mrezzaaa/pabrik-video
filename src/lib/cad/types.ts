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

export type ParametricPrimitiveType =
  | "box_housing"
  | "battery_pack_grid"
  | "cylinder_motor_stator"
  | "wheel_axle_assembly"
  | "turbine_rotor_stage"
  | "contoured_shell_body"
  | "structural_frame_chassis"
  | "pcb_stack_module"
  | "high_voltage_cables"
  | "stratified_layer_slab";

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

export interface ComposableAssemblySpec {
  id: string;
  stationCode: string; // e.g. "STA-01"
  label: string; // e.g. "800V LFP Skateboard Battery Pack"
  metrics?: string; // e.g. "Capacity: 75 kWh | Voltage: 800V DC | Mass: 450 kg"
  category: SubAssemblyCategory;
  primitiveType: ParametricPrimitiveType;
  dimensions?: [number, number, number]; // [width/radius, height, length/depth]
  basePosition: [number, number, number];
  baseRotation?: [number, number, number]; // Euler radians [rx, ry, rz]
  explodeOffset: [number, number, number]; // Direction & distance when exploded
  rotationAxis?: "x" | "y" | "z";
  rotationSpeed?: number;
  bladeOrCellCount?: number;
  isShell?: boolean;
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
  archetype?: CADArchetype | string;
  params?: Record<string, any>;
  phases: CADBlueprintPhase[];
  assemblies?: ComposableAssemblySpec[];
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
