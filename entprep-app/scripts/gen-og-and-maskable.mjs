import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

// 1. Generate OG image PNG from SVG (1200x630)
const ogSvg = readFileSync(resolve(publicDir, 'og-image.svg'), 'utf8');
const ogResvg = new Resvg(ogSvg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true },
});
const ogPng = ogResvg.render().asPng();
writeFileSync(resolve(publicDir, 'og-image.png'), ogPng);
console.log(`Generated og-image.png (${ogPng.length} bytes)`);

// 2. Generate maskable icon (512x512 with 20% safe zone padding)
const faviconSvg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');
const paddedSize = 512;
const iconSize = Math.round(paddedSize * 0.8); // 80% = safe zone
const offset = Math.round((paddedSize - iconSize) / 2);

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paddedSize}" height="${paddedSize}" viewBox="0 0 ${paddedSize} ${paddedSize}">
  <rect width="${paddedSize}" height="${paddedSize}" fill="#3b4d6e"/>
  <svg x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" viewBox="0 0 512 512">
    ${faviconSvg.replace(/<\/?svg[^>]*>/g, '')}
  </svg>
</svg>`;

const maskResvg = new Resvg(maskableSvg, {
  fitTo: { mode: 'width', value: paddedSize },
  font: { loadSystemFonts: true },
});
const maskPng = maskResvg.render().asPng();
writeFileSync(resolve(publicDir, 'icon-512-maskable.png'), maskPng);
console.log(`Generated icon-512-maskable.png (${maskPng.length} bytes)`);

console.log('Done!');
