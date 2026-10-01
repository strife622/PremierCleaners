#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicRoot = path.join(root, "public");

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return [fullPath];
  });
}

function routeFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment.includes("\\") || segment.includes("/"))) {
    return null;
  }
  const candidate = path.join(publicRoot, ...segments);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return path.join(candidate, "index.html");
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  const directoryIndex = path.join(candidate, "index.html");
  if (fs.existsSync(directoryIndex)) {
    return directoryIndex;
  }
  return null;
}

function routeForHtml(filePath) {
  const relative = path.relative(publicRoot, filePath).replaceAll("\\", "/");
  if (relative === "index.html") {
    return "/";
  }
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -"index.html".length)}`;
  }
  return `/${relative}`;
}

function attrValues(html, attributeName) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function attrValue(html, attributeName) {
  return attrValues(html, attributeName)[0] || "";
}

function imgTags(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function srcsetUrls(srcset) {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function hexToRgb(hex) {
  const clean = hex.trim();
  const match = clean.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255
  ];
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const [red, green, blue] = rgb.map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  if (first === null || second === null) {
    return 0;
  }
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssVariable(css, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1] || "";
}

function hasFragmentTarget(html, fragment) {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(id|name)\\s*=\\s*["']${escaped}["']`, "i").test(html);
}

function checkReference(rawReference, fromFile) {
  if (!rawReference || rawReference.startsWith("tel:")) {
    return;
  }
  if (/^(https?:|data:|blob:)/i.test(rawReference)) {
    fail(`${path.relative(root, fromFile)} references external/nonlocal URL ${rawReference}`);
    return;
  }
  if (/^mailto:/i.test(rawReference)) {
    fail(`${path.relative(root, fromFile)} contains mailto URL ${rawReference}`);
    return;
  }

  const fromRoute = routeForHtml(fromFile);
  const parsed = new URL(rawReference, `http://local${fromRoute}`);
  const targetFile = routeFile(parsed.pathname);
  if (!targetFile) {
    fail(`${path.relative(root, fromFile)} references missing ${rawReference}`);
    return;
  }
  if (parsed.hash) {
    const targetHtml = fs.readFileSync(targetFile, "utf8");
    const fragment = decodeURIComponent(parsed.hash.slice(1));
    if (!hasFragmentTarget(targetHtml, fragment)) {
      fail(`${path.relative(root, fromFile)} references missing fragment ${rawReference}`);
    }
  }
}

if (!fs.existsSync(publicRoot)) {
  fail("public/ directory is missing");
}

const publicFiles = fs.existsSync(publicRoot) ? walk(publicRoot) : [];
const publicRel = publicFiles.map((file) => path.relative(publicRoot, file).replaceAll("\\", "/"));

for (const forbidden of ["BUSINESS.md", "docs/", "tools/", "scripts/", "assets/photos/", ".zenith/", ".codex/"]) {
  if (publicRel.some((file) => file === forbidden.replace("/", "") || file.startsWith(forbidden))) {
    fail(`public/ contains forbidden source/tooling path: ${forbidden}`);
  }
}

if (publicRel.includes("assets/images/manifest.json")) {
  fail("public/assets/images/manifest.json should stay outside deployable output");
}

const requiredRoutes = ["/", "/services/", "/about/", "/contact/", "/404.html"];
for (const route of requiredRoutes) {
  if (!routeFile(route)) {
    fail(`missing route file for ${route}`);
  }
}

const htmlFiles = publicFiles.filter((file) => file.endsWith(".html"));
const mainPageTitles = new Set();
const allowedEagerImages = new Set([
  "index.html|/assets/images/hallway-portrait-1200.jpg",
  "services/index.html|/assets/images/hallway-portrait-720.jpg"
]);

const placeholderPattern = /<placeholder>|<company|<confirm|company email|company address|TODO|FIXME/i;
const prohibitedPattern = /\b(HIPAA|OSHA|hospital-grade|biohazard|regulated medical waste|terminal cleaning|operating-room|infection-control|bloodborne|fully insured|bonded|licensed|certified|certification|testimonial|review|star rating|award|years in business|years of experience|24\/7|emergency|same cleaner|family-owned|locally owned|carpet extraction|stripping|refinishing)\b/i;

for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();

  if (!/<html\s+[^>]*lang=["']en["']/i.test(html)) {
    fail(`${relative} is missing lang="en"`);
  }
  if (!/<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1["']/i.test(html)) {
    fail(`${relative} is missing the expected viewport meta tag`);
  }
  if (!title) {
    fail(`${relative} is missing a title`);
  }
  if (!description) {
    fail(`${relative} is missing a meta description`);
  }
  if ((html.match(/<main\b/gi) || []).length !== 1) {
    fail(`${relative} must contain exactly one main landmark`);
  }
  if ((html.match(/<h1\b/gi) || []).length !== 1) {
    fail(`${relative} must contain exactly one h1`);
  }
  if (!/class=["'][^"']*\bskip-link\b/i.test(html)) {
    fail(`${relative} is missing a skip link`);
  }
  if (placeholderPattern.test(html)) {
    fail(`${relative} contains visible placeholder or TODO language`);
  }
  if (prohibitedPattern.test(html)) {
    fail(`${relative} contains a prohibited or unconfirmed claim term`);
  }
  if (/warm wood walls|polished flooring/i.test(html)) {
    fail(`${relative} contains stale hallway visual detail`);
  }
  if (/<form\b/i.test(html)) {
    fail(`${relative} contains a form, but no backend exists`);
  }
  if (/href=["']#["']/i.test(html)) {
    fail(`${relative} contains an empty hash link`);
  }

  if (["index.html", "services/index.html", "about/index.html", "contact/index.html"].includes(path.relative(publicRoot, file).replaceAll("\\", "/"))) {
    if (mainPageTitles.has(title)) {
      fail(`duplicate main-page title: ${title}`);
    }
    mainPageTitles.add(title);
  }

  const references = [
    ...attrValues(html, "href"),
    ...attrValues(html, "src"),
    ...attrValues(html, "srcset").flatMap(srcsetUrls),
    ...attrValues(html, "imagesrcset").flatMap(srcsetUrls)
  ];
  references.forEach((reference) => checkReference(reference, file));

  for (const tag of imgTags(html)) {
    const src = attrValue(tag, "src");
    const loading = attrValue(tag, "loading");
    const srcset = attrValue(tag, "srcset");
    const sizes = attrValue(tag, "sizes");
    const width = attrValue(tag, "width");
    const height = attrValue(tag, "height");
    const publicRelative = path.relative(publicRoot, file).replaceAll("\\", "/");

    if (!loading) {
      fail(`${relative} image ${src} is missing loading attribute`);
    }
    if (loading === "eager" && !allowedEagerImages.has(`${publicRelative}|${src}`)) {
      fail(`${relative} image ${src} is eager but is not a high-priority hero image`);
    }
    if (loading === "lazy" && /fetchpriority\s*=\s*["']high["']/i.test(tag)) {
      fail(`${relative} image ${src} is lazy but still has fetchpriority high`);
    }
    if (srcset && !sizes) {
      fail(`${relative} responsive image ${src} has srcset without sizes`);
    }
    if (!width || !height) {
      fail(`${relative} image ${src} is missing explicit dimensions`);
    }
  }
}

const cssBytes = publicFiles.filter((file) => file.endsWith(".css")).reduce((sum, file) => sum + fs.statSync(file).size, 0);
const jsBytes = publicFiles.filter((file) => file.endsWith(".js")).reduce((sum, file) => sum + fs.statSync(file).size, 0);
const fontBytes = publicFiles.filter((file) => file.includes(`${path.sep}fonts${path.sep}`)).reduce((sum, file) => sum + fs.statSync(file).size, 0);

if (cssBytes > 80 * 1024) {
  fail(`CSS budget exceeded: ${cssBytes} bytes`);
}
if (jsBytes > 20 * 1024) {
  fail(`JS budget exceeded: ${jsBytes} bytes`);
}
if (fontBytes > 250 * 1024) {
  fail(`font budget exceeded: ${fontBytes} bytes`);
}

const cssFiles = publicFiles.filter((file) => file.endsWith(".css"));
const cssText = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const copper = cssVariable(cssText, "--copper");
const warm = cssVariable(cssText, "--warm");
const paper = cssVariable(cssText, "--paper");
const navy = cssVariable(cssText, "--navy");
const navy2 = cssVariable(cssText, "--navy-2");
const focusOnLight = cssVariable(cssText, "--focus-on-light");
const focusOnDark = cssVariable(cssText, "--focus-on-dark");

for (const [foreground, background, label, minimum] of [
  [copper, warm, "copper on warm", 4.5],
  [copper, paper, "copper on paper", 4.5],
  [focusOnLight, warm, "light-surface focus on warm", 3],
  [focusOnLight, paper, "light-surface focus on paper", 3],
  [focusOnDark, navy, "dark-surface focus on navy", 3],
  [focusOnDark, navy2, "dark-surface focus on navy-2", 3],
  [focusOnDark, "#0d1629", "dark-surface focus on footer", 3]
]) {
  const ratio = contrastRatio(foreground, background);
  if (ratio < minimum) {
    fail(`${label} contrast ${ratio.toFixed(2)} is below ${minimum}:1`);
  }
}

notes.push(`public files: ${publicRel.length}`);
notes.push(`html files: ${htmlFiles.length}`);
notes.push(`css bytes: ${cssBytes}`);
notes.push(`js bytes: ${jsBytes}`);
notes.push(`font bytes: ${fontBytes}`);

if (failures.length) {
  console.error("Site check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Site check passed.");
notes.forEach((note) => console.log(`- ${note}`));
