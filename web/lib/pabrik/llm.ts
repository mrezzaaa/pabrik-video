export type LLM = (req: {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;

/** Adapter Anthropic. Ganti isi fungsi ini kalau kamu pakai provider lain; signature LLM tetap sama. */
export function anthropicLLM(model: string, apiKey = process.env.ANTHROPIC_API_KEY ?? ""): LLM {
  return async ({ prompt, temperature = 0.4, maxTokens = 8000 }) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return data.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
  };
}

/** Isi placeholder {nama} dengan nilai. Hanya kunci yang diberikan yang diganti, kurung kurawal lain aman. */
export function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
  return out;
}

export function extractJSON(raw: string): any {
  const s = raw.replace(/```json|```/g, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("tidak ada objek JSON di output");
  return JSON.parse(s.slice(a, b + 1));
}

export type Checked<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/**
 * Panggil LLM, cek hasilnya, dan kalau gagal kirim ulang dengan daftar error spesifik.
 * Ini inti dari "validasi lalu retry" di semua tahap.
 */
export async function callChecked<T>(
  llm: LLM,
  prompt: string,
  check: (raw: string) => Checked<T>,
  opts: { retries?: number; temperature?: number; maxTokens?: number; label?: string } = {},
): Promise<T> {
  const { retries = 2, temperature = 0.4, maxTokens, label = "llm" } = opts;
  let current = prompt;
  let lastErrors: string[] = [];
  for (let i = 0; i <= retries; i++) {
    const raw = await llm({ prompt: current, temperature, maxTokens });
    const r = check(raw);
    if (r.ok) return r.value;
    lastErrors = r.errors;
    current =
      prompt +
      `\n\nOUTPUT SEBELUMNYA DITOLAK OLEH VALIDATOR. Perbaiki SEMUA masalah berikut lalu kembalikan output lengkap dengan format yang sama:\n- ` +
      r.errors.slice(0, 15).join("\n- ") +
      `\n\nOutput yang ditolak:\n${raw.slice(0, 6000)}`;
  }
  throw new Error(`[${label}] gagal setelah ${retries + 1} percobaan:\n- ${lastErrors.join("\n- ")}`);
}

export function callJSON<T>(
  llm: LLM,
  prompt: string,
  validate: (x: any) => string[],
  opts: { retries?: number; temperature?: number; maxTokens?: number; label?: string } = {},
): Promise<T> {
  return callChecked<T>(
    llm,
    prompt,
    (raw) => {
      let obj: any;
      try {
        obj = extractJSON(raw);
      } catch (e: any) {
        return { ok: false, errors: [`JSON tidak valid: ${e.message}`] };
      }
      const errors = validate(obj);
      return errors.length ? { ok: false, errors } : { ok: true, value: obj as T };
    },
    opts,
  );
}
