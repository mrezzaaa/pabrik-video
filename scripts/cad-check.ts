/**
 * Validasi scene CAD di Node (tanpa WebGL).  npm run cad:check
 * Memeriksa kontrak: part lengkap, deterministik, semua material terpotong clip,
 * explode menggeser part, hasil hingga (tanpa NaN), dan bounding box wajar.
 */
import * as THREE from "three";
import type { CadSceneModule } from "../src/cad/contract";
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
