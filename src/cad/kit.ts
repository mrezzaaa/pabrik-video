import * as THREE from "three";
import type { CadFrameState, CadRuntime, CadSceneMeta } from "./contract";

/** RNG ber-seed (mulberry32): hasil sama di setiap worker render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Profil selubung: daftar [x, radius] terurut menurut x. */
export type Profile = ReadonlyArray<readonly [number, number]>;

export function interp(profile: Profile, x: number): number {
  if (x <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    if (x <= profile[i][0]) {
      const t = (x - profile[i - 1][0]) / (profile[i][0] - profile[i - 1][0]);
      return profile[i - 1][1] + t * (profile[i][1] - profile[i - 1][1]);
    }
  }
  return profile[profile.length - 1][1];
}

export interface BlueprintMaterials {
  glass(color: number, opacity: number): THREE.MeshBasicMaterial;
  wire(color: number, opacity: number): THREE.MeshBasicMaterial;
  solid(color: number, emissive: number): THREE.MeshStandardMaterial;
  additive(color: number, opacity: number): THREE.MeshBasicMaterial;
}

/** Material gaya blueprint; semuanya terpotong oleh `clip` (cutaway). */
export function blueprintMaterials(clip: THREE.Plane): BlueprintMaterials {
  const clippingPlanes = [clip];
  return {
    glass: (color, opacity) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        clippingPlanes,
      }),
    wire: (color, opacity) =>
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity,
        clippingPlanes,
      }),
    solid: (color, emissive) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: 0.5,
        metalness: 0.6,
        roughness: 0.35,
        side: THREE.DoubleSide,
        clippingPlanes,
      }),
    additive: (color, opacity) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        clippingPlanes,
      }),
  };
}

/** Cangkang revolusi (nacelle, casing) di sekeliling sumbu X: kaca + wireframe. */
export function latheShell(
  mats: BlueprintMaterials,
  profile: Profile,
  style: { glass: [number, number]; wire: [number, number] },
): THREE.Group {
  const geometry = new THREE.LatheGeometry(
    profile.map(([x, r]) => new THREE.Vector2(r, x)),
    64,
  );
  const group = new THREE.Group();
  for (const material of [
    mats.glass(style.glass[0], style.glass[1]),
    mats.wire(style.wire[0], style.wire[1]),
  ]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = -Math.PI / 2; // sumbu Y lathe -> sumbu X dunia
    group.add(mesh);
  }
  return group;
}

export interface BladeRingOptions {
  rootRadius: number;
  tipRadius: number;
  count: number;
  chord: number;
  thickness: number;
  /** Sudut pitch bilah (rad) terhadap sumbu. */
  pitch: number;
  color: number;
  emissive: number;
}

/** Cincin bilah instanced + cakram rotor, berpusat di x=0 lokal. Putar lewat rotation.x. */
export function bladeRing(
  mats: BlueprintMaterials,
  o: BladeRingOptions,
): THREE.Group {
  const geometry = new THREE.BoxGeometry(
    o.thickness,
    o.tipRadius - o.rootRadius,
    o.chord,
  );
  geometry.rotateY(o.pitch);
  geometry.translate(0, (o.tipRadius - o.rootRadius) / 2 + o.rootRadius, 0);
  const blades = new THREE.InstancedMesh(
    geometry,
    mats.solid(o.color, o.emissive),
    o.count,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < o.count; i++) {
    dummy.rotation.set((i / o.count) * Math.PI * 2, 0, 0);
    dummy.updateMatrix();
    blades.setMatrixAt(i, dummy.matrix);
  }
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(o.rootRadius + 0.02, o.rootRadius + 0.02, 0.05, 40),
    mats.solid(0x10233f, 0x0a1a30),
  );
  disc.rotation.z = Math.PI / 2;
  const group = new THREE.Group();
  group.add(blades, disc);
  return group;
}

export interface AssemblyEntryOptions {
  position: [number, number, number];
  /** Kecepatan putar rotation.x (rad/detik). */
  spin?: number;
  /** Offset posisi saat explode = 1. */
  explodeOffset?: [number, number, number];
}

interface AssemblyEntry {
  group: THREE.Object3D;
  base: THREE.Vector3;
  explode: THREE.Vector3;
  spin: number;
  offset: THREE.Vector3;
}

/** Kumpulan part: posisi dasar, putaran, explode. Beberapa grup boleh berbagi satu part id. */
export class Assembly {
  readonly root = new THREE.Group();
  private entries = new Map<string, AssemblyEntry[]>();

  add(id: string, object: THREE.Object3D, o: AssemblyEntryOptions): void {
    const entry: AssemblyEntry = {
      group: object,
      base: new THREE.Vector3(...o.position),
      explode: new THREE.Vector3(...(o.explodeOffset ?? [0, 0, 0])),
      spin: o.spin ?? 0,
      offset: new THREE.Vector3(),
    };
    object.position.copy(entry.base);
    this.root.add(object);
    const list = this.entries.get(id) ?? [];
    list.push(entry);
    this.entries.set(id, list);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  update(state: CadFrameState): void {
    for (const list of this.entries.values()) {
      for (const e of list) {
        e.offset.copy(e.explode).multiplyScalar(state.explode);
        e.group.position.copy(e.base).add(e.offset);
        if (e.spin) e.group.rotation.x = e.spin * state.t;
      }
    }
  }

  /** Rata-rata offset explode semua entri sebuah part. */
  offsetOf(id: string, out = new THREE.Vector3()): THREE.Vector3 {
    out.set(0, 0, 0);
    const list = this.entries.get(id);
    if (!list?.length) return out;
    for (const e of list) out.add(e.offset);
    return out.multiplyScalar(1 / list.length);
  }
}

export interface FlowOptions {
  count: number;
  rng: () => number;
  xMin: number;
  xMax: number;
  cowl: Profile;
  core: Profile;
  /** x tempat udara mulai memanas (cyan -> oranye). */
  hotFrom: number;
  hotSpan: number;
  clip: THREE.Plane;
}

/** Partikel aliran udara; posisi = fungsi tertutup dari t (tanpa state antar frame). */
export function createFlow(o: FlowOptions): {
  points: THREE.Points;
  update(t: number): void;
} {
  const positions = new Float32Array(o.count * 3);
  const colors = new Float32Array(o.count * 3);
  const span = o.xMax - o.xMin;
  const data = Array.from({ length: o.count }, () => ({
    x0: o.rng() * span,
    f: 0.1 + o.rng() * 0.8,
    core: o.rng() < 0.45,
    a: o.rng() * Math.PI * 2,
    v: 0.8 + o.rng() * 0.8,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      clippingPlanes: [o.clip],
    }),
  );
  points.frustumCulled = false;
  return {
    points,
    update(t) {
      data.forEach((p, i) => {
        const x = o.xMin + ((((p.x0 + p.v * t * 1.3) % span) + span) % span);
        const c = interp(o.core, x);
        const w = interp(o.cowl, x);
        const r = p.core ? c * 0.9 * p.f : c + (w - c) * (0.12 + 0.76 * p.f);
        positions[i * 3] = x;
        positions[i * 3 + 1] = r * Math.sin(p.a);
        positions[i * 3 + 2] = r * Math.cos(p.a);
        const h =
          Math.min(1, Math.max(0, (x - o.hotFrom) / o.hotSpan)) *
          (p.core ? 1 : 0.25);
        colors[i * 3] = 0.3 + 0.7 * h;
        colors[i * 3 + 1] = 0.85 - 0.3 * h;
        colors[i * 3 + 2] = 1 - 0.8 * h;
      });
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

export function blueprintGrid(y: number, size = 26): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, size * 2, 0x1b4a7a, 0x0d2a4a);
  grid.position.y = y;
  const material = grid.material as THREE.Material;
  material.transparent = true;
  material.opacity = 0.55;
  return grid;
}

export function axisLine(halfLength: number): THREE.Line {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfLength, 0, 0),
      new THREE.Vector3(halfLength, 0, 0),
    ]),
    new THREE.LineDashedMaterial({
      color: 0x4fd8ff,
      dashSize: 0.2,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.5,
    }),
  );
  line.computeLineDistances();
  return line;
}

/** Bungkus Assembly + animasi tambahan menjadi CadRuntime. */
export function makeRuntime(
  meta: CadSceneMeta,
  asm: Assembly,
  extra?: (state: CadFrameState) => void,
): CadRuntime {
  const base = new Map(
    meta.parts.map((p) => [p.id, new THREE.Vector3(...p.anchor)]),
  );
  const tmp = new THREE.Vector3();
  return {
    root: asm.root,
    update(state) {
      asm.update(state);
      extra?.(state);
    },
    anchor(id) {
      const b = base.get(id);
      if (!b) throw new Error(`Part tidak dikenal: ${id}`);
      return b.clone().add(asm.offsetOf(id, tmp));
    },
  };
}
