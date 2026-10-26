import * as THREE from "three";
import { SubAssemblySpec } from "../types";

export function buildContinuumWave(params: Record<string, any> = {}): SubAssemblySpec[] {
  const width = Number(params.width) || 7.2;
  const length = Number(params.length) || 6.4;

  return [
    // 1. Fluid Ocean Column & Dynamic Tsunami Wave Crest (Shell)
    {
      id: "water_column_surface",
      label: "Displaced Oceanic Water Column & Solitary Wave",
      stationCode: "STA-01",
      category: "shell",
      isShell: true,
      basePosition: [0, 0.85, 0],
      explodeOffset: [0, 2.6, 0],
      metrics: "PROPAGATION VELOCITY: 800 km/h // OPEN-OCEAN WAVELENGTH: 200 km",
      buildGeometry: (group, { createCADPart }) => {
        // High-density surface wave plane with wave displacement
        const waveGeo = new THREE.PlaneGeometry(width, length, 48, 36);
        waveGeo.rotateX(-Math.PI / 2);

        // Pre-displace vertices for a cresting tsunami profile
        const pos = waveGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          const waveHeight =
            Math.sin(x * 0.9 - 0.5) * 0.38 +
            Math.cos(z * 0.6) * 0.18 +
            Math.exp(-Math.pow(x - 0.8, 2) * 1.5) * 0.75;
          pos.setY(i, waveHeight);
        }
        waveGeo.computeVertexNormals();

        group.add(
          createCADPart(waveGeo, {
            fillColor: 0x072844,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.38,
            edgeThreshold: 10,
          })
        );

        // Water volume block beneath surface
        const bodyGeo = new THREE.BoxGeometry(width, 1.2, length);
        bodyGeo.translate(0, -0.6, 0);
        group.add(
          createCADPart(bodyGeo, {
            fillColor: 0x061e33,
            edgeColor: 0x00f0ff,
            isShell: true,
            opacity: 0.22,
          })
        );
      },
    },

    // 2. Seabed Bathymetric Topography & Continental Shelf (Core)
    {
      id: "bathymetric_seabed",
      label: "Accretionary Prism & Bathymetric Continental Slope",
      stationCode: "STA-02",
      category: "core",
      basePosition: [0, -0.25, 0],
      explodeOffset: [0, 1.2, 0],
      metrics: "BATHYMETRIC TRENCH DEPTH: 6,500m // SLOPE ANGLE: 18°",
      buildGeometry: (group, { createCADPart }) => {
        // Continental shelf and oceanic trench diorama
        const bedGeo = new THREE.BoxGeometry(width, 0.8, length);
        group.add(
          createCADPart(bedGeo, {
            fillColor: 0x0d283e,
            edgeColor: 0x00f0ff,
            opacity: 0.88,
          })
        );

        // Trench depression
        const trenchGeo = new THREE.BoxGeometry(width * 0.3, 0.6, length);
        trenchGeo.translate(-1.8, -0.3, 0);
        group.add(
          createCADPart(trenchGeo, {
            fillColor: 0x071b2b,
            edgeColor: 0x00f0ff,
          })
        );
      },
    },

    // 3. Megathrust Fault Rupture Plane (Thermal / Energy Release)
    {
      id: "megathrust_fault_plane",
      label: "Megathrust Interplate Seismogenic Rupture Zone",
      stationCode: "STA-03",
      category: "thermal",
      basePosition: [0, -1.1, 0],
      explodeOffset: [0, 0, 0],
      metrics: "MOMENT MAGNITUDE: Mw 9.1 // CO-SEISMIC SLIP: 22.4m",
      buildGeometry: (group, { createCADPart }) => {
        // Angled slip plane
        const faultGeo = new THREE.PlaneGeometry(width * 0.75, length * 0.9, 12, 12);
        faultGeo.rotateX(-Math.PI / 2);
        faultGeo.rotateZ(0.35); // subduction dip angle
        group.add(
          createCADPart(faultGeo, {
            fillColor: 0x3d1208,
            edgeColor: 0xef4444,
            opacity: 0.95,
          })
        );

        // Concentric seismic shockwave rings
        for (let r = 0.6; r <= 2.4; r += 0.6) {
          const ringGeo = new THREE.TorusGeometry(r, 0.04, 8, 28);
          ringGeo.rotateX(Math.PI / 2);
          ringGeo.translate(0.5, 0.08, 0);
          group.add(
            createCADPart(ringGeo, {
              fillColor: 0x3d1908,
              edgeColor: 0xf59e0b,
            })
          );
        }
      },
    },

    // 4. Overriding Continental Crustal Plate (Structure)
    {
      id: "overriding_continental_crust",
      label: "Overriding Continental Upper Crustal Forearc",
      stationCode: "STA-04",
      category: "structure",
      basePosition: [1.6, -1.8, 0],
      explodeOffset: [1.8, -0.8, 0],
      metrics: "DENSITY: 2.7 g/cm³ // GRANITIC CONTINENTAL LITHOSPHERE",
      buildGeometry: (group, { createCADPart }) => {
        const crustGeo = new THREE.BoxGeometry(width * 0.5, 1.4, length);
        group.add(
          createCADPart(crustGeo, {
            fillColor: 0x0c2336,
            edgeColor: 0x00f0ff,
            opacity: 0.92,
          })
        );
      },
    },

    // 5. Subducting Oceanic Tectonic Slab (Structure)
    {
      id: "subducting_oceanic_slab",
      label: "Subducting Dense Basaltic Oceanic Lithosphere",
      stationCode: "STA-05",
      category: "structure",
      basePosition: [-1.6, -2.5, 0],
      explodeOffset: [-1.8, -1.2, 0],
      metrics: "SUBDUCTION RATE: 78 mm/yr // ECLOGITE METAMORPHIC PHASE",
      buildGeometry: (group, { createCADPart }) => {
        const slabGeo = new THREE.BoxGeometry(width * 0.5, 1.6, length);
        slabGeo.rotateZ(0.28);
        group.add(
          createCADPart(slabGeo, {
            fillColor: 0x0a1e2d,
            edgeColor: 0x00f0ff,
            opacity: 0.92,
          })
        );
      },
    },

    // 6. Deep Asthenosphere / Upper Mantle Diorama Base (Foundation)
    {
      id: "mantle_asthenosphere_base",
      label: "Viscoelastic Upper Mantle & Asthenosphere",
      stationCode: "STA-06",
      category: "electronics",
      basePosition: [0, -3.8, 0],
      explodeOffset: [0, -2.8, 0],
      metrics: "TEMPERATURE: 1,350°C // DUCTILE CONVECTIVE SOLID",
      buildGeometry: (group, { createCADPart }) => {
        const mantleGeo = new THREE.BoxGeometry(width + 0.4, 1.4, length + 0.4);
        group.add(
          createCADPart(mantleGeo, {
            fillColor: 0x081a28,
            edgeColor: 0x10b981,
            opacity: 0.95,
          })
        );
      },
    },
  ];
}
