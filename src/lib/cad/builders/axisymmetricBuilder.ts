import * as THREE from "three";
import { SubAssemblySpec } from "../types";

export function buildAxisymmetricMachine(params: Record<string, any> = {}): SubAssemblySpec[] {
  const bladeCount = Number(params.bladeCount) || 24;
  const stageCount = Number(params.stageCount) || 5;

  return [
    // 1. Aerodynamic Outer Nacelle / Cowling (Shell)
    {
      id: "outer_nacelle",
      label: "Aerodynamic Nacelle & Bypass Duct",
      stationCode: "STA-01",
      category: "shell",
      isShell: true,
      basePosition: [0, 0, 0],
      explodeOffset: [0, 2.2, 0],
      metrics: "DIAMETER: 2.85m // TITANIUM-CARBON COMPOSITE",
      buildGeometry: (group, { createCADPart }) => {
        // Outer intake cowl
        const cowlGeo = new THREE.CylinderGeometry(1.65, 1.55, 4.6, 36, 1, true);
        cowlGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(cowlGeo, {
            fillColor: 0x0c2136,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.25,
            edgeThreshold: 15,
          })
        );

        // Forward lip ring
        const lipGeo = new THREE.TorusGeometry(1.65, 0.08, 16, 40);
        group.add(
          createCADPart(lipGeo, {
            fillColor: 0x1e3a5f,
            edgeColor: 0x00f0ff,
            isShell: true,
          })
        );
      },
    },

    // 2. High-Bypass Front Fan & Titanium Spinner (Rotor)
    {
      id: "front_fan_rotor",
      label: "Wide-Chord Titanium Fan & Spinner",
      stationCode: "STA-02",
      category: "rotor",
      basePosition: [0, 0, 1.8],
      explodeOffset: [0, 0, 2.8],
      rotationSpeed: 0.08,
      rotationAxis: "z",
      metrics: `BLADES: ${bladeCount} // TIP SPEED: 450 m/s // REVOLUTIONS: 3,200 RPM`,
      buildGeometry: (group, { createCADPart }) => {
        // Aerodynamic Spinner cone
        const coneGeo = new THREE.ConeGeometry(0.55, 1.1, 24);
        coneGeo.rotateX(Math.PI / 2);
        coneGeo.translate(0, 0, 0.4);
        group.add(
          createCADPart(coneGeo, {
            fillColor: 0x111c2e,
            edgeColor: 0xf59e0b,
            opacity: 0.95,
          })
        );

        // Fan Hub Disk
        const hubGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 28);
        hubGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(hubGeo, {
            fillColor: 0x0f2942,
            edgeColor: 0x00f0ff,
          })
        );

        // Polar array of swept fan blades
        for (let i = 0; i < bladeCount; i++) {
          const angle = (i / bladeCount) * Math.PI * 2;
          const bladeGeo = new THREE.BoxGeometry(0.12, 1.0, 0.22);
          bladeGeo.translate(0, 0.52, 0);
          bladeGeo.rotateZ(angle);
          bladeGeo.rotateX(0.28); // twist pitch
          group.add(
            createCADPart(bladeGeo, {
              fillColor: 0x153554,
              edgeColor: 0x00f0ff,
              opacity: 0.9,
            })
          );
        }
      },
    },

    // 3. Multi-Stage High Pressure Compressor (Core)
    {
      id: "hp_compressor",
      label: "Axial HP Compressor Core (9-Stage)",
      stationCode: "STA-03",
      category: "core",
      basePosition: [0, 0, 0.4],
      explodeOffset: [0, 0, 1.2],
      rotationSpeed: 0.12,
      rotationAxis: "z",
      metrics: "PRESSURE RATIO: 42:1 // INCONEL 718 DISKS",
      buildGeometry: (group, { createCADPart }) => {
        // Tapered spool body
        const spoolGeo = new THREE.CylinderGeometry(0.48, 0.62, 1.6, 24);
        spoolGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(spoolGeo, {
            fillColor: 0x14283d,
            edgeColor: 0x00f0ff,
          })
        );

        // Compressor blade stages
        const stages = 5;
        for (let s = 0; s < stages; s++) {
          const zPos = -0.6 + s * 0.3;
          const radius = 0.85 - s * 0.06;
          const count = 18 + s * 2;
          for (let b = 0; b < count; b++) {
            const angle = (b / count) * Math.PI * 2;
            const bGeo = new THREE.BoxGeometry(0.06, radius - 0.45, 0.12);
            bGeo.translate(0, (radius + 0.45) / 2, 0);
            bGeo.rotateZ(angle);
            bGeo.translate(0, 0, zPos);
            group.add(
              createCADPart(bGeo, {
                fillColor: 0x1b3c59,
                edgeColor: 0x00f0ff,
                opacity: 0.95,
              })
            );
          }
        }
      },
    },

    // 4. Annular Combustion Chamber (Thermal)
    {
      id: "combustion_chamber",
      label: "Annular Combustor & Fuel Injector Ring",
      stationCode: "STA-04",
      category: "thermal",
      basePosition: [0, 0, -0.75],
      explodeOffset: [0, 0, -0.6],
      metrics: "EXIT TEMP: 1,750°C // 24 DUAL-ORIFICE NOZZLES",
      buildGeometry: (group, { createCADPart }) => {
        // Outer combustor liner with thermal glow
        const linerGeo = new THREE.CylinderGeometry(0.72, 0.68, 0.9, 24, 1, true);
        linerGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(linerGeo, {
            fillColor: 0x4a1208,
            edgeColor: 0xef4444,
            opacity: 0.88,
          })
        );

        // Fuel nozzle manifold ring
        const ringGeo = new THREE.TorusGeometry(0.68, 0.05, 12, 28);
        group.add(
          createCADPart(ringGeo, {
            fillColor: 0x22110a,
            edgeColor: 0xf59e0b,
          })
        );

        // Fuel injector pins
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const pinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8);
          pinGeo.translate(0, 0.68, 0);
          pinGeo.rotateZ(angle);
          group.add(
            createCADPart(pinGeo, {
              fillColor: 0x2b0f0a,
              edgeColor: 0xef4444,
            })
          );
        }
      },
    },

    // 5. High & Low Pressure Turbine Stages (Rotor)
    {
      id: "turbine_stages",
      label: "Single-Crystal HP/LP Turbine Rotor",
      stationCode: "STA-05",
      category: "rotor",
      basePosition: [0, 0, -1.6],
      explodeOffset: [0, 0, -1.8],
      rotationSpeed: 0.1,
      rotationAxis: "z",
      metrics: "CMSX-4 ALLOY // AIR-COOLED CERAMIC COATING",
      buildGeometry: (group, { createCADPart }) => {
        // Turbine disk
        const diskGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.5, 24);
        diskGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(diskGeo, {
            fillColor: 0x18283a,
            edgeColor: 0xf59e0b,
          })
        );

        // Turbine blades with active amber highlight
        const count = 26;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const bladeGeo = new THREE.BoxGeometry(0.08, 0.42, 0.16);
          bladeGeo.translate(0, 0.65, 0);
          bladeGeo.rotateZ(angle);
          bladeGeo.rotateX(-0.25);
          group.add(
            createCADPart(bladeGeo, {
              fillColor: 0x2a1d0d,
              edgeColor: 0xf59e0b,
              opacity: 0.95,
            })
          );
        }
      },
    },

    // 6. Center Concentric Drive Shaft & Exhaust Cone (Structure)
    {
      id: "shaft_exhaust",
      label: "Concentric N1/N2 Shaft & Exhaust Tailcone",
      stationCode: "STA-06",
      category: "structure",
      basePosition: [0, 0, -0.4],
      explodeOffset: [0, -1.5, 0],
      metrics: "COAXIAL SHAFT // DUAL CERAMIC BEARINGS",
      buildGeometry: (group, { createCADPart }) => {
        // Long central shaft
        const shaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.8, 18);
        shaftGeo.rotateX(Math.PI / 2);
        group.add(
          createCADPart(shaftGeo, {
            fillColor: 0x0d2238,
            edgeColor: 0x00f0ff,
            opacity: 0.95,
          })
        );

        // Exhaust exit mixer cone
        const exConeGeo = new THREE.ConeGeometry(0.48, 1.4, 20);
        exConeGeo.rotateX(-Math.PI / 2);
        exConeGeo.translate(0, 0, -2.5);
        group.add(
          createCADPart(exConeGeo, {
            fillColor: 0x142233,
            edgeColor: 0x00f0ff,
            opacity: 0.9,
          })
        );
      },
    },
  ];
}
