import * as THREE from "three";
import { createFan, FanProps } from "./fan";
import { createCylinder, CylinderProps } from "./cylinder";
import { createCone, ConeProps } from "./cone";
import { createTorus, TorusProps } from "./torus";
import { createBox, BoxProps } from "./box";
import { createPlane, PlaneProps } from "./plane";
import { createRoad, RoadProps } from "./road";
import { createPillar, PillarProps } from "./pillar";
import { createSphere, SphereProps } from "./sphere";
import { createChamber, ChamberProps } from "./chamber";
import { GeometryType } from "../types";

export * from "./fan";
export * from "./cylinder";
export * from "./cone";
export * from "./torus";
export * from "./box";
export * from "./plane";
export * from "./road";
export * from "./pillar";
export * from "./sphere";
export * from "./chamber";

export const primitives: Record<
  GeometryType,
  (params: any) => THREE.Group
> = {
  fan: (p: FanProps) => createFan(p),
  cylinder: (p: CylinderProps) => createCylinder(p),
  cone: (p: ConeProps) => createCone(p),
  torus: (p: TorusProps) => createTorus(p),
  box: (p: BoxProps) => createBox(p),
  plane: (p: PlaneProps) => createPlane(p),
  road: (p: RoadProps) => createRoad(p),
  pillar: (p: PillarProps) => createPillar(p),
  sphere: (p: SphereProps) => createSphere(p),
  chamber: (p: ChamberProps) => createChamber(p),
};
