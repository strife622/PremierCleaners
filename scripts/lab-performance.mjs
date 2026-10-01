#!/usr/bin/env node

const args = process.argv.slice(2);
const runSyntheticChecks = args[0] === "--self-test";
const [cdpUrl, baseUrl = "http://127.0.0.1:4173"] = runSyntheticChecks ? [] : args;

if (!runSyntheticChecks && !cdpUrl) {
  console.error("Usage: node scripts/lab-performance.mjs <browser-cdp-url> [base-url]");
  console.error("       node scripts/lab-performance.mjs --self-test");
  process.exit(2);
}

if (!runSyntheticChecks && typeof WebSocket === "undefined") {
  console.error("This helper requires Node.js 22 or newer with global WebSocket support.");
  process.exit(2);
}

const routes = ["/", "/services/", "/about/", "/contact/"];
const samplesPerRoute = 3;
const viewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: false };
const settleMsBeforeScroll = 5500;
const scrollStepDelayMs = 350;
const postScrollSettleMs = 900;
const protocolTimeoutMs = 15000;
const thresholds = {
  medianLcpMs: 2500,
  maxCls: 0.1,
  decodedBodySize: 1.5 * 1024 * 1024
};
const collectionSetup = {
  javaScript: "enabled via Emulation.setScriptExecutionDisabled(false) before each navigation",
  cpuThrottling: "disabled via Emulation.setCPUThrottlingRate(1)",
  networkThrottling: "disabled via Network.emulateNetworkConditions with zero latency and unlimited throughput"
};
const failures = [];
let nextId = 1;
const pending = new Map();
let ws;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function displayLcp(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function displayCls(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
}

function displayMetric(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function send(method, params = {}, sessionId, timeoutMs = protocolTimeoutMs) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error(`Cannot send ${method}; WebSocket is not open`));
  }

  const id = nextId++;
  const message = { id, method, params };
  if (sessionId) {
    message.sessionId = sessionId;
  }

  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method}: timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, method, timer });
  });

  ws.send(JSON.stringify(message));
  return promise;
}

function rejectPending(reason) {
  for (const [id, item] of pending.entries()) {
    pending.delete(id);
    clearTimeout(item.timer);
    item.reject(new Error(`${item.method}: ${reason}`));
  }
}

function waitForSessionEvent(sessionId, method, timeoutMs = protocolTimeoutMs) {
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

function opened(socket, timeoutMs = protocolTimeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WebSocket connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket connection failed"));
    }, { once: true });
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function decodedSize(entries, navigation) {
  const unique = new Map();
  if (navigation?.name) {
    unique.set(navigation.name, navigation.decodedBodySize || 0);
  }
  for (const entry of entries) {
    unique.set(entry.name, Math.max(unique.get(entry.name) || 0, entry.decodedBodySize || 0));
  }
  return [...unique.values()].reduce((sum, size) => sum + size, 0);
}

function sampleLabel(route, sampleNumber) {
  return `${route} sample ${sampleNumber}`;
}

function recordSampleIntegrity(sample, targetFailures = failures) {
  const label = sampleLabel(sample.route, sample.sample);
  if (sample.vitals?.error) {
    targetFailures.push(`${label} PerformanceObserver error: ${sample.vitals.error}`);
  }
  if (!Number.isFinite(sample.lcpMsRaw) || sample.lcpMsRaw <= 0 || !(sample.vitals?.lcpEntries > 0)) {
    targetFailures.push(`${label} missing positive observed LCP`);
  }
  if (!Number.isFinite(sample.clsRaw) || sample.clsRaw < 0) {
    targetFailures.push(`${label} missing valid CLS`);
  }
  if (!Number.isFinite(sample.decodedBodySize) || sample.decodedBodySize < 0) {
    targetFailures.push(`${label} missing valid decoded body size`);
  }
  if (!sample.navigation) {
    targetFailures.push(`${label} missing navigation timing entry`);
  }
  if (sample.images.some((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || !image.currentSrc)) {
    targetFailures.push(`${label} has incomplete image loading after incremental full scroll`);
  }
  if (sample.resources.some((resource) => resource.name.includes("/assets/photos/"))) {
    targetFailures.push(`${label} fetched an original source photo from assets/photos`);
  }
}

function summarizeRoute(route, routeResults, targetFailures = failures) {
  const lcpSamplesRaw = routeResults.map((result) => result.lcpMsRaw);
  const clsSamplesRaw = routeResults.map((result) => result.clsRaw);
  const byteSamples = routeResults.map((result) => result.decodedBodySize);
  const medianLcpRaw = lcpSamplesRaw.every(Number.isFinite) ? median(lcpSamplesRaw) : NaN;
  const maxClsRaw = clsSamplesRaw.every(Number.isFinite) ? Math.max(...clsSamplesRaw) : NaN;
  const maxBytes = byteSamples.every(Number.isFinite) ? Math.max(...byteSamples) : NaN;

  if (Number.isFinite(medianLcpRaw) && medianLcpRaw > thresholds.medianLcpMs) {
    targetFailures.push(`${route} median raw LCP ${displayMetric(medianLcpRaw, 3)}ms exceeds ${thresholds.medianLcpMs}ms`);
  }
  if (Number.isFinite(maxClsRaw) && maxClsRaw > thresholds.maxCls) {
    targetFailures.push(`${route} max raw CLS ${displayMetric(maxClsRaw, 5)} exceeds ${thresholds.maxCls}`);
  }
  if (Number.isFinite(maxBytes) && maxBytes > thresholds.decodedBodySize) {
    targetFailures.push(`${route} decoded body size ${maxBytes} exceeds ${thresholds.decodedBodySize}`);
  }

  return {
    route,
    medianLcp: displayLcp(medianLcpRaw),
    medianLcpRaw,
    maxCls: displayCls(maxClsRaw),
    maxClsRaw,
    maxBytes,
    samples: routeResults
  };
}

function evaluateRouteSamples(route, routeResults, targetFailures = failures) {
  for (const sample of routeResults) {
    recordSampleIntegrity(sample, targetFailures);
  }
  return summarizeRoute(route, routeResults, targetFailures);
}

function attachSocketHandlers(socket) {
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }
    const item = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) {
      item.reject(new Error(`${item.method}: ${message.error.message}`));
    } else {
      item.resolve(message.result || {});
    }
  });
  socket.addEventListener("close", () => rejectPending("WebSocket closed"), { once: true });
  socket.addEventListener("error", () => rejectPending("WebSocket error"), { once: true });
}

const vitalsScript = `
  window.__premierVitals = { lcp: null, cls: 0, lcpEntries: 0, clsEntries: 0, error: null };
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      var last = entries[entries.length - 1];
      window.__premierVitals.lcpEntries += entries.length;
      if (last) {
        window.__premierVitals.lcp = last.renderTime || last.loadTime || last.startTime || null;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      window.__premierVitals.clsEntries += entries.length;
      for (var index = 0; index < entries.length; index += 1) {
        var entry = entries[index];
        if (!entry.hadRecentInput) {
          window.__premierVitals.cls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch (error) {
    window.__premierVitals.error = String(error && error.message || error);
  }
`;

const incrementalScrollScript = `
  new Promise((resolve) => {
    const delay = (ms) => new Promise((done) => setTimeout(done, ms));
    const imageState = () => Array.from(document.images).map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        src: image.getAttribute("src") || "",
        currentSrc: image.currentSrc || "",
        loading: image.getAttribute("loading") || "auto",
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: Math.round(rect.width),
        renderedHeight: Math.round(rect.height)
      };
    });
    const waitForImages = async () => {
      await Promise.all(Array.from(document.images).map((image) => {
        if (image.complete && image.naturalWidth > 0) {
          return Promise.resolve();
        }
        return new Promise((done) => {
          const timer = setTimeout(done, 3000);
          image.addEventListener("load", () => {
            clearTimeout(timer);
            done();
          }, { once: true });
          image.addEventListener("error", () => {
            clearTimeout(timer);
            done();
          }, { once: true });
        });
      }));
    };
    (async () => {
      let y = 0;
      let iterations = 0;
      const step = Math.max(260, Math.floor(window.innerHeight * 0.7));
      window.scrollTo(0, 0);
      await delay(${scrollStepDelayMs});
      while (iterations < 80) {
        const maxY = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        ) - window.innerHeight;
        if (y >= maxY) {
          break;
        }
        y = Math.min(maxY, y + step);
        window.scrollTo(0, y);
        iterations += 1;
        await delay(${scrollStepDelayMs});
      }
      window.scrollTo(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
      await delay(${postScrollSettleMs});
      await waitForImages();
      await delay(250);

      const resources = performance.getEntriesByType("resource").map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        decodedBodySize: entry.decodedBodySize,
        encodedBodySize: entry.encodedBodySize,
        transferSize: entry.transferSize,
        duration: Number(entry.duration.toFixed(2))
      }));
      const navigation = performance.getEntriesByType("navigation")[0];
      resolve(JSON.stringify({
        scrollY: Math.round(window.scrollY),
        documentHeight: Math.round(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),
        viewportHeight: window.innerHeight,
        scrollIterations: iterations,
        images: imageState(),
        resources,
        navigation: navigation ? {
          name: navigation.name,
          decodedBodySize: navigation.decodedBodySize,
          encodedBodySize: navigation.encodedBodySize,
          transferSize: navigation.transferSize,
          duration: Number(navigation.duration.toFixed(2)),
          domContentLoadedEventEnd: Number(navigation.domContentLoadedEventEnd.toFixed(2)),
          loadEventEnd: Number(navigation.loadEventEnd.toFixed(2))
        } : null
      }));
    })();
  })
`;

function parseRuntimeJson(evaluation, label) {
  if (evaluation.exceptionDetails) {
    throw new Error(`${label}: runtime exception`);
  }
  const value = evaluation.result?.value;
  if (typeof value !== "string") {
    throw new Error(`${label}: missing JSON string result`);
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label}: invalid JSON result (${error.message})`);
  }
}

async function sampleRoute(route, sampleNumber) {
  let targetId;
  let sessionId;

  try {
    const target = await send("Target.createTarget", { url: "about:blank" });
    targetId = target.targetId;
    if (!targetId) {
      throw new Error(`${sampleLabel(route, sampleNumber)} missing created target id`);
    }
    const attached = await send("Target.attachToTarget", { targetId, flatten: true });
    sessionId = attached.sessionId;
    if (!sessionId) {
      throw new Error(`${sampleLabel(route, sampleNumber)} missing attached session id`);
    }

    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Network.enable", {}, sessionId);
    await send("Network.clearBrowserCache", {}, sessionId);
    await send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
    await send("Emulation.setScriptExecutionDisabled", { value: false }, sessionId);
    await send("Emulation.setCPUThrottlingRate", { rate: 1 }, sessionId);
    await send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    }, sessionId);
    await send("Emulation.setDeviceMetricsOverride", viewport, sessionId);
    await send("Page.addScriptToEvaluateOnNewDocument", { source: vitalsScript }, sessionId);

    const url = new URL(route, baseUrl).toString();
    const loaded = waitForSessionEvent(sessionId, "Page.loadEventFired", 20000);
    await send("Page.navigate", { url }, sessionId);
    await loaded;

    await send("Runtime.evaluate", {
      expression: `new Promise((resolve) => setTimeout(resolve, ${settleMsBeforeScroll}))`,
      awaitPromise: true
    }, sessionId, settleMsBeforeScroll + 5000);

    const vitalsResult = await send("Runtime.evaluate", {
      expression: "JSON.stringify(window.__premierVitals)",
      returnByValue: true
    }, sessionId);

    const resourcesResult = await send("Runtime.evaluate", {
      expression: incrementalScrollScript,
      awaitPromise: true,
      returnByValue: true
    }, sessionId, 45000);

    const vitals = parseRuntimeJson(vitalsResult, `${sampleLabel(route, sampleNumber)} vitals`);
    const resourceState = parseRuntimeJson(resourcesResult, `${sampleLabel(route, sampleNumber)} resources`);
    const bytes = decodedSize(resourceState.resources, resourceState.navigation);
    const lcpMsRaw = finiteNumber(vitals.lcp);
    const clsRaw = finiteNumber(vitals.cls);

    const sample = {
      route,
      sample: sampleNumber,
      url,
      lcpMs: displayLcp(lcpMsRaw),
      lcpMsRaw,
      cls: displayCls(clsRaw),
      clsRaw,
      decodedBodySize: bytes,
      resourceCount: resourceState.resources.length + (resourceState.navigation ? 1 : 0),
      scrollY: Math.round(resourceState.scrollY),
      scrollIterations: resourceState.scrollIterations,
      vitals,
      navigation: resourceState.navigation,
      images: resourceState.images,
      resources: resourceState.resources
    };

    recordSampleIntegrity(sample);
    return sample;
  } finally {
    if (sessionId) {
      await send("Target.detachFromTarget", { sessionId }).catch(() => {});
    }
    if (targetId) {
      await send("Target.closeTarget", { targetId }).catch(() => {});
    }
  }
}

function syntheticSample(overrides = {}) {
  const lcpMsRaw = "lcpMsRaw" in overrides ? overrides.lcpMsRaw : 1200;
  const clsRaw = "clsRaw" in overrides ? overrides.clsRaw : 0;
  const vitals = {
    lcp: lcpMsRaw,
    cls: clsRaw,
    lcpEntries: Number.isFinite(lcpMsRaw) && lcpMsRaw > 0 ? 1 : 0,
    clsEntries: Number.isFinite(clsRaw) && clsRaw > 0 ? 1 : 0,
    error: null,
    ...overrides.vitals
  };
  const decodedBodySize = "decodedBodySize" in overrides ? overrides.decodedBodySize : 1024;

  return {
    route: "/synthetic/",
    sample: overrides.sample || 1,
    url: "http://127.0.0.1/synthetic/",
    lcpMs: displayLcp(lcpMsRaw),
    lcpMsRaw,
    cls: displayCls(clsRaw),
    clsRaw,
    decodedBodySize,
    resourceCount: 1,
    scrollY: 100,
    scrollIterations: 1,
    vitals,
    navigation: overrides.navigation === undefined ? { name: "synthetic", decodedBodySize } : overrides.navigation,
    images: overrides.images || [],
    resources: overrides.resources || []
  };
}

function failuresForSynthetic(samples) {
  const targetFailures = [];
  evaluateRouteSamples("/synthetic/", samples, targetFailures);
  return targetFailures;
}

function runSyntheticThresholdChecks() {
  const tests = [
    {
      name: "raw equality at LCP/CLS/resource thresholds passes",
      samples: [
        syntheticSample({ sample: 1, lcpMsRaw: thresholds.medianLcpMs, clsRaw: thresholds.maxCls, decodedBodySize: thresholds.decodedBodySize }),
        syntheticSample({ sample: 2, lcpMsRaw: thresholds.medianLcpMs, clsRaw: thresholds.maxCls, decodedBodySize: thresholds.decodedBodySize }),
        syntheticSample({ sample: 3, lcpMsRaw: thresholds.medianLcpMs, clsRaw: thresholds.maxCls, decodedBodySize: thresholds.decodedBodySize })
      ],
      shouldFail: false
    },
    {
      name: "raw LCP 2500.4ms fails even though rounded display is 2500ms",
      samples: [
        syntheticSample({ sample: 1, lcpMsRaw: 2500.4 }),
        syntheticSample({ sample: 2, lcpMsRaw: 2500.4 }),
        syntheticSample({ sample: 3, lcpMsRaw: 2500.4 })
      ],
      shouldFail: true,
      expectedPattern: /median raw LCP 2500\.4ms exceeds/
    },
    {
      name: "raw CLS 0.10004 fails even though rounded display is 0.1",
      samples: [
        syntheticSample({ sample: 1, clsRaw: 0.10004 }),
        syntheticSample({ sample: 2, clsRaw: 0.04 }),
        syntheticSample({ sample: 3, clsRaw: 0 })
      ],
      shouldFail: true,
      expectedPattern: /max raw CLS 0\.10004 exceeds/
    },
    {
      name: "missing LCP, invalid CLS and observer errors fail",
      samples: [
        syntheticSample({
          sample: 1,
          lcpMsRaw: NaN,
          clsRaw: NaN,
          vitals: { lcp: null, cls: "not-a-number", lcpEntries: 0, error: "observer failed" }
        })
      ],
      shouldFail: true,
      expectedPattern: /PerformanceObserver error|missing positive observed LCP|missing valid CLS/
    }
  ];

  const testFailures = [];
  for (const test of tests) {
    const actualFailures = failuresForSynthetic(test.samples);
    const hasExpectedFailure = test.expectedPattern ? actualFailures.some((failure) => test.expectedPattern.test(failure)) : false;
    if (!test.shouldFail && actualFailures.length) {
      testFailures.push(`${test.name}: expected pass, got ${actualFailures.join("; ")}`);
    }
    if (test.shouldFail && (!actualFailures.length || !hasExpectedFailure)) {
      testFailures.push(`${test.name}: expected targeted failure, got ${actualFailures.join("; ") || "none"}`);
    }
  }

  if (testFailures.length) {
    console.error("Lab performance synthetic threshold checks failed:");
    testFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Lab performance synthetic threshold checks passed.");
}

if (runSyntheticChecks) {
  runSyntheticThresholdChecks();
} else {
  ws = new WebSocket(cdpUrl);
  attachSocketHandlers(ws);

  try {
    await opened(ws);
    const version = await send("Browser.getVersion");
    const results = [];
    for (const route of routes) {
      for (let sample = 1; sample <= samplesPerRoute; sample += 1) {
        results.push(await sampleRoute(route, sample));
      }
    }

    const summary = routes.map((route) => {
      const routeResults = results.filter((result) => result.route === route);
      return summarizeRoute(route, routeResults);
    });

    console.log(JSON.stringify({
      browser: version.product,
      userAgent: version.userAgent,
      viewport,
      setup: collectionSetup,
      cache: "Network.clearBrowserCache plus Network.setCacheDisabled before each navigation",
      settleMsBeforeScroll,
      scroll: {
        method: "incremental full-page scroll",
        stepDelayMs: scrollStepDelayMs,
        postScrollSettleMs
      },
      thresholds,
      baseUrl,
      routes,
      samplesPerRoute,
      summary
    }, null, 2));

    ws.close();
    if (failures.length) {
      failures.forEach((failure) => console.error(failure));
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    process.exit(1);
  }
}
