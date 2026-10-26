export function splitNarration(script: string): string[] {
  const byLine = script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parts = byLine.flatMap((line) =>
    line
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean),
  );

  if (parts.length >= 2) return parts;
  return script
    .split(/,\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
