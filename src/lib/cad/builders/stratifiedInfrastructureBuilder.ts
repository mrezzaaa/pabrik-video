import * as THREE from "three";
import { SubAssemblySpec } from "../types";

export function buildStratifiedInfrastructure(params: Record<string, any> = {}): SubAssemblySpec[] {
  const roadLength = Number(params.length) || 12;
  const deckWidth = Number(params.width) || 4.2;

  return [
    // 1. Asphalt Wearing Surface & Lane Markings (Shell/Top)
    {
      id: "asphalt_wearing_course",
      label: "SMA Stone Matrix Asphalt Wearing Course",
      stationCode: "STA-01",
      category: "shell",
      isShell: true,
      basePosition: [0, 1.25, 0],
      explodeOffset: [0, 2.4, 0],
      metrics: "THICKNESS: 50mm // HIGH-FRICTION POLYMER BITUMEN",
      buildGeometry: (group, { createCADPart }) => {
        // Road surface slab
        const deckGeo = new THREE.BoxGeometry(deckWidth, 0.12, roadLength);
        group.add(
          createCADPart(deckGeo, {
            fillColor: 0x091c2e,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.35,
          })
        );

        // Guardrails on both sides
        const railLGeo = new THREE.BoxGeometry(0.12, 0.35, roadLength);
        railLGeo.translate(-deckWidth / 2 + 0.1, 0.22, 0);
        group.add(
          createCADPart(railLGeo, {
            fillColor: 0x163450,
            edgeColor: 0x00f0ff,
            isShell: true,
          })
        );
        const railRGeo = new THREE.BoxGeometry(0.12, 0.35, roadLength);
        railRGeo.translate(deckWidth / 2 - 0.1, 0.22, 0);
        group.add(
          createCADPart(railRGeo, {
            fillColor: 0x163450,
            edgeColor: 0x00f0ff,
            isShell: true,
          })
        );

        // Center lane dashes
        for (let z = -roadLength / 2 + 1; z < roadLength / 2; z += 2.2) {
          const dashGeo = new THREE.BoxGeometry(0.12, 0.02, 1.2);
          dashGeo.translate(0, 0.07, z);
          group.add(
            createCADPart(dashGeo, {
              fillColor: 0x224466,
              edgeColor: 0xf59e0b,
            })
          );
        }
      },
    },

    // 2. Precast Concrete Box Girder Deck (Core Structure)
    {
      id: "box_girder_deck",
      label: "Post-Tensioned Concrete Box Girder",
      stationCode: "STA-02",
      category: "structure",
      basePosition: [0, 0.75, 0],
      explodeOffset: [0, 1.4, 0],
      metrics: "COMPRESSIVE STRENGTH: fc 50 MPa // PRESTRESSED",
      buildGeometry: (group, { createCADPart }) => {
        // Trapezoidal/hollow box girder body
        const girderGeo = new THREE.BoxGeometry(deckWidth - 0.4, 0.65, roadLength);
        group.add(
          createCADPart(girderGeo, {
            fillColor: 0x0e2338,
            edgeColor: 0x00f0ff,
            opacity: 0.9,
          })
        );

        // Transverse internal diaphragms
        for (let z = -roadLength / 2 + 2; z < roadLength / 2; z += 3.5) {
          const diaGeo = new THREE.BoxGeometry(deckWidth - 0.6, 0.6, 0.25);
          diaGeo.translate(0, 0, z);
          group.add(
            createCADPart(diaGeo, {
              fillColor: 0x183755,
              edgeColor: 0x00f0ff,
            })
          );
        }
      },
    },

    // 3. Prestressing Tendons & Reinforcing Rebar Grid (Active Structure)
    {
      id: "prestressing_tendons",
      label: "High-Tensile Steel Tendon Matrix & Rebar",
      stationCode: "STA-03",
      category: "rotor",
      basePosition: [0, 0.45, 0],
      explodeOffset: [0, 0.6, 0],
      metrics: "TENSILE STRENGTH: 1,860 MPa // 7-WIRE STRANDS",
      buildGeometry: (group, { createCADPart }) => {
        // Longitudinal parabolic tendon ducts
        const tendonCount = 6;
        for (let i = 0; i < tendonCount; i++) {
          const x = -1.2 + (i / (tendonCount - 1)) * 2.4;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, 0.15, -roadLength / 2),
            new THREE.Vector3(x, -0.15, 0),
            new THREE.Vector3(x, 0.15, roadLength / 2),
          ]);
          const ductGeo = new THREE.TubeGeometry(curve, 24, 0.05, 8, false);
          group.add(
            createCADPart(ductGeo, {
              fillColor: 0x33220a,
              edgeColor: 0xf59e0b,
              opacity: 0.95,
            })
          );
        }

        // Transverse rebar rings
        for (let z = -roadLength / 2 + 0.8; z < roadLength / 2; z += 1.2) {
          const hoopGeo = new THREE.BoxGeometry(deckWidth - 0.8, 0.45, 0.04);
          hoopGeo.translate(0, 0, z);
          group.add(
            createCADPart(hoopGeo, {
              fillColor: 0x223344,
              edgeColor: 0x00f0ff,
              opacity: 0.8,
            })
          );
        }
      },
    },

    // 4. Hammerhead Pier Cap & Elastomeric Bearings (Core)
    {
      id: "pier_cap_bearings",
      label: "Reinforced Pier Cap & Seismic Pot Bearings",
      stationCode: "STA-04",
      category: "core",
      basePosition: [0, -0.1, 0],
      explodeOffset: [0, -0.4, 0],
      metrics: "DESIGN AXIAL LOAD: 8,500 kN // SEISMIC BASE ISOLATION",
      buildGeometry: (group, { createCADPart }) => {
        // T-Shaped hammerhead pier cap
        const capGeo = new THREE.BoxGeometry(3.6, 0.7, 1.4);
        group.add(
          createCADPart(capGeo, {
            fillColor: 0x0f2740,
            edgeColor: 0x00f0ff,
          })
        );

        // Elastomeric bearing pads
        const padLGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.15, 16);
        padLGeo.translate(-1.1, 0.42, 0);
        group.add(
          createCADPart(padLGeo, {
            fillColor: 0x3a1e05,
            edgeColor: 0xf59e0b,
          })
        );
        const padRGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.15, 16);
        padRGeo.translate(1.1, 0.42, 0);
        group.add(
          createCADPart(padRGeo, {
            fillColor: 0x3a1e05,
            edgeColor: 0xf59e0b,
          })
        );
      },
    },

    // 5. Heavy Monolithic Pier Column (Structure)
    {
      id: "pier_column",
      label: "Monolithic Octagonal Pier Column",
      stationCode: "STA-05",
      category: "structure",
      basePosition: [0, -1.6, 0],
      explodeOffset: [0, -1.2, 0],
      metrics: "DIAMETER: 1.8m // SPIRAL TRANSVERSE CONFINEMENT",
      buildGeometry: (group, { createCADPart }) => {
        // Octagonal tapered column
        const colGeo = new THREE.CylinderGeometry(0.85, 0.95, 2.4, 8);
        group.add(
          createCADPart(colGeo, {
            fillColor: 0x0b2034,
            edgeColor: 0x00f0ff,
            opacity: 0.92,
          })
        );
      },
    },

    // 6. Subterranean Pile Cap & Deep Bored Piles (Foundation / Substratum)
    {
      id: "bored_pile_foundation",
      label: "Subterranean Pile Cap & Deep Bored Piles",
      stationCode: "STA-06",
      category: "electronics", // Foundations / Substratum uses emerald
      basePosition: [0, -3.4, 0],
      explodeOffset: [0, -2.4, 0],
      metrics: "BORE DEPTH: 28.0m // END-BEARING HARD BEDROCK",
      buildGeometry: (group, { createCADPart }) => {
        // Large footing pile cap
        const capGeo = new THREE.BoxGeometry(3.2, 0.9, 3.2);
        group.add(
          createCADPart(capGeo, {
            fillColor: 0x081926,
            edgeColor: 0x10b981,
            opacity: 0.9,
          })
        );

        // 4 Deep bored piles sinking into bedrock
        const pileOffsets = [
          [-1.0, -1.0],
          [1.0, -1.0],
          [-1.0, 1.0],
          [1.0, 1.0],
        ];
        pileOffsets.forEach(([px, pz]) => {
          const pileGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.6, 16);
          pileGeo.translate(px, -1.4, pz);
          group.add(
            createCADPart(pileGeo, {
              fillColor: 0x0a1e2a,
              edgeColor: 0x10b981,
            })
          );
        });
      },
    },
  ];
}
