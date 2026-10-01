#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const workspace = "C:/src/PremierCleaners";
const outDir = "C:/Users/Tidus/.zenith/projects/20260914T025854Z-first-real-project-mission-design-and-build-a-complete-first-pro/.zenith/missions/mission-001/evidence/V08-render-access-perf-20260914";
const baseUrl = "http://127.0.0.1:4186";
let ws, preview, chrome, nextId = 1;
const pending = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];

function send(method, params = {}, sid, timeout = 20000) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sid) msg.sessionId = sid;
  const p = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, timeout);
    pending.set(id, { resolve, reject, timer, method });
  });
  ws.send(JSON.stringify(msg));
  return p;
}
function waitEvent(sid, method, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener("message", onMessage); reject(new Error(`wait ${method} timeout`)); }, timeout);
    function onMessage(e) {
      const msg = JSON.parse(e.data);
      if (msg.sessionId === sid && msg.method === method) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        resolve(msg.params || {});
      }
    }
    ws.addEventListener("message", onMessage);
  });
}
async function evalJson(sid, expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sid);
  return JSON.parse(r.result.value);
}
async function launch() {
  preview = spawn(process.execPath, ["scripts/preview.mjs", "4186"], { cwd: workspace, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(baseUrl + "/")).status === 200) break; } catch {} await sleep(200); }
  const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((x) => existsSync(x));
  const profile = path.join(outDir, "chrome-profile-nojs-click").replaceAll("\\", "/");
  await fs.mkdir(profile, { recursive: true });
  chrome = spawn(exe, ["--headless=new", "--remote-debugging-port=9336", `--user-data-dir=${profile}`, "--disable-background-networking", "--no-first-run", "about:blank"], { stdio: "ignore", windowsHide: true });
  let version; for (let i = 0; i < 60; i++) { try { version = await (await fetch("http://127.0.0.1:9336/json/version")).json(); break; } catch {} await sleep(200); }
  ws = new WebSocket(version.webSocketDebuggerUrl);
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
    msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result || {});
  });
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
}
async function page(width, height) {
  const t = await send("Target.createTarget", { url: "about:blank" });
  const a = await send("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const sid = a.sessionId;
  for (const m of ["Page.enable", "Runtime.enable", "DOM.enable", "Network.enable"]) await send(m, {}, sid).catch(() => {});
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sid);
  await send("Emulation.setScriptExecutionDisabled", { value: true }, sid);
  return { sid, targetId: t.targetId };
}
async function nav(p, url) {
  const load = waitEvent(p.sid, "Page.loadEventFired").catch(() => null);
  await send("Page.navigate", { url }, p.sid);
  await load; await sleep(350);
}
async function clickSelector(p, selector) {
  const info = await evalJson(p.sid, `JSON.stringify((()=>{const el=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}); if(!el) throw new Error('no visible target '+${JSON.stringify(selector)}); const r=el.getBoundingClientRect(); return {text:el.innerText||el.getAttribute('aria-label')||el.href, href:el.getAttribute('href'), x:r.left+r.width/2, y:r.top+r.height/2, w:r.width, h:r.height, before:location.href, h1:document.querySelector('h1')?.innerText}})())`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: info.x, y: info.y, button: "none" }, p.sid);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: info.x, y: info.y, button: "left", clickCount: 1 }, p.sid);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: info.x, y: info.y, button: "left", clickCount: 1 }, p.sid);
  await sleep(600);
  const after = await evalJson(p.sid, `JSON.stringify({url:location.href,h1:document.querySelector('h1')?.innerText,htmlClass:document.documentElement.className,navDisplay:getComputedStyle(document.querySelector('.site-nav')).display})`);
  rows.push({ selector, clicked: info, after });
}
async function runFlow(width, height, label) {
  const p = await page(width, height);
  await nav(p, baseUrl + "/");
  rows.push({ label, start: await evalJson(p.sid, `JSON.stringify({url:location.href,h1:document.querySelector('h1')?.innerText,htmlClass:document.documentElement.className,navDisplay:getComputedStyle(document.querySelector('.site-nav')).display})`) });
  await clickSelector(p, '.site-nav a[href="/services/"]');
  await clickSelector(p, '.site-nav a[href="/contact/"]');
  await clickSelector(p, 'a[href="tel:+15853406868"]');
  await send("Target.detachFromTarget", { sessionId: p.sid }).catch(() => {});
  await send("Target.closeTarget", { targetId: p.targetId }).catch(() => {});
}
try {
  await launch();
  await runFlow(1440, 1000, "desktop1440");
  await runFlow(390, 844, "mobile390");
  await fs.writeFile(path.join(outDir, "nojs-click-flow.json"), JSON.stringify({ baseUrl, rows }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  if (chrome) chrome.kill();
  if (preview) preview.kill();
}
