import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Pembaca skill (folder berisi SKILL.md) dari `src/skills`.
 * Skill diperlakukan sebagai DATA: kita hanya membaca teksnya lalu menyuntikkan
 * potongan yang relevan ke prompt agent. Tidak ada kode skill yang dieksekusi.
 */

export interface SkillEntry {
  /** Path relatif folder skill, mis. "pabrik/reels-hook-3s" atau "marketing-skills/social". */
  id: string;
  name: string;
  description: string;
  dir: string;
}

export function skillsRoot(): string {
  return process.env.SKILLS_DIR
    ? path.resolve(process.env.SKILLS_DIR)
    : path.join(process.cwd(), "src", "skills");
}

const SKIP_DIRS = new Set([
  "node_modules",
  "references",
  "scripts",
  "templates",
  "evals",
  "agents",
  "assets",
]);

export function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[kv[1]] = value;
  }
  return { meta, body: raw.slice(match[0].length) };
}

async function walk(root: string, dir: string, out: SkillEntry[], depth: number) {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  if (entries.some((entry) => entry.isFile() && entry.name === "SKILL.md")) {
    try {
      const raw = await fs.readFile(path.join(dir, "SKILL.md"), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const id = path.relative(root, dir).split(path.sep).join("/");
      const firstParagraph =
        body
          .split(/\n{2,}/)
          .map((part) => part.replace(/^#+\s.*$/gm, "").trim())
          .find((part) => part.length > 20) ?? "";
      out.push({
        id,
        name: meta.name || path.basename(dir),
        description: (meta.description || firstParagraph).slice(0, 600),
        dir,
      });
    } catch {
      /* skill rusak dilewati */
    }
  }

  if (depth >= 3) return;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) {
      continue;
    }
    await walk(root, path.join(dir, entry.name), out, depth + 1);
  }
}

let catalogCache: { root: string; promise: Promise<SkillEntry[]> } | null = null;

export function listSkills(): Promise<SkillEntry[]> {
  const root = skillsRoot();
  if (!catalogCache || catalogCache.root !== root) {
    const out: SkillEntry[] = [];
    catalogCache = {
      root,
      promise: walk(root, root, out, 0).then(() =>
        out.sort((a, b) => a.id.localeCompare(b.id)),
      ),
    };
  }
  return catalogCache.promise;
}

export function resetSkillCache() {
  catalogCache = null;
}

export async function getSkill(id: string): Promise<SkillEntry | null> {
  return (await listSkills()).find((skill) => skill.id === id) ?? null;
}

/** Isi markdown skill (tanpa frontmatter) atau salah satu file referensinya. */
export async function readSkillMarkdown(
  id: string,
  file?: string,
): Promise<string> {
  const skill = await getSkill(id);
  if (!skill) return "";
  const target = path.resolve(skill.dir, file ?? "SKILL.md");
  // Jangan keluar dari folder skill.
  if (!target.startsWith(path.resolve(skill.dir) + path.sep)) return "";
  try {
    const raw = await fs.readFile(target, "utf8");
    return parseFrontmatter(raw).body;
  } catch {
    return "";
  }
}

type SectionPattern = string | RegExp;

function matches(heading: string, patterns: SectionPattern[]) {
  const lower = heading.toLowerCase();
  return patterns.some((pattern) =>
    typeof pattern === "string"
      ? lower.includes(pattern.toLowerCase())
      : pattern.test(heading),
  );
}

/** Ambil section markdown yang judulnya cocok (sampai heading selevel/lebih tinggi berikutnya). */
export function extractSections(md: string, patterns: SectionPattern[]): string {
  const lines = md.split(/\r?\n/);
  const picked: string[] = [];
  let capturingLevel = 0;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const heading = !inFence ? line.match(/^(#{1,4})\s+(.*)$/) : null;

    if (heading) {
      const level = heading[1].length;
      if (capturingLevel && level <= capturingLevel) capturingLevel = 0;
      if (!capturingLevel && matches(heading[2], patterns)) {
        capturingLevel = level;
        picked.push(line);
        continue;
      }
    }
    if (capturingLevel) picked.push(line);
  }
  return picked.join("\n").trim();
}

/** Rapikan markdown dan potong di batas paragraf, tidak di tengah kata. */
export function condenseMarkdown(md: string, maxChars: number): string {
  const cleaned = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;

  const slice = cleaned.slice(0, maxChars);
  const paragraphEnd = slice.lastIndexOf("\n\n");
  const lineEnd = slice.lastIndexOf("\n");
  const cut =
    paragraphEnd > maxChars * 0.6
      ? paragraphEnd
      : lineEnd > maxChars * 0.6
        ? lineEnd
        : slice.lastIndexOf(" ");
  return `${slice.slice(0, Math.max(cut, 0)).trimEnd()}\n[...dipotong]`;
}
