/**
 * Deterministic pseudo-random number generator for jitter-free animations
 */
export function seededRandom(seed: string | number): () => number {
  let s = 123456789;
  if (typeof seed === "number") {
    s = Math.floor(Math.abs(seed)) + 1;
  } else if (typeof seed === "string") {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    s = Math.abs(hash) + 1;
  }

  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
