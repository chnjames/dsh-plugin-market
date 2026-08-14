// Build the browser client half: copy src/client/index.js -> lib/client.js
// The client bundle is already in ModuleLoader format (window.__ModuleLoader__),
// so no bundler is required — ModuleLoader provides react and @deepseek-ai/* deps.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'client', 'index.js');
const outDir = join(here, '..', 'lib', 'client');
const out = join(outDir, 'client.js');

if (!existsSync(src)) {
  console.error('client build: missing src/client/index.js');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
copyFileSync(src, out);
console.log(`client build: ${src} -> ${out}`);
