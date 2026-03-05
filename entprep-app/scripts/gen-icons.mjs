import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
const svg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');

const sizes = [96, 180, 192, 256, 512];

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  const name = `icon-${size}.png`;
  writeFileSync(resolve(publicDir, name), png);
  console.log(`Generated ${name} (${png.length} bytes)`);
}

console.log('Done!');
