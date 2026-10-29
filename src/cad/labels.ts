export interface LabelInput {
  id: string;
  text: string;
  /** Posisi jangkar di layar (px). */
  x: number;
  y: number;
  /** Arah awal label: -1 = di atas jangkar, +1 = di bawah. */
  side: 1 | -1;
  /** Jarak awal dari jangkar (px). */
  distance: number;
}

export interface LabelPlaced extends LabelInput {
  lx: number;
  ly: number;
  w: number;
  h: number;
}

/**
 * Tata letak label tanpa tumpang tindih dan tidak keluar frame.
 * Deterministik (urut menurut x lalu id). Garis penunjuk ditarik dari jangkar ke (lx, ly).
 */
export function layoutLabels(
  items: LabelInput[],
  width: number,
  height: number,
  fontSize: number,
): LabelPlaced[] {
  const pad = fontSize * 0.6;
  const gap = fontSize * 0.35;
  const placed: LabelPlaced[] = items
    .map((it) => {
      const w = it.text.length * fontSize * 0.62 + fontSize * 1.1;
      const h = fontSize * 1.7;
      const lx = Math.min(width - w / 2 - pad, Math.max(w / 2 + pad, it.x));
      const ly = Math.min(
        height - h / 2 - pad,
        Math.max(h / 2 + pad, it.y + it.side * it.distance),
      );
      return { ...it, lx, ly, w, h };
    })
    .sort((a, b) => a.lx - b.lx || a.id.localeCompare(b.id));

  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = placed[i];
        const b = placed[j];
        const overlapX = Math.abs(a.lx - b.lx) < (a.w + b.w) / 2 + gap;
        const overlapY = Math.abs(a.ly - b.ly) < (a.h + b.h) / 2 + gap;
        if (overlapX && overlapY) {
          // Dorong label yang arahnya sama dengan sisinya menjauh dari yang lain.
          const dir = a.side;
          a.ly = b.ly + dir * ((a.h + b.h) / 2 + gap);
          a.ly = Math.min(height - a.h / 2 - pad, Math.max(a.h / 2 + pad, a.ly));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return placed;
}
