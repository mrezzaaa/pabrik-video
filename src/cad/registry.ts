import type { CadSceneModule } from "./contract";
import { jetEngine } from "./scenes/jet-engine";

/** Scene yang sudah ada. Scene hasil LLM (commit 2) didaftarkan lewat loader terpisah. */
const FIXTURES: Record<string, CadSceneModule> = {
  [jetEngine.meta.id]: jetEngine,
};

export function getCadScene(id: string): CadSceneModule {
  const scene = FIXTURES[id];
  if (!scene) throw new Error(`Scene CAD tidak ditemukan: ${id}`);
  return scene;
}

export function listCadScenes(): string[] {
  return Object.keys(FIXTURES);
}
