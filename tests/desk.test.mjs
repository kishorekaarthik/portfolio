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

// ---------- Task 3: sheets, router, focus, history ----------
const visibleSections = `[...document.querySelectorAll('section.s')].filter(s => !s.hidden).map(s => s.id)`;

test('click object opens its sheet and focuses its heading', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  assert.equal(await p.eval(`location.hash`), '#about');
  assert.deepEqual(await p.eval(visibleSections), ['about']);
  assert.equal(await p.eval(`document.activeElement.id`), 'sheet-title-about');
  assert.equal(await p.eval(`document.querySelector('.desk').inert`), true);
  assert.equal(await p.eval(`document.querySelector('.hero').inert`), true);
  assert.equal(await p.eval(`document.getElementById('about').getAttribute('role')`), 'region');
  assert.equal(await p.eval(`document.getElementById('about').getAttribute('aria-labelledby')`), 'sheet-title-about');
  assert.equal(await p.eval(`document.querySelector('header.sidebar nav a[href="#about"]').getAttribute('aria-current')`), 'page');
  assert.deepEqual(p.errors, []);
  await p.close();
});

test('prev/next links follow section order', async () => {
  const p = await page();
  const pn = await p.eval(`['about','skills','scars','work','contact'].map(id => [
    document.querySelector('#' + id + ' .sheet-prev')?.getAttribute('href') || null,
    document.querySelector('#' + id + ' .sheet-next')?.getAttribute('href') || null])`);
  assert.deepEqual(pn, [[null, '#skills'], ['#about', '#scars'], ['#skills', '#work'], ['#scars', '#contact'], ['#work', null]]);
  assert.match(await p.eval(`document.querySelector('#about .sheet-next').textContent`), /Skills/);
  assert.match(await p.eval(`document.querySelector('#about .sheet-close').textContent`), /back to desk/);
  await p.close();
});

test('next replaces history; Back returns to desk; Forward reopens', async () => {
  const p = await page();
  const len0 = await p.eval(`history.length`);
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  await p.click('#about .sheet-next');
  await p.waitFor(`location.hash === '#skills' && ${STATE} === 'sheet'`);
  assert.deepEqual(await p.eval(visibleSections), ['skills']);
  assert.equal(await p.eval(`history.length`), len0 + 1);
  await p.eval(`history.back()`);
  await p.waitFor(`${STATE} === 'desk'`);
  assert.equal(await p.eval(`location.hash`), '');
  assert.deepEqual(await p.eval(visibleSections), []);
  assert.equal(await p.eval(`document.querySelector('.desk').inert`), false);
  assert.equal(await p.eval(`document.activeElement.dataset.target`), 'skills');
  await p.eval(`history.forward()`);
  await p.waitFor(`${STATE} === 'sheet' && location.hash === '#skills'`);
  await p.close();
});

test('deep link opens directly; close button goes to desk without adding or leaving history', async () => {
  const p = await page('/#work');
  await p.waitFor(`${STATE} === 'sheet'`);
  assert.deepEqual(await p.eval(visibleSections), ['work']);
  const len = await p.eval(`history.length`);
  await p.click('#work .sheet-close');
  await p.waitFor(`${STATE} === 'desk'`);
  assert.equal(await p.eval(`location.hash`), '');
  assert.equal(await p.eval(`location.pathname`), '/');
  assert.equal(await p.eval(`history.length`), len);
  await p.close();
});

test('Escape closes the sheet', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="contact"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  await p.press('Escape');
  await p.waitFor(`${STATE} === 'desk'`);
  assert.equal(await p.eval(`location.hash`), '');
  assert.equal(await p.eval(`document.activeElement.dataset.target`), 'contact');
  await p.close();
});

test('in-content #work link switches sheet by replace', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="scars"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  const len = await p.eval(`history.length`);
  await p.click('#scars a.hand[href="#work"], #scars .repo-links a[href="#work"]');
  await p.waitFor(`location.hash === '#work' && ${STATE} === 'sheet'`);
  assert.equal(await p.eval(`history.length`), len);
  await p.close();
});

test('#top and unknown hashes show the desk', async () => {
  const p = await page('/#nope');
  await p.waitFor(`${STATE} === 'desk'`);
  assert.deepEqual(await p.eval(visibleSections), []);
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  await p.click('header.sidebar .logo');
  await p.waitFor(`${STATE} === 'desk'`);
  assert.deepEqual(await p.eval(visibleSections), []);
  assert.notEqual(await p.eval('location.hash'), '#about');
  await p.close();
});

test('sidebar nav from desk pushes, from sheet replaces', async () => {
  const p = await page();
  const len0 = await p.eval(`history.length`);
  await p.click('header.sidebar nav a[href="#skills"]');
  await p.waitFor(`location.hash === '#skills' && ${STATE} === 'sheet'`);
  await p.click('header.sidebar nav a[href="#work"]');
  await p.waitFor(`location.hash === '#work' && ${STATE} === 'sheet'`);
  assert.equal(await p.eval(`history.length`), len0 + 1);
  assert.equal(await p.eval(`document.querySelector('header.sidebar nav a[href="#skills"]').hasAttribute('aria-current')`), false);
  await p.close();
});

test('no console/CSP errors after a full tour', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`);
  for (const id of ['skills', 'scars', 'work', 'contact']) {
    await p.click('section.s.is-open .sheet-next');
    await p.waitFor(`location.hash === '#${id}' && ${STATE} === 'sheet'`);
  }
  await p.click('#contact .sheet-close');
  await p.waitFor(`${STATE} === 'desk'`);
  assert.deepEqual(p.errors, []);
  await p.close();
});

test('desktop: open sheet has a single border and no theme button in its bar', async () => {
  const p = await page('/#scars');
  await p.waitFor(`${STATE} === 'sheet'`);
  assert.equal(await p.eval(`getComputedStyle(document.getElementById('scars')).outlineStyle`), 'none');
  assert.equal(await p.eval(`document.querySelector('#scars .sheet-tg').offsetWidth`), 0);
  await p.close();
});

// ---------- Task 4: transitions ----------
test('double click on an object adds one history entry', async () => {
  const p = await page();
  const len0 = await p.eval(`history.length`);
  await p.click('.desk-obj[data-target="work"]');
  await p.eval(`document.querySelector('.desk-obj[data-target="work"]').click()`);
  await p.waitFor(`${STATE} === 'sheet'`, 1500);
  assert.equal(await p.eval(`history.length`), len0 + 1);
  assert.deepEqual(await p.eval(visibleSections), ['work']);
  await p.close();
});

test('opening animates through the opening state', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="skills"]');
  assert.equal(await p.eval(STATE), 'opening');
  await p.waitFor(`${STATE} === 'sheet'`, 1500);
  await p.click('#skills .sheet-next');
  assert.equal(await p.eval(STATE), 'switching');
  await p.waitFor(`${STATE} === 'sheet' && location.hash === '#scars'`, 1500);
  await p.click('#scars .sheet-close');
  await p.waitFor(`${STATE} === 'closing' || ${STATE} === 'desk'`, 500);
  await p.waitFor(`${STATE} === 'desk'`, 1500);
  await p.close();
});

test('clicks during an animation land on the latest target', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="about"]');
  await p.eval(`document.querySelector('header.sidebar nav a[href="#work"]').click()`);
  await p.waitFor(`${STATE} === 'sheet' && location.hash === '#work'`, 2000);
  assert.deepEqual(await p.eval(visibleSections), ['work']);
  await p.close();
});

test('reduced motion: no transform on desk or sheet while opening', async () => {
  const p = await page('/', { reducedMotion: true });
  await p.click('.desk-obj[data-target="skills"]');
  const during = await p.eval(`[getComputedStyle(document.querySelector('.desk')).transform, getComputedStyle(document.getElementById('skills')).transform]`);
  assert.deepEqual(during, ['none', 'none']);
  await p.waitFor(`${STATE} === 'sheet'`, 1500);
  assert.equal(await p.eval(`getComputedStyle(document.querySelector('.desk')).transform`), 'none');
  assert.equal(await p.eval(`getComputedStyle(document.getElementById('skills')).transform`), 'none');
  await p.close();
});

test('transitions settle within 1s', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`, 1000);
  await p.click('#about .sheet-next');
  await p.waitFor(`${STATE} === 'sheet' && location.hash === '#skills'`, 1000);
  await p.press('Escape');
  await p.waitFor(`${STATE} === 'desk'`, 1000);
  assert.deepEqual(p.errors, []);
  await p.close();
});

test('pressing Escape twice quickly never leaves the site', async () => {
  const p = await page();
  await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${STATE} === 'sheet'`, 1500);
  await p.eval(`(() => { const ev = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }); document.dispatchEvent(ev()); document.dispatchEvent(ev()); })()`);
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(await p.eval(`location.origin + location.pathname`), url + '/');
  assert.equal(await p.eval(STATE), 'desk');
  await p.close();
});
