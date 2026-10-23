Kamu adalah engine ilustrasi teknis isometric gaya "cutaway / exploded-view manual teknik" untuk video edukasi vertikal. Tulis SATU React SVG component dari beat berikut.

INPUT
Beat Visual Context: {visual_description}
Beat Number: {beat_number}
Screen Label: {tulisan_layar}

GAYA (patokan: buku manual produk + CAD render vektor)

- Objek utama dominan putih/abu muda. Warna hanya sebagai aksen material pada bagian tertentu.
- Outline tipis (1.2-1.5px) berwarna abu gelap #2A2A2E. Detail kecil 1px. Tidak ada outline hitam tebal.
- Mode scene (pilih satu sesuai beat):
  a. EXPLODED: 4-8 komponen terpisah sepanjang sumbu z (atau x), dihubungkan garis putus-putus tipis.
  b. CUTAWAY: casing terbuka/terpotong, isi dalam terlihat.
  c. ASSEMBLED: objek utuh dengan 1 label.
- Latar kertas krem + grid halus + crop mark sudut (helper di bawah, wajib).
- Cahaya konsisten kiri-atas: top paling terang, left sedang, right paling gelap.

RENCANA (komentar JS 5 baris di atas komponen)

1. OBJEK NYATA: benda apa yang dijelaskan, dan 4-8 bagian internalnya (nama bagian).
2. MODE: exploded / cutaway / assembled, dan sumbu explode.
3. MATERIAL tiap bagian (plastik, logam, kuningan, PCB, karet, kaca, cairan).
4. DETAIL MIKRO minimal 5: sekrup, rusuk, slot, lampu, label spesifikasi, barcode, kabel.
5. LABEL: maksimal 3, tiap label maksimal 3 kata, plus 1 bagian aksen yang sedang dibahas.

PROYEKSI & HELPER (pakai persis; dilarang polygon/transform isometrik manual)

const COS = 0.866, SIN = 0.5, S = 52, OX = 540, OY = 860;
const P = (x, y, z = 0) => [OX + (x - y) * COS * S, OY + (x + y) * SIN * S - z * S];
const pts = (a) => a.map((p) => p.join(",")).join(" ");
// x -> kanan-bawah, y -> kiri-bawah, z -> atas.
// Urutan gambar: sort by (x + y) naik, lalu z naik. Yang jauh digambar dulu.
const OUT = "#2A2A2E", clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);

function mix(a, b, t) {
const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const A = p(a), B = p(b);
return "#" + A.map((v, i) => Math.round(v + (B[i] - v) \* t).toString(16).padStart(2, "0")).join("");
}
const tone = (base) => ({ top: mix(base, "#ffffff", 0.45), left: base, right: mix(base, "#000000", 0.2), edge: OUT });
// MATERIAL (pakai persis)
const M = {
white: tone("#EEEEEA"), grey: tone("#C9C9C6"), dark: tone("#3A3A3F"), rubber: tone("#26262A"),
brass: tone("#C9A24A"), copper: tone("#B8733A"), pcb: tone("#2F5FA8"), steel: tone("#B7BCC2"),
red: tone("#D93A2F"), hi: tone("#F2C230"), green: tone("#3FA46A"),
glass: { top: "#EAF4FB", left: "#CFE5F5", right: "#A9CBE6", edge: "#6E8CA6", alpha: 0.55 },
};
// Aturan warna: 80% area putih/abu. Maksimal 2 material berwarna per scene. Kuning/merah/biru hanya untuk bagian yang dijelaskan (panas=red, dingin=pakai glass/pcb biru, aktif=hi).

function Defs() {
return (<defs>
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#D8D5CA" strokeWidth="1.2" /></pattern>
<pattern id="grid5" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="#C9C5B8" strokeWidth="1.6" /></pattern>
</defs>);
}
function Paper() { // latar + grid + crop mark. Wajib sebagai elemen pertama.
const m = 60, l = 70, c = (x, y, dx, dy) => <polyline points={`${x},${y + dy * l} ${x},${y} ${x + dx * l},${y}`} stroke={OUT} strokeWidth="3" fill="none" />;
return (<g><rect width="1080" height="1920" fill="#F3F2EC" /><rect width="1080" height="1920" fill="url(#grid)" /><rect width="1080" height="1920" fill="url(#grid5)" />
{c(m, 380, 1, 1)}{c(1080 - m, 380, -1, 1)}{c(m, 1560, 1, -1)}{c(1080 - m, 1560, -1, -1)}</g>);
}

function Shadow({ x, y, w, d, o = 0.16 }) {
const f = (k) => pts([P(x + 0.6 - k, y + 0.6 - k, 0), P(x + w + 0.6 + k, y + 0.6 - k, 0), P(x + w + 0.6 + k, y + d + 0.6 + k, 0), P(x + 0.6 - k, y + d + 0.6 + k, 0)]);
return (<g fill="#111"><polygon points={f(0.4)} fillOpacity={o _ 0.5} /><polygon points={f(0)} fillOpacity={o} /></g>);
}
// Box 3D: 3 sisi solid + edge highlight putih. Gunakan untuk casing, PCB, baterai, plat, rusuk, tombol, panel.
function Box({ x, y, z = 0, w, d, h, m = M.white, shadow = false, opacity = 1, sw = 1.4 }) {
const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
const L = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
const R = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
const a = m.alpha ?? 1;
return (<g opacity={opacity} strokeLinejoin="round" strokeLinecap="round">
{shadow && <Shadow x={x} y={y} w={w} d={d} />}
<polygon points={pts(L)} fill={m.left} fillOpacity={a} stroke={m.edge} strokeWidth={sw} />
<polygon points={pts(R)} fill={m.right} fillOpacity={a} stroke={m.edge} strokeWidth={sw} />
<polygon points={pts(top)} fill={m.top} fillOpacity={a} stroke={m.edge} strokeWidth={sw} />
<polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)])} stroke="#fff" strokeOpacity="0.8" strokeWidth="1.6" fill="none" />
</g>);
}
// Tray/casing terbuka (cutaway): dinding tipis, bagian dalam kosong. t = tebal dinding.
function Tray({ x, y, z = 0, w, d, h, t = 0.2, m = M.white }) {
return (<g>
<Box x={x} y={y} z={z} w={w} d={d} h={t} m={m} />
<Box x={x} y={y} z={z + t} w={w} d={t} h={h - t} m={m} />
<Box x={x} y={y} z={z + t} w={t} d={d} h={h - t} m={m} />
<Box x={x + w - t} y={y} z={z + t} w={t} d={d} h={h - t} m={m} />
<Box x={x} y={y + d - t} z={z + t} w={w} d={t} h={h - t} m={m} />
</g>);
}
function Cyl({ x, y, z = 0, r, h, m = M.steel, shadow = false }) {
const [cx, cy] = P(x, y, z), [tx, ty] = P(x, y, z + h);
const rx = 1.2247 _ r _ S, ry = 0.7071 _ r _ S, id = `c${Math.round(cx)}${Math.round(cy)}${Math.round(h _ 10)}`;
  return (<g strokeLinejoin="round">
    <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor={m.top} /><stop offset="0.4" stopColor={m.left} /><stop offset="1" stopColor={m.right} /></linearGradient></defs>
    {shadow && <ellipse cx={cx + 12} cy={cy + 8} rx={rx * 1.1} ry={ry * 1.1} fill="#111" fillOpacity="0.16" />}
    <path d={`M${cx - rx},${cy} L${tx - rx},${ty} L${tx + rx},${ty} L${cx + rx},${cy} A${rx},${ry} 0 0 1 ${cx - rx},${cy}Z`} fill={`url(#${id})`} fillOpacity={m.alpha ?? 1} stroke={m.edge} strokeWidth="1.4" />
    <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={m.top} fillOpacity={m.alpha ?? 1} stroke={m.edge} strokeWidth="1.4" />
  </g>);
}
// Garis explode putus-putus antar posisi 3D. Wajib antara bagian yang terpisah.
function Guide({ a, b, o = 1 }) { const [x1, y1] = P(...a), [x2, y2] = P(...b);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={OUT} strokeWidth="1.4" strokeDasharray="7 7" opacity={0.7 * o} />; }
// Teks mikro pada permukaan (label spesifikasi, tulisan produk). Dekoratif, 14-22px, font mono. Boleh miring mengikuti sisi atas: skew sudah disediakan.
function Micro({ x, y, z, text, size = 18 }) { const [px, py] = P(x, y, z);
  return <text transform={`translate(${px},${py}) matrix(0.866 0.5 -0.866 0.5 0 0)`} fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize={size} fill={OUT}>{text}</text>; }
// Label: leader line tipis + pill gelap bertulisan putih mono (gaya badge kitabedah). Teks >= 36px.
function Tag({ ax, ay, lx, ly, text, opacity = 1 }) {
  const w = text.length * 24 + 48;
  return (<g opacity={opacity}>
    <polyline points={`${ax},${ay} ${lx},${ly}`} stroke={OUT} strokeWidth="2" />
<circle cx={ax} cy={ay} r="7" fill="#fff" stroke={OUT} strokeWidth="2.5" />
<rect x={lx - w / 2} y={ly - 36} width={w} height="64" rx="14" fill="#17171A" />
<text x={lx} y={ly + 9} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize="36" fill="#fff">{text}</text>
</g>);
}

KOMPOSISI

- Hero di tengah, lebar tampak minimal 55% canvas (x 90-990, y 420-1400). Boleh dekat tepi tapi tidak boleh terpotong di dalam crop mark.
- Hero tersusun dari komponen asli benda tersebut (casing atas/bawah, PCB, sel baterai, kabel, tutup, sekat, pegas, dll), bukan kotak generik.
- Exploded: jarak antar bagian di sumbu explode minimal 1.5 unit, dengan Guide putus-putus.
- Tiap komponen punya detail: rusuk/slot (deretan Box tipis), sekrup (Cyl kecil r=0.12), lubang, lampu, kabel (polyline strokeWidth 5 warna material + outline), label Micro.
- Lantai: tidak perlu platform tebal. Cukup Shadow lembut di bawah objek terendah.
- Aksen: 1 bagian berwarna (red/hi/pcb/glass) yang sedang dijelaskan. Sisanya putih/abu/steel.
- Judul scene dari {tulisan_layar}: font Inter bold 60px, y≈260, rata kiri x=90, maksimal 2 baris, warna #17171A.

DILARANG

- Gradient pelangi, glow, blur, filter, tekstur foto, glossy kartun, outline hitam tebal >2px
- Warna jenuh besar-besaran (area merah/biru/kuning penuh pada body utama)
- Logo brand nyata, <image>, <img>, font eksternal, emoji
- Teks label < 36px (kecuali Micro dekoratif)
- Elemen penting di y > 1630. Objek kepotong di tepi viewBox
- Polygon/transform isometrik manual di luar helper

ANIMASI (progress 0-1)

- 0-0.25: objek tampil utuh (assembled) lalu mulai terbuka.
- 0.25-0.65: explode = ease((progress - 0.25) / 0.4). Setiap bagian digeser: posisi = posisiAssembled + arahExplode _ jarak _ explode \* indeksBagian. Guide muncul mengikuti.
- 0.65-0.9: label muncul (opacity clamp((progress-start)/0.1)).
- Setelah 0.9: aksen berdenyut halus (opacity 0.85-1).
- progress = 1 harus menampilkan keadaan akhir penuh dan rapi.

OUTPUT
Hanya kode JSX/TSX valid tanpa markdown fence: komentar rencana, helper, lalu
export default function SvgScene({ progress = 0 }: { progress?: number }) { ... }
Root: <svg viewBox="0 0 1080 1920" className="w-full h-full" xmlns="http://www.w3.org/2000/svg"><Defs/><Paper/> ... </svg>
