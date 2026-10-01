#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const workspace = "C:/src/PremierCleaners";
const outDir = "C:/Users/Tidus/.zenith/projects/20260914T025854Z-first-real-project-mission-design-and-build-a-complete-first-pro/.zenith/missions/mission-001/evidence/V08-render-access-perf-20260914";
const baseUrl = "http://127.0.0.1:4185";
const routes = [["home", "/"], ["services", "/services/"], ["about", "/about/"], ["contact", "/contact/"]];
const viewports = [["desktop1440", 1440, 1000], ["mobile390", 390, 844]];
let ws, preview, chrome, nextId = 1;
const pending = new Map();
const screenshots = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(method, params = {}, sessionId, timeout = 20000) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, timeout);
    pending.set(id, { resolve, reject, timer, method });
  });
  ws.send(JSON.stringify(msg));
  return promise;
}
function waitEvent(sessionId, method, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener("message", onMessage); reject(new Error(`wait ${method} timeout`)); }, timeout);
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
async function evalJson(sessionId, expression, timeout = 30000) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId, timeout);
  return JSON.parse(result.result.value);
}
async function launch() {
  preview = spawn(process.execPath, ["scripts/preview.mjs", "4185"], { cwd: workspace, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(baseUrl + "/")).status === 200) break; } catch {}
    await sleep(200);
  }
  const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((x) => existsSync(x));
  const profile = path.join(outDir, "chrome-profile-clean").replaceAll("\\", "/");
  await fs.mkdir(profile, { recursive: true });
  chrome = spawn(exe, ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${profile}`, "--disable-background-networking", "--no-first-run", "about:blank"], { stdio: "ignore", windowsHide: true });
  let version;
  for (let i = 0; i < 60; i++) {
    try { version = await (await fetch("http://127.0.0.1:9335/json/version")).json(); break; } catch {}
    await sleep(200);
  }
  ws = new WebSocket(version.webSocketDebuggerUrl);
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
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
async function capture(id, route, vp, width, height) {
  const target = await send("Target.createTarget", { url: "about:blank" });
  const attach = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sid = attach.sessionId;
  for (const method of ["Page.enable", "Runtime.enable", "Network.enable"]) await send(method, {}, sid).catch(() => {});
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sid);
  const loaded = waitEvent(sid, "Page.loadEventFired").catch(() => null);
  await send("Page.navigate", { url: baseUrl + route }, sid);
  await loaded;
  await sleep(500);
  const scrollState = await evalJson(sid, `(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let y=0,n=0;while(n<90){const max=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight;if(y>=max)break;y=Math.min(max,y+Math.max(260,Math.floor(innerHeight*.7)));window.scrollTo(0,y);n++;await s(200)}await Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true});setTimeout(r,2500)})));window.scrollTo(0,0);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();await s(200);return JSON.stringify({iterations:n,images:Array.from(document.images).map(img=>({currentSrc:img.currentSrc,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}))})})()`, 50000);
  const metrics = await send("Page.getLayoutMetrics", {}, sid);
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(metrics.contentSize.width), height: Math.ceil(metrics.contentSize.height), scale: 1 } }, sid, 60000);
  const file = path.join(outDir, `clean-${id}-${vp}-loaded-topfull.png`);
  await fs.writeFile(file, Buffer.from(shot.data, "base64"));
  screenshots.push({ route, viewport: vp, file, scrollState });
  await send("Target.detachFromTarget", { sessionId: sid }).catch(() => {});
  await send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
}
try {
  await launch();
  for (const [vp, w, h] of viewports) for (const [id, route] of routes) await capture(id, route, vp, w, h);
  await fs.writeFile(path.join(outDir, "clean-full-screenshots.json"), JSON.stringify({ baseUrl, screenshots }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  if (chrome) chrome.kill();
  if (preview) preview.kill();
}
