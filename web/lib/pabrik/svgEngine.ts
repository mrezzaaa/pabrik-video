export interface BeatVisualInput {
  beat_number: number;
  text: string;
  visual: string;
  tulisan_layar: string;
  topic: string;
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sanitizeLlmSvg(raw: string): string | null {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return null;
  let svg = match[0];

  svg = svg.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  if (/progress|isActive|highlightOpacity|\?\s*["']/i.test(svg)) {
    return null;
  }

  svg = svg
    .replace(/strokeWidth=\{(\d+(?:\.\d+)?)\}/g, 'stroke-width="$1"')
    .replace(/strokeWidth="(\d+(?:\.\d+)?)"/g, 'stroke-width="$1"')
    .replace(/fontSize=\{(\d+(?:\.\d+)?)\}/g, 'font-size="$1"')
    .replace(/fontSize="(\d+(?:\.\d+)?)"/g, 'font-size="$1"')
    .replace(/fontWeight=\{(\d+|"[^"]+")\}/g, 'font-weight="$1"')
    .replace(/fontWeight="([^"]+)"/g, 'font-weight="$1"')
    .replace(/fontFamily="([^"]+)"/g, 'font-family="$1"')
    .replace(/textAnchor="([^"]+)"/g, 'text-anchor="$1"')
    .replace(/strokeDasharray="([^"]+)"/g, 'stroke-dasharray="$1"')
    .replace(/strokeLinecap="([^"]+)"/g, 'stroke-linecap="$1"')
    .replace(/floodColor="([^"]+)"/g, 'flood-color="$1"')
    .replace(/floodOpacity="([^"]+)"/g, 'flood-opacity="$1"')
    .replace(/className=/g, 'class=');

  if (/rotate\(-30\)\s*skewX\(30\)/i.test(svg) || /viewBox="0 0 1080 1920"/i.test(svg)) {
    return null;
  }

  if (/[{}]/.test(svg)) {
    return null;
  }

  return svg;
}

export function buildPrecisionIsometricSvg(input: BeatVisualInput): string {
  const { beat_number, tulisan_layar, visual, topic } = input;
  const combined = `${topic} ${visual} ${tulisan_layar}`.toLowerCase();

  const isThermalVessel = /tumbler|termos|botol|magic com|rice cooker|panci|kopi|air panas|es\b|suhu|vakum|dinding ganda/.test(combined);
  const isCoolingLoop = /freon|ac\b|pendingin|kompresor|evaporator|kondensor|kulkas|pipa|bocoran/.test(combined);
  const isMechanicalDrive = /cvt|transmisi|mesin|motor|mobil|piston|gear|roda|rem|pesawat|turbin|oli/.test(combined);

  const isMythOrFaultBeat = beat_number === 2 || beat_number === 6 || beat_number === 7;
  const isCheckOrSafeBeat = beat_number === 3 || beat_number === 8 || beat_number === 10;
  const primaryAccent = isMythOrFaultBeat ? '#FF3B30' : isCheckOrSafeBeat ? '#30D158' : '#FFD60A';
  const secondaryAccent = beat_number % 2 === 0 ? '#FF3B30' : '#0A84FF';

  const cleanLabel = escapeXml(tulisan_layar.toUpperCase().slice(0, 24));
  const cleanSub = escapeXml(visual.slice(0, 42) + (visual.length > 42 ? '...' : ''));

  let mainAssembly = '';

  if (isThermalVessel) {
    mainAssembly = `
      <path d="M -130,-220 L -130,60 A 130,65 0 0,0 130,60 L 130,-220 Z" fill="#E5E5EA" stroke="#111111" stroke-width="3"/>
      <ellipse cx="0" cy="-220" rx="130" ry="65" fill="#D1D1D6" stroke="#111111" stroke-width="3"/>
      <path d="M -112,-205 L -112,42 A 112,56 0 0,0 112,42 L 112,-205 Z" fill="${beat_number === 3 || beat_number === 5 ? '#FFD60A' : '#111111'}" fill-opacity="${beat_number === 3 || beat_number === 5 ? '0.85' : '0.12'}" stroke="#111111" stroke-width="2" stroke-dasharray="6 4"/>
      <path d="M -92,-200 L -92,25 A 92,46 0 0,0 92,25 L 92,-200 Z" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
      <path d="M -86,-110 L -86,20 A 86,43 0 0,0 86,20 L 86,-110 Z" fill="${secondaryAccent}" fill-opacity="0.88" stroke="#111111" stroke-width="2.5"/>
      <ellipse cx="0" cy="-110" rx="86" ry="43" fill="${secondaryAccent}" stroke="#111111" stroke-width="2.5"/>
      <g transform="translate(-35, -95)">
        <polygon points="0,-18 22,-7 22,16 0,27 -22,16 -22,-7" fill="#FFFFFF" stroke="#111111" stroke-width="2"/>
        <polyline points="-22,-7 0,4 22,-7" fill="none" stroke="#111111" stroke-width="2"/>
        <line x1="0" y1="4" x2="0" y2="27" stroke="#111111" stroke-width="2"/>
      </g>
      <g transform="translate(32, -80)">
        <polygon points="0,-16 20,-6 20,14 0,24 -20,14 -20,-6" fill="#FFFFFF" stroke="#111111" stroke-width="2"/>
        <polyline points="-20,-6 0,4 20,-6" fill="none" stroke="#111111" stroke-width="2"/>
        <line x1="0" y1="4" x2="0" y2="24" stroke="#111111" stroke-width="2"/>
      </g>
      <rect x="-130" y="-220" width="38" height="265" fill="#FFD60A" stroke="#111111" stroke-width="3"/>
      <rect x="92" y="-220" width="38" height="265" fill="#FFD60A" stroke="#111111" stroke-width="3"/>
      <g transform="translate(0, ${beat_number === 4 || beat_number === 6 ? '-55' : '-15'})">
        <ellipse cx="0" cy="-235" rx="126" ry="60" fill="${beat_number === 6 || beat_number === 9 ? '#FF3B30' : '#30D158'}" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="-250" rx="130" ry="62" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="-255" rx="75" ry="34" fill="#E5E5EA" stroke="#111111" stroke-width="2.5"/>
      </g>
      <g stroke="#FF3B30" stroke-width="3">
        <line x1="-220" y1="-80" x2="-145" y2="-80" />
        <polygon points="-145,-80 -160,-88 -160,-72" fill="#FF3B30" />
        <line x1="220" y1="-80" x2="145" y2="-80" />
        <polygon points="145,-80 160,-88 160,-72" fill="#FF3B30" />
      </g>
    `;
  } else if (isCoolingLoop) {
    mainAssembly = `
      <path d="M -150,-40 L -210,-10 L -210,-170 L -60,-240 L 160,-150 L 160,20 L 20,90 Z" fill="none" stroke="#111111" stroke-width="16" stroke-linejoin="round"/>
      <path d="M -150,-40 L -210,-10 L -210,-170 L -60,-240 L 160,-150 L 160,20 L 20,90 Z" fill="none" stroke="${secondaryAccent}" stroke-width="8" stroke-dasharray="18 10" stroke-linejoin="round"/>
      <g transform="translate(-95, -50)">
        <path d="M -70,-120 L -70,20 A 70,35 0 0,0 70,20 L 70,-120 Z" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="-120" rx="70" ry="35" fill="${primaryAccent}" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="-120" rx="35" ry="17" fill="#111111"/>
      </g>
      <g transform="translate(95, -95)">
        <polygon points="0,-90 110,-35 0,20 -110,-35" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
        <polygon points="-110,-35 0,20 0,110 -110,55" fill="#E5E5EA" stroke="#111111" stroke-width="3"/>
        <polygon points="0,20 110,-35 110,55 0,110" fill="${secondaryAccent}" fill-opacity="0.85" stroke="#111111" stroke-width="3"/>
        <line x1="-85" y1="-5" x2="-15" y2="30" stroke="#111111" stroke-width="2"/>
        <line x1="-85" y1="15" x2="-15" y2="50" stroke="#111111" stroke-width="2"/>
        <line x1="-85" y1="35" x2="-15" y2="70" stroke="#111111" stroke-width="2"/>
      </g>
      <g transform="translate(0, -210)">
        <circle cx="0" cy="0" r="38" fill="#FFD60A" stroke="#111111" stroke-width="3"/>
        <circle cx="0" cy="0" r="28" fill="#FFFFFF" stroke="#111111" stroke-width="2"/>
        <line x1="0" y1="0" x2="16" y2="-14" stroke="#FF3B30" stroke-width="3" stroke-linecap="round"/>
      </g>
    `;
  } else if (isMechanicalDrive) {
    mainAssembly = `
      <polygon points="0,-190 210,-85 0,20 -210,-85" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
      <polygon points="-210,-85 0,20 0,95 -210,-10" fill="#E5E5EA" stroke="#111111" stroke-width="3"/>
      <polygon points="0,20 210,-85 210,-10 0,95" fill="#D1D1D6" stroke="#111111" stroke-width="3"/>
      <path d="M -95,-145 L 85,-65 L 85,-15 L -95,-95 Z" fill="${primaryAccent}" fill-opacity="0.85" stroke="#111111" stroke-width="3"/>
      <g transform="translate(-95, -125)">
        <ellipse cx="0" cy="25" rx="68" ry="34" fill="#D1D1D6" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="68" ry="34" fill="#FFD60A" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="24" ry="12" fill="#111111"/>
      </g>
      <g transform="translate(85, -55)">
        <ellipse cx="0" cy="25" rx="54" ry="27" fill="#D1D1D6" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="54" ry="27" fill="${secondaryAccent}" stroke="#111111" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="18" ry="9" fill="#111111"/>
      </g>
    `;
  } else {
    mainAssembly = `
      <polygon points="0,-220 200,-120 0,-20 -200,-120" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
      <polygon points="-200,-120 0,-20 0,90 -200,-10" fill="#E5E5EA" stroke="#111111" stroke-width="3"/>
      <polygon points="0,-20 200,-120 200,-10 0,90" fill="#D1D1D6" stroke="#111111" stroke-width="3"/>
      <g transform="translate(0, -95)">
        <polygon points="0,-85 110,-30 0,25 -110,-30" fill="${primaryAccent}" stroke="#111111" stroke-width="3"/>
        <polygon points="-110,-30 0,25 0,95 -110,40" fill="${secondaryAccent}" stroke="#111111" stroke-width="3"/>
        <polygon points="0,25 110,-30 110,40 0,95" fill="#FFD60A" stroke="#111111" stroke-width="3"/>
      </g>
      <line x1="-140" y1="-150" x2="-55" y2="-110" stroke="#111111" stroke-width="4"/>
      <circle cx="-140" cy="-150" r="14" fill="#30D158" stroke="#111111" stroke-width="3"/>
      <line x1="140" y1="-150" x2="55" y2="-110" stroke="#111111" stroke-width="4"/>
      <circle cx="140" cy="-150" r="14" fill="#FF3B30" stroke="#111111" stroke-width="3"/>
    `;
  }

  const statusOverlay = isMythOrFaultBeat
    ? `<g transform="translate(-210, -250)">
         <circle cx="0" cy="0" r="36" fill="#FF3B30" stroke="#111111" stroke-width="3"/>
         <line x1="-14" y1="-14" x2="14" y2="14" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
         <line x1="14" y1="-14" x2="-14" y2="14" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
       </g>`
    : `<g transform="translate(-210, -250)">
         <circle cx="0" cy="0" r="36" fill="#30D158" stroke="#111111" stroke-width="3"/>
         <polyline points="-15,2 -4,13 16,-11" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
       </g>`;

  return `<svg viewBox="0 0 800 800" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="isoShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="10" dy="10" stdDeviation="0" flood-color="#111111" flood-opacity="0.2"/>
      </filter>
    </defs>
    <g transform="translate(400, 470)">
      <polygon points="0,-165 310,-10 0,145 -310,-10" fill="#FFFFFF" stroke="#111111" stroke-width="3.5" filter="url(#isoShadow)"/>
      <polygon points="-310,-10 0,145 0,190 -310,35" fill="#E5E5EA" stroke="#111111" stroke-width="3.5"/>
      <polygon points="0,145 310,-10 310,35 0,190" fill="#D1D1D6" stroke="#111111" stroke-width="3.5"/>
      <line x1="-155" y1="-87" x2="155" y2="67" stroke="#111111" stroke-opacity="0.12" stroke-width="2"/>
      <line x1="-155" y1="67" x2="155" y2="-87" stroke="#111111" stroke-opacity="0.12" stroke-width="2"/>
      ${mainAssembly}
      ${statusOverlay}
      <g transform="translate(95, -275)">
        <polyline points="-45,55 -10,0 20,0" fill="none" stroke="#111111" stroke-width="3"/>
        <circle cx="-45" cy="55" r="6" fill="#FFD60A" stroke="#111111" stroke-width="2.5"/>
        <rect x="20" y="-28" width="240" height="52" rx="8" fill="#111111"/>
        <text x="140" y="4" fill="#FFD60A" font-size="17" font-weight="900" text-anchor="middle" font-family="Inter, system-ui, sans-serif">
          ${cleanLabel}
        </text>
      </g>
      <g transform="translate(0, 235)">
        <rect x="-260" y="-22" width="520" height="40" rx="8" fill="#FFFFFF" stroke="#111111" stroke-width="2.5"/>
        <text x="0" y="4" fill="#111111" font-size="14" font-weight="800" text-anchor="middle" font-family="Inter, monospace">
          BEAT 0${beat_number} // ${cleanSub}
        </text>
      </g>
    </g>
  </svg>`;
}
