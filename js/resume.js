// resume.js — PDF 이력서를 페이지 로드 시마다 다시 받아 PDF.js 로 canvas 에 렌더한다.
// assets/jslee7518.pdf 를 fetch → PDF.js 로 페이지별 canvas 렌더 → #resume-content 주입.
// PDF 만 새로 커밋하면 코드 수정 없이 화면이 갱신된다.
// (docx → PDF 내보내기는 Word 등에서 수동으로 수행)

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

const PDF_URL = 'assets/jslee7518.pdf';
const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/cmaps/';

let currentPdf = null;

async function load() {
  const host = document.getElementById('resume-content');
  if (!host) return;

  try {
    currentPdf = await pdfjsLib.getDocument({
      url: PDF_URL,
      cMapUrl: CMAP_URL, // 한글(CJK) 폰트 안전장치
      cMapPacked: true,
    }).promise;

    await renderAll(host);
  } catch (err) {
    console.error('[resume] load failed:', err);
    showError(
      host,
      `이력서를 불러오지 못했습니다: ${err.message}` +
        '<br><br><code>assets/jslee7518.pdf</code> 파일이 리포지토리에 있는지 확인해주세요.'
    );
  }

  if (window.lucide) window.lucide.createIcons();
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
