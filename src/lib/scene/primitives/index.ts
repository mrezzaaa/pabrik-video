import * as THREE from "three";
import { createFan, FanProps } from "./fan";
import { createCylinder, CylinderProps } from "./cylinder";
import { createCone, ConeProps } from "./cone";
import { createTorus, TorusProps } from "./torus";
import { createChamber, ChamberProps } from "./chamber";
import { createBox, BoxProps } from "./box";
import { GeometryType } from "../types";

export * from "./fan";
export * from "./cylinder";
export * from "./cone";
export * from "./torus";
export * from "./chamber";
export * from "./box";

export const primitives: Record<
  GeometryType,
  (params: any) => THREE.Group
> = {
  fan: (p: FanProps) => createFan(p),
  cylinder: (p: CylinderProps) => createCylinder(p),
  cone: (p: ConeProps) => createCone(p),
  torus: (p: TorusProps) => createTorus(p),
  chamber: (p: ChamberProps) => createChamber(p),
  box: (p: BoxProps) => createBox(p),
};
