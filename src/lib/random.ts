/**
 * Deterministic seeded pseudo-random number generator (Mulberry32).
 * Guarantees zero-jitter across renders with identical seed/jobId.
 */
export function createSeededRandom(seedStr: string): () => number {
  let h = 0xefc8249d;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x5bd1e995);
    h = ((h << 13) | (h >>> 19)) ^ 0x6e9ea37b;
  }
  let s = h >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed: string, salt = ""): number {
  return createSeededRandom(seed + salt)();
}
