#!/usr/bin/env node

const args = process.argv.slice(2);
const [cdpUrl, mode, targetUrl] = args;
const holdIndex = args.indexOf("--hold-ms");
const holdMs = holdIndex === -1 ? 0 : Number.parseInt(args[holdIndex + 1] || "0", 10);

if (!cdpUrl || !["--disable", "--enable"].includes(mode) || !targetUrl || Number.isNaN(holdMs)) {
  console.error("Usage: node scripts/cdp-nojs.mjs <browser-cdp-url> --disable|--enable <url> [--hold-ms <milliseconds>]");
  process.exit(2);
}

if (typeof WebSocket === "undefined") {
  console.error("This helper requires a Node runtime with global WebSocket support.");
  process.exit(2);
}

let nextId = 1;
const pending = new Map();

const ws = new WebSocket(cdpUrl);

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const message = { id, method, params };
  if (sessionId) {
    message.sessionId = sessionId;
  }
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
  });
  ws.send(JSON.stringify(message));
  return promise;
}

function waitForSessionEvent(sessionId, method, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
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

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) {
    return;
  }
  const item = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) {
    item.reject(new Error(`${item.method}: ${message.error.message}`));
  } else {
    item.resolve(message.result || {});
  }
});

function opened(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
  });
}

function evaluateExpression(url) {
  if (url.startsWith("data:")) {
    return `JSON.stringify({
      url: location.href,
      inlineState: document.documentElement.dataset.inline || "",
      noscriptText: document.querySelector("noscript")?.textContent.trim() || ""
    })`;
  }

  return `JSON.stringify({
    url: location.href,
    title: document.title,
    htmlClass: document.documentElement.className,
    navDisplay: getComputedStyle(document.querySelector(".site-nav")).display,
    toggleDisplay: getComputedStyle(document.querySelector("[data-nav-toggle]")).display,
    navLinks: Array.from(document.querySelectorAll(".site-nav a")).map((a) => a.textContent.trim()),
    phoneLinks: Array.from(document.querySelectorAll("a[href^='tel:']")).map((a) => a.getAttribute("href"))
  })`;
}

try {
  await opened(ws);
  const targets = await send("Target.getTargets");
  const page = targets.targetInfos.find((target) => target.type === "page");
  if (!page) {
    throw new Error("No page target found");
  }

  await send("Target.activateTarget", { targetId: page.targetId });
  const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("DOM.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Log.enable", {}, sessionId);
  await send("Emulation.setScriptExecutionDisabled", { value: mode === "--disable" }, sessionId);

  const loaded = waitForSessionEvent(sessionId, "Page.loadEventFired");
  await send("Page.navigate", { url: targetUrl }, sessionId);
  await loaded;
  await send("Target.activateTarget", { targetId: page.targetId });

  const result = await send("Runtime.evaluate", {
    expression: evaluateExpression(targetUrl),
    returnByValue: true
  }, sessionId);

  console.log(result.result.value);
  if (holdMs > 0) {
    console.log(`Holding CDP session for ${holdMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, holdMs));
  }
  await send("Target.detachFromTarget", { sessionId });
  ws.close();
} catch (error) {
  console.error(error.message);
  ws.close();
  process.exit(1);
}
