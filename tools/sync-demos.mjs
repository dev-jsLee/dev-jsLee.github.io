// sync-demos.mjs — _src/ 의 클론 repo에서 "화면(정적 프론트)"만 추려
// projects/<slug>/ 로 복사(vendor)한다. 복사본은 메인 repo에 커밋되어 GitHub Pages 가 서빙한다.
//
//   node tools/sync-demos.mjs            # 화면 재복사만
//   node tools/sync-demos.mjs --pull     # 각 소스 git pull 후 재복사
//
// 소스 repo(_src/*)는 .gitignore 처리되어 추적되지 않으며, 이 스크립트는 그쪽에 push 하지 않는다.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, '_src');
const OUT_ROOT = path.join(ROOT, 'projects');

// slug = manifest 의 프로젝트 slug(서빙 경로 projects/<slug>/), repo = _src 안 클론 폴더명,
// src = 그 repo 안에서 정적 프론트가 있는 하위 경로, fixAbsolute = 선행 슬래시 경로 보정 여부.
// nav = 좌측 "디자인 리뷰" 사이트맵 오버레이 주입 여부(멀티페이지 데모만; graph 는 단일 페이지라 제외).
const CONFIG = [
  { slug: 'chat', repo: 'calDAVchat', src: 'frontend', fixAbsolute: true, nav: true },
  { slug: 'graph', repo: 'funcSound', src: '.', fixAbsolute: false, nav: false },
  { slug: 'robots', repo: 'soul-fingerprint', src: 'frontend', fixAbsolute: true, nav: true },
];

// CONFIG(_src 기반)에 없지만 이미 vendoring 된 데모 — nav 오버레이만 in-place 주입.
const NAV_ONLY = ['tams'];

// 복사 허용 확장자(정적 웹 자산만)
const ALLOW_EXT = new Set([
  '.html', '.htm', '.css', '.js', '.mjs',
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.json', '.map', '.txt',
]);
// 확장자가 허용돼도 이름으로 제외(빌드·패키지 메타)
const DENY_NAME = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'tsconfig.json',
  'composer.json', 'AGENTS.md', 'MILESTONES.md',
]);
const SKIP_DIR = new Set(['.git', 'node_modules', '.sisyphus', '__pycache__']);

const PULL = process.argv.includes('--pull');

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyWebAssets(srcDir, destDir) {
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) continue;
      count += copyWebAssets(path.join(srcDir, entry.name), path.join(destDir, entry.name));
    } else if (entry.isFile()) {
      if (DENY_NAME.has(entry.name)) continue;
      if (!ALLOW_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
      count++;
    }
  }
  return count;
}

// 선행 슬래시(/css, /js, …) 자산 경로를 서브경로(/projects/<slug>/…)로 보정.
// 프로토콜상대(//)·절대 URL(http)·data: 는 건드리지 않는다.
function fixAbsolutePaths(content, slug) {
  // 선행 슬래시는 정규식이 소비하므로, base(/projects/<slug>/)를 그대로 붙여 절대경로를 유지한다.
  const base = `/projects/${slug}/`;
  return content
    // HTML: href="/…", src='/…'  →  href="/projects/<slug>/…"
    .replace(/(\b(?:href|src)\s*=\s*)(["'])\/(?!\/)/gi, (_m, p, q) => `${p}${q}${base}`)
    // CSS / 인라인 style: url(/…), url("/…"), url('/…')
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, (_m, q) => `url(${q}${base}`);
}

const TEXT_EXT = new Set(['.html', '.htm', '.css']);

function applyFixups(destDir, slug) {
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    const full = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      applyFixups(full, slug);
    } else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
      const before = fs.readFileSync(full, 'utf8');
      const after = fixAbsolutePaths(before, slug);
      if (after !== before) fs.writeFileSync(full, after);
    }
  }
}

// ---- demo-nav 사이트맵 오버레이 주입 -------------------------------------
const NAV_MARKER = '<!-- demo-nav -->';
// 기존 주입 블록(마커 + script) — 멱등 재주입을 위해 먼저 제거한다.
const NAV_STRIP_RE = /\n?[ \t]*<!-- demo-nav -->\s*<script[^>]*data-demo-base[^>]*><\/script>/gi;

function listHtmlDocs(dir) {
  const out = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR.has(entry.name)) continue;
        walk(full);
      } else if (/\.html?$/i.test(entry.name)) {
        out.push(full);
      }
    }
  })(dir);
  return out;
}

function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// dir 안 완전한 HTML 문서에 오버레이 script 를 주입하고, 페이지 목록 __nav.json 을 생성한다.
function injectNav(dir, slug) {
  if (!fs.existsSync(dir)) {
    console.warn(`    ⚠ nav 대상 없음: projects/${slug} — 건너뜀`);
    return;
  }
  const base = `/projects/${slug}/`;
  const tag = `${NAV_MARKER}<script defer src="/js/demo-nav.js" data-demo-base="${base}"></script>`;
  const pages = [];
  let injected = 0;

  for (const file of listHtmlDocs(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/');
    if (rel.includes('/components/')) continue; // 프래그먼트 제외(목록·주입 모두)
    let html = fs.readFileSync(file, 'utf8');
    if (!/<\/body>/i.test(html)) continue; // 완전한 문서만
    pages.push({ path: rel, title: titleOf(html) });
    html = html.replace(NAV_STRIP_RE, ''); // 기존 주입 제거(멱등)
    html = html.replace(/<\/body>/i, `\n${tag}\n</body>`);
    fs.writeFileSync(file, html);
    injected++;
  }

  // index.html 먼저, 그다음 경로순
  pages.sort((a, b) =>
    a.path === 'index.html' ? -1 : b.path === 'index.html' ? 1 : a.path.localeCompare(b.path)
  );
  fs.writeFileSync(path.join(dir, '__nav.json'), JSON.stringify({ slug, pages }, null, 2));
  console.log(`    ↳ demo-nav 주입 ${injected}개 페이지 + __nav.json`);
}

function gitPull(repoDir) {
  try {
    const out = execFileSync('git', ['-C', repoDir, 'pull', '--ff-only'], { encoding: 'utf8' });
    console.log(`    ↳ git pull: ${out.trim().split('\n').pop()}`);
  } catch (err) {
    console.warn(`    ⚠ git pull 실패: ${err.message.split('\n')[0]}`);
  }
}

function main() {
  console.log(`sync-demos${PULL ? ' --pull' : ''}\n`);
  let total = 0;

  for (const cfg of CONFIG) {
    const repoDir = path.join(SRC_ROOT, cfg.repo);
    const srcDir = cfg.src === '.' ? repoDir : path.join(repoDir, cfg.src);
    const outDir = path.join(OUT_ROOT, cfg.slug);

    console.log(`• ${cfg.slug}  ←  _src/${cfg.repo}/${cfg.src === '.' ? '' : cfg.src}`);

    if (!fs.existsSync(repoDir)) {
      console.warn(`    ⚠ 소스 없음: ${path.relative(ROOT, repoDir)} — 건너뜀`);
      continue;
    }
    if (PULL) gitPull(repoDir);
    if (!fs.existsSync(srcDir)) {
      console.warn(`    ⚠ 프론트 경로 없음: ${path.relative(ROOT, srcDir)} — 건너뜀`);
      continue;
    }

    rmrf(outDir);
    const n = copyWebAssets(srcDir, outDir);
    if (cfg.fixAbsolute) applyFixups(outDir, cfg.slug);
    total += n;
    console.log(`    ↳ ${n}개 파일 복사 → projects/${cfg.slug}/${cfg.fixAbsolute ? ' (경로 보정)' : ''}`);
  }

  // nav 오버레이 주입 — vendoring 산출물에 in-place 로(복사 여부·_src 유무와 무관, 멱등).
  // 대상: CONFIG 의 nav:true + NAV_ONLY(_src 기반 아닌 기존 데모).
  const navSlugs = [...CONFIG.filter((c) => c.nav).map((c) => c.slug), ...NAV_ONLY];
  console.log('\n• demo-nav 사이트맵 주입');
  for (const slug of navSlugs) {
    console.log(`  - ${slug}`);
    injectNav(path.join(OUT_ROOT, slug), slug);
  }

  console.log(`\n완료: 총 ${total}개 파일.`);
}

main();
