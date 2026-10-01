#!/usr/bin/env node
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const workspace = "C:/src/PremierCleaners";
const publicRoot = path.join(workspace, "public");
const evidenceRoot = "C:/Users/Tidus/.zenith/projects/20260914T025854Z-first-real-project-mission-design-and-build-a-complete-first-pro/.zenith/missions/mission-001/evidence/V09-hero-final-render";
const host = "127.0.0.1";
const port = 4183;
const baseUrl = `http://${host}:${port}`;
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const userDataDir = path.join(evidenceRoot, "chrome-profile");
const routes = [
  { id: "home", path: "/" },
  { id: "services", path: "/services/" },
  { id: "about", path: "/about/" },
  { id: "contact", path: "/contact/" }
];
const viewports = {
  narrow320: { width: 320, height: 844 },
  mobile390: { width: 390, height: 844 },
  tablet768: { width: 768, height: 844 },
  desktop1440: { width: 1440, height: 1000 },
  bp360: { width: 360, height: 844 },
  bp361: { width: 361, height: 844 },
  bp520: { width: 520, height: 844 },
  bp521: { width: 521, height: 844 }
};
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"]
]);

let ws;
let nextId = 1;
const pending = new Map();
const events = [];
const consoleMessages = [];
const networkRows = [];

function writeHeadForFile(response, file, statusCode) {
  const type = mime.get(path.extname(file).toLowerCase()) || "application/octet-stream";
  return stat(file).then((info) => {
    response.writeHead(statusCode, {
      "Content-Type": type,
      "Content-Length": info.size,
      "X-Content-Type-Options": "nosniff"
    });
    return info;
  });
}

function createPreviewServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", baseUrl);
      const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
      if (segments.some((segment) => segment === ".." || segment.includes("\\") || segment.includes("/"))) {
        response.writeHead(400);
        response.end("Bad request path");
        return;
      }
      let candidate = path.join(publicRoot, ...segments);
      try {
        const info = await stat(candidate);
        if (info.isDirectory()) candidate = path.join(candidate, "index.html");
      } catch {
        const withIndex = path.join(candidate, "index.html");
        if (fss.existsSync(withIndex)) candidate = withIndex;
      }
      if (!fss.existsSync(candidate) || !fss.statSync(candidate).isFile()) {
        candidate = path.join(publicRoot, "404.html");
        await writeHeadForFile(response, candidate, 404);
      } else {
        await writeHeadForFile(response, candidate, 200);
      }
      if (request.method === "HEAD") {
        response.end();
      } else {
        createReadStream(candidate).pipe(response);
      }
    } catch (error) {
      response.writeHead(500);
      response.end(String(error.message || error));
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function send(method, params = {}, sessionId, timeoutMs = 15000) {
  const id = nextId++;
  const message = { id, method, params };
  if (sessionId) message.sessionId = sessionId;
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer, method });
  });
  ws.send(JSON.stringify(message));
  return promise;
}

function waitForEvent(sessionId, method, timeoutMs = 15000) {
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

async function openSocket(url) {
  ws = new WebSocket(url);
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method) {
      events.push(message);
      if (message.method === "Runtime.consoleAPICalled") {
        consoleMessages.push(message.params);
      }
      if (message.method === "Network.responseReceived") {
        networkRows.push({
          url: message.params.response.url,
          status: message.params.response.status,
          mimeType: message.params.response.mimeType,
          encodedDataLength: message.params.response.encodedDataLength || 0
        });
      }
    }
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
    else item.resolve(message.result || {});
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome WebSocket open timeout")), 15000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

async function launchChrome() {
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.mkdir(userDataDir, { recursive: true });
  const args = [
    "--headless=new",
    "--remote-debugging-port=9229",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "about:blank"
  ];
  const chrome = spawn(chromePath, args, { stdio: "ignore", windowsHide: true });
  let version;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:9229/json/version");
      version = await response.json();
      break;
    } catch {
      await delay(250);
    }
  }
  if (!version?.webSocketDebuggerUrl) throw new Error("Chrome CDP endpoint was not ready");
  await openSocket(version.webSocketDebuggerUrl);
  return { chrome, version };
}

async function withPage(fn) {
  const target = await send("Target.createTarget", { url: "about:blank" });
  const targetId = target.targetId;
  const attached = await send("Target.attachToTarget", { targetId, flatten: true });
  const sessionId = attached.sessionId;
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Log.enable", {}, sessionId);
  await send("Accessibility.enable", {}, sessionId);
  try {
    return await fn(sessionId, targetId);
  } finally {
    await send("Target.detachFromTarget", { sessionId }).catch(() => {});
    await send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

async function navigate(sessionId, routePath, viewport, options = {}) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false
  }, sessionId);
  await send("Emulation.setScriptExecutionDisabled", { value: options.noJs === true }, sessionId);
  if (options.reducedMotion) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
  } else {
    await send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
  }
  const loaded = waitForEvent(sessionId, "Page.loadEventFired", 20000);
  await send("Page.navigate", { url: new URL(routePath, baseUrl).toString() }, sessionId);
  await loaded;
  await delay(options.settleMs ?? 350);
  if (options.root200) {
    await evalJson(sessionId, "(() => { document.documentElement.style.fontSize = '32px'; return getComputedStyle(document.documentElement).fontSize; })()");
    await delay(250);
  }
  if (options.overlayScrollbar) {
    await evalJson(sessionId, `(() => {
      const style = document.createElement('style');
      style.textContent = '::-webkit-scrollbar{display:none!important}';
      document.head.appendChild(style);
      return true;
    })()`);
    await delay(100);
  }
}

async function evalJson(sessionId, expression, timeoutMs = 15000) {
  const result = await send("Runtime.evaluate", {
    expression: `(async () => JSON.stringify(await (${expression})))()`,
    returnByValue: true,
    awaitPromise: true
  }, sessionId, timeoutMs);
  if (result.exceptionDetails) throw new Error("Runtime exception");
  return JSON.parse(result.result.value);
}

async function screenshot(sessionId, name, full = false) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: full,
    fromSurface: true
  }, sessionId, 30000);
  const file = path.join(evidenceRoot, name);
  await fs.writeFile(file, Buffer.from(result.data, "base64"));
  return file;
}

const pageStateExpr = `(() => {
  const doc = document.documentElement;
  const h1 = document.querySelector('h1');
  const hero = document.querySelector('.hero-copy') || document.querySelector('.page-hero .wrap') || document.querySelector('main');
  const ctas = Array.from(document.querySelectorAll('a,button')).filter(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  }).map(el => {
    const r = el.getBoundingClientRect();
    return {
      text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
      tag: el.tagName,
      href: el.href || '',
      role: el.getAttribute('role') || '',
      aria: el.getAttribute('aria-label') || '',
      expanded: el.getAttribute('aria-expanded') || '',
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    };
  });
  const h1Range = h1 ? document.createRange() : null;
  if (h1Range && h1.firstChild) {
    h1Range.selectNodeContents(h1);
  }
  const h1Rects = h1Range ? Array.from(h1Range.getClientRects()).map(r => ({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)})) : [];
  const wordRects = Array.from(document.querySelectorAll('.hero-title-word')).map(el => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  });
  const lineGroups = [];
  for (const rect of h1Rects) {
    const group = lineGroups.find(g => Math.abs(g.y - rect.y) <= 2);
    if (group) {
      group.w += rect.w;
      group.parts += 1;
    } else {
      lineGroups.push({ y: rect.y, h: rect.h, w: rect.w, parts: 1 });
    }
  }
  const elements = Array.from(document.body.querySelectorAll('*')).filter(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  });
  const clipped = elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.left < -1 || r.right > window.innerWidth + 1;
  }).slice(0, 20).map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, className: el.className || '', text: (el.innerText || '').trim().slice(0, 80), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) } };
  });
  return {
    url: location.href,
    title: document.title,
    h1Text: h1 ? (h1.getAttribute('aria-label') || h1.textContent.trim()) : '',
    h1RawText: h1 ? h1.textContent : '',
    mainCount: document.querySelectorAll('main').length,
    h1Count: document.querySelectorAll('h1').length,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    scrollbarWidth: window.innerWidth - doc.clientWidth,
    rootFontSize: getComputedStyle(doc).fontSize,
    h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
    heroTextMeasure: hero ? Math.round(hero.getBoundingClientRect().width) : null,
    h1Rect: h1 ? (() => { const r = h1.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    h1Rects,
    h1LineGroups: lineGroups,
    wordRects,
    overflowX: doc.scrollWidth > doc.clientWidth + 1,
    clipped,
    visibleText: document.body.innerText.slice(0, 1600),
    ctas
  };
})()`;

const imageStateExpr = `(() => Array.from(document.images).map(img => {
  const r = img.getBoundingClientRect();
  return {
    alt: img.alt,
    src: img.getAttribute('src'),
    srcset: img.getAttribute('srcset'),
    sizes: img.getAttribute('sizes'),
    loading: img.getAttribute('loading') || 'auto',
    currentSrc: img.currentSrc,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    renderedWidth: Math.round(r.width),
    renderedHeight: Math.round(r.height),
    widthAttr: img.getAttribute('width'),
    heightAttr: img.getAttribute('height')
  };
}))()`;

async function fullScrollAndImages(sessionId) {
  return evalJson(sessionId, `(async () => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    window.scrollTo(0, 0);
    await delay(250);
    let y = 0;
    const step = Math.floor(window.innerHeight * 0.65);
    for (let i = 0; i < 80; i++) {
      const maxY = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      if (y >= maxY) break;
      y = Math.min(maxY, y + step);
      window.scrollTo(0, y);
      await delay(260);
    }
    await Promise.all(Array.from(document.images).map(img => img.complete && img.naturalWidth > 0 ? true : new Promise(resolve => {
      const t = setTimeout(resolve, 3000);
      img.addEventListener('load', () => { clearTimeout(t); resolve(); }, {once:true});
      img.addEventListener('error', () => { clearTimeout(t); resolve(); }, {once:true});
    })));
    return { scrollY: Math.round(window.scrollY), images: ${imageStateExpr}, resources: performance.getEntriesByType('resource').map(e => ({ name:e.name, initiatorType:e.initiatorType, decodedBodySize:e.decodedBodySize, encodedBodySize:e.encodedBodySize, transferSize:e.transferSize })) };
  })()`, 45000);
}

async function collectRenderEvidence() {
  const render = { states: [], screenshots: [], images: [] };
  await withPage(async (sessionId) => {
    for (const route of routes) {
      for (const [label, vp] of Object.entries({ mobile390: viewports.mobile390, desktop1440: viewports.desktop1440 })) {
        await navigate(sessionId, route.path, vp);
        await evalJson(sessionId, "(() => { window.scrollTo(0,0); document.activeElement && document.activeElement.blur(); return {scrollY: window.scrollY}; })()");
        const shot = await screenshot(sessionId, `${route.id}-${label}-full.png`, true);
        render.screenshots.push(shot);
        render.states.push({ route: route.id, label, state: await evalJson(sessionId, pageStateExpr) });
        const imageData = await fullScrollAndImages(sessionId);
        render.images.push({ route: route.id, label, ...imageData });
        await evalJson(sessionId, `(() => new Promise((resolve) => {
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          document.activeElement && document.activeElement.blur();
          window.scrollTo(0, 0);
          let tries = 0;
          const tick = () => {
            tries += 1;
            if (Math.round(window.scrollY) === 0 || tries > 40) {
              resolve({ scrollY: Math.round(window.scrollY) });
            } else {
              setTimeout(tick, 50);
            }
          };
          tick();
        }))()`);
        await delay(350);
        const loadedShot = await screenshot(sessionId, `${route.id}-${label}-loaded-full.png`, true);
        render.screenshots.push(loadedShot);
      }
    }
    for (const route of routes) {
      for (const [label, vp] of Object.entries({ narrow320: viewports.narrow320, tablet768: viewports.tablet768 })) {
        await navigate(sessionId, route.path, vp);
        const shot = await screenshot(sessionId, `${route.id}-${label}-viewport.png`, false);
        render.screenshots.push(shot);
        render.states.push({ route: route.id, label, state: await evalJson(sessionId, pageStateExpr) });
      }
      for (const [label, vp] of Object.entries({ root200_320: viewports.narrow320, root200_390: viewports.mobile390 })) {
        await navigate(sessionId, route.path, vp, { root200: true, settleMs: 500 });
        const shot = await screenshot(sessionId, `${route.id}-${label}-viewport.png`, false);
        render.screenshots.push(shot);
        render.states.push({ route: route.id, label, state: await evalJson(sessionId, pageStateExpr) });
      }
    }
    for (const [label, vp] of Object.entries({
      home320classic: viewports.narrow320,
      home390classic: viewports.mobile390,
      home320overlay: viewports.narrow320,
      home390overlay: viewports.mobile390,
      home360: viewports.bp360,
      home361: viewports.bp361,
      home520: viewports.bp520,
      home521: viewports.bp521,
      home768: viewports.tablet768,
      home1440: viewports.desktop1440
    })) {
      await navigate(sessionId, "/", vp, { overlayScrollbar: label.includes("overlay") });
      const shot = await screenshot(sessionId, `${label}-initial.png`, false);
      render.screenshots.push(shot);
      render.states.push({ route: "home", label, state: await evalJson(sessionId, pageStateExpr) });
    }
    for (const [label, vp] of Object.entries({ home320root200classic: viewports.narrow320, home390root200classic: viewports.mobile390 })) {
      await navigate(sessionId, "/", vp, { root200: true, settleMs: 500 });
      const shot = await screenshot(sessionId, `${label}-initial.png`, false);
      render.screenshots.push(shot);
      render.states.push({ route: "home", label, state: await evalJson(sessionId, pageStateExpr) });
    }
  });
  return render;
}

async function collectA11yKeyboardEvidence() {
  const result = { semantic: [], keyboard: [], screenshots: [] };
  await withPage(async (sessionId) => {
    for (const route of routes) {
      await navigate(sessionId, route.path, viewports.mobile390);
      const state = await evalJson(sessionId, `(() => ({
        title: document.title,
        mainCount: document.querySelectorAll('main').length,
        headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => ({ tag:h.tagName, text:(h.getAttribute('aria-label')||h.innerText).trim() })),
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text:(a.innerText||a.getAttribute('aria-label')||'').trim(), href:a.getAttribute('href') })),
        images: Array.from(document.images).map(img => ({ alt: img.alt, src: img.getAttribute('src') })),
        controls: Array.from(document.querySelectorAll('a,button')).map(el => ({ tag: el.tagName, text:(el.innerText||el.getAttribute('aria-label')||'').trim(), type: el.getAttribute('type'), href: el.getAttribute('href') }))
      }))()`);
      const ax = await send("Accessibility.getFullAXTree", {}, sessionId);
      result.semantic.push({ route: route.id, state, axSample: ax.nodes.slice(0, 80).map(n => ({ role:n.role?.value, name:n.name?.value })) });
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
      await delay(120);
      const skipFocus = await evalJson(sessionId, `(() => ({ activeText: document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '', activeTag: document.activeElement.tagName, outline: getComputedStyle(document.activeElement).outlineStyle, rect: (()=>{const r=document.activeElement.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})() }))()`);
      const skipShot = await screenshot(sessionId, `${route.id}-skip-focus.png`, false);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
      await delay(150);
      const skipActivated = await evalJson(sessionId, `(() => ({ activeId: document.activeElement.id, activeTag: document.activeElement.tagName, scrollY: Math.round(window.scrollY), mainFocused: document.activeElement === document.querySelector('main') }))()`);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
      await delay(100);
      const focusAfterTabs = [];
      for (let i = 0; i < 6; i += 1) {
        focusAfterTabs.push(await evalJson(sessionId, `(() => ({ activeText: document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '', tag: document.activeElement.tagName, outline: getComputedStyle(document.activeElement).outlineStyle, href: document.activeElement.href || '', expanded: document.activeElement.getAttribute('aria-expanded') || '' }))()`));
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
        await delay(80);
      }
      await navigate(sessionId, route.path, viewports.mobile390);
      let reachedMenu = false;
      for (let i = 0; i < 8; i += 1) {
        const active = await evalJson(sessionId, `(() => ({ text: document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '', tag: document.activeElement.tagName }))()`);
        if (active.tag === "BUTTON" && active.text.includes("navigation")) {
          reachedMenu = true;
          break;
        }
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
        await delay(80);
      }
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
      await delay(150);
      const menuState = await evalJson(sessionId, `(() => ({ reachedMenu: ${reachedMenu}, expanded: document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'), navOpen: document.querySelector('[data-site-header]').hasAttribute('data-nav-open'), display: getComputedStyle(document.querySelector('#site-nav')).display, active: document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '' }))()`);
      const menuShot = await screenshot(sessionId, `${route.id}-keyboard-menu-open.png`, false);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
      await delay(120);
      const escapeState = await evalJson(sessionId, `(() => ({ expanded: document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'), navOpen: document.querySelector('[data-site-header]').hasAttribute('data-nav-open'), active: document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || '' }))()`);
      result.keyboard.push({ route: route.id, skipFocus, skipActivated, focusAfterTabs, menuState, escapeState, skipShot, menuShot });
      result.screenshots.push(skipShot, menuShot);
    }
  });
  return result;
}

async function collectTargetsAndJourney() {
  const result = { targets: [], journey: [], screenshots: [] };
  await withPage(async (sessionId) => {
    for (const [label, vp] of Object.entries({ narrow320: viewports.narrow320, mobile390: viewports.mobile390, desktop1440: viewports.desktop1440 })) {
      await navigate(sessionId, "/", vp);
      const closed = await evalJson(sessionId, `(() => Array.from(document.querySelectorAll('a,button')).map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { text:(el.innerText||el.getAttribute('aria-label')||'').trim(), tag:el.tagName, href:el.getAttribute('href')||'', visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none', rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, display:cs.display };
      }))()`);
      const closedShot = await screenshot(sessionId, `targets-${label}-closed.png`, false);
      await evalJson(sessionId, `(() => { const b=document.querySelector('[data-nav-toggle]'); if (b) b.click(); return true; })()`);
      await delay(120);
      const open = await evalJson(sessionId, `(() => Array.from(document.querySelectorAll('a,button')).map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { text:(el.innerText||el.getAttribute('aria-label')||'').trim(), tag:el.tagName, href:el.getAttribute('href')||'', visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none', rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, display:cs.display };
      }))()`);
      const openShot = await screenshot(sessionId, `targets-${label}-menu-open.png`, false);
      result.targets.push({ label, closed, open });
      result.screenshots.push(closedShot, openShot);
    }
    const journeySteps = [
      { expectedStart: "/", clickText: "Services" },
      { expectedStart: "/services/", clickText: "About" },
      { expectedStart: "/about/", clickText: "Contact" }
    ];
    await navigate(sessionId, "/", viewports.desktop1440);
    for (const step of journeySteps) {
      const before = await evalJson(sessionId, pageStateExpr);
      const shot = await screenshot(sessionId, `journey-${before.h1Text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28)}.png`, false);
      const target = await evalJson(sessionId, `(() => {
        const target = Array.from(document.querySelectorAll('a')).find(a => (a.innerText || '').trim() === '${step.clickText}' && a.getBoundingClientRect().width > 0);
        if (!target) return { found:false };
        const r = target.getBoundingClientRect();
        return { found:true, href: target.href, text: target.innerText.trim(), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} };
      })()`);
      if (target.found) {
        const loaded = waitForEvent(sessionId, "Page.loadEventFired", 10000).catch(() => null);
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: target.x, y: target.y, button: "left", clickCount: 1 }, sessionId);
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", clickCount: 1 }, sessionId);
        await loaded;
        await delay(250);
      }
      const after = await evalJson(sessionId, pageStateExpr);
      result.journey.push({ before, shot, action: step.clickText, clicked: target, after });
      result.screenshots.push(shot);
    }
    const final = await evalJson(sessionId, pageStateExpr);
    const finalShot = await screenshot(sessionId, "journey-contact-final.png", false);
    result.journey.push({ before: final, shot: finalShot, action: "end" });
    result.screenshots.push(finalShot);
  });
  return result;
}

async function collectNoJsReducedMotion() {
  const result = { noJs: [], reducedMotion: [] };
  await withPage(async (sessionId) => {
    await navigate(sessionId, "/canary", viewports.mobile390, { noJs: true });
  }).catch(() => {});
  await withPage(async (sessionId) => {
    const canary = "data:text/html,<html data-inline='blocked'><body><script>document.documentElement.dataset.inline='ran'</script><noscript>JavaScript disabled</noscript></body></html>";
    await send("Emulation.setScriptExecutionDisabled", { value: true }, sessionId);
    const loaded = waitForEvent(sessionId, "Page.loadEventFired", 10000);
    await send("Page.navigate", { url: canary }, sessionId);
    await loaded;
    const disabled = await evalJson(sessionId, `(() => ({ inline: document.documentElement.dataset.inline, text: document.body.innerText }))()`);
    await send("Emulation.setScriptExecutionDisabled", { value: false }, sessionId);
    const loaded2 = waitForEvent(sessionId, "Page.loadEventFired", 10000);
    await send("Page.navigate", { url: canary }, sessionId);
    await loaded2;
    const enabled = await evalJson(sessionId, `(() => ({ inline: document.documentElement.dataset.inline, text: document.body.innerText }))()`);
    result.canary = { disabled, enabled };
    for (const route of routes) {
      await navigate(sessionId, route.path, viewports.mobile390, { noJs: true });
      result.noJs.push({ route: route.id, state: await evalJson(sessionId, pageStateExpr), screenshot: await screenshot(sessionId, `nojs-${route.id}-mobile390.png`, false) });
    }
    for (const route of routes) {
      await navigate(sessionId, route.path, viewports.mobile390, { reducedMotion: true });
      result.reducedMotion.push({ route: route.id, reduced: await evalJson(sessionId, `(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior, transitionCount: Array.from(document.querySelectorAll('*')).filter(el => parseFloat(getComputedStyle(el).transitionDuration) > 0.01).length }))()`), screenshot: await screenshot(sessionId, `reduced-${route.id}-mobile390.png`, false) });
    }
  });
  return result;
}

const vitalsScript = `
window.__v09 = { lcp: null, lcpEntries: 0, cls: 0, clsEntries: 0, error: null };
try {
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    window.__v09.lcpEntries += entries.length;
    const last = entries[entries.length - 1];
    if (last) window.__v09.lcp = last.renderTime || last.loadTime || last.startTime || null;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    window.__v09.clsEntries += entries.length;
    for (const entry of entries) if (!entry.hadRecentInput) window.__v09.cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
} catch (error) {
  window.__v09.error = String(error && error.message || error);
}
`;

function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

async function collectPerformance() {
  const samples = [];
  await withPage(async (sessionId) => {
    await send("Page.addScriptToEvaluateOnNewDocument", { source: vitalsScript }, sessionId);
    for (const route of routes) {
      for (let sample = 1; sample <= 3; sample += 1) {
        await send("Network.clearBrowserCache", {}, sessionId);
        await send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
        await send("Emulation.setCPUThrottlingRate", { rate: 1 }, sessionId);
        await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId);
        await navigate(sessionId, route.path, viewports.mobile390, { settleMs: 0 });
        await delay(5500);
        const vitals = await evalJson(sessionId, "window.__v09");
        const afterScroll = await fullScrollAndImages(sessionId);
        const unique = new Map();
        for (const res of afterScroll.resources) unique.set(res.name, Math.max(unique.get(res.name) || 0, res.decodedBodySize || 0));
        const navigation = await evalJson(sessionId, `(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          return nav ? { name: nav.name, decodedBodySize: nav.decodedBodySize, encodedBodySize: nav.encodedBodySize, transferSize: nav.transferSize, duration: nav.duration } : null;
        })()`);
        if (navigation) unique.set(navigation.name, Math.max(unique.get(navigation.name) || 0, navigation.decodedBodySize || 0));
        samples.push({
          route: route.path,
          sample,
          lcpRaw: Number(vitals.lcp),
          clsRaw: Number(vitals.cls),
          lcpEntries: vitals.lcpEntries,
          clsEntries: vitals.clsEntries,
          observerError: vitals.error,
          decodedBodySize: [...unique.values()].reduce((a, b) => a + b, 0),
          navigation,
          scrollY: afterScroll.scrollY,
          resources: afterScroll.resources,
          images: afterScroll.images
        });
      }
    }
  });
  const summary = routes.map((route) => {
    const routeSamples = samples.filter(s => s.route === route.path);
    return {
      route: route.path,
      medianLcpRaw: median(routeSamples.map(s => s.lcpRaw)),
      maxClsRaw: Math.max(...routeSamples.map(s => s.clsRaw)),
      maxDecodedBodySize: Math.max(...routeSamples.map(s => s.decodedBodySize)),
      samples: routeSamples.map(s => ({ sample: s.sample, lcpRaw: s.lcpRaw, clsRaw: s.clsRaw, decodedBodySize: s.decodedBodySize, lcpEntries: s.lcpEntries, scrollY: s.scrollY, resourceCount: s.resources.length + (s.navigation ? 1 : 0) }))
    };
  });
  return { samples, summary, thresholds: { medianLcpMs: 2500, maxCls: 0.1, decodedBodySize: 1.5 * 1024 * 1024 }, method: "Three fresh cold-cache 390x844 JS-enabled Chromium loads per route; cache cleared and disabled; CPU/network unthrottled; 5.5s pre-scroll settle; incremental full scroll; resource/image inventory retained." };
}

function sourceAudit() {
  const files = routes.map(r => path.join(publicRoot, r.path, r.path === "/" ? "index.html" : ""));
  const htmlFiles = [
    path.join(publicRoot, "index.html"),
    path.join(publicRoot, "services/index.html"),
    path.join(publicRoot, "about/index.html"),
    path.join(publicRoot, "contact/index.html")
  ];
  const audit = {
    package: JSON.parse(fss.readFileSync(path.join(workspace, "package.json"), "utf8")),
    fileBytes: {},
    pages: [],
    unsupportedClaimHits: [],
    externalRefs: []
  };
  for (const file of [
    path.join(publicRoot, "assets/css/styles.css"),
    path.join(publicRoot, "assets/js/site.js"),
    ...fss.readdirSync(path.join(publicRoot, "assets/images")).map(n => path.join(publicRoot, "assets/images", n))
  ]) {
    audit.fileBytes[path.relative(workspace, file).replaceAll("\\", "/")] = fss.statSync(file).size;
  }
  const bad = /\b(HIPAA|OSHA|hospital-grade|biohazard|terminal cleaning|operating-room|fully insured|bonded|licensed|certified|certification|testimonial|review|award|years in business|years of experience|24\/7|emergency|same cleaner|family-owned|locally owned|carpet extraction|stripping|refinishing)\b/i;
  for (const file of htmlFiles) {
    const html = fss.readFileSync(file, "utf8");
    const rel = path.relative(workspace, file).replaceAll("\\", "/");
    audit.pages.push({
      file: rel,
      title: html.match(/<title>([^<]+)/i)?.[1] || "",
      h1Count: (html.match(/<h1\b/gi) || []).length,
      mainCount: (html.match(/<main\b/gi) || []).length,
      imgCount: (html.match(/<img\b/gi) || []).length,
      lazyCount: (html.match(/loading="lazy"/gi) || []).length,
      eagerCount: (html.match(/loading="eager"/gi) || []).length,
      hasSkipLink: html.includes("skip-link"),
      hasForm: /<form\b/i.test(html),
      h1Aria: rel === "public/index.html" ? html.match(/<h1[^>]*aria-label="([^"]+)"/i)?.[1] || "" : ""
    });
    const hit = html.match(bad);
    if (hit) audit.unsupportedClaimHits.push({ file: rel, hit: hit[0] });
    for (const ref of [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(m => m[1])) {
      if (/^https?:|^mailto:/i.test(ref)) audit.externalRefs.push({ file: rel, ref });
    }
  }
  return audit;
}

async function main() {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const server = await createPreviewServer();
  const { chrome, version } = await launchChrome();
  try {
    const browserVersion = await send("Browser.getVersion");
    const source = sourceAudit();
    const render = await collectRenderEvidence();
    const a11y = await collectA11yKeyboardEvidence();
    const targetsJourney = await collectTargetsAndJourney();
    const nojsMotion = await collectNoJsReducedMotion();
    const perf = await collectPerformance();
    const evidence = {
      collectedAt: new Date().toISOString(),
      workspace,
      evidenceRoot,
      server: { baseUrl, host, port, publicRoot },
      chrome: { launchedPath: chromePath, versionEndpoint: version, browserVersion },
      source,
      render,
      a11y,
      targetsJourney,
      nojsMotion,
      perf,
      consoleMessages,
      networkRows
    };
    await fs.writeFile(path.join(evidenceRoot, "validator-evidence.json"), JSON.stringify(evidence, null, 2));
    const summary = [
      "# V09 hero final render summary",
      "",
      `Browser: ${browserVersion.product}`,
      `User agent: ${browserVersion.userAgent}`,
      `Server: ${baseUrl}, publicRoot=${publicRoot}`,
      "",
      "## Home narrow measurements",
      ...render.states.filter(s => s.route === "home" && /home320|home390|home360|home361|home520|home521|narrow320|root200/.test(s.label)).map(s => `- ${s.label}: inner=${s.state.innerWidth}, client=${s.state.clientWidth}, scrollbar=${s.state.scrollbarWidth}, root=${s.state.rootFontSize}, h1=${s.state.h1FontSize}, measure=${s.state.heroTextMeasure}, h1Rect=${s.state.h1Rect?.w}x${s.state.h1Rect?.h}, lines=${s.state.h1LineGroups.map(g => `${g.w}px@${g.y}`).join(" / ")}, overflow=${s.state.overflowX}, clipped=${s.state.clipped.length}`),
      "",
      "## Performance summary",
      ...perf.summary.map(s => `- ${s.route}: medianLCP=${s.medianLcpRaw}ms, maxCLS=${s.maxClsRaw}, maxDecoded=${s.maxDecodedBodySize}`),
      "",
      "## Source budgets",
      `- CSS bytes: ${source.fileBytes["public/assets/css/styles.css"]}`,
      `- JS bytes: ${source.fileBytes["public/assets/js/site.js"]}`,
      `- unsupported claim hits: ${source.unsupportedClaimHits.length}`,
      `- external refs: ${source.externalRefs.length}`
    ].join("\n");
    await fs.writeFile(path.join(evidenceRoot, "validator-summary.md"), summary);
  } finally {
    ws.close();
    chrome.kill();
    server.close();
  }
}

main().catch(async (error) => {
  await fs.mkdir(evidenceRoot, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(evidenceRoot, "validator-error.txt"), String(error.stack || error)).catch(() => {});
  console.error(error);
  process.exit(1);
});
