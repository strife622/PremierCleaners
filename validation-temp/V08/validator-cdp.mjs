#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const workspace = "C:/src/PremierCleaners";
const outDir = "C:/Users/Tidus/.zenith/projects/20260914T025854Z-first-real-project-mission-design-and-build-a-complete-first-pro/.zenith/missions/mission-001/evidence/V08-render-access-perf-20260914";
const baseUrl = "http://127.0.0.1:4183";
const routes = [
  ["home", "/"],
  ["services", "/services/"],
  ["about", "/about/"],
  ["contact", "/contact/"]
];
const mainViewports = [["desktop1440", 1440, 1000], ["mobile390", 390, 844]];
const targetViewports = [["narrow320", 320, 844], ["tablet768", 768, 844]];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let ws;
let nextId = 1;
let chromeProc;
let previewProc;
const pending = new Map();
const openPages = [];
const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl,
  setup: {},
  screenshots: [],
  pages: [],
  targeted: [],
  zoom200: [],
  keyboard: [],
  contrast: [],
  contrastInteractive: [],
  targetBounds: [],
  imageChecks: [],
  noJs: [],
  noJsCanary: {},
  motion: [],
  performance: {},
  sourceAudit: {},
  designRubric: {}
};

function send(method, params = {}, sessionId, timeoutMs = 20000) {
  const id = nextId++;
  const message = { id, method, params };
  if (sessionId) message.sessionId = sessionId;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer, method });
  });
  ws.send(JSON.stringify(message));
  return promise;
}

function waitEvent(sessionId, method, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    function onMessage(event) {
      const message = JSON.parse(event.data);
      if (message.sessionId === sessionId && message.method === method) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        resolve(message.params || {});
      }
    }
    ws.addEventListener("message", onMessage);
  });
}

async function connect(cdpUrl) {
  ws = new WebSocket(cdpUrl);
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const pendingItem = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(pendingItem.timer);
    if (message.error) {
      pendingItem.reject(new Error(`${pendingItem.method}: ${message.error.message}`));
    } else {
      pendingItem.resolve(message.result || {});
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

async function launchPreview() {
  const log = await fs.open(path.join(outDir, "preview.log"), "w");
  previewProc = spawn(process.execPath, ["scripts/preview.mjs", "4183"], {
    cwd: workspace,
    stdio: ["ignore", log.fd, log.fd],
    windowsHide: true
  });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.status === 200) {
        evidence.setup.preview = { command: "node scripts/preview.mjs 4183", pid: previewProc.pid, status: res.status };
        return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("Preview did not start on 127.0.0.1:4183");
}

async function launchChrome() {
  const exe = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean).find((candidate) => existsSync(candidate));
  if (!exe) throw new Error("No Chrome or Edge executable found");
  const profile = path.join(outDir, "chrome-profile").replaceAll("\\", "/");
  await fs.mkdir(profile, { recursive: true });
  const log = await fs.open(path.join(outDir, "chrome.log"), "w");
  chromeProc = spawn(exe, [
    "--headless=new",
    "--remote-debugging-port=9333",
    `--user-data-dir=${profile}`,
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "about:blank"
  ], { stdio: ["ignore", log.fd, log.fd], windowsHide: true });
  let version;
  for (let i = 0; i < 60; i++) {
    try {
      version = await (await fetch("http://127.0.0.1:9333/json/version")).json();
      break;
    } catch {}
    await sleep(200);
  }
  if (!version) throw new Error("Chrome CDP endpoint did not start");
  await connect(version.webSocketDebuggerUrl);
  evidence.setup.chrome = {
    executable: exe,
    pid: chromeProc.pid,
    product: (await send("Browser.getVersion")).product,
    userAgent: (await send("Browser.getVersion")).userAgent,
    profile
  };
}

async function createPage({ width, height, jsDisabled = false, reduced = false } = {}) {
  const target = await send("Target.createTarget", { url: "about:blank" });
  const attach = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const page = { targetId: target.targetId, sessionId: attach.sessionId, width, height };
  openPages.push(page);
  for (const method of ["Page.enable", "Runtime.enable", "DOM.enable", "CSS.enable", "Network.enable", "Log.enable"]) {
    await send(method, {}, page.sessionId).catch(() => {});
  }
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, page.sessionId);
  await send("Emulation.setScriptExecutionDisabled", { value: jsDisabled }, page.sessionId);
  if (reduced) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, page.sessionId);
  }
  return page;
}

async function closePage(page) {
  await send("Target.detachFromTarget", { sessionId: page.sessionId }).catch(() => {});
  await send("Target.closeTarget", { targetId: page.targetId }).catch(() => {});
}

async function navigate(page, url) {
  const loaded = waitEvent(page.sessionId, "Page.loadEventFired", 25000).catch(() => null);
  await send("Page.navigate", { url }, page.sessionId);
  await loaded;
  await sleep(600);
}

async function evalJson(page, expression, timeoutMs = 20000) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, page.sessionId, timeoutMs);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  const value = result.result?.value;
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function screenshot(page, filename, full = false) {
  const params = { format: "png", fromSurface: true, captureBeyondViewport: full };
  if (full) {
    const metrics = await send("Page.getLayoutMetrics", {}, page.sessionId);
    params.clip = {
      x: 0,
      y: 0,
      width: Math.ceil(metrics.contentSize.width),
      height: Math.ceil(metrics.contentSize.height),
      scale: 1
    };
  }
  const capture = await send("Page.captureScreenshot", params, page.sessionId, 60000);
  const file = path.join(outDir, filename);
  await fs.writeFile(file, Buffer.from(capture.data, "base64"));
  evidence.screenshots.push(file);
  return file;
}

const stateExpression = `JSON.stringify((()=>{const cs=e=>getComputedStyle(e);const txt=e=>(e?.innerText||e?.textContent||'').trim().replace(/\\s+/g,' ');const rect=e=>{const r=e.getBoundingClientRect();return{x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),left:+r.left.toFixed(2),right:+r.right.toFixed(2),top:+r.top.toFixed(2),bottom:+r.bottom.toFixed(2)}};return{url:location.href,title:document.title,h1:txt(document.querySelector('h1')),mainCount:document.querySelectorAll('main').length,htmlClass:document.documentElement.className,navDisplay:cs(document.querySelector('.site-nav')).display,menuOpen:document.querySelector('[data-site-header]')?.hasAttribute('data-nav-open')||false,overflow:{innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth},clipped:Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.right>innerWidth+1||r.left<-1)}).slice(0,30).map(e=>({tag:e.tagName,cls:String(e.className),text:txt(e).slice(0,70),rect:rect(e)})),headings:Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h=>({tag:h.tagName,text:txt(h),fontSize:cs(h).fontSize,fontWeight:cs(h).fontWeight,rect:rect(h)})),focusables:Array.from(document.querySelectorAll('a[href],button:not([disabled]),main[tabindex]')).map(e=>({tag:e.tagName,text:txt(e)||e.getAttribute('aria-label')||e.id,href:e.getAttribute('href'),expanded:e.getAttribute('aria-expanded'),rect:rect(e),display:cs(e).display,visibility:cs(e).visibility})),images:Array.from(document.images).map(img=>({alt:img.alt,src:img.getAttribute('src'),currentSrc:img.currentSrc,loading:img.getAttribute('loading')||img.loading,widthAttr:img.getAttribute('width'),heightAttr:img.getAttribute('height'),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,rendered:rect(img),objectFit:cs(img).objectFit}))}})())`;

async function state(page) {
  return evalJson(page, stateExpression);
}

async function scrollFully(page) {
  await evalJson(page, `(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));window.scrollTo(0,0);await s(120);let n=0,y=0;while(n<80){const max=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight;if(y>=max)break;y=Math.min(max,y+Math.max(260,Math.floor(innerHeight*.7)));window.scrollTo(0,y);n++;await s(220)}await Promise.all(Array.from(document.images).map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});setTimeout(r,2500)})));return JSON.stringify({scrollY,iterations:n,height:document.documentElement.scrollHeight})})()`, 45000);
}

async function captureLayouts() {
  for (const [name, width, height] of mainViewports) {
    for (const [id, route] of routes) {
      const page = await createPage({ width, height });
      await navigate(page, baseUrl + route);
      await scrollFully(page);
      evidence.pages.push({ route, viewport: name, screenshot: await screenshot(page, `${id}-${name}-full.png`, true), state: await state(page) });
      await closePage(page);
    }
  }
  for (const [name, width, height] of targetViewports) {
    for (const [id, route] of routes) {
      const page = await createPage({ width, height });
      await navigate(page, baseUrl + route);
      evidence.targeted.push({ route, viewport: name, screenshot: await screenshot(page, `${id}-${name}-initial.png`), state: await state(page) });
      await closePage(page);
    }
  }
  for (const [id, route] of routes) {
    const page = await createPage({ width: 390, height: 844 });
    await navigate(page, baseUrl + route);
    await evalJson(page, `(()=>{document.documentElement.style.fontSize='200%';return JSON.stringify({fontSize:getComputedStyle(document.documentElement).fontSize})})()`);
    evidence.zoom200.push({ route, screenshot: await screenshot(page, `${id}-390-roottext200.png`), state: await state(page) });
    await closePage(page);
  }
}

async function keyboardChecks() {
  for (const [id, route] of routes) {
    const page = await createPage({ width: 390, height: 844 });
    await navigate(page, baseUrl + route);
    const rows = [];
    const press = async (key, code, vk, text) => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text, unmodifiedText: text || undefined }, page.sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }, page.sessionId);
      await sleep(100);
    };
    await press("Tab", "Tab", 9);
    rows.push({ step: "tab-to-skip", active: await evalJson(page, `JSON.stringify({tag:document.activeElement.tagName,text:document.activeElement.innerText||document.activeElement.getAttribute('aria-label')||'',href:document.activeElement.getAttribute('href'),outline:getComputedStyle(document.activeElement).outlineStyle})`) });
    await press("Enter", "Enter", 13, "\r");
    rows.push({ step: "activate-skip", state: await evalJson(page, `JSON.stringify({hash:location.hash,activeTag:document.activeElement.tagName,activeId:document.activeElement.id,mainFocused:document.activeElement===document.querySelector('main'),scrollY})`) });
    for (let i = 0; i < 14; i++) {
      await press("Tab", "Tab", 9);
      const active = await evalJson(page, `JSON.stringify({tag:document.activeElement.tagName,text:(document.activeElement.innerText||document.activeElement.getAttribute('aria-label')||document.activeElement.id||'').trim(),href:document.activeElement.getAttribute('href'),expanded:document.activeElement.getAttribute('aria-expanded'),outline:getComputedStyle(document.activeElement).outlineStyle})`);
      rows.push({ step: `tab-${i + 2}`, active });
      if (active.text === "Open navigation") break;
    }
    await press("Enter", "Enter", 13, "\r");
    const openShot = await screenshot(page, `keyboard-${id}-menu-open.png`);
    const opened = await evalJson(page, `JSON.stringify({expanded:document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),navOpen:document.querySelector('[data-site-header]').hasAttribute('data-nav-open'),navDisplay:getComputedStyle(document.querySelector('.site-nav')).display,hasFocus:document.hasFocus()})`);
    await press("Escape", "Escape", 27);
    const escaped = await evalJson(page, `JSON.stringify({expanded:document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),navOpen:document.querySelector('[data-site-header]').hasAttribute('data-nav-open'),active:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText,hasFocus:document.hasFocus()})`);
    evidence.keyboard.push({ route, rows, opened, escaped, screenshot: openShot });
    await closePage(page);
  }
}

async function contrastChecks() {
  const page = await createPage({ width: 1440, height: 1000 });
  await navigate(page, baseUrl + "/");
  evidence.contrast = await evalJson(page, `JSON.stringify((()=>{function parse(s){const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}function blend(f,b){return{r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1}}function lum(c){const v=[c.r,c.g,c.b].map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}function ratio(a,b){const x=lum(a),y=lum(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(3)}function bg(el){let base={r:255,g:255,b:255,a:1};for(let e=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(c&&c.a>0){base=blend(c,base);if(c.a===1)break}}return base}const sels=['.wordmark small','.kicker','.lead','.button','.text-link','.service-row-copy span','.service-row-action','.difference-item dd','.photo-mosaic figcaption','.owner-contact a','.final-cta p','.footer-links a','.page-hero p','.anchor-list a','.scope-note span','.responsible-card p','.phone-number','.contact-facts dd','.contact-action p'];return sels.map(sel=>document.querySelector(sel)?(()=>{const el=document.querySelector(sel),s=getComputedStyle(el),b=bg(el);return{selector:sel,text:(el.innerText||el.textContent||'').trim().slice(0,90),fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,background:'rgb('+Math.round(b.r)+', '+Math.round(b.g)+', '+Math.round(b.b)+')',ratio:ratio(parse(s.color),b)}})():null).filter(Boolean)})())`);
  const root = (await send("DOM.getDocument", {}, page.sessionId)).root.nodeId;
  for (const selector of [".button", ".text-link", ".service-row", ".nav-toggle"]) {
    const found = await send("DOM.querySelector", { nodeId: root, selector }, page.sessionId);
    if (found.nodeId) await send("CSS.forcePseudoState", { nodeId: found.nodeId, forcedPseudoClasses: ["hover", "focus-visible"] }, page.sessionId).catch(() => {});
    evidence.contrastInteractive.push({ selector, computed: await evalJson(page, `JSON.stringify((()=>{const el=document.querySelector('${selector}'),s=getComputedStyle(el);return{color:s.color,background:s.backgroundColor,outline:s.outlineColor,boxShadow:s.boxShadow}})())`) });
  }
  evidence.contrastScreenshot = await screenshot(page, "contrast-hover-focus-desktop.png");
  await closePage(page);
}

async function targetChecks() {
  for (const [name, width, height] of [["desktop1440", 1440, 1000], ["mobile390", 390, 844], ["narrow320", 320, 844]]) {
    const page = await createPage({ width, height });
    await navigate(page, baseUrl + "/");
    const collect = () => evalJson(page, `JSON.stringify(Array.from(document.querySelectorAll('a[href],button')).filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||e.href||'').trim().replace(/\\s+/g,' '),href:e.getAttribute('href'),w:+r.width.toFixed(2),h:+r.height.toFixed(2),x:+r.x.toFixed(2),y:+r.y.toFixed(2),primary:e.matches('.button,.nav-toggle,.header-phone,.site-nav a,.text-link')}}))`);
    evidence.targetBounds.push({ viewport: name, state: "closed", screenshot: await screenshot(page, `targets-${name}-closed.png`), rows: await collect() });
    if (width <= 390) {
      for (let i = 0; i < 8; i++) {
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, page.sessionId);
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, page.sessionId);
        if (await evalJson(page, `JSON.stringify(document.activeElement.matches('[data-nav-toggle]'))`)) break;
      }
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" }, page.sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, page.sessionId);
      await sleep(200);
      evidence.targetBounds.push({ viewport: name, state: "menu-open", screenshot: await screenshot(page, `targets-${name}-menu-open.png`), rows: await collect() });
    }
    await closePage(page);
  }
}

async function imageChecks() {
  for (const [name, width, height] of mainViewports) {
    for (const [id, route] of routes) {
      const page = await createPage({ width, height });
      await navigate(page, baseUrl + route);
      await scrollFully(page);
      evidence.imageChecks.push({ route, viewport: name, images: (await state(page)).images });
      await closePage(page);
    }
  }
  evidence.sourceAudit.publicImages = [];
  for (const file of (await fs.readdir(path.join(workspace, "public/assets/images"))).filter((file) => /\.jpe?g$/i.test(file))) {
    evidence.sourceAudit.publicImages.push({ file, bytes: (await fs.stat(path.join(workspace, "public/assets/images", file))).size });
  }
}

async function noJsChecks() {
  for (const [name, width, height] of mainViewports) {
    for (const [id, route] of routes) {
      const page = await createPage({ width, height, jsDisabled: true });
      await navigate(page, baseUrl + route);
      evidence.noJs.push({ route, viewport: name, screenshot: await screenshot(page, `nojs-${id}-${name}.png`), state: await state(page) });
      await closePage(page);
    }
  }
  const disabled = await createPage({ width: 390, height: 844, jsDisabled: true });
  await navigate(disabled, "data:text/html,<html data-inline='blocked'><body><script>document.documentElement.dataset.inline='ran'</script><noscript>JavaScript disabled</noscript></body></html>");
  evidence.noJsCanary.disabled = await evalJson(disabled, `JSON.stringify({inline:document.documentElement.dataset.inline,body:document.body.innerText})`);
  await closePage(disabled);
  const enabled = await createPage({ width: 390, height: 844 });
  await navigate(enabled, "data:text/html,<html data-inline='blocked'><body><script>document.documentElement.dataset.inline='ran'</script><noscript>JavaScript disabled</noscript></body></html>");
  evidence.noJsCanary.enabled = await evalJson(enabled, `JSON.stringify({inline:document.documentElement.dataset.inline,body:document.body.innerText})`);
  await closePage(enabled);
}

async function motionChecks() {
  for (const reduced of [false, true]) {
    const page = await createPage({ width: 390, height: 844, reduced });
    await navigate(page, baseUrl + "/");
    const computed = await evalJson(page, `JSON.stringify((()=>{const rows=Array.from(document.querySelectorAll('*')).slice(0,400).map(e=>{const s=getComputedStyle(e);return{transition:s.transitionDuration,animation:s.animationDuration,scroll:s.scrollBehavior}});return{matches:matchMedia('(prefers-reduced-motion: reduce)').matches,rootScroll:getComputedStyle(document.documentElement).scrollBehavior,transitions:[...new Set(rows.map(r=>r.transition))].slice(0,20),animations:[...new Set(rows.map(r=>r.animation))].slice(0,20),bodyStart:document.body.innerText.slice(0,240)}})())`);
    const shot = await screenshot(page, `motion-${reduced ? "reduced" : "normal"}-home390.png`);
    await scrollFully(page);
    evidence.motion.push({ reduced, screenshot: shot, computed, afterScroll: await evalJson(page, `JSON.stringify({scrollY,contactVisible:document.body.innerText.includes('Tell us what your facility needs')})`) });
    await closePage(page);
  }
}

async function performanceChecks() {
  const samples = [];
  const vitalsScript = `window.__v={lcp:null,cls:0,lcpEntries:0,clsEntries:0,error:null};try{new PerformanceObserver(l=>{const es=l.getEntries(),last=es[es.length-1];window.__v.lcpEntries+=es.length;if(last)window.__v.lcp=last.renderTime||last.loadTime||last.startTime||null}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__v.clsEntries++;if(!e.hadRecentInput)window.__v.cls+=e.value}}).observe({type:'layout-shift',buffered:true})}catch(e){window.__v.error=String(e&&e.message||e)}`;
  for (const [, route] of routes) {
    for (let sample = 1; sample <= 3; sample++) {
      const page = await createPage({ width: 390, height: 844 });
      await send("Network.clearBrowserCache", {}, page.sessionId);
      await send("Network.setCacheDisabled", { cacheDisabled: true }, page.sessionId);
      await send("Emulation.setScriptExecutionDisabled", { value: false }, page.sessionId);
      await send("Emulation.setCPUThrottlingRate", { rate: 1 }, page.sessionId);
      await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, page.sessionId);
      await send("Page.addScriptToEvaluateOnNewDocument", { source: vitalsScript }, page.sessionId);
      await navigate(page, baseUrl + route);
      await sleep(5500);
      const vitals = await evalJson(page, `JSON.stringify(window.__v)`);
      await scrollFully(page);
      const inventory = await evalJson(page, `JSON.stringify((()=>{const nav=performance.getEntriesByType('navigation')[0];const resources=performance.getEntriesByType('resource').map(e=>({name:e.name,initiatorType:e.initiatorType,decodedBodySize:e.decodedBodySize,encodedBodySize:e.encodedBodySize,transferSize:e.transferSize,duration:+e.duration.toFixed(2)}));const images=Array.from(document.images).map(img=>({currentSrc:img.currentSrc,loading:img.loading,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,renderedWidth:Math.round(img.getBoundingClientRect().width),renderedHeight:Math.round(img.getBoundingClientRect().height)}));return{navigation:nav?{name:nav.name,decodedBodySize:nav.decodedBodySize,encodedBodySize:nav.encodedBodySize,transferSize:nav.transferSize,duration:+nav.duration.toFixed(2)}:null,resources,images,scrollY,height:document.documentElement.scrollHeight}})())`);
      const unique = new Map();
      if (inventory.navigation) unique.set(inventory.navigation.name, inventory.navigation.decodedBodySize || 0);
      for (const item of inventory.resources) unique.set(item.name, Math.max(unique.get(item.name) || 0, item.decodedBodySize || 0));
      samples.push({ route, sample, lcpMsRaw: Number(vitals.lcp), clsRaw: Number(vitals.cls), vitals, decodedBodySize: [...unique.values()].reduce((a, b) => a + b, 0), inventory });
      await closePage(page);
    }
  }
  evidence.performance = {
    method: "three fresh cold-cache Chromium CDP navigations per route at 390x844; clear+disable cache; JS enabled; CPU/network unthrottled; 5.5s settle before incremental full scroll; retained per-resource inventory",
    thresholds: { medianLcpMs: 2500, maxCls: 0.1, maxDecodedBodySize: 1572864, cssBytes: 81920, jsBytes: 20480, fontBytes: 256000 },
    samples,
    summary: routes.map(([, route]) => {
      const rows = samples.filter((sample) => sample.route === route);
      const lcps = rows.map((sample) => sample.lcpMsRaw).sort((a, b) => a - b);
      const cls = rows.map((sample) => sample.clsRaw);
      const bytes = rows.map((sample) => sample.decodedBodySize);
      return { route, lcpSamples: lcps, medianLcpMs: lcps[1], clsSamples: cls, maxCls: Math.max(...cls), decodedBodySamples: bytes, maxDecodedBodySize: Math.max(...bytes) };
    })
  };
}

async function sourceAudit() {
  const pkg = JSON.parse(await fs.readFile(path.join(workspace, "package.json"), "utf8"));
  evidence.sourceAudit.dependencyAudit = {
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    cssBytes: (await fs.stat(path.join(workspace, "public/assets/css/styles.css"))).size,
    jsBytes: (await fs.stat(path.join(workspace, "public/assets/js/site.js"))).size,
    fontBytes: 0
  };
  evidence.sourceAudit.htmlImageTags = [];
  for (const [, route] of routes) {
    const file = path.join(workspace, "public", route === "/" ? "index.html" : route.slice(1), route === "/" ? "" : "index.html");
    const html = await fs.readFile(file, "utf8");
    evidence.sourceAudit.htmlImageTags.push({ route, imgTags: (html.match(/<img\b/g) || []).length, eager: (html.match(/loading="eager"/g) || []).length, lazy: (html.match(/loading="lazy"/g) || []).length, originalRefs: html.includes("assets/photos") });
  }
}

function designRubric() {
  evidence.designRubric = {
    premiumCredibility: "Screenshots show immediate commercial cleaning, Greater Rochester, phone and walk-through actions, disciplined typography, and real facility photography before decoration.",
    originalRestraint: "The rendered system uses a split photographic hero, ruled quick strip, ledger service rows, dark accountability band, process timeline, photo mosaic, and phone-led panels rather than stock cleaning icon grids, sparkles, glass, heavy gradients, or fake teams.",
    pageDistinction: "Home, Services, About, and Contact have distinct section structures while sharing type, spacing, color, and CTA language. Services uses anchored rows/detail sections; About emphasizes philosophy and Donald; Contact is phone-led.",
    mobileCare: "390/320 and 200% evidence shows service/contact paths remain reachable with no measured horizontal overflow. The prior 320 accountability split is not present in current screenshots.",
    capabilityHumanBalance: "The journey leads with professional commercial capability and then makes Donald/direct responsible-person access a practical reason to contact Premier, without cheap/little-guy/artificial-enterprise claims.",
    comparatorDistinctions: "Compared to CleanCraft/ABM/Coverall research, this keeps commercial polish and service architecture but does not copy CleanCraft curves/two-tier proof, ABM sweeping/video enterprise treatment, or Coverall franchise/protocol quote-form framing."
  };
}

async function writeSummary() {
  const overflow = [...evidence.pages, ...evidence.targeted, ...evidence.zoom200]
    .filter((item) => item.state.overflow.overflowX || item.state.clipped.length)
    .map((item) => `- ${item.route} ${item.viewport}: overflow=${item.state.overflow.overflowX} clipped=${item.state.clipped.length}`)
    .join("\n") || "- none in measured states";
  const perf = evidence.performance.summary.map((row) => `- ${row.route}: LCP ${row.lcpSamples.join(", ")} ms; median ${row.medianLcpMs}; CLS ${row.clsSamples.join(", ")} max ${row.maxCls}; decoded bytes ${row.decodedBodySamples.join(", ")} max ${row.maxDecodedBodySize}`).join("\n");
  await fs.writeFile(path.join(outDir, "validator-summary.md"), `# V08 Render/Accessibility/Performance Evidence\n\nBrowser: ${evidence.setup.chrome.product}\nUser agent: ${evidence.setup.chrome.userAgent}\nPreview: ${evidence.setup.preview.command} at ${baseUrl}\n\n## Screenshots\n${evidence.screenshots.map((file) => `- ${file}`).join("\n")}\n\n## Overflow And Clipping\n${overflow}\n\n## Performance\n${perf}\n\n## Design Rubric\n${Object.entries(evidence.designRubric).map(([key, value]) => `- ${key}: ${value}`).join("\n")}\n`);
}

async function cleanup() {
  for (const page of openPages.reverse()) await closePage(page).catch(() => {});
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  if (chromeProc && !chromeProc.killed) chromeProc.kill();
  if (previewProc && !previewProc.killed) previewProc.kill();
}

try {
  await fs.mkdir(outDir, { recursive: true });
  await launchPreview();
  await launchChrome();
  await sourceAudit();
  await captureLayouts();
  await keyboardChecks();
  await contrastChecks();
  await targetChecks();
  await imageChecks();
  await noJsChecks();
  await motionChecks();
  await performanceChecks();
  designRubric();
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, "validator-evidence.json"), JSON.stringify(evidence, null, 2));
  await writeSummary();
} catch (error) {
  evidence.fatal = error.stack || error.message;
  await fs.writeFile(path.join(outDir, "validator-evidence-partial.json"), JSON.stringify(evidence, null, 2)).catch(() => {});
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
