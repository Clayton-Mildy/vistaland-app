// Generates the illustrated sample "photos" used by the simulated AI demo.
// Run: node scripts/gen-samples.mjs  (writes public/samples/*.svg)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/samples');
fs.mkdirSync(out, { recursive: true });

const grain = `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/></filter>`;
const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><defs>${grain}${defs}</defs>${body}<rect width="800" height="600" filter="url(#g)"/></svg>\n`;
const vignette = `<radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.28"/></radialGradient>`;
const shade = `<rect width="800" height="600" fill="url(#v)"/>`;

const wall = (c, top = '#F4EFE6') => `<rect width="800" height="600" fill="${c}"/><rect width="800" height="70" fill="${top}"/><rect y="70" width="800" height="8" fill="#000" opacity="0.06"/><rect y="560" width="800" height="40" fill="#CFC6B6"/><rect y="556" width="800" height="6" fill="#B9AE9B"/>`;

const damp = (opacity) => wall('#E7DECF') + (opacity > 0
  ? `<g opacity="${opacity}"><ellipse cx="420" cy="150" rx="190" ry="95" fill="url(#st)"/><ellipse cx="330" cy="200" rx="120" ry="80" fill="url(#st)"/><ellipse cx="520" cy="230" rx="90" ry="70" fill="url(#st)"/><path d="M360 230 q8 90 -4 160 M450 250 q-6 70 6 130 M520 290 q5 50 -3 90" stroke="#7A5A36" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.5"/></g>`
  : `<rect x="250" y="90" width="340" height="260" fill="#EFE8DB" opacity="0.7"/>`) + shade;
const stainDef = `<radialGradient id="st"><stop offset="0%" stop-color="#6E4E2C" stop-opacity="0.75"/><stop offset="70%" stop-color="#8C6A43" stop-opacity="0.35"/><stop offset="100%" stop-color="#8C6A43" stop-opacity="0"/></radialGradient>`;

const tiles = (crack, uneven) => {
  let g = '<rect width="800" height="600" fill="#D9D3C7"/>';
  for (let y = 0; y < 600; y += 120) for (let x = 0; x < 800; x += 120) g += `<rect x="${x + 3}" y="${y + 3}" width="114" height="114" fill="#EEE9DF"/><rect x="${x + 3}" y="${y + 3}" width="114" height="114" fill="url(#tl)" opacity="0.5"/>`;
  g += '<rect width="800" height="150" fill="#5B6470"/><rect y="110" width="800" height="40" fill="#3E4650"/><circle cx="300" cy="60" r="34" fill="#2B3138"/><circle cx="500" cy="60" r="34" fill="#2B3138"/>';
  if (crack) g += `<path d="M300 300 L345 338 L330 372 L380 405 L372 448 L420 470" stroke="#3A332B" stroke-width="${uneven ? 3 : 4.5}" fill="none" stroke-linejoin="round"/><path d="M345 338 L372 330 M380 405 L405 398" stroke="#3A332B" stroke-width="2.5"/>`;
  if (uneven) g += `<rect x="241" y="243" width="240" height="6" fill="#9C9384"/><rect x="361" y="243" width="6" height="240" fill="#A8A091"/>`;
  return g + shade;
};
const tileDef = `<linearGradient id="tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfc7b8"/></linearGradient>`;

const paint = (state) => wall('#D5E2E6', '#EEF3F4') + (state === 'fixed'
  ? `<rect x="140" y="170" width="430" height="260" fill="#DCE8EB"/>`
  : `<g><path d="M170 190 l60 -18 l40 30 l70 -12 l30 50 l-20 60 l40 40 l-60 50 l-80 -10 l-50 30 l-40 -60 l-30 -70z" fill="#F2EEE4" stroke="#B9C3C6" stroke-width="4"/><path d="M420 240 l50 -10 l30 40 l-10 50 l-60 20 l-30 -40z" fill="#F2EEE4" stroke="#B9C3C6" stroke-width="4"/>${state === 'before' ? '<path d="M230 172 q30 -40 70 -10 q-30 0 -40 30z" fill="#C9D7DB"/><path d="M470 230 q30 -30 50 0 q-25 -5 -30 20z" fill="#C9D7DB"/>' : ''}</g>`) + shade;

const crack = (state) => wall('#ECE4D7') + (state === 'fixed'
  ? `<path d="M400 78 L410 160 L385 240 L415 330 L395 420 L410 556" stroke="#E2D8C8" stroke-width="14" fill="none" stroke-linecap="round"/>`
  : `<path d="M400 78 L410 160 L385 240 L415 330 L395 420 L410 556" stroke="${state === 'before' ? '#4A3F33' : '#7B6E5E'}" stroke-width="${state === 'before' ? 5 : 3}" fill="none" stroke-linejoin="round"/><path d="M385 240 L350 262 M415 330 L452 346 M395 420 L360 452" stroke="${state === 'before' ? '#4A3F33' : '#7B6E5E'}" stroke-width="3" fill="none"/>${state === 'notfixed' ? '<path d="M400 78 L410 160 L385 240" stroke="#D9CDBA" stroke-width="16" fill="none" opacity="0.8"/>' : ''}`) + shade;

const tap = (drips) => {
  let g = '<rect width="800" height="600" fill="#DDE9F0"/>';
  for (let y = 0; y < 600; y += 80) for (let x = 0; x < 800; x += 80) g += `<rect x="${x + 2}" y="${y + 2}" width="76" height="76" fill="#EAF2F6"/>`;
  g += '<rect x="170" y="330" width="460" height="40" rx="10" fill="#F7F7F5"/><ellipse cx="400" cy="372" rx="200" ry="70" fill="#FFFFFF"/><ellipse cx="400" cy="372" rx="160" ry="48" fill="#E3E8EA"/><circle cx="400" cy="380" r="9" fill="#9AA4AA"/>';
  g += '<rect x="385" y="170" width="30" height="110" rx="8" fill="#B8C1C7"/><path d="M400 180 h90 a20 20 0 0 1 20 20 v20 h-26 v-12 h-84z" fill="#C9D1D6"/><rect x="470" y="220" width="26" height="22" rx="4" fill="#A7B0B6"/><rect x="360" y="150" width="80" height="24" rx="10" fill="#9EA8AE"/>';
  if (drips) g += '<path d="M483 252 q-8 14 0 20 q8 -6 0 -20z" fill="#5AA9E6"/><path d="M483 290 q-7 12 0 18 q7 -6 0 -18z" fill="#5AA9E6"/><ellipse cx="483" cy="372" rx="40" ry="10" fill="#7DBDEB" opacity="0.6"/><ellipse cx="560" cy="520" rx="90" ry="14" fill="#7DBDEB" opacity="0.45"/>';
  return g + shade;
};

const clean = wall('#ECE6DC') + `<rect x="290" y="150" width="220" height="160" rx="6" fill="#8C6B4F"/><rect x="304" y="164" width="192" height="132" fill="#CFE0D8"/><path d="M304 296 L370 220 L420 270 L450 240 L496 296z" fill="#7FA48F"/><circle cx="455" cy="200" r="16" fill="#F1D48A"/><rect x="600" y="420" width="70" height="136" rx="8" fill="#B5815A"/><circle cx="635" cy="390" r="60" fill="#5E8F6A"/>` + shade;
const dark = `<rect width="800" height="600" fill="#1C1A17"/><g filter="url(#b)" opacity="0.6"><ellipse cx="380" cy="260" rx="220" ry="140" fill="#3A332B"/><rect x="200" y="420" width="400" height="80" fill="#2C2722"/></g>`;
const darkDef = `<filter id="b"><feGaussianBlur stdDeviation="18"/></filter>`;
const wrong = `<rect width="800" height="600" fill="#E9E4DA"/><rect x="250" y="90" width="230" height="470" fill="#8B5E3C"/><rect x="268" y="108" width="194" height="452" fill="#A87449"/><circle cx="440" cy="340" r="9" fill="#E3C27A"/><rect x="540" y="150" width="190" height="200" fill="#6F8FA6"/><rect x="540" y="150" width="190" height="200" fill="none" stroke="#F7F4EE" stroke-width="12"/><path d="M635 150 v200 M540 250 h190" stroke="#F7F4EE" stroke-width="8"/><rect y="560" width="800" height="40" fill="#C9BFAF"/>` + shade;

const signature = `<rect width="800" height="600" fill="#FFFFFF"/><path d="M180 360 C230 250 270 260 260 340 C252 400 300 300 340 320 C370 335 360 380 400 350 C440 320 470 260 500 330 C520 380 560 300 610 330" stroke="#1D2A44" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M170 420 H630" stroke="#CBD2DC" stroke-width="3"/>`;
const lease = `<rect width="800" height="600" fill="#EDEAE3"/><rect x="190" y="40" width="420" height="540" fill="#FFFFFF"/><rect x="250" y="80" width="300" height="20" fill="#2B3445"/>${Array.from({ length: 14 }, (_, i) => `<rect x="230" y="${140 + i * 26}" width="${i % 4 === 3 ? 220 : 340}" height="8" fill="#C9CED6"/>`).join('')}<path d="M420 520 c20 -30 40 -10 30 10 c-8 16 30 -20 50 -6" stroke="#1D2A44" stroke-width="4" fill="none"/>`;
const selfie = `<rect width="800" height="600" fill="#B9D3C2"/><circle cx="400" cy="250" r="110" fill="#C88B5E"/><path d="M290 230 q110 -150 220 0 q-30 -60 -110 -62 q-80 2 -110 62z" fill="#2E2A26"/><rect x="250" y="370" width="300" height="230" rx="120" fill="#1B5E36"/><circle cx="360" cy="250" r="9" fill="#2E2A26"/><circle cx="440" cy="250" r="9" fill="#2E2A26"/><path d="M370 300 q30 22 60 0" stroke="#2E2A26" stroke-width="6" fill="none"/>`;
const receipt = `<rect width="800" height="600" fill="#D8D2C6"/><path d="M290 40 h220 v500 l-20 15 -20 -15 -20 15 -20 -15 -20 15 -20 -15 -20 15 -20 -15 -20 15 -20 -15 -20 15z" fill="#FBFAF6"/><rect x="330" y="80" width="140" height="18" fill="#1F2937"/>${Array.from({ length: 12 }, (_, i) => `<rect x="320" y="${130 + i * 28}" width="${i % 3 === 2 ? 90 : 160}" height="8" fill="#9CA3AF"/>`).join('')}`;
const lawn = (cut) => {
  let g = `<rect width="800" height="600" fill="#BFD8E8"/><rect y="200" width="800" height="400" fill="${cut ? '#6FA85A' : '#5E8F45'}"/>`;
  if (cut) for (let x = 0; x < 800; x += 80) g += `<rect x="${x}" y="200" width="40" height="400" fill="#7DB466" opacity="0.6"/>`;
  else for (let i = 0; i < 260; i++) { const x = (i * 37) % 800; const y = 220 + ((i * 53) % 370); g += `<path d="M${x} ${y} l6 -34 l6 34" fill="#3F7A2E"/>`; }
  return g + shade;
};

const files = {
  'damp.svg': svg(damp(1), stainDef + vignette),
  'damp-fixed.svg': svg(damp(0), stainDef + vignette),
  'damp-notfixed.svg': svg(damp(0.45), stainDef + vignette),
  'tile.svg': svg(tiles(true, false), tileDef + vignette),
  'tile-fixed.svg': svg(tiles(false, false), tileDef + vignette),
  'tile-notfixed.svg': svg(tiles(true, true), tileDef + vignette),
  'paint.svg': svg(paint('before'), vignette),
  'paint-fixed.svg': svg(paint('fixed'), vignette),
  'paint-notfixed.svg': svg(paint('notfixed'), vignette),
  'crack.svg': svg(crack('before'), vignette),
  'crack-fixed.svg': svg(crack('fixed'), vignette),
  'crack-notfixed.svg': svg(crack('notfixed'), vignette),
  'tap.svg': svg(tap(true), vignette),
  'tap-fixed.svg': svg(tap(false), vignette),
  'tap-notfixed.svg': svg(tap(true), vignette),
  'clean.svg': svg(clean, vignette),
  'dark.svg': svg(dark, darkDef),
  'wrong.svg': svg(wrong, vignette),
  'signature.svg': svg(signature),
  'lease.svg': svg(lease),
  'selfie.svg': svg(selfie),
  'receipt.svg': svg(receipt),
  'lawn-before.svg': svg(lawn(false), vignette),
  'lawn-after.svg': svg(lawn(true), vignette),
};
for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(out, name), content);
console.log(`Wrote ${Object.keys(files).length} sample images to public/samples`);
