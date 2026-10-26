import * as THREE from "three";
import { SubAssemblySpec } from "../types";

export function buildStructuralGrid(params: Record<string, any> = {}): SubAssemblySpec[] {
  const floorCount = Number(params.floors) || 6;
  const buildingWidth = Number(params.width) || 4.8;
  const buildingDepth = Number(params.depth) || 4.8;

  return [
    // 1. Double-Skin Glazed Curtain Wall Facade (Shell)
    {
      id: "curtain_wall_facade",
      label: "Unitized Low-E Double Glazed Curtain Wall",
      stationCode: "STA-01",
      category: "shell",
      isShell: true,
      basePosition: [0, 0, 0],
      explodeOffset: [2.5, 0, 2.5],
      metrics: "U-VALUE: 1.1 W/m²K // SHGC: 0.28 HIGH-PERFORMANCE",
      buildGeometry: (group, { createCADPart }) => {
        // Outer translucent curtain box
        const h = floorCount * 1.1;
        const facadeGeo = new THREE.BoxGeometry(
          buildingWidth + 0.3,
          h,
          buildingDepth + 0.3
        );
        group.add(
          createCADPart(facadeGeo, {
            fillColor: 0x0a1e30,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.22,
            edgeThreshold: 15,
          })
        );

        // Mullion grid lines on facades
        for (let fl = 1; fl < floorCount; fl++) {
          const y = -h / 2 + fl * 1.1;
          const bandGeo = new THREE.BoxGeometry(
            buildingWidth + 0.34,
            0.08,
            buildingDepth + 0.34
          );
          bandGeo.translate(0, y, 0);
          group.add(
            createCADPart(bandGeo, {
              fillColor: 0x123450,
              edgeColor: 0x00f0ff,
              isShell: true,
            })
          );
        }
      },
    },

    // 2. Central Shear Wall Core & Elevator Risers (Core)
    {
      id: "central_core_shear_wall",
      label: "Reinforced Concrete Core & Shear Wall System",
      stationCode: "STA-02",
      category: "core",
      basePosition: [0, 0, 0],
      explodeOffset: [0, 0, 0],
      metrics: "SLIPFORM CONCRETE // LATERAL WIND & SEISMIC BRACE",
      buildGeometry: (group, { createCADPart }) => {
        const h = floorCount * 1.1;
        // Central core tube
        const coreGeo = new THREE.BoxGeometry(1.8, h, 1.8);
        group.add(
          createCADPart(coreGeo, {
            fillColor: 0x132a40,
            edgeColor: 0x00f0ff,
            opacity: 0.95,
          })
        );

        // Twin elevator shaft cavities inside
        const shaftLGeo = new THREE.BoxGeometry(0.65, h - 0.2, 0.65);
        shaftLGeo.translate(-0.45, 0, 0);
        group.add(
          createCADPart(shaftLGeo, {
            fillColor: 0x1d3e5e,
            edgeColor: 0xf59e0b,
          })
        );
        const shaftRGeo = new THREE.BoxGeometry(0.65, h - 0.2, 0.65);
        shaftRGeo.translate(0.45, 0, 0);
        group.add(
          createCADPart(shaftRGeo, {
            fillColor: 0x1d3e5e,
            edgeColor: 0xf59e0b,
          })
        );
      },
    },

    // 3. Perimeter Steel Columns & Structural Space Frame (Structure)
    {
      id: "perimeter_frame_columns",
      label: "Structural Steel Composite Column Matrix",
      stationCode: "STA-03",
      category: "structure",
      basePosition: [0, 0, 0],
      explodeOffset: [-2.0, 0, -2.0],
      metrics: "BOX COLUMNS // ASTM A992 GRADE 50 STEEL",
      buildGeometry: (group, { createCADPart }) => {
        const h = floorCount * 1.1;
        const colPositions = [
          [-buildingWidth / 2 + 0.3, -buildingDepth / 2 + 0.3],
          [0, -buildingDepth / 2 + 0.3],
          [buildingWidth / 2 - 0.3, -buildingDepth / 2 + 0.3],
          [-buildingWidth / 2 + 0.3, buildingDepth / 2 - 0.3],
          [0, buildingDepth / 2 - 0.3],
          [buildingWidth / 2 - 0.3, buildingDepth / 2 - 0.3],
          [-buildingWidth / 2 + 0.3, 0],
          [buildingWidth / 2 - 0.3, 0],
        ];

        colPositions.forEach(([cx, cz]) => {
          const colGeo = new THREE.BoxGeometry(0.24, h, 0.24);
          colGeo.translate(cx, 0, cz);
          group.add(
            createCADPart(colGeo, {
              fillColor: 0x0f2942,
              edgeColor: 0x00f0ff,
            })
          );
        });
      },
    },

    // 4. Multi-Level Composite Floor Diaphragm Slabs (Structure)
    {
      id: "floor_slabs",
      label: "Profiled Steel Deck Composite Floor Diaphragms",
      stationCode: "STA-04",
      category: "structure",
      basePosition: [0, 0, 0],
      explodeOffset: [0, 2.8, 0],
      metrics: `${floorCount} LEVELS // LIGHTWEIGHT CONCRETE ON TRAPEZOIDAL DECK`,
      buildGeometry: (group, { createCADPart }) => {
        const h = floorCount * 1.1;
        for (let fl = 0; fl < floorCount; fl++) {
          const y = -h / 2 + (fl + 0.5) * 1.1;
          const slabGeo = new THREE.BoxGeometry(
            buildingWidth - 0.1,
            0.12,
            buildingDepth - 0.1
          );
          slabGeo.translate(0, y, 0);
          group.add(
            createCADPart(slabGeo, {
              fillColor: 0x142b42,
              edgeColor: 0x00f0ff,
              opacity: 0.85,
            })
          );
        }
      },
    },

    // 5. MEP Mechanical, HVAC & Fire Piping Risers (Thermal / Fluid)
    {
      id: "mep_hvac_piping",
      label: "Integrated MEP Risers, Fire Sprinklers & HVAC",
      stationCode: "STA-05",
      category: "thermal",
      basePosition: [0, 0, 0],
      explodeOffset: [0, 0, 1.8],
      metrics: "VAV AIR HANDLERS // DUAL STANDPIPE FIRE PROTECTION",
      buildGeometry: (group, { createCADPart }) => {
        const h = floorCount * 1.1;
        // Main vertical HVAC duct
        const ductGeo = new THREE.BoxGeometry(0.5, h, 0.35);
        ductGeo.translate(1.2, 0, 0);
        group.add(
          createCADPart(ductGeo, {
            fillColor: 0x3d1808,
            edgeColor: 0xef4444,
            opacity: 0.9,
          })
        );

        // Chilled water riser pipes
        const pipeL = new THREE.CylinderGeometry(0.08, 0.08, h, 12);
        pipeL.translate(-1.2, 0, 0.4);
        group.add(
          createCADPart(pipeL, {
            fillColor: 0x103040,
            edgeColor: 0x00f0ff,
          })
        );
        const pipeR = new THREE.CylinderGeometry(0.08, 0.08, h, 12);
        pipeR.translate(-1.2, 0, -0.4);
        group.add(
          createCADPart(pipeR, {
            fillColor: 0x401a08,
            edgeColor: 0xef4444,
          })
        );
      },
    },

    // 6. Basements, Retaining Diaphragm Walls & Raft Foundation (Foundation)
    {
      id: "raft_foundation_basement",
      label: "Substructure Basements & Massive Raft Foundation",
      stationCode: "STA-06",
      category: "electronics",
      basePosition: [0, -(floorCount * 1.1) / 2 - 1.2, 0],
      explodeOffset: [0, -2.5, 0],
      metrics: "RAFT THICKNESS: 2.5m // PERIMETER SECANT PILE WALL",
      buildGeometry: (group, { createCADPart }) => {
        // Massive raft slab
        const raftGeo = new THREE.BoxGeometry(
          buildingWidth + 1.2,
          1.4,
          buildingDepth + 1.2
        );
        group.add(
          createCADPart(raftGeo, {
            fillColor: 0x0a1d2d,
            edgeColor: 0x10b981,
            opacity: 0.95,
          })
        );

        // Foundation friction piles
        const pilePts = [
          [-2.2, -2.2],
          [2.2, -2.2],
          [-2.2, 2.2],
          [2.2, 2.2],
          [0, 0],
        ];
        pilePts.forEach(([px, pz]) => {
          const pGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.8, 16);
          pGeo.translate(px, -1.8, pz);
          group.add(
            createCADPart(pGeo, {
              fillColor: 0x081824,
              edgeColor: 0x10b981,
            })
          );
        });
      },
    },
  ];
}
