import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './helpers/server.mjs';
import { launchBrowser } from './helpers/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server, browser, url;

before(async () => {
  server = await startServer(root);
  url = server.url;
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

test('page loads without console/CSP errors', async () => {
  const p = await browser.newPage();
  await p.goto(url + '/');
  assert.deepEqual(p.errors, []);
  await p.close();
});

test('without JS: long page, desk hidden, all sections visible', async () => {
  const p = await browser.newPage({ js: false });
  await p.goto(url + '/');
  // Script execution is disabled for the page, so inspect via a fresh isolated evaluation.
  assert.equal(await p.eval(`document.documentElement.classList.contains('desk-mode')`), false);
  assert.equal(await p.eval(`[...document.querySelectorAll('section.s')].filter(s => s.offsetHeight > 0).length`), 5);
  assert.equal(await p.eval(`!document.querySelector('.desk') || document.querySelector('.desk').offsetHeight === 0`), true);
  await p.close();
});
