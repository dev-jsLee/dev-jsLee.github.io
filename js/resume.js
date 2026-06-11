// resume.js — PDF 이력서를 페이지 로드 시마다 다시 받아 PDF.js 로 canvas 에 렌더한다.
// assets/ 에서 가장 최근에 내보낸 PDF(jslee7518_YYMMDD_HHMM.pdf)를 자동으로 골라
// fetch → PDF.js 로 페이지별 canvas 렌더 → #resume-content 주입.
// 새 PDF 를 커밋만 하면 코드 수정 없이 자동으로 최신본이 잡힌다.
// (docx → PDF 내보내기는 Word 등에서 수동으로 수행)

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

// GitHub Contents API 로 assets 목록을 받아 최신 PDF 를 고른다.
// 정적 호스팅엔 디렉터리 목록 API 가 없어 GitHub API 를 사용. 파일명의
// YYMMDD_HHMM 은 고정폭 숫자라 사전순 정렬 = 시간순 정렬이 된다.
const REPO = 'dev-jsLee/dev-jsLee.github.io';
const ASSETS_DIR = 'assets';
const PDF_PREFIX = 'jslee7518'; // jslee7518_YYMMDD_HHMM.pdf
const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/cmaps/';

let currentPdf = null;

async function resolveLatestPdfUrl() {
  const api = `https://api.github.com/repos/${REPO}/contents/${ASSETS_DIR}`;
  const res = await fetch(api, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);

  const entries = await res.json();
  const pdfs = entries
    .filter((e) => e.type === 'file' && e.name.startsWith(PDF_PREFIX) && /\.pdf$/i.test(e.name))
    .map((e) => e.name)
    .sort(); // 사전순 = 시간순

  if (pdfs.length === 0) throw new Error('assets 에 PDF 가 없습니다');

  const latest = pdfs[pdfs.length - 1]; // 마지막 = 최신
  return `${ASSETS_DIR}/${latest}`;
}

async function load() {
  const host = document.getElementById('resume-content');
  if (!host) return;

  try {
    const pdfUrl = await resolveLatestPdfUrl();
    setDownloadHref(pdfUrl);

    currentPdf = await pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: CMAP_URL, // 한글(CJK) 폰트 안전장치
      cMapPacked: true,
    }).promise;

    await renderAll(host);
  } catch (err) {
    console.error('[resume] load failed:', err);
    showError(
      host,
      `이력서를 불러오지 못했습니다: ${err.message}` +
        `<br><br><code>${ASSETS_DIR}/${PDF_PREFIX}_*.pdf</code> 형식의 PDF 가 ` +
        '리포지토리에 커밋되어 있는지 확인해주세요.<br>' +
        '(최신본 탐색은 GitHub Pages 배포본에서 동작하며, 로컬 미리보기에서는 ' +
        '원격 저장소의 최신 PDF 를 가리킵니다.)'
    );
  }

  if (window.lucide) window.lucide.createIcons();
}

function setDownloadHref(url) {
  const link = document.querySelector('.resume-download');
  if (link) link.href = url;
}

async function renderAll(host) {
  if (!currentPdf) return;

  // 컨테이너 폭 기준 렌더 — canvas 는 CSS 로 100% 폭, 내부 해상도는 DPR 만큼 키워 선명도 유지
  const cssWidth = host.clientWidth || 760;
  const dpr = window.devicePixelRatio || 1;

  host.innerHTML = '';

  for (let pageNum = 1; pageNum <= currentPdf.numPages; pageNum++) {
    const page = await currentPdf.getPage(pageNum);

    const base = page.getViewport({ scale: 1 });
    const scale = (cssWidth / base.width) * dpr;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const wrap = document.createElement('div');
    wrap.className = 'pdf-page';
    wrap.appendChild(canvas);
    host.appendChild(wrap);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  }

  host.classList.remove('is-loading');
}

// 폭 변화에 맞춰 디바운스 후 재렌더 — 좁은 화면/회전에서도 선명하게
let resizeTimer = null;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (!currentPdf) return;
  if (Math.abs(window.innerWidth - lastWidth) < 40) return; // 미세 변동 무시
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const host = document.getElementById('resume-content');
    if (host) renderAll(host);
  }, 200);
});

function showError(host, message) {
  host.classList.remove('is-loading');
  host.innerHTML = `<p class="resume-error">${message}</p>`;
}

load();
