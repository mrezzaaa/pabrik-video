/**
 * Ubah teks tampilan menjadi teks ucapan bahasa Indonesia untuk TTS.
 * Caption tetap memakai teks asli (angka tetap digit); hanya input TTS yang diubah,
 * sehingga mesin suara tidak salah baca "1.500" atau "40%".
 */

const ONES = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
const SCALES: [number, string][] = [
  [1_000_000_000_000, "triliun"],
  [1_000_000_000, "miliar"],
  [1_000_000, "juta"],
];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ONES[n];
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${ONES[n - 10]} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rest = n % 10;
    return `${ONES[tens]} puluh${rest ? ` ${ONES[rest]}` : ""}`;
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds === 1 ? "seratus" : `${ONES[hundreds]} ratus`;
  return rest ? `${head} ${below1000(rest)}` : head;
}

export function cardinal(input: number): string {
  let n = Math.trunc(input);
  if (n < 0) return `minus ${cardinal(-n)}`;
  if (n === 0) return "nol";

  const parts: string[] = [];
  for (const [value, name] of SCALES) {
    if (n >= value) {
      const count = Math.floor(n / value);
      parts.push(`${cardinal(count)} ${name}`);
      n %= value;
    }
  }
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    parts.push(thousands === 1 ? "seribu" : `${below1000(thousands)} ribu`);
    n %= 1000;
  }
  if (n > 0) parts.push(below1000(n));
  return parts.join(" ");
}

/** "1.500" -> 1500, "3,5" -> desimal, "2025" -> 2025. */
function numberToWords(raw: string): string {
  const thousands = /^\d{1,3}(\.\d{3})+(,\d+)?$/;
  let intPart = raw;
  let decPart = "";

  if (thousands.test(raw)) {
    const [i, d] = raw.replace(/\./g, "").split(",");
    intPart = i;
    decPart = d ?? "";
  } else if (/^\d+[.,]\d+$/.test(raw)) {
    [intPart, decPart] = raw.split(/[.,]/);
  } else if (!/^\d+$/.test(raw)) {
    return raw;
  }

  if (intPart.length > 15) return raw.split("").map((c) => ONES[Number(c)] ?? c).join(" ");
  const base = cardinal(Number(intPart));
  if (!decPart) return base;
  const digits = decPart.split("").map((c) => ONES[Number(c)]).join(" ");
  return `${base} koma ${digits}`;
}

const NUM = String.raw`\d+(?:\.\d{3})*(?:[.,]\d+)?`;

/** [pola satuan, flag regex, ucapan]. Urutan penting: yang spesifik lebih dulu. */
const UNITS: [string, string, string][] = [
  [String.raw`km\s*\/\s*(?:jam|h)`, "iu", "kilometer per jam"],
  [String.raw`m\s*\/\s*(?:s|detik)`, "iu", "meter per detik"],
  [String.raw`°\s*C`, "iu", "derajat Celsius"],
  [String.raw`°\s*F`, "iu", "derajat Fahrenheit"],
  [String.raw`kwh`, "iu", "kilowatt jam"],
  [String.raw`rpm`, "iu", "putaran per menit"],
  [String.raw`km`, "iu", "kilometer"],
  [String.raw`kg`, "iu", "kilogram"],
  [String.raw`mg`, "iu", "miligram"],
  [String.raw`cm`, "iu", "sentimeter"],
  [String.raw`mm`, "iu", "milimeter"],
  [String.raw`ml`, "iu", "mililiter"],
  [String.raw`kw`, "iu", "kilowatt"],
  [String.raw`hz`, "iu", "hertz"],
  [String.raw`m`, "u", "meter"],
  [String.raw`l`, "u", "liter"],
];

const WORD_FIXES: [RegExp, string][] = [
  [/\bdll\b\.?/gi, "dan lain-lain"],
  [/\bdsb\b\.?/gi, "dan sebagainya"],
  [/\byg\b/gi, "yang"],
  [/\bdgn\b/gi, "dengan"],
  [/\btdk\b/gi, "tidak"],
  [/\bsbg\b/gi, "sebagai"],
  [/&/g, " dan "],
];

export function toSpokenIndonesian(input: string): string {
  let text = input;

  // Rupiah: "Rp 5.000" / "Rp5.000.000"
  text = text.replace(new RegExp(String.raw`\bRp\.?\s*(${NUM})`, "g"), (_m, n: string) => `${numberToWords(n)} rupiah`);

  // Persen: "40%" / "12,5 %"
  text = text.replace(new RegExp(`(${NUM})\\s*%`, "g"), (_m, n: string) => `${numberToWords(n)} persen`);

  // Ordinal "ke-3" -> "ketiga"
  text = text.replace(/\bke-(\d+)\b/gi, (_m, n: string) => `ke${numberToWords(n)}`);

  // Rentang "5-10" -> "lima sampai sepuluh" (hanya bila kedua sisi angka murni)
  text = text.replace(/\b(\d+)\s*[-–]\s*(\d+)\b/g, (_m, a: string, b: string) => `${numberToWords(a)} sampai ${numberToWords(b)}`);

  // Angka + satuan
  for (const [unit, flags, spoken] of UNITS) {
    text = text.replace(
      new RegExp(`(${NUM})\\s*${unit}(?![\\p{L}\\d])`, `g${flags}`),
      (_m, n: string) => `${numberToWords(n)} ${spoken}`,
    );
  }

  // Angka biasa (tahun, bilangan, desimal)
  text = text.replace(new RegExp(NUM, "g"), (n) => numberToWords(n));

  for (const [pattern, spoken] of WORD_FIXES) text = text.replace(pattern, spoken);

  return text
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
