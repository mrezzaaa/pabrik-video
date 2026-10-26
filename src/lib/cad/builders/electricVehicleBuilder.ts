import { ComposableAssemblySpec } from "../types";

export function buildElectricVehicle(params: Record<string, any> = {}): ComposableAssemblySpec[] {
  return [
    // 1. Aerodynamic Outer Car Body Silhouette (Shell)
    {
      id: "ev_car_body_shell",
      stationCode: "STA-01",
      label: "Aerodynamic Composite Car Body & Greenhouse",
      metrics: "Cd: 0.208 // ULTRA-LOW DRAG // ALUMINUM-STEEL HYBRID",
      category: "shell",
      primitiveType: "contoured_shell_body",
      dimensions: [2.4, 1.4, 5.2],
      basePosition: [0, 0.7, 0],
      explodeOffset: [0, 2.8, 0],
      isShell: true,
    },

    // 2. Skateboard Chassis Structural Frame (Structure)
    {
      id: "ev_skateboard_chassis",
      stationCode: "STA-02",
      label: "Skateboard Modular Chassis & Extruded Side Rails",
      metrics: "TORSIONAL RIGIDITY: 40,000 Nm/deg // CRASH CRUMPLE ZONES",
      category: "structure",
      primitiveType: "structural_frame_chassis",
      dimensions: [2.3, 0.35, 4.8],
      basePosition: [0, -0.3, 0],
      explodeOffset: [0, -1.2, 0],
    },

    // 3. 800V Structural Floor Battery Pack (Core / Energy)
    {
      id: "ev_battery_pack",
      stationCode: "STA-03",
      label: "800V Cell-to-Pack Skateboard Battery Grid",
      metrics: "CAPACITY: 85 kWh // LFP PRISMATIC CELLS // LIQUID COOLED",
      category: "core",
      primitiveType: "battery_pack_grid",
      dimensions: [2.1, 0.38, 3.6],
      basePosition: [0, -0.15, 0],
      explodeOffset: [0, -2.2, 0],
    },

    // 4. Front & Rear Dual SiC Inverters (Electronics)
    {
      id: "ev_dual_inverters",
      stationCode: "STA-04",
      label: "Dual Silicon Carbide (SiC) Power Inverters",
      metrics: "SWITCHING FREQ: 20 kHz // EFFICIENCY: 99.2% // 400 kW",
      category: "electronics",
      primitiveType: "pcb_stack_module",
      dimensions: [1.3, 0.32, 1.2],
      basePosition: [0, 0.35, 1.6],
      explodeOffset: [0, 1.6, 1.2],
    },

    // 5. Permanent Magnet Front & Rear Traction Motors (Rotor / Drive)
    {
      id: "ev_front_motor",
      stationCode: "STA-05",
      label: "High-RPM Hairpin Wound PMSM Traction Motor",
      metrics: "20,000 RPM // TORQUE: 350 Nm // HAIRPIN COPPER STATOR",
      category: "rotor",
      primitiveType: "cylinder_motor_stator",
      dimensions: [0.48, 1.2, 0.48], // [radius, length, radius]
      basePosition: [0, 0.05, 2.0],
      baseRotation: [0, 0, Math.PI / 2], // oriented along X axle
      explodeOffset: [0, 0, 1.8],
      rotationSpeed: 0.12,
      rotationAxis: "x",
    },

    // 6. 4 Wheel & Regenerative Brake Assemblies (Active Wheel Assembly)
    {
      id: "ev_front_left_wheel",
      stationCode: "STA-06",
      label: "20-Inch Aero Wheel & Regenerative Disc Brake",
      metrics: "255/40 R20 // 4-PISTON BARKING CALIPER // REGEN: 250 kW",
      category: "structure",
      primitiveType: "wheel_axle_assembly",
      dimensions: [0.85, 0.38, 0.85],
      basePosition: [1.38, 0, 1.8],
      explodeOffset: [1.8, 0, 0],
      rotationSpeed: 0.15,
      rotationAxis: "x",
    },
    {
      id: "ev_front_right_wheel",
      stationCode: "STA-06",
      label: "Front Right Aero Wheel & Brake Assembly",
      metrics: "255/40 R20 // BRAKE ROTOR VENTILATED",
      category: "structure",
      primitiveType: "wheel_axle_assembly",
      dimensions: [0.85, 0.38, 0.85],
      basePosition: [-1.38, 0, 1.8],
      baseRotation: [0, Math.PI, 0],
      explodeOffset: [-1.8, 0, 0],
      rotationSpeed: 0.15,
      rotationAxis: "x",
    },
    {
      id: "ev_rear_left_wheel",
      stationCode: "STA-06",
      label: "Rear Left Aero Wheel & Traction Hub",
      metrics: "255/40 R20 // ELECTRIC PARKING BRAKE",
      category: "structure",
      primitiveType: "wheel_axle_assembly",
      dimensions: [0.85, 0.38, 0.85],
      basePosition: [1.38, 0, -1.8],
      explodeOffset: [1.8, 0, 0],
      rotationSpeed: 0.15,
      rotationAxis: "x",
    },
    {
      id: "ev_rear_right_wheel",
      stationCode: "STA-06",
      label: "Rear Right Aero Wheel & Traction Hub",
      metrics: "255/40 R20 // REAR AXLE DRIVE",
      category: "structure",
      primitiveType: "wheel_axle_assembly",
      dimensions: [0.85, 0.38, 0.85],
      basePosition: [-1.38, 0, -1.8],
      baseRotation: [0, Math.PI, 0],
      explodeOffset: [-1.8, 0, 0],
      rotationSpeed: 0.15,
      rotationAxis: "x",
    },

    // 7. High-Voltage Orange Busbar & Harness Conduits (Thermal / Power)
    {
      id: "ev_hv_cables",
      stationCode: "STA-07",
      label: "High-Voltage Shielded Orange Power Busbars",
      metrics: "CURRENT RATING: 500A CONTINUOUS // DUAL-LAYER SHIELDING",
      category: "thermal",
      primitiveType: "high_voltage_cables",
      dimensions: [1.8, 0.8, 3.6],
      basePosition: [0, 0, 0],
      explodeOffset: [0, 1.0, 0],
    },
  ];
}
