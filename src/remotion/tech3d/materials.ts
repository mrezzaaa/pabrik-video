import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { PartSpec } from "./types";

/** Bidang clipping bersama; di-update tiap frame oleh TechScene. */
export interface TechPlanes {
  /** pertahankan y <= sweepY  (area yang sudah jadi blueprint solid) */
  keepBelow: THREE.Plane;
  /** pertahankan y >= sweepY  (area yang masih wireframe) */
  keepAbove: THREE.Plane;
  /** potongan melintang: pertahankan x <= c */
  section: THREE.Plane;
}

export function createPlanes(): TechPlanes {
  return {
    keepBelow: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99),
    keepAbove: new THREE.Plane(new THREE.Vector3(0, 1, 0), 99),
    section: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 99),
  };
}

/** X-Ray / ghost shader: tepi menyala (Fresnel), tengah tembus pandang. */
export function createXRayMaterial(color: string, planes: THREE.Plane[]) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 2.4 },
      uBase: { value: 0.07 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <clipping_planes_pars_vertex>
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uBase;
      uniform float uOpacity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        #include <clipping_planes_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        float a = (uBase + f * 0.85) * uOpacity;
        gl_FragColor = vec4(uColor * (0.55 + f * 1.4), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    clipping: true,
  });
  mat.clippingPlanes = planes;
  return mat;
}

export function createEdgeLines(
  geo: THREE.BufferGeometry,
  color: string,
  planes: THREE.Plane[],
  resolution: THREE.Vector2
) {
  const edges = new THREE.EdgesGeometry(geo, 30);
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  const mat = new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth: 2.6,
    resolution,
    transparent: true,
    opacity: 0.95,
  });
  mat.clippingPlanes = planes;
  return new LineSegments2(lg, mat);
}

export function createWireMaterial(color: string, planes: THREE.Plane[]) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    clippingPlanes: planes,
  });
}

/* ------------------------------ geometri part ----------------------------- */

const num = (p: PartSpec, k: string, d: number) =>
  typeof p.params[k] === "number" ? (p.params[k] as number) : d;

export function buildGeometry(part: PartSpec): THREE.BufferGeometry {
  switch (part.kind) {
    case "cylinder": {
      const r = num(part, "r", 1);
      const h = num(part, "h", 1);
      const g = new THREE.CylinderGeometry(r, r, h, 48, 1);
      if (part.params.axis === "x") g.rotateZ(Math.PI / 2);
      if (part.params.axis === "z") g.rotateX(Math.PI / 2);
      return g;
    }
    case "cone": {
      const h = num(part, "h", 1);
      const g = new THREE.CylinderGeometry(
        num(part, "rTop", 0.5),
        num(part, "rBottom", 1),
        h,
        48,
        1,
        false
      );
      if (part.params.axis === "x") g.rotateZ(Math.PI / 2);
      if (part.params.axis === "z") g.rotateX(Math.PI / 2);
      return g;
    }
    case "tube": {
      const ro = num(part, "rOuter", 1);
      const ri = num(part, "rInner", 0.8);
      const h = num(part, "h", 2);
      const pts = [
        new THREE.Vector2(ri, 0),
        new THREE.Vector2(ro, 0),
        new THREE.Vector2(ro, h),
        new THREE.Vector2(ri, h),
        new THREE.Vector2(ri, 0),
      ];
      const g = new THREE.LatheGeometry(pts, 64);
      g.translate(0, -h / 2, 0);
      return g;
    }
    case "box":
      return new THREE.BoxGeometry(
        num(part, "w", 1),
        num(part, "h", 1),
        num(part, "d", 1)
      );
    case "gear": {
      const ro = num(part, "rOuter", 1.2);
      const rr = num(part, "rRoot", 1.0);
      const n = Math.round(num(part, "teeth", 16));
      const depth = num(part, "depth", 0.25);
      const hole = num(part, "hole", 0.3);
      const shape = new THREE.Shape();
      const step = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const a = i * step;
        const pts: Array<[number, number]> = [
          [rr, a],
          [rr, a + step * 0.18],
          [ro, a + step * 0.3],
          [ro, a + step * 0.5],
          [rr, a + step * 0.62],
        ];
        pts.forEach(([r, ang], j) => {
          const x = Math.cos(ang) * r;
          const y = Math.sin(ang) * r;
          if (i === 0 && j === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        });
      }
      shape.closePath();
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, hole, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 24,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    case "sphere": {
      const r = num(part, "r", 0.5);
      return new THREE.SphereGeometry(r, 32, 24);
    }
    case "torus": {
      const r = num(part, "r", 1);
      const tube = num(part, "tube", 0.2);
      return new THREE.TorusGeometry(r, tube, 24, 48);
    }
  }
}
