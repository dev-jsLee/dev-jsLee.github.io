import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, normalize } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const UI_ROOT = join(__dirname, 'ui');
const MANIFEST_PATH = join(REPO_ROOT, 'projects', 'manifest.json');
const GITMODULES_PATH = join(REPO_ROOT, '.gitmodules');

const HOST = '127.0.0.1';
const PORT = 4488;
const ALLOWED_ORIGINS = new Set([`http://${HOST}:${PORT}`, `http://localhost:${PORT}`]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data, null, 2), { 'Content-Type': MIME['.json'] });
}

function parseGitmodulesSlugs(text) {
  const slugs = new Set();
  const re = /^\s*path\s*=\s*projects\/([^\s/]+)\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) slugs.add(m[1]);
  return [...slugs];
}

async function readBody(req, limit = 1_000_000) {
  return new Promise((res, rej) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        rej(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

function validateManifest(obj) {
  if (!obj || typeof obj !== 'object') return 'manifest must be an object';
  if (obj.version !== 1) return 'manifest.version must be 1';
  if (!obj.site || typeof obj.site !== 'object') return 'manifest.site must be an object';
  if (!Array.isArray(obj.projects)) return 'manifest.projects must be an array';
  for (const [i, p] of obj.projects.entries()) {
    if (!p.slug || typeof p.slug !== 'string') return `projects[${i}].slug missing`;
    if (!/^[a-z0-9][a-z0-9-_]*$/i.test(p.slug)) return `projects[${i}].slug invalid (kebab-case-ish)`;
  }
  return null;
}

async function handleState(_req, res) {
  const [manifestRaw, gitmodulesRaw] = await Promise.all([
    readFile(MANIFEST_PATH, 'utf8').catch(() => null),
    readFile(GITMODULES_PATH, 'utf8').catch(() => ''),
  ]);

  let manifest;
  try {
    manifest = manifestRaw ? JSON.parse(manifestRaw) : null;
  } catch (e) {
    return sendJson(res, 500, { error: `manifest.json parse failed: ${e.message}` });
  }

  sendJson(res, 200, {
    manifest,
    gitmodules: parseGitmodulesSlugs(gitmodulesRaw),
    paths: {
      manifest: MANIFEST_PATH,
      gitmodules: GITMODULES_PATH,
    },
  });
}

async function handleManifestPut(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return sendJson(res, 403, { error: `forbidden origin: ${origin}` });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return sendJson(res, 413, { error: e.message });
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (e) {
    return sendJson(res, 400, { error: `invalid JSON: ${e.message}` });
  }

  const err = validateManifest(parsed);
  if (err) return sendJson(res, 400, { error: err });

  await writeFile(MANIFEST_PATH, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const safe = normalize(rel).replace(/^[/\\]+/, '');
  const filePath = join(UI_ROOT, safe);
  if (!filePath.startsWith(UI_ROOT)) {
    return send(res, 403, 'forbidden');
  }
  if (!existsSync(filePath)) {
    return send(res, 404, 'not found');
  }
  const ext = extname(filePath).toLowerCase();
  const data = await readFile(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/api/state') return handleState(req, res);
    if (req.method === 'PUT' && url.pathname === '/api/manifest') return handleManifestPut(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    return send(res, 405, 'method not allowed');
  } catch (e) {
    console.error('[admin] error:', e);
    return sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Portfolio Admin');
  console.log('  ---------------');
  console.log(`  URL:       http://${HOST}:${PORT}/`);
  console.log(`  Manifest:  ${MANIFEST_PATH}`);
  console.log(`  Gitmod.:   ${GITMODULES_PATH}`);
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
