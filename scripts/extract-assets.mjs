// Extracts the Moni mascot poses (with transparency) and house photos from the
// commercial wireframe PDF. Usage: npm run extract-assets -- "<path to PDF>"
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const pdf = process.argv[2];
if (!pdf || !fs.existsSync(pdf)) {
  console.error('usage: npm run extract-assets -- "<path to MONI wireframe PDF>"');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vhome-assets-'));
// Pages 2-10 hold every asset; -all keeps JPEGs compressed (much smaller on disk).
execFileSync('pdfimages', ['-all', '-p', '-f', '2', '-l', '10', pdf, path.join(tmp, 'm')]);

const moniDir = path.join(root, 'src/assets/moni');
const houseDir = path.join(root, 'src/assets/houses');
const iconDir = path.join(root, 'public/icons');
for (const d of [moniDir, houseDir, iconDir]) fs.mkdirSync(d, { recursive: true });

const file = (name, ext = 'png') => path.join(tmp, `${name}.${ext}`);

function withAlpha(imageName, maskName, outFile) {
  const img = PNG.sync.read(fs.readFileSync(file(imageName)));
  const mask = PNG.sync.read(fs.readFileSync(file(maskName)));
  if (img.width !== mask.width || img.height !== mask.height) {
    throw new Error(`${imageName}: mask size mismatch`);
  }
  for (let i = 0; i < img.width * img.height; i++) {
    img.data[i * 4 + 3] = mask.data[i * 4];
  }
  fs.writeFileSync(outFile, PNG.sync.write(img));
}

const poses = {
  wave: ['m-002-011', 'm-002-012'],
  'wave-sm': ['m-005-018', 'm-005-019'],
  point: ['m-005-034', 'm-005-035'],
  thumbs: ['m-005-026', 'm-005-027'],
  crossed: ['m-005-038', 'm-005-039'],
  cool: ['m-005-048', 'm-005-049'],
};
for (const [pose, [img, mask]] of Object.entries(poses)) {
  withAlpha(img, mask, path.join(moniDir, `${pose}.png`));
}
fs.copyFileSync(file('m-002-001', 'jpg'), path.join(moniDir, 'icon.jpg'));

['m-010-131', 'm-010-132', 'm-010-133', 'm-010-134', 'm-010-135'].forEach((name, i) => {
  fs.copyFileSync(file(name, 'jpg'), path.join(houseDir, `house-${i + 1}.jpg`));
});

for (const size of [192, 512]) {
  execFileSync('sips', ['-s', 'format', 'png', '-z', String(size), String(size), path.join(moniDir, 'icon.jpg'), '--out', path.join(iconDir, `vhome-${size}.png`)], { stdio: 'ignore' });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('Extracted 7 Moni images, 5 house photos and 2 app icons.');
