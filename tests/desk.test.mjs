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

// ---------- Task 2: desk ----------
const STATE = `document.documentElement.dataset.deskState`;
const LABELS = { about: 'About', skills: 'Skills', scars: 'Hackathons', work: 'Work', contact: 'Say hello' };

async function page(p = '/', opts = {}) {
  const pg = await browser.newPage(opts);
  await pg.goto(url + p);
  await pg.waitFor(`document.documentElement.classList.contains('desk-mode')`);
  return pg;
}

for (const [w, h, name] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
  test(`desk shows on first screen (${name})`, async () => {
    const p = await page('/', { width: w, height: h, mobile: w < 900 });
    await p.waitFor(`${STATE} === 'desk'`);
    assert.equal(await p.eval(`document.querySelectorAll('.desk-obj').length`), 5);
    assert.deepEqual(await p.eval(`[...document.querySelectorAll('.desk-obj')].map(a => a.dataset.target)`),
      ['about', 'skills', 'scars', 'work', 'contact']);
    assert.equal(await p.eval(`[...document.querySelectorAll('.desk-obj')].every(a => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width >= 44 && r.height >= 44; })`), true,
      await p.eval(`JSON.stringify([...document.querySelectorAll('.desk-obj')].map(a => { const r = a.getBoundingClientRect(); return [a.dataset.target, Math.round(r.top), Math.round(r.bottom), Math.round(r.width), Math.round(r.height)]; }))`));
    assert.equal(await p.eval(`[...document.querySelectorAll('section.s')].every(s => s.hidden)`), true);
    assert.equal(await p.eval(`document.querySelector('h1').textContent.trim()`), 'Kishore Kaarthik');
    assert.equal(await p.eval(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
    assert.deepEqual(p.errors, []);
    await p.close();
  });
}

test('desk objects have accessible names matching section labels', async () => {
  const p = await page();
  const names = await p.eval(`[...document.querySelectorAll('.desk-obj')].map(a => [a.dataset.target, (a.getAttribute('aria-label') || a.innerText).trim()])`);
  for (const [id, name] of names) assert.ok(name.toLowerCase().includes(LABELS[id].toLowerCase()), `${id}: "${name}"`);
  await p.close();
});

test('dark desk uses dark ink', async () => {
  const p = await page();
  await p.eval(`document.getElementById('tg').click()`);
  assert.equal(await p.eval(`getComputedStyle(document.querySelector('.desk')).color`), 'rgb(242, 242, 238)');
  await p.close();
});

test('phone: theme toggle in the top bar is on screen', async () => {
  const p = await page('/', { width: 390, height: 844, mobile: true });
  assert.equal(await p.eval(`(() => { const r = document.getElementById('tg').getBoundingClientRect(); return r.right <= document.documentElement.clientWidth && r.width > 0; })()`), true);
  await p.close();
});
