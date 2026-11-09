// Visual check: node tests/shots.mjs [hash ...]  → tests/shots/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './helpers/server.mjs';
import { launchBrowser } from './helpers/browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'shots');
mkdirSync(out, { recursive: true });

const hashes = ['', ...process.argv.slice(2)];
const sizes = [[1280, 800, 'desktop'], [390, 844, 'phone']];
const server = await startServer(path.resolve(here, '..'));
const browser = await launchBrowser();
try {
  for (const hash of hashes) {
    for (const [w, h, name] of sizes) {
      for (const theme of ['light', 'dark']) {
        const p = await browser.newPage({ width: w, height: h, mobile: w < 900 });
        await p.goto(server.url + '/');
        await p.eval(`localStorage.setItem('kk-theme', '${theme}')`);
        await p.goto(server.url + '/' + (hash ? '#' + hash : ''));
        await p.waitFor(`['desk','sheet'].includes(document.documentElement.dataset.deskState)`);
        await new Promise((r) => setTimeout(r, 400));
        const file = path.join(out, `${hash || 'desk'}-${name}-${theme}.png`);
        writeFileSync(file, await p.screenshot());
        console.log(file, p.errors.length ? p.errors : '');
        await p.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}
