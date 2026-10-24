import fs from "fs";
import path from "path";
import { z } from "zod";
import { ASSEMBLIES } from "../remotion/tech3d/assemblies";
import type { AssemblyDef } from "../remotion/tech3d/types";

/**
 * Assembly hasil rancangan LLM disimpan sebagai JSON di public/assets/_assemblies
 * (folder ini ada di volume `assets_data`, jadi bertahan setelah container restart).
 * Topik serupa di job berikutnya otomatis memakai ulang assembly yang sudah tersimpan.
 */

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const SavedAssemblySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  fits: z.string(),
  parts: z
    .array(
      z.object({
        id: z.string(),
        nameId: z.string(),
        role: z.string(),
        kind: z.enum(["cylinder", "tube", "box", "gear", "cone"]),
        position: Vec3Schema,
        params: z.record(z.string(), z.union([z.number(), z.string()])),
        explodeDir: Vec3Schema,
        explodeDistance: z.number(),
        spinZ: z.number().optional(),
        bob: z.object({ amp: z.number(), speed: z.number() }).optional(),
      })
    )
    .min(1),
});

export const assemblyDir = () =>
  path.join(process.cwd(), "public", "assets", "_assemblies");

export function loadSavedAssemblies(): Record<string, AssemblyDef> {
  const out: Record<string, AssemblyDef> = {};
  const dir = assemblyDir();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const parsed = SavedAssemblySchema.parse(
        JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))
      );
      out[parsed.id] = parsed as AssemblyDef;
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
          : (err as Error).message;
      console.warn(`[ASSEMBLY-STORE] Lewati file rusak ${f}: ${msg}`);
    }
  }
  return out;
}

/** Katalog gabungan: bawaan kode menang atas file tersimpan bila id-nya sama. */
export function getCatalog(): Record<string, AssemblyDef> {
  return { ...loadSavedAssemblies(), ...ASSEMBLIES };
}

export function saveAssembly(a: AssemblyDef): string {
  const dir = assemblyDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${a.id}.json`);
  fs.writeFileSync(file, JSON.stringify(a, null, 2));
  return file;
}
