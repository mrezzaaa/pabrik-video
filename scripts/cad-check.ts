/**
 * Validasi scene CAD di Node (tanpa WebGL).  npm run cad:check
 * Memeriksa kontrak: part lengkap, deterministik, semua material terpotong clip,
 * explode menggeser part, hasil hingga (tanpa NaN), dan bounding box wajar.
 */
import * as THREE from "three";
import { applyCamera } from "../src/cad/camera";
import { type CadSceneModule, DEFAULT_SHOT } from "../src/cad/contract";
import { layoutLabels } from "../src/cad/labels";
import { listCadScenes, getCadScene } from "../src/cad/registry";

function snapshot(root: THREE.Object3D): number[] {
  const out: number[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    out.push(...o.matrixWorld.elements);
    if (o instanceof THREE.Points) {
      out.push(...Array.from(o.geometry.attributes.position.array as Float32Array));
    }
  });
  return out;
}

function check(scene: CadSceneModule): string[] {
  const errors: string[] = [];
  const { meta } = scene;
  const clipA = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const a = scene.build({ clip: clipA, seed: 1 });
  const b = scene.build({ clip: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), seed: 1 });

  a.update({ t: 3.7, explode: 0 });
  b.update({ t: 3.7, explode: 0 });
  const sa = snapshot(a.root);
  const sb = snapshot(b.root);
  if (sa.length !== sb.length || sa.some((v, i) => v !== sb[i])) errors.push("tidak deterministik (seed sama, hasil beda)");
  if (sa.some((v) => !Number.isFinite(v))) errors.push("ada NaN/Infinity pada pose");

  // Material harus memakai clip yang sama dengan ctx.clip
  let unclipped = 0;
  a.root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      if (!(o as THREE.Mesh).isMesh && !(o as THREE.Points).isPoints) continue;
      if (!mat.clippingPlanes?.includes(clipA)) unclipped++;
    }
  });
  if (unclipped) errors.push(`${unclipped} material tidak memakai ctx.clip (cutaway tidak akan memotongnya)`);

  // Part meta: jangkar valid, dalam radius, bisa di-update dan di-explode
  const ids = new Set<string>();
  for (const p of meta.parts) {
    if (ids.has(p.id)) errors.push(`id part ganda: ${p.id}`);
    ids.add(p.id);
    const v = a.anchor(p.id);
    if (!Number.isFinite(v.x + v.y + v.z)) errors.push(`jangkar ${p.id} tidak hingga`);
    if (v.length() > meta.radius * 1.05) errors.push(`jangkar ${p.id} di luar radius model`);
  }
  a.update({ t: 3.7, explode: 1 });
  const moved = meta.parts.filter((p) => a.anchor(p.id).distanceTo(new THREE.Vector3(...p.anchor)) > 1e-6).length;
  if (moved === 0) errors.push("explode tidak menggeser satu part pun");

  // Framing: semua jangkar harus ada di dalam frame 1080x1920, juga saat explode penuh;
  // label tidak boleh saling menimpa atau keluar frame.
  const W = 1080;
  const H = 1920;
  const fontSize = Math.round(W * 0.026);
  for (const explode of [0, 1]) {
    const rt = scene.build({ clip: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), seed: 1 });
    const shot = { ...DEFAULT_SHOT, explode };
    for (const t of [0, 2.5, 5]) {
      rt.update({ t, explode });
      const cam = new THREE.PerspectiveCamera();
      applyCamera(cam, meta, rt, shot, t, W / H);
      const items = meta.parts.map((p) => {
        const v = rt.anchor(p.id).project(cam);
        const dy = p.labelDy ?? -0.04;
        return { id: p.id, text: p.label, x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, side: (dy < 0 ? -1 : 1) as 1 | -1, distance: Math.max(0.035, Math.abs(dy)) * H };
      });
      for (const it of items) {
        if (it.x < 0 || it.x > W || it.y < 0 || it.y > H) errors.push(`explode=${explode} t=${t}: jangkar ${it.id} keluar frame (${Math.round(it.x)},${Math.round(it.y)})`);
      }
      const placed = layoutLabels(items, W, H, fontSize);
      for (const l of placed) {
        if (l.lx - l.w / 2 < 0 || l.lx + l.w / 2 > W || l.ly - l.h / 2 < 0 || l.ly + l.h / 2 > H) errors.push(`explode=${explode} t=${t}: label ${l.id} keluar frame`);
      }
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i];
          const b = placed[j];
          if (Math.abs(a.lx - b.lx) < (a.w + b.w) / 2 && Math.abs(a.ly - b.ly) < (a.h + b.h) / 2) errors.push(`explode=${explode} t=${t}: label ${a.id} menimpa ${b.id}`);
        }
      }
    }
  }

  const box = new THREE.Box3().setFromObject(a.root);
  const size = box.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x + size.y + size.z) || size.length() === 0) errors.push("bounding box kosong/tidak hingga");
  console.log(
    `  ${meta.id}: ${meta.parts.length} part, bbox ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}, ` +
      `${moved}/${meta.parts.length} part bergeser saat explode`,
  );
  return errors;
}

let failed = 0;
for (const id of listCadScenes()) {
  const errs = check(getCadScene(id));
  if (errs.length) {
    failed++;
    console.error(`GAGAL ${id}:\n` + errs.map((e) => `  - ${e}`).join("\n"));
  } else console.log(`OK ${id}`);
}
process.exit(failed ? 1 : 0);
