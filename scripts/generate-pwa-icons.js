// scripts/generate-pwa-icons.js
// Rasteriza public/icon-source.svg nos 3 PNGs exigidos pelo manifest (D-04 da Fase 5).
// Os PNGs sao commitados; rode `npm run icons:generate` apenas quando o SVG mudar.
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'icon-source.svg');
const outDir = path.join(root, 'public', 'icons');

if (!fs.existsSync(source)) {
  console.error('[generate-pwa-icons] SVG de origem nao encontrado: ' + source);
  process.exit(1);
}

const svg = fs.readFileSync(source);
fs.mkdirSync(outDir, { recursive: true });

// O maskable e um arquivo SEPARADO do "any" (warning conhecido do Lighthouse se reutilizado).
// Na variante maskable o desenho (exceto o fundo) e reduzido a 88% para ficar com folga extra
// dentro da zona segura, pois launchers Android aplicam mascaras circulares agressivas.
const bgEnd = svg.toString().indexOf('/>') + 2;
const maskableSvg = Buffer.from(
  svg.toString().slice(0, bgEnd) +
    '<g transform="translate(256 256) scale(0.88) translate(-256 -256)">' +
    svg.toString().slice(bgEnd).replace('</svg>', '</g></svg>'),
);

const targets = [
  { file: 'icon-192x192.png', size: 192, src: svg },
  { file: 'icon-512x512.png', size: 512, src: svg },
  { file: 'icon-512x512-maskable.png', size: 512, src: maskableSvg },
];

for (const { file, size, src } of targets) {
  const png = new Resvg(src, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(outDir, file), png);
  console.log('[generate-pwa-icons] ' + file + ' (' + png.length + ' bytes)');
}
