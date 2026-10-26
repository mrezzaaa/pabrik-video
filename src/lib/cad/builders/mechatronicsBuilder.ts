import * as THREE from "three";
import { SubAssemblySpec } from "../types";

export function buildMechatronics(params: Record<string, any> = {}): SubAssemblySpec[] {
  const armSpan = Number(params.armSpan) || 3.2;

  return [
    // 1. Aerodynamic Carbon Canopy & Top Plate (Shell)
    {
      id: "aerodynamic_canopy",
      label: "Molded Carbon Canopy & Camera Fairing",
      stationCode: "STA-01",
      category: "shell",
      isShell: true,
      basePosition: [0, 0.45, 0],
      explodeOffset: [0, 2.2, 0],
      metrics: "3K TORAY TWILL // AERO DRAG Cd: 0.18 // DRY WEIGHT: 28g",
      buildGeometry: (group, { createCADPart }) => {
        // Streamlined top canopy
        const canopyGeo = new THREE.CylinderGeometry(0.55, 0.95, 0.75, 18, 1, false);
        canopyGeo.scale(1.0, 0.5, 1.8);
        group.add(
          createCADPart(canopyGeo, {
            fillColor: 0x0a1e30,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.28,
            edgeThreshold: 15,
          })
        );

        // FPV Lens housing
        const lensGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16);
        lensGeo.rotateX(Math.PI / 2);
        lensGeo.translate(0, 0.05, 0.95);
        group.add(
          createCADPart(lensGeo, {
            fillColor: 0x1d3a54,
            edgeColor: 0x00f0ff,
            isShell: true,
          })
        );
      },
    },

    // 2. High-Density Flight Controller & ESC Stack (Electronics)
    {
      id: "fc_esc_electronics_stack",
      label: "STM32H7 Flight Controller & 65A 4-in-1 ESC Stack",
      stationCode: "STA-02",
      category: "electronics",
      basePosition: [0, 0.15, 0],
      explodeOffset: [0, 1.1, 0],
      metrics: "480 MHz ARM CORTEX-M7 // 128kHz DSHOT2400 MOSFETs",
      buildGeometry: (group, { createCADPart }) => {
        // FC Board
        const fcGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
        group.add(
          createCADPart(fcGeo, {
            fillColor: 0x092b1e,
            edgeColor: 0x10b981,
            opacity: 0.95,
          })
        );

        // MCU Processor Chip
        const mcuGeo = new THREE.BoxGeometry(0.42, 0.06, 0.42);
        mcuGeo.translate(0, 0.07, 0);
        group.add(
          createCADPart(mcuGeo, {
            fillColor: 0x18181b,
            edgeColor: 0xf59e0b,
          })
        );

        // 4 ESC Shunt Resistors & MOSFETs
        const mosfetPositions = [
          [-0.38, 0.06, -0.38],
          [0.38, 0.06, -0.38],
          [-0.38, 0.06, 0.38],
          [0.38, 0.06, 0.38],
        ];
        mosfetPositions.forEach(([mx, my, mz]) => {
          const mosGeo = new THREE.BoxGeometry(0.22, 0.05, 0.22);
          mosGeo.translate(mx, my, mz);
          group.add(
            createCADPart(mosGeo, {
              fillColor: 0x221a08,
              edgeColor: 0xf59e0b,
            })
          );
        });

        // Lower ESC Board
        const escGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
        escGeo.translate(0, -0.25, 0);
        group.add(
          createCADPart(escGeo, {
            fillColor: 0x092b1e,
            edgeColor: 0x10b981,
          })
        );
      },
    },

    // 3. Unibody Structural Carbon Fiber Frame & Arms (Structure)
    {
      id: "carbon_frame_arms",
      label: "CNC Chamfered 6mm Carbon Fiber Unibody Base",
      stationCode: "STA-03",
      category: "structure",
      basePosition: [0, -0.15, 0],
      explodeOffset: [0, -0.5, 0],
      metrics: "TENSILE MODULUS: 230 GPa // TITANIUM FASTENERS",
      buildGeometry: (group, { createCADPart }) => {
        // Central bottom frame
        const centerGeo = new THREE.BoxGeometry(1.5, 0.12, 2.0);
        group.add(
          createCADPart(centerGeo, {
            fillColor: 0x0f2334,
            edgeColor: 0x00f0ff,
            opacity: 0.95,
          })
        );

        // 4 Symmetrical diagonal motor arms
        const armAngles = [
          Math.PI * 0.25,
          Math.PI * 0.75,
          Math.PI * 1.25,
          Math.PI * 1.75,
        ];
        armAngles.forEach((angle) => {
          const armGeo = new THREE.BoxGeometry(armSpan, 0.12, 0.28);
          armGeo.rotateY(angle);
          group.add(
            createCADPart(armGeo, {
              fillColor: 0x0b1e2e,
              edgeColor: 0x00f0ff,
            })
          );
        });
      },
    },

    // 4. Brushless DC Motors: Stator Coils & Base (Core)
    {
      id: "brushless_stator_cores",
      label: "12N14P Brushless Stator & Oxygen-Free Copper Coils",
      stationCode: "STA-04",
      category: "core",
      basePosition: [0, 0, 0],
      explodeOffset: [1.6, 0, 1.6], // radial outward
      metrics: "0.2mm KAWASAKI SILICON STEEL // 2207.5 1950KV",
      buildGeometry: (group, { createCADPart }) => {
        const motorRadius = armSpan * 0.42;
        const motorPositions = [
          [Math.cos(Math.PI * 0.25) * motorRadius, Math.sin(Math.PI * 0.25) * motorRadius],
          [Math.cos(Math.PI * 0.75) * motorRadius, Math.sin(Math.PI * 0.75) * motorRadius],
          [Math.cos(Math.PI * 1.25) * motorRadius, Math.sin(Math.PI * 1.25) * motorRadius],
          [Math.cos(Math.PI * 1.75) * motorRadius, Math.sin(Math.PI * 1.75) * motorRadius],
        ];

        motorPositions.forEach(([mx, mz]) => {
          // Stator base & core
          const statorGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 18);
          statorGeo.translate(mx, 0.05, mz);
          group.add(
            createCADPart(statorGeo, {
              fillColor: 0x3d2008,
              edgeColor: 0xf59e0b,
            })
          );

          // Copper coil windings
          const coilRing = new THREE.TorusGeometry(0.32, 0.06, 8, 16);
          coilRing.rotateX(Math.PI / 2);
          coilRing.translate(mx, 0.12, mz);
          group.add(
            createCADPart(coilRing, {
              fillColor: 0x4d1808,
              edgeColor: 0xef4444,
            })
          );
        });
      },
    },

    // 5. Counter-Rotating Propellers & Outer Rotor Bells (Rotor)
    {
      id: "counter_rotating_props",
      label: "Polycarbonate Tri-Blade Propellers & N52SH Bell",
      stationCode: "STA-05",
      category: "rotor",
      basePosition: [0, 0.35, 0],
      explodeOffset: [0, 1.8, 0], // lifts along motor axis
      rotationSpeed: 0.25,
      rotationAxis: "y",
      metrics: "MAX THRUST: 2,150g PER AXIS // 5.1 x 4.3 x 3 PITCH",
      buildGeometry: (group, { createCADPart }) => {
        const motorRadius = armSpan * 0.42;
        const motorPositions = [
          [Math.cos(Math.PI * 0.25) * motorRadius, Math.sin(Math.PI * 0.25) * motorRadius, 1],
          [Math.cos(Math.PI * 0.75) * motorRadius, Math.sin(Math.PI * 0.75) * motorRadius, -1],
          [Math.cos(Math.PI * 1.25) * motorRadius, Math.sin(Math.PI * 1.25) * motorRadius, 1],
          [Math.cos(Math.PI * 1.75) * motorRadius, Math.sin(Math.PI * 1.75) * motorRadius, -1],
        ];

        motorPositions.forEach(([mx, mz, dir]) => {
          // Motor Bell
          const bellGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18);
          bellGeo.translate(mx, 0.0, mz);
          group.add(
            createCADPart(bellGeo, {
              fillColor: 0x12253a,
              edgeColor: 0x00f0ff,
            })
          );

          // 3-blade prop
          for (let b = 0; b < 3; b++) {
            const angle = (b / 3) * Math.PI * 2;
            const bladeGeo = new THREE.BoxGeometry(0.95, 0.04, 0.18);
            bladeGeo.translate(0.48, 0, 0);
            bladeGeo.rotateY(angle * dir);
            bladeGeo.rotateX(0.22 * dir);
            bladeGeo.translate(mx, 0.18, mz);
            group.add(
              createCADPart(bladeGeo, {
                fillColor: 0x173a5a,
                edgeColor: 0x00f0ff,
                opacity: 0.9,
              })
            );
          }
        });
      },
    },

    // 6. High-Discharge LiPo Battery Pack & Power Leads (Thermal / Power)
    {
      id: "lipo_battery_pack",
      label: "6S 22.2V 1300mAh 150C Graphene LiPo Battery",
      stationCode: "STA-06",
      category: "thermal",
      basePosition: [0, -0.65, 0],
      explodeOffset: [0, -2.2, 0],
      metrics: "CONTINUOUS DISCHARGE: 195A // BURST: 300A // XT60 CONNECTOR",
      buildGeometry: (group, { createCADPart }) => {
        // Battery rectangular cell block
        const battGeo = new THREE.BoxGeometry(1.1, 0.65, 1.8);
        group.add(
          createCADPart(battGeo, {
            fillColor: 0x361608,
            edgeColor: 0xef4444,
            opacity: 0.92,
          })
        );

        // Power cables & XT60
        const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
        cableGeo.rotateX(Math.PI / 2);
        cableGeo.translate(0, 0.15, 1.1);
        group.add(
          createCADPart(cableGeo, {
            fillColor: 0x4a180a,
            edgeColor: 0xef4444,
          })
        );
      },
    },
  ];
}
