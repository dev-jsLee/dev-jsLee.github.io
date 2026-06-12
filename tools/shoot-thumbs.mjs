// shoot-thumbs.mjs — 각 프로젝트 화면을 시스템 Chromium(Edge/Chrome) 헤드리스로 스크린샷해
// assets/thumbs/<slug>.png 로 저장한다. 별도 npm 의존성 없음 — 시스템 브라우저만 있으면 된다.
// 로컬 데모(designUrl)는 내장 정적 서버로 서빙하고(오버레이는 ?nonav 로 숨김), 외부 전용은 liveUrl 로 접속.
//
//   node tools/shoot-thumbs.mjs
//   CHROME_PATH="C:\\path\\to\\chrome.exe" node tools/shoot-thumbs.mjs   # 브라우저 경로 수동 지정
//
// 화면이 바뀌면 다시 실행 후 커밋. PNG 가 없으면 카드는 placeholder 로 우아하게 폴백한다.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'thumbs');
const PORT = 8799;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.map': 'application/json', '.txt': 'text/plain',
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p.endsWith('/')) p += 'index.html';
        const full = path.join(ROOT, p);
        if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(full).pipe(res);
      } catch {
        res.statusCode = 500;
        res.end('error');
      }
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

// 시스템에 설치된 Chromium 계열 브라우저(Edge/Chrome) 경로를 찾는다.
function findBrowser() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const c = [];
  if (process.platform === 'win32') {
    for (const b of [process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], process.env['LOCALAPPDATA']].filter(Boolean)) {
      c.push(path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
      c.push(path.join(b, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    c.push('/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return c.find((x) => { try { return fs.existsSync(x); } catch { return false; } }) || null;
}

// 비동기 spawn — 내장 정적 서버(같은 프로세스)가 캡처 중에도 요청을 처리하도록 이벤트 루프를 막지 않는다.
function shoot(browser, url, outFile) {
  return new Promise((resolve, reject) => {
    const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumb-'));
    const cleanup = () => fs.rmSync(userDir, { recursive: true, force: true });
    const child = spawn(browser, [
      '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${userDir}`, '--window-size=1280,800', '--virtual-time-budget=4000',
      `--screenshot=${outFile}`, url,
    ], { stdio: 'ignore' });
    const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
    child.on('exit', () => { clearTimeout(timer); cleanup(); resolve(); });
    child.on('error', (e) => { clearTimeout(timer); cleanup(); reject(e); });
  });
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects', 'manifest.json'), 'utf8'));
  const projects = Array.isArray(manifest.projects) ? manifest.projects : [];
  fs.mkdirSync(OUT, { recursive: true });

  const browser = findBrowser();
  if (!browser) {
    console.error('Chromium(Edge/Chrome) 를 찾지 못했습니다 — CHROME_PATH 환경변수로 경로를 지정하세요.');
    process.exit(1);
  }
  console.log(`browser: ${browser}\n`);

  const srv = await startServer();
  let ok = 0;
  for (const p of projects) {
    if (!p.slug) continue;
    const url = p.designUrl ? `http://localhost:${PORT}/${p.designUrl}?nonav=1` : p.liveUrl;
    if (!url) {
      console.log(`• ${p.slug}: 대상 URL 없음 — 건너뜀`);
      continue;
    }
    const outFile = path.join(OUT, `${p.slug}.png`);
    try {
      await shoot(browser, url, outFile);
      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
        console.log(`• ${p.slug} ✓  ${url}`);
        ok++;
      } else {
        console.warn(`• ${p.slug} ✗  ${url} — 파일 미생성`);
      }
    } catch (e) {
      console.warn(`• ${p.slug} ✗  ${url} — ${String(e && e.message ? e.message : e).split('\n')[0]}`);
    }
  }
  srv.close();
  console.log(`\n완료: ${ok}/${projects.length} → assets/thumbs/`);
}

main();
