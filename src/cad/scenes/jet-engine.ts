import * as THREE from "three";
import type { CadSceneModule } from "../contract";
import {
  Assembly,
  axisLine,
  bladeRing,
  blueprintGrid,
  blueprintMaterials,
  createFlow,
  latheShell,
  makeRuntime,
  mulberry32,
  type Profile,
} from "../kit";

/** Fixture referensi: turbofan, potret mesin jet. Contoh kualitas target untuk scene hasil LLM. */
const COWL: Profile = [[-4, 1.5], [-3.4, 1.58], [-1.5, 1.5], [0.5, 1.2], [2.5, 0.95], [4.2, 0.55]];
const CORE: Profile = [[-2.3, 0.62], [-1.5, 0.7], [0, 0.62], [1.2, 0.72], [2.8, 0.74], [4.2, 0.45]];

export const jetEngine: CadSceneModule = {
  meta: {
    id: "jet-engine",
    title: "TURBOFAN",
    subtitle: "POTONGAN A–A · SKALA 1:24",
    radius: 4.6,
    crossRadius: 1.6,
    parts: [
      { id: "fan", label: "FAN // N1", anchor: [-3.6, 1.3, 0], labelDy: -0.05 },
      { id: "lpc", label: "LPC (3 TAHAP)", anchor: [-2.4, 0.55, 0], labelDy: 0.04 },
      { id: "hpc", label: "HPC (6 TAHAP) // N2", anchor: [-0.8, 0.45, 0], labelDy: -0.045 },
      { id: "combustor", label: "RUANG BAKAR", anchor: [0.45, 0.55, 0], hot: true, labelDy: 0.05 },
      { id: "hpt", label: "TURBIN HP", anchor: [1.4, 0.45, 0], hot: true, labelDy: -0.05 },
      { id: "lpt", label: "TURBIN LP", anchor: [2.5, 0.6, 0], hot: true, labelDy: 0.045 },
      { id: "nozzle", label: "NOSEL BUANG", anchor: [3.9, 0.3, 0], labelDy: -0.04 },
      { id: "bypass", label: "ALIRAN BYPASS", anchor: [-1, 1.4, 0], labelDy: -0.035 },
    ],
  },

  build({ clip, seed }) {
    const rng = mulberry32(seed);
    const mats = blueprintMaterials(clip);
    const asm = new Assembly();
    const X = (x: number): [number, number, number] => [x * 0.55, 0, 0];
    const at = (x: number): [number, number, number] => [x, 0, 0];
    const N1 = 1.2;
    const N2 = 3.4;

    asm.root.add(
      latheShell(mats, COWL, { glass: [0x2a7fff, 0.1], wire: [0x4fd8ff, 0.22] }),
      latheShell(mats, CORE, { glass: [0x4fd8ff, 0.08], wire: [0x6fe6ff, 0.3] }),
    );

    // Fan + hidung
    asm.add("fan", bladeRing(mats, { rootRadius: 0.3, tipRadius: 1.45, count: 24, chord: 0.42, thickness: 0.035, pitch: 0.7, color: 0x4fd8ff, emissive: 0x0b3a52 }), { position: at(-3.6), spin: N1, explodeOffset: X(-3.6) });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 32), mats.solid(0x8fdcff, 0x0b3a52));
    nose.rotation.z = Math.PI / 2;
    const noseGroup = new THREE.Group();
    noseGroup.add(nose);
    asm.add("fan", noseGroup, { position: at(-4.15), spin: N1, explodeOffset: X(-4.15) });

    // LPC: 3 tahap rotor + stator
    [-2.7, -2.4, -2.1].forEach((x, i) => {
      asm.add("lpc", bladeRing(mats, { rootRadius: 0.3, tipRadius: 0.62 - i * 0.02, count: 36, chord: 0.14, thickness: 0.03, pitch: 0.55, color: 0x3aa0ff, emissive: 0x0a2850 }), { position: at(x), spin: N1, explodeOffset: X(x) });
      asm.add("lpc", bladeRing(mats, { rootRadius: 0.3, tipRadius: 0.6 - i * 0.02, count: 30, chord: 0.1, thickness: 0.02, pitch: -0.5, color: 0x1f5a9a, emissive: 0x061a30 }), { position: at(x + 0.13), explodeOffset: X(x + 0.13) });
    });

    // HPC: 6 tahap
    for (let i = 0; i < 6; i++) {
      const x = -1.4 + i * 0.22;
      asm.add("hpc", bladeRing(mats, { rootRadius: 0.28, tipRadius: 0.52 - i * 0.025, count: 44, chord: 0.1, thickness: 0.025, pitch: 0.5, color: 0x5a7bff, emissive: 0x101c52 }), { position: at(x), spin: N2, explodeOffset: X(x) });
      asm.add("hpc", bladeRing(mats, { rootRadius: 0.28, tipRadius: 0.5 - i * 0.025, count: 36, chord: 0.07, thickness: 0.02, pitch: -0.45, color: 0x35509a, emissive: 0x0a1230 }), { position: at(x + 0.11), explodeOffset: X(x + 0.11) });
    }

    // Ruang bakar: liner, 18 nozzle bahan bakar, inti api
    const combustor = new THREE.Group();
    const linerGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.9, 48, 1, true);
    const liner = new THREE.Mesh(linerGeometry, mats.glass(0xff9a3c, 0.14));
    const linerWire = new THREE.Mesh(linerGeometry, mats.wire(0xffb15c, 0.35));
    liner.rotation.z = linerWire.rotation.z = Math.PI / 2;
    combustor.add(liner, linerWire);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 10), mats.solid(0xffc65a, 0x6a3a00));
      nozzle.rotation.z = -Math.PI / 2;
      nozzle.position.set(-0.38, 0.56 * Math.cos(a), 0.56 * Math.sin(a));
      combustor.add(nozzle);
    }
    const flameMaterial = mats.additive(0xff7a1c, 0.4);
    const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.8, 32, 1, true), flameMaterial);
    flame.rotation.z = Math.PI / 2;
    combustor.add(flame);
    asm.add("combustor", combustor, { position: at(0.45), explodeOffset: X(0.45) });

    // Turbin HP (2) dan LP (4)
    [1.25, 1.5].forEach((x) =>
      asm.add("hpt", bladeRing(mats, { rootRadius: 0.3, tipRadius: 0.5, count: 40, chord: 0.1, thickness: 0.03, pitch: 0.6, color: 0xff8a3c, emissive: 0x5a2400 }), { position: at(x), spin: N2, explodeOffset: X(x) }),
    );
    [1.95, 2.28, 2.61, 2.94].forEach((x, i) =>
      asm.add("lpt", bladeRing(mats, { rootRadius: 0.3, tipRadius: 0.62 + i * 0.02, count: 44, chord: 0.13, thickness: 0.03, pitch: 0.55, color: 0xff5a4a, emissive: 0x4a1410 }), { position: at(x), spin: N1, explodeOffset: X(x) }),
    );

    // Poros dan kerucut buang
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.6, 16), mats.solid(0xffc65a, 0x4a3000));
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.2;
    asm.root.add(shaft);
    const plugGeometry = new THREE.ConeGeometry(0.42, 1.6, 32, 1, true);
    const plug = new THREE.Group();
    const plugGlass = new THREE.Mesh(plugGeometry, mats.glass(0x8fdcff, 0.18));
    const plugWire = new THREE.Mesh(plugGeometry, mats.wire(0x8fdcff, 0.35));
    plugGlass.rotation.z = plugWire.rotation.z = -Math.PI / 2;
    plug.add(plugGlass, plugWire);
    asm.add("nozzle", plug, { position: at(3.8), explodeOffset: X(3.8) });

    asm.root.add(blueprintGrid(-1.9), axisLine(6));
    const flow = createFlow({ count: 900, rng, xMin: -5, xMax: 4.6, cowl: COWL, core: CORE, hotFrom: -0.2, hotSpan: 1.2, clip });
    asm.root.add(flow.points);

    return makeRuntime(jetEngine.meta, asm, ({ t }) => {
      flameMaterial.opacity = 0.32 + 0.1 * Math.sin(t * 20) + 0.05 * Math.sin(t * 47);
      flow.update(t);
    });
  },
};
