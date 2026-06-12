// shoot-thumbs.mjs — 각 프로젝트의 데모/운영 화면을 스크린샷해 assets/thumbs/<slug>.png 로 저장한다.
// 로컬 데모(designUrl)는 내장 정적 서버로 서빙해 캡처하고, 외부 전용(liveUrl)은 그 URL로 직접 접속한다.
// 생성된 PNG 는 커밋되어 GitHub Pages 가 카드 썸네일로 서빙한다.
//
//   npm i                              # playwright 설치(devDependency)
//   npx playwright install chromium    # 브라우저 엔진 1회 설치
//   npm run shoot-thumbs               # 캡처 실행
//
// 화면이 바뀌면 다시 실행 후 커밋. PNG 가 없으면 카드는 placeholder 로 우아하게 폴백한다.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'thumbs');
const PORT = 8799;
const VIEWPORT = { width: 1280, height: 800 };

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

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects', 'manifest.json'), 'utf8'));
  const projects = Array.isArray(manifest.projects) ? manifest.projects : [];
  fs.mkdirSync(OUT, { recursive: true });

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('playwright 가 없습니다 — `npm i && npx playwright install chromium` 후 다시 실행하세요.');
    process.exit(1);
  }

  const srv = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1.5 });

  let ok = 0;
  for (const p of projects) {
    if (!p.slug) continue;
    const url = p.designUrl ? `http://localhost:${PORT}/${p.designUrl}` : p.liveUrl;
    if (!url) {
      console.log(`• ${p.slug}: 대상 URL 없음 — 건너뜀`);
      continue;
    }
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, `${p.slug}.png`) });
      console.log(`• ${p.slug} ✓  ${url}`);
      ok++;
    } catch (e) {
      console.warn(`• ${p.slug} ✗  ${url} — ${String(e && e.message ? e.message : e).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  srv.close();
  console.log(`\n완료: ${ok}/${projects.length} → assets/thumbs/`);
}

main();
