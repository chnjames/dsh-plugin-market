// Build the browser client half: copy src/client/index.js -> lib/client.js
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'client', 'index.js');
const outDir = join(here, '..', 'lib');
const out = join(outDir, 'client.js');

if (!existsSync(src)) {
  console.error('client build: missing src/client/index.js');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
copyFileSync(src, out);

const legacyClientDir = join(outDir, 'client');
mkdirSync(legacyClientDir, { recursive: true });
copyFileSync(src, join(legacyClientDir, 'client.js'));

const snapshotSrc = join(here, '..', 'website', 'public', 'registry.json');
const snapshotOut = join(outDir, 'registry.snapshot.json');
if (existsSync(snapshotSrc)) {
  copyFileSync(snapshotSrc, snapshotOut);
  console.log(`client build: snapshot ${snapshotSrc} -> ${snapshotOut}`);
}

console.log(`client build: ${src} -> ${out}`);
