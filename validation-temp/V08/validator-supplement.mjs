#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const workspace = "C:/src/PremierCleaners";
const outDir = "C:/Users/Tidus/.zenith/projects/20260914T025854Z-first-real-project-mission-design-and-build-a-complete-first-pro/.zenith/missions/mission-001/evidence/V08-render-access-perf-20260914";
const baseUrl = "http://127.0.0.1:4184";
const routes = [["home", "/"], ["services", "/services/"], ["about", "/about/"], ["contact", "/contact/"]];
let ws;
let nextId = 1;
let previewProc;
let chromeProc;
const pending = new Map();
const events = [];
const pages = [];
const out = { startedAt: new Date().toISOString(), baseUrl, screenshots: [], accessibility: [], keyboard: [], targetBounds: [], observationEvents: events };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(method, params = {}, sessionId, timeoutMs = 20000) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, timeoutMs);
    pending.set(id, { resolve, reject, timer, method });
  });
  ws.send(JSON.stringify(msg));
  return promise;
}
function waitEvent(sessionId, method, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener("message", onMessage); reject(new Error(`wait ${method} timed out`)); }, timeoutMs);
    function onMessage(event) {
      const msg = JSON.parse(event.data);
      if (msg.sessionId === sessionId && msg.method === method) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        resolve(msg.params || {});
      }
    }
    ws.addEventListener("message", onMessage);
  });
}
async function connect(url) {
  ws = new WebSocket(url);
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method) events.push(msg);
    if (!msg.id || !pending.has(msg.id)) return;
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    clearTimeout(p.timer);
    msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result || {});
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}
async function launch() {
  previewProc = spawn(process.execPath, ["scripts/preview.mjs", "4184"], { cwd: workspace, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(baseUrl + "/")).status === 200) break; } catch {}
    await sleep(200);
  }
  const exe = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].find((x) => existsSync(x));
  const profile = path.join(outDir, "chrome-profile-supplement").replaceAll("\\", "/");
  await fs.mkdir(profile, { recursive: true });
  chromeProc = spawn(exe, ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${profile}`, "--disable-background-networking", "--no-first-run", "about:blank"], { stdio: "ignore", windowsHide: true });
  let version;
  for (let i = 0; i < 60; i++) {
    try { version = await (await fetch("http://127.0.0.1:9334/json/version")).json(); break; } catch {}
    await sleep(200);
  }
  await connect(version.webSocketDebuggerUrl);
  out.chrome = await send("Browser.getVersion");
}
async function page(width, height) {
  const target = await send("Target.createTarget", { url: "about:blank" });
  const attach = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const p = { targetId: target.targetId, sessionId: attach.sessionId, width, height };
  pages.push(p);
  for (const m of ["Page.enable", "Runtime.enable", "DOM.enable", "Accessibility.enable", "Network.enable", "Log.enable"]) await send(m, {}, p.sessionId).catch(() => {});
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, p.sessionId);
  return p;
}
async function closePage(p) {
  await send("Target.detachFromTarget", { sessionId: p.sessionId }).catch(() => {});
  await send("Target.closeTarget", { targetId: p.targetId }).catch(() => {});
}
async function nav(p, url) {
  const loaded = waitEvent(p.sessionId, "Page.loadEventFired").catch(() => null);
  await send("Page.navigate", { url }, p.sessionId);
  await loaded;
  await sleep(500);
}
async function evalJson(p, expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, p.sessionId);
  return JSON.parse(r.result.value);
}
async function shot(p, file) {
  await evalJson(p, `JSON.stringify((()=>{window.scrollTo(0,0);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return true})())`);
  const m = await send("Page.getLayoutMetrics", {}, p.sessionId);
  const r = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(m.contentSize.width), height: Math.ceil(m.contentSize.height), scale: 1 } }, p.sessionId, 60000);
  const fp = path.join(outDir, file);
  await fs.writeFile(fp, Buffer.from(r.data, "base64"));
  out.screenshots.push(fp);
  return fp;
}
async function nativeControlAndKeyboard() {
  const p = await page(390, 844);
  await nav(p, "data:text/html,<button id=b type=button>Native</button><output id=o>0</output><script>b.addEventListener('click',e=>{o.textContent=String(+o.textContent+1);window.lastTrusted=e.isTrusted})</script>");
  await evalJson(p, `JSON.stringify((()=>{b.focus();return document.activeElement.id})())`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" }, p.sessionId);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, p.sessionId);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " ", unmodifiedText: " " }, p.sessionId);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 }, p.sessionId);
  out.nativeControl = await evalJson(p, `JSON.stringify({count:o.textContent,lastTrusted:window.lastTrusted,hasFocus:document.hasFocus()})`);
  await closePage(p);
  for (const [id, route] of routes) {
    const q = await page(390, 844);
    await nav(q, baseUrl + route);
    const steps = [];
    for (let i = 0; i < 4; i++) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, q.sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, q.sessionId);
      await sleep(80);
      steps.push(await evalJson(q, `JSON.stringify({tag:document.activeElement.tagName,text:document.activeElement.innerText||document.activeElement.getAttribute('aria-label')||'',expanded:document.activeElement.getAttribute('aria-expanded'),hasFocus:document.hasFocus()})`));
      if (steps.at(-1).text === "Open navigation") break;
    }
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" }, q.sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, q.sessionId);
    await sleep(150);
    const open = await evalJson(q, `JSON.stringify({expanded:document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),navOpen:document.querySelector('[data-site-header]').hasAttribute('data-nav-open'),display:getComputedStyle(document.querySelector('.site-nav')).display,hasFocus:document.hasFocus()})`);
    const s = await shot(q, `supplement-keyboard-${id}-open.png`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, q.sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, q.sessionId);
    await sleep(100);
    const esc = await evalJson(q, `JSON.stringify({expanded:document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),active:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText,hasFocus:document.hasFocus()})`);
    out.keyboard.push({ route, steps, open, escape: esc, screenshot: s });
    await closePage(q);
  }
}
async function screenshotsAxTargets() {
  for (const [vp, w, h] of [["desktop1440", 1440, 1000], ["mobile390", 390, 844]]) {
    for (const [id, route] of routes) {
      const p = await page(w, h);
      await nav(p, baseUrl + route);
      out.screenshots.push(await shot(p, `supplement-${id}-${vp}-topfull.png`));
      const ax = await send("Accessibility.getFullAXTree", {}, p.sessionId);
      out.accessibility.push({ route, viewport: vp, roles: ax.nodes.filter((n) => n.role?.value).map((n) => ({ role: n.role.value, name: n.name?.value || "" })).slice(0, 120) });
      out.targetBounds.push({ route, viewport: vp, rows: await evalJson(p, `JSON.stringify(Array.from(document.querySelectorAll('a[href],button')).filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'}).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||e.href||'').trim().replace(/\\s+/g,' '),href:e.getAttribute('href'),w:+r.width.toFixed(2),h:+r.height.toFixed(2),x:+r.x.toFixed(2),y:+r.y.toFixed(2),primary:e.matches('.button,.nav-toggle,.header-phone,.site-nav a,.text-link')}}))`) });
      await closePage(p);
    }
  }
}
async function cleanup() {
  for (const p of pages.reverse()) await closePage(p).catch(() => {});
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  if (chromeProc) chromeProc.kill();
  if (previewProc) previewProc.kill();
}
try {
  await launch();
  await screenshotsAxTargets();
  await nativeControlAndKeyboard();
  out.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, "validator-supplement.json"), JSON.stringify(out, null, 2));
} catch (error) {
  out.fatal = error.stack || error.message;
  await fs.writeFile(path.join(outDir, "validator-supplement-partial.json"), JSON.stringify(out, null, 2)).catch(() => {});
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
