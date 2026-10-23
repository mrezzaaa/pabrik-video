/**
 * Deterministic Depth Sorting & Backface Culling Engine
 *
 * Konvensi Depth Sort (Painter's Algorithm: Back-to-Front):
 * - Objek terjauh memiliki nilai (x + y + z) terkecil.
 * - Objek terdekat memiliki nilai (x + y + z) terbesar.
 * - Urutan gambar: nilai (x + y + z) rendah -> tinggi.
 *
 * Urutan Face di Dalam Part yang Sama:
 * 1. "left" (menghadap +y)
 * 2. "right" (menghadap +x)
 * 3. "cut" (dinding penampang)
 * 4. "top" (tutup atas +z)
 *
 * Material "glass":
 * - Ditumpuk di lapisan paling akhir (depthKey bonus) dengan opacity ~0.35 agar detail interior di baliknya tetap terlihat jelas.
 */

import { type Face3D } from "./primitives";
import { isFaceFacingCamera } from "./math";
import { type PaletteToken } from "./shading";

export interface RenderableFace extends Face3D {
  material: "solid" | "glass" | "cut";
  layerBias?: number;
  colorToken?: PaletteToken;
  emphasis?: "normal" | "focus" | "dim";
}

const ROLE_ORDER: Record<string, number> = {
  left: 0,
  right: 1,
  cut: 2,
  top: 3,
};

/**
 * Menyaring face yang membelakangi kamera (Backface Culling)
 * dan mengurutkan face dari belakang ke depan (Painter's Algorithm).
 */
export function sortFacesBackToFront(faces: RenderableFace[]): RenderableFace[] {
  // 1. Backface culling
  const visibleFaces = faces.filter((f) => isFaceFacingCamera(f.normal));

  // 2. Sorting back to front
  return visibleFaces.sort((a, b) => {
    // Material glass diposisikan di akhir dalam tie-break
    const aIsGlass = a.material === "glass" ? 1 : 0;
    const bIsGlass = b.material === "glass" ? 1 : 0;

    if (aIsGlass !== bIsGlass) {
      return aIsGlass - bIsGlass;
    }

    const aDepth = a.depthKey + (a.layerBias ?? 0);
    const bDepth = b.depthKey + (b.layerBias ?? 0);

    // Beda kedalaman signifikan (> 0.05 unit grid)
    if (Math.abs(aDepth - bDepth) > 0.05) {
      return aDepth - bDepth;
    }

    // Jika kedalaman setara dalam part yang sama, urutkan: left -> right -> cut -> top
    const aRoleOrder = ROLE_ORDER[a.role] ?? 1;
    const bRoleOrder = ROLE_ORDER[b.role] ?? 1;

    return aRoleOrder - bRoleOrder;
  });
}
