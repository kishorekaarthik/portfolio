// Minimal Chrome DevTools Protocol client — zero dependencies (Node >= 22).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Connection {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

class Page {
  constructor(conn, sessionId, targetId) {
    this.conn = conn;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.errors = [];
    this.loadWaiters = [];
    this.listener = (msg) => {
      if (msg.sessionId !== this.sessionId) return;
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        this.errors.push(d.exception?.description || d.text);
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.errors.push(msg.params.entry.text);
      } else if (msg.method === 'Page.loadEventFired') {
        this.loadWaiters.splice(0).forEach((r) => r());
      }
    };
    conn.listeners.add(this.listener);
  }
  send(method, params) { return this.conn.send(method, params, this.sessionId); }

  async goto(url) {
    const loaded = new Promise((r) => this.loadWaiters.push(r));
    await this.send('Page.navigate', { url });
    await loaded;
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`eval failed: ${expr}\n${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result.value;
  }

  async click(selector) {
    const box = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    })()`);
    if (!box) throw new Error(`click: no element for ${selector}`);
    if (!box.w || !box.h) throw new Error(`click: element not visible ${selector}`);
    const base = { x: box.x, y: box.y, button: 'left', clickCount: 1 };
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
  }

  async press(key) {
    const codes = { Escape: 27, Tab: 9, Enter: 13 };
    const p = { key, code: key, windowsVirtualKeyCode: codes[key], nativeVirtualKeyCode: codes[key] };
    await this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...p });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
  }

  async waitFor(expr, timeoutMs = 3000) {
    const end = Date.now() + timeoutMs;
    let last;
    while (Date.now() < end) {
      try { last = await this.eval(`!!(${expr})`); if (last) return; } catch (e) { last = e.message; }
      await sleep(25);
    }
    throw new Error(`waitFor timed out after ${timeoutMs}ms: ${expr} (last: ${last})`);
  }

  async resize(width, height) {
    const mobile = width < 900;
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await sleep(50);
  }

  async screenshot() {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(data, 'base64');
  }

  async close() {
    this.conn.listeners.delete(this.listener);
    await this.conn.send('Target.closeTarget', { targetId: this.targetId }).catch(() => {});
  }
}

class Browser {
  constructor(proc, conn, profile) { this.proc = proc; this.conn = conn; this.profile = profile; }

  async newPage({ width = 1280, height = 800, mobile = false, reducedMotion = false, js = true } = {}) {
    const { targetId } = await this.conn.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.conn.send('Target.attachToTarget', { targetId, flatten: true });
    const page = new Page(this.conn, sessionId, targetId);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
    });
    if (!js) await page.send('Emulation.setScriptExecutionDisabled', { value: true });
    return page;
  }

  async close() {
    try { await this.conn.send('Browser.close'); } catch { }
    this.proc.kill();
    await sleep(200);
    try { rmSync(this.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { }
  }
}

export async function launchBrowser() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error('No Chrome/Edge found. Set BROWSER_PATH to a Chromium-based browser executable.');
  const profile = mkdtempSync(path.join(tmpdir(), 'desk-test-'));
  const proc = spawn(exe, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  const end = Date.now() + 15000;
  while (!existsSync(portFile)) {
    if (Date.now() > end) throw new Error(`Browser did not start: ${exe}`);
    await sleep(50);
  }
  let lines;
  while (!(lines = readFileSync(portFile, 'utf8').split('\n'))[1]) await sleep(20);
  const ws = new WebSocket(`ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  return new Browser(proc, new Connection(ws), profile);
}
