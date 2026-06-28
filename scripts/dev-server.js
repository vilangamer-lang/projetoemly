#!/usr/bin/env node
const http = require("http");
const { promises: fs } = require("fs");
const path = require("path");

const patientHandler = require("../api/patient");

const ROOT = path.resolve(__dirname, "..");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".ico", "image/x-icon"]
]);

function contentType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function resolveWithinRoot(pathname) {
  const resolved = path.resolve(ROOT, `.${pathname}`);
  if (!resolved.startsWith(ROOT)) {
    return null;
  }
  return resolved;
}

async function pathExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveStaticFile(pathname) {
  if (pathname === "/") {
    return path.join(ROOT, "index.html");
  }

  const direct = resolveWithinRoot(pathname);
  if (direct && (await pathExists(direct))) {
    const stat = await fs.stat(direct);
    if (stat.isFile()) return direct;
    if (stat.isDirectory()) {
      const indexPath = path.join(direct, "index.html");
      if (await pathExists(indexPath)) return indexPath;
    }
  }

  if (!path.extname(pathname)) {
    const htmlCandidate = resolveWithinRoot(`${pathname}.html`);
    if (htmlCandidate && (await pathExists(htmlCandidate))) {
      return htmlCandidate;
    }
  }

  return null;
}

async function serveFile(res, filePath, method = "GET") {
  const body = await fs.readFile(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType(filePath));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", body.length);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname.startsWith("/api/patient")) {
      await patientHandler(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Method Not Allowed");
      return;
    }

    const filePath = await resolveStaticFile(requestUrl.pathname);
    if (!filePath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return;
    }

    await serveFile(res, filePath, req.method);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Internal Server Error: ${error.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`Serving from ${ROOT}`);
});
