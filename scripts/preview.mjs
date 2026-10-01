#!/usr/bin/env node
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || process.argv[2] || "4173", 10);
const publicRoot = path.resolve(process.cwd(), "public");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  ["", "text/plain; charset=utf-8"]
]);

function isInsidePublic(filePath) {
  const relative = path.relative(publicRoot, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePublicPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const decodedPathname = decodeURIComponent(url.pathname);
  if (decodedPathname.includes("\0")) {
    const error = new Error("Bad request path");
    error.statusCode = 400;
    throw error;
  }

  const segments = decodedPathname.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment.includes("\\") || segment.includes("/"))) {
    const error = new Error("Unsafe request path");
    error.statusCode = 400;
    throw error;
  }

  const candidate = path.join(publicRoot, ...segments);
  if (!isInsidePublic(candidate)) {
    const error = new Error("Path escapes public root");
    error.statusCode = 403;
    throw error;
  }

  return candidate;
}

async function existingFileFor(candidate) {
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      const indexFile = path.join(candidate, "index.html");
      const indexInfo = await stat(indexFile);
      return indexInfo.isFile() ? indexFile : null;
    }
    return info.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

async function sendFile(response, filePath, statusCode, method) {
  const type = contentTypes.get(path.extname(filePath).toLowerCase()) || contentTypes.get("");
  const info = await stat(filePath);
  response.writeHead(statusCode, {
    "Content-Type": type,
    "Content-Length": info.size,
    "X-Content-Type-Options": "nosniff"
  });
  if (method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, { "Allow": "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  try {
    const candidate = resolvePublicPath(request.url || "/");
    const found = await existingFileFor(candidate);
    if (found) {
      await sendFile(response, found, 200, request.method);
      return;
    }

    const notFound = path.join(publicRoot, "404.html");
    await sendFile(response, notFound, 404, request.method);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(statusCode === 500 ? "Internal Server Error" : error.message);
  }
});

server.listen(port, host, () => {
  console.log(`Premier Cleaners preview: http://${host}:${port}/`);
  console.log(`Serving only: ${publicRoot}`);
});
