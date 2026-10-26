import * as THREE from "three";
import { ComposableAssemblySpec, CADHelpers } from "./types";

/**
 * Procedural CAD Primitive Renderer
 * Converts any of the 10 Composable Parametric Primitives into dual-pass CAD geometry.
 */
export function renderComposablePrimitive(
  spec: ComposableAssemblySpec,
  parentGroup: THREE.Group,
  helpers: CADHelpers
): void {
  const { createCADPart } = helpers;
  const dims = spec.dimensions || [1.8, 1.2, 1.8];
  const count = spec.bladeOrCellCount || 16;
  const isShell = Boolean(spec.isShell || spec.category === "shell");

  // Local container for this assembly component
  const group = new THREE.Group();

  // Apply base rotation if specified
  if (spec.baseRotation) {
    group.rotation.set(spec.baseRotation[0], spec.baseRotation[1], spec.baseRotation[2]);
  }

  // Engineering color palette based on functional category
  let edgeColor = 0x00f0ff; // Cyan (primary structure / default)
  let fillColor = 0x0c2136;

  if (spec.category === "rotor" || spec.category === "core") {
    edgeColor = 0xf59e0b; // Amber (active / rotating / core)
    fillColor = 0x241808;
  } else if (spec.category === "thermal") {
    edgeColor = 0xef4444; // Red-orange (thermal / combustion / high-voltage)
    fillColor = 0x3d1208;
  } else if (spec.category === "electronics") {
    edgeColor = 0x10b981; // Emerald (PCBs / sensors / microchips)
    fillColor = 0x092b1e;
  } else if (spec.category === "shell") {
    edgeColor = 0x00f0ff;
    fillColor = 0x0a1e30;
  }

  switch (spec.primitiveType) {
    // 1. Parametric Rectangular Enclosure with Cooling Fins
    case "box_housing": {
      const [w, h, d] = dims;
      // Main box enclosure
      const mainGeo = new THREE.BoxGeometry(w, h, d);
      group.add(
        createCADPart(mainGeo, {
          fillColor,
          edgeColor,
          isShell,
          opacity: isShell ? 0.28 : 0.9,
        })
      );

      // Lateral cooling fin heatsinks
      const finCount = 5;
      for (let i = 0; i < finCount; i++) {
        const offset = -d / 2 + (d / (finCount + 1)) * (i + 1);
        const finGeo = new THREE.BoxGeometry(w + 0.12, h * 0.75, 0.04);
        finGeo.translate(0, 0, offset);
        group.add(
          createCADPart(finGeo, {
            fillColor: 0x142b40,
            edgeColor: 0x00f0ff,
            isShell,
          })
        );
      }
      break;
    }

    // 2. Flat Skateboard Array / Block of Battery Cells inside Frame
    case "battery_pack_grid": {
      const [w, h, d] = dims;
      // Bottom structural protective tray
      const trayGeo = new THREE.BoxGeometry(w, h * 0.35, d);
      trayGeo.translate(0, -h * 0.32, 0);
      group.add(
        createCADPart(trayGeo, {
          fillColor: 0x0a1a28,
          edgeColor: 0x00f0ff,
          opacity: 0.95,
        })
      );

      // Grid of cylindrical battery cells (e.g., 21700 or 4680 cells)
      const rows = 4;
      const cols = 6;
      const cellRadius = Math.min(w / (cols * 2.6), d / (rows * 2.6));
      const cellHeight = h * 0.75;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = -w / 2 + ((c + 0.5) / cols) * w;
          const cz = -d / 2 + ((r + 0.5) / rows) * d;

          const cellGeo = new THREE.CylinderGeometry(cellRadius, cellRadius, cellHeight, 12);
          cellGeo.translate(cx, 0.05, cz);
          group.add(
            createCADPart(cellGeo, {
              fillColor: 0x0a2618,
              edgeColor: 0x10b981,
              opacity: 0.9,
            })
          );
        }
      }

      // Top busbar conductors (copper/amber interconnects)
      for (let r = 0; r < rows; r++) {
        const cz = -d / 2 + ((r + 0.5) / rows) * d;
        const busGeo = new THREE.BoxGeometry(w * 0.88, 0.03, cellRadius * 1.2);
        busGeo.translate(0, cellHeight * 0.52, cz);
        group.add(
          createCADPart(busGeo, {
            fillColor: 0x3a2208,
            edgeColor: 0xf59e0b,
          })
        );
      }
      break;
    }

    // 3. Ribbed Cylindrical Stator Housing with Internal Coils and Shaft
    case "cylinder_motor_stator": {
      const radius = dims[0];
      const length = dims[1];

      // Stator outer ribbed cylindrical housing
      const housingGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
      group.add(
        createCADPart(housingGeo, {
          fillColor,
          edgeColor: 0x00f0ff,
          isShell,
          opacity: isShell ? 0.3 : 0.92,
        })
      );

      // Internal copper stator winding rings
      const coilRings = 4;
      for (let i = 0; i < coilRings; i++) {
        const yPos = -length / 2 + (length / (coilRings + 1)) * (i + 1);
        const coilGeo = new THREE.TorusGeometry(radius * 0.78, 0.06, 8, 20);
        coilGeo.rotateX(Math.PI / 2);
        coilGeo.translate(0, yPos, 0);
        group.add(
          createCADPart(coilGeo, {
            fillColor: 0x4a1808,
            edgeColor: 0xf59e0b,
          })
        );
      }

      // Hardened central rotor drive shaft extending past housing
      const shaftGeo = new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, length * 1.5, 16);
      group.add(
        createCADPart(shaftGeo, {
          fillColor: 0x0e2238,
          edgeColor: 0x00f0ff,
          opacity: 0.95,
        })
      );
      break;
    }

    // 4. Detailed Wheel Rim, Tire Tread, Brake Rotor & Caliper
    case "wheel_axle_assembly": {
      const radius = dims[0] || 0.85;
      const width = dims[1] || 0.38;

      // Tire body (outer cylinder oriented along Z or X)
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24, 1, false);
      tireGeo.rotateZ(Math.PI / 2);
      group.add(
        createCADPart(tireGeo, {
          fillColor: 0x081522,
          edgeColor: 0x00f0ff,
          opacity: 0.9,
        })
      );

      // Alloy wheel rim hub
      const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 0.92, 20);
      rimGeo.rotateZ(Math.PI / 2);
      group.add(
        createCADPart(rimGeo, {
          fillColor: 0x11283d,
          edgeColor: 0x00f0ff,
        })
      );

      // Radial wheel rim spokes (5-spoke star)
      for (let s = 0; s < 5; s++) {
        const spokeAngle = (s / 5) * Math.PI * 2;
        const spokeGeo = new THREE.BoxGeometry(0.08, radius * 0.55, 0.08);
        spokeGeo.translate(0, radius * 0.28, 0);
        spokeGeo.rotateZ(spokeAngle);
        spokeGeo.rotateY(Math.PI / 2);
        group.add(
          createCADPart(spokeGeo, {
            fillColor: 0x193a58,
            edgeColor: 0x00f0ff,
          })
        );
      }

      // Ventilated brake disc (rotor)
      const discGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, 0.05, 20);
      discGeo.rotateZ(Math.PI / 2);
      discGeo.translate(width * 0.25, 0, 0);
      group.add(
        createCADPart(discGeo, {
          fillColor: 0x1f2937,
          edgeColor: 0xf59e0b,
        })
      );

      // Performance brake caliper (clamp in bold red/amber)
      const caliperGeo = new THREE.BoxGeometry(0.12, 0.28, 0.22);
      caliperGeo.translate(width * 0.25, radius * 0.4, 0);
      group.add(
        createCADPart(caliperGeo, {
          fillColor: 0x421008,
          edgeColor: 0xef4444,
        })
      );

      // Half-shaft axle connecting inward
      const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12);
      axleGeo.rotateZ(Math.PI / 2);
      axleGeo.translate(-0.4, 0, 0);
      group.add(
        createCADPart(axleGeo, {
          fillColor: 0x0a1e30,
          edgeColor: 0x00f0ff,
        })
      );
      break;
    }

    // 5. Hub with N Radial Twisted Airfoil Blades
    case "turbine_rotor_stage": {
      const radius = dims[0] || 1.4;
      const hubLength = dims[1] || 0.45;
      const bladeNum = count || 18;

      // Central Hub
      const hubGeo = new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, hubLength, 24);
      hubGeo.rotateX(Math.PI / 2);
      group.add(
        createCADPart(hubGeo, {
          fillColor: 0x102538,
          edgeColor: 0x00f0ff,
        })
      );

      // Aerodynamic Spinner Nosecone
      const noseGeo = new THREE.ConeGeometry(radius * 0.35, hubLength * 1.4, 20);
      noseGeo.rotateX(Math.PI / 2);
      noseGeo.translate(0, 0, hubLength * 0.7);
      group.add(
        createCADPart(noseGeo, {
          fillColor: 0x1a2e44,
          edgeColor: 0xf59e0b,
        })
      );

      // Polar array of twisted airfoil blades
      for (let i = 0; i < bladeNum; i++) {
        const angle = (i / bladeNum) * Math.PI * 2;
        const bladeGeo = new THREE.BoxGeometry(0.08, radius * 0.65, 0.16);
        bladeGeo.translate(0, radius * 0.32 + radius * 0.18, 0);
        bladeGeo.rotateZ(angle);
        bladeGeo.rotateX(0.24); // pitch twist
        group.add(
          createCADPart(bladeGeo, {
            fillColor: 0x153554,
            edgeColor: 0x00f0ff,
            opacity: 0.95,
          })
        );
      }
      break;
    }

    // 6. Translucent Outer Aerodynamic Body / Hull / Nacelle
    case "contoured_shell_body": {
      const [w, h, d] = dims;

      // Lower vehicle / chassis aerodynamic cabin silhouette
      const lowerGeo = new THREE.BoxGeometry(w, h * 0.45, d);
      lowerGeo.translate(0, -h * 0.22, 0);
      group.add(
        createCADPart(lowerGeo, {
          fillColor: 0x0a1e30,
          edgeColor: 0x00f0ff,
          isShell: true,
          opacity: 0.25,
          edgeThreshold: 14,
        })
      );

      // Upper cabin canopy (tapered)
      const cabinGeo = new THREE.BoxGeometry(w * 0.85, h * 0.55, d * 0.55);
      cabinGeo.translate(0, h * 0.25, -d * 0.05);
      group.add(
        createCADPart(cabinGeo, {
          fillColor: 0x071928,
          edgeColor: 0x00f0ff,
          isShell: true,
          opacity: 0.22,
          edgeThreshold: 14,
        })
      );

      // Front bonnet / hood taper
      const hoodGeo = new THREE.BoxGeometry(w * 0.88, 0.08, d * 0.35);
      hoodGeo.translate(0, 0.02, d * 0.32);
      group.add(
        createCADPart(hoodGeo, {
          fillColor: 0x0e2a44,
          edgeColor: 0x00f0ff,
          isShell: true,
        })
      );
      break;
    }

    // 7. Structural Spaceframe / Skateboard Chassis Frame
    case "structural_frame_chassis": {
      const [w, h, d] = dims;

      // Left longitudinal frame rail
      const railL = new THREE.BoxGeometry(0.16, 0.16, d);
      railL.translate(-w / 2 + 0.12, 0, 0);
      group.add(
        createCADPart(railL, {
          fillColor: 0x0d2238,
          edgeColor: 0x00f0ff,
          opacity: 0.95,
        })
      );

      // Right longitudinal frame rail
      const railR = new THREE.BoxGeometry(0.16, 0.16, d);
      railR.translate(w / 2 - 0.12, 0, 0);
      group.add(
        createCADPart(railR, {
          fillColor: 0x0d2238,
          edgeColor: 0x00f0ff,
          opacity: 0.95,
        })
      );

      // Transverse cross-members
      const crossCount = 4;
      for (let i = 0; i < crossCount; i++) {
        const cz = -d / 2 + (d / (crossCount - 1)) * i;
        const crossGeo = new THREE.BoxGeometry(w - 0.24, 0.14, 0.14);
        crossGeo.translate(0, 0, cz);
        group.add(
          createCADPart(crossGeo, {
            fillColor: 0x122e48,
            edgeColor: 0x00f0ff,
          })
        );
      }

      // Front & Rear suspension subframe towers
      const towerF = new THREE.BoxGeometry(w * 0.75, 0.45, 0.35);
      towerF.translate(0, 0.22, d * 0.38);
      group.add(
        createCADPart(towerF, {
          fillColor: 0x0f243a,
          edgeColor: 0x00f0ff,
        })
      );
      const towerR = new THREE.BoxGeometry(w * 0.75, 0.45, 0.35);
      towerR.translate(0, 0.22, -d * 0.38);
      group.add(
        createCADPart(towerR, {
          fillColor: 0x0f243a,
          edgeColor: 0x00f0ff,
        })
      );
      break;
    }

    // 8. Circuit Board Module with Surface-Mount IC Blocks & Pin Headers
    case "pcb_stack_module": {
      const [w, h, d] = dims;

      // Main PCB Substrate in Emerald
      const boardGeo = new THREE.BoxGeometry(w, 0.08, d);
      group.add(
        createCADPart(boardGeo, {
          fillColor: 0x082418,
          edgeColor: 0x10b981,
          opacity: 0.95,
        })
      );

      // Central Processor / Power Inverter Chip (SoC/IGBT)
      const icGeo = new THREE.BoxGeometry(w * 0.45, 0.08, d * 0.45);
      icGeo.translate(0, 0.08, 0);
      group.add(
        createCADPart(icGeo, {
          fillColor: 0x1a1a20,
          edgeColor: 0xf59e0b,
        })
      );

      // Peripheral Capacitor & Inductor blocks
      const compOffsets = [
        [-w * 0.32, 0.07, -d * 0.32],
        [w * 0.32, 0.07, -d * 0.32],
        [-w * 0.32, 0.07, d * 0.32],
        [w * 0.32, 0.07, d * 0.32],
      ];
      compOffsets.forEach(([cx, cy, cz]) => {
        const cGeo = new THREE.BoxGeometry(0.25, 0.09, 0.25);
        cGeo.translate(cx, cy, cz);
        group.add(
          createCADPart(cGeo, {
            fillColor: 0x2b1e0a,
            edgeColor: 0xf59e0b,
          })
        );
      });
      break;
    }

    // 9. 3D Curved High-Voltage Tubes & Busbar Routing
    case "high_voltage_cables": {
      const [w, h, d] = dims;

      // Dual curved HV power conduits (Battery -> Inverter -> Motor)
      const curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-w * 0.2, -0.1, -d * 0.4),
        new THREE.Vector3(-w * 0.3, 0.25, 0),
        new THREE.Vector3(-w * 0.2, 0.35, d * 0.4),
      ]);
      const tubeGeo1 = new THREE.TubeGeometry(curve1, 24, 0.06, 8, false);
      group.add(
        createCADPart(tubeGeo1, {
          fillColor: 0x4d1908,
          edgeColor: 0xef4444,
          opacity: 0.95,
        })
      );

      const curve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(w * 0.2, -0.1, -d * 0.4),
        new THREE.Vector3(w * 0.3, 0.25, 0),
        new THREE.Vector3(w * 0.2, 0.35, d * 0.4),
      ]);
      const tubeGeo2 = new THREE.TubeGeometry(curve2, 24, 0.06, 8, false);
      group.add(
        createCADPart(tubeGeo2, {
          fillColor: 0x4d1908,
          edgeColor: 0xf59e0b,
          opacity: 0.95,
        })
      );
      break;
    }

    // 10. Extruded Geological / Structural Pavement Slab with Internal Rebar
    case "stratified_layer_slab": {
      const [w, h, d] = dims;

      // Main structural slab
      const slabGeo = new THREE.BoxGeometry(w, h, d);
      group.add(
        createCADPart(slabGeo, {
          fillColor: 0x0e2438,
          edgeColor: 0x00f0ff,
          opacity: 0.92,
        })
      );

      // Embedded internal rebar longitudinal bars
      const rebarCount = 5;
      for (let i = 0; i < rebarCount; i++) {
        const rx = -w / 2 + (w / (rebarCount + 1)) * (i + 1);
        const barGeo = new THREE.CylinderGeometry(0.04, 0.04, d * 0.95, 8);
        barGeo.rotateX(Math.PI / 2);
        barGeo.translate(rx, 0, 0);
        group.add(
          createCADPart(barGeo, {
            fillColor: 0x332208,
            edgeColor: 0xf59e0b,
          })
        );
      }
      break;
    }
  }

  parentGroup.add(group);
}
