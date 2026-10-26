---
name: cad-blueprint-3d-visualizer
description: Generates interactive single-file React + Three.js procedural 3D CAD Blueprint visualizations with dynamic cutaway sectioning, multi-axis exploded views, and telemetry HUDs for any physical object, infrastructure, or natural phenomenon.
---

# Procedural 3D CAD Blueprint Engine Skill

When asked to visualize, dissect, or build a 3D cutaway of any object, machine, structure, or phenomenon, NEVER use external `.gltf`/`.obj` assets and NEVER build naive primitive snowmen. Follow this strict 4-step engineering pipeline before outputting code.

---

## STEP 1: TOPOLOGICAL CLASSIFICATION & ROUTING

Analyze the requested subject and classify its primary and secondary components into one or more of these 5 archetypes:

### Archetype A: Axisymmetric / Cylindrical (Turbines, Rockets, Tunnels, Pipes, Motors, Lenses)

- **Primary Geometry**: `THREE.LatheGeometry` (for contoured profiles), `THREE.CylinderGeometry`, `THREE.TorusGeometry`, polar `InstancedMesh` arrays (`Math.cos/sin` loops for blades/bolts/coils).
- **Cutaway Method**: Parametric angle slicing (`thetaLength` / `phiLength` mapped to `cutawayAngle` from `0` to `1.5 * Math.PI`) on outer housings while keeping inner cores at `2 * Math.PI`.
- **Explode Vector**: Axial translation along the primary shaft centerline (`z_offset = base_z + stageIndex * explodeFactor * spacing`).

### Archetype B: Stratified / Linear Extrusion (Highways, Bridges, Armor Plates, Soil/Geological Layers, Cables, PCB Stackups)

- **Primary Geometry**: `THREE.ExtrudeGeometry` along paths (`CatmullRomCurve3` or linear cross-sections) or stacked `BoxGeometry` slabs with varied thickness and surface detail (corrugations, rebar grids, drainage channels).
- **Cutaway Method**: Stepped longitudinal slicing (`renderer.localClippingEnabled = true` with `new THREE.Plane(new THREE.Vector3(0, 0, -1), offset)` staggered differently per layer so lower layers stick out like a staircase).
- **Explode Vector**: Vertical delamination along the Y-axis (`y_offset = layerIndex * explodeFactor * gap`).

### Archetype C: Architectural / Structural Grid (Buildings, Data Centers, Ships, Factories, Bridges)

- **Primary Geometry**: Modular `InstancedMesh` structural matrices (columns, I-beams, trusses, foundation piles), `TubeGeometry` for MEP/piping networks, and translucent outer curtain walls.
- **Cutaway Method**: Dual-plane `THREE.Plane` clipping — Horizontal floor-by-floor sectioning (`Vector3(0, -1, 0)`) combined with vertical facade peeling (`Vector3(-1, 0, 0)`).
- **Explode Vector**: Vertical floor separation (Y-axis) + Lateral facade detachment (X/Z-axis outward from the structural core).

### Archetype D: Multi-Axis Mechanical & Mechatronic Assembly (Drones, VTOLs, Robotics, Vehicles, Satellites, IoT Hardware)

- **Primary Geometry**: Custom 2D `THREE.Shape` + `ExtrudeGeometry` for carbon plates/chassis/wings, `BoxGeometry` + micro-components for PCB stacks, `CylinderGeometry` for brushless motors/actuators, and `CatmullRomCurve3` + `TubeGeometry` for wiring harnesses.
- **Cutaway Method**: Selective shell opacity + local `THREE.Plane` slicing on outer aerodynamic fairings, canopies, and motor bells while leaving PCBs, stators, and frames intact.
- **Explode Vector**: **Spherical / Multi-Vector Explode**:
  - Central electronics/chassis stack -> Explodes Vertically (`+Y` / `-Y`).
  - Arms, wings, wheels, pods -> Explode Radially outward along their normal vector from center (`dirVector.clone().multiplyScalar(explodeFactor)`).
  - Sub-assemblies (e.g., motor bell + prop + stator) -> Explode along their local actuator axis.

### Archetype E: Dynamic Field / Continuum Phenomenon (Tsunamis, Earthquakes, Aerodynamic Airflow, Sonar/Radar, Thermal Plumes)

- **Primary Geometry**: High-density vertex grids (`PlaneGeometry(W, L, 128, 128)`) with real-time vertex shader or CPU `position.setY()` wave/fault math (Gerstner waves, tectonic slip vectors, vortex fields), paired with a solid 3D diorama block beneath it.
- **Cutaway Method**: Diorama Bounding-Box Cross-Section (4 vertical clipping planes forming a clean geological/fluid aquarium cube showing subterranean/underwater cross-sections).
- **Explode Vector**: Vertical stratum separation (Atmosphere / Fluid Column / Seabed Bathymetry / Tectonic Crust / Lithosphere).

---

## STEP 2: MANDATORY CAD BLUEPRINT VISUAL STANDARD (DUAL-PASS RENDERING)

Every component in the scene MUST be rendered using a helper function `createCADPart(geometry, options)` that produces a `THREE.Group` containing two passes:

1. **Surface Pass (`THREE.Mesh`)**:
   - Outer Casings / Fairings / Water / Glass: `MeshPhysicalMaterial` or `MeshStandardMaterial` with `transparent: true`, `opacity: 0.15` to `0.45`, `depthWrite: false`, `side: THREE.DoubleSide`, `roughness: 0.3`, `metalness: 0.6`.
   - Internal Cores / Structural Frames: `opacity: 0.85` to `1.0`, `depthWrite: true`, distinct engineering color coding (Cyan `#00f0ff` for primary structure, Amber `#f59e0b` for active/rotating/high-voltage parts, Emerald `#10b981` for PCBs/sensors, Red/Orange `#ef4444` for thermal/hazard/fluid zones).
2. **Vector Edge Pass (`THREE.LineSegments`)**:
   - Generated via `new THREE.EdgesGeometry(geometry, thresholdAngle)` (use `15` to `25` degrees).
   - Material: `new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.75 })`.

### Mandatory Helper Implementation:

Always define and use this exact helper function inside the Three.js scene setup:

```javascript
function createCADPart(
  geometry,
  {
    fillColor = 0x0f2942,
    edgeColor = 0x00f0ff,
    opacity = 0.85,
    isShell = false,
    clippingPlanes = [],
    edgeThreshold = 20,
  } = {},
) {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: fillColor,
    transparent: opacity < 1.0 || isShell,
    opacity: isShell ? Math.min(opacity, 0.35) : opacity,
    depthWrite: !isShell,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.6,
    clippingPlanes: clippingPlanes,
    clipIntersection: false,
  });

  const mesh = new THREE.Mesh(geometry, mat);
  group.add(mesh);

  const edgesGeo = new THREE.EdgesGeometry(geometry, edgeThreshold);
  const lineMat = new THREE.LineBasicMaterial({
    color: edgeColor,
    transparent: true,
    opacity: isShell ? 0.5 : 0.9,
    clippingPlanes: clippingPlanes,
  });
  const lines = new THREE.LineSegments(edgesGeo, lineMat);
  group.add(lines);

  return { group, mesh, lines, mat, lineMat };
}
```

### Universal Clipping Plane Setup (For Non-Cylindrical Cutaways):

When building Archetypes B, C, D, or E, enable local clipping on the renderer and drive plane constants via React state refs:

```javascript
renderer.localClippingEnabled = true;

// Primary sectioning plane (e.g., slicing along X, Y, or Z)
const sectionPlane = new THREE.Plane(
  new THREE.Vector3(-1, 0, 0),
  cutawayOffset,
);

// In the animation loop, update plane constant smoothly from state ref:
sectionPlane.constant = THREE.MathUtils.lerp(
  maxBounds,
  minBounds,
  cutawayRatioRef.current,
);
```

---

## STEP 3: PROCEDURAL DETAIL DENSITY RULES

Never render a component as a single empty box or cylinder. Enforce sub-component density:

- **Minimum 6 to 10 distinct mechanical/structural sub-systems** per visualization, each stored in its own `THREE.Group` with metadata (`id`, `name`, `station`, `material`, `specs`, `explodeVector`).
- **Fasteners, Ribs, & Stiffeners**: Add structural ribs, flanges, cooling fins, rebars, or mounting standoffs using polar or linear loops.
- **Dynamic Flow / Physics Particles**: Include a `THREE.Points` or vector-arrow system showing the active physics of the object (e.g., airflow streamlines through a drone/turbine, seismic P/S-wave rings in an earthquake, traffic load vectors on a highway, data/power flow in an IoT board).

---

## STEP 4: REQUIRED INTERACTIVE UI & TELEMETRY HUD

Wrap the Three.js viewport in a full-screen dark technical CAD interface (`#050b14` background, monospace typography, cyan/amber borders):

1. **Viewport Controls**:
   - Camera Projection Toggle: `Perspective` vs `Orthographic` (True CAD Isometric, Top, Side, Front views).
   - Self-contained spherical orbital/pan/zoom camera controller implemented via pointer and wheel events on the canvas (do not rely on external OrbitControls imports that may fail to resolve).
2. **Dissection Sliders**:
   - `Cutaway Section Slider` (0% to 100%): Drives either angular `thetaLength` or `THREE.Plane` constant offset.
   - `Exploded View Slider` (0% to 100%): Drives multi-axis component separation vectors (`group.position.lerpVectors(basePos, explodedPos, explodeFactor)`).
   - `Shell / Casing Opacity Slider` (0% to 100%).
   - `Simulation / Physics Intensity Slider` (e.g., Throttle RPM, Wave Magnitude, Structural Load, Flight Pitch).
3. **Interactive Sub-Assembly Inspector**:
   - Clicking a sub-system in the 3D view (via `THREE.Raycaster`) or in the left-hand hierarchy tree isolates/highlights its wireframe in bright amber/white, focuses the camera target on that stage, and displays engineering specifications (Material, Dimensions, Mass/Load, Operating Metrics).
