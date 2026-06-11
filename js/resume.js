// resume.js — docx 이력서를 페이지 로드 시마다 다시 받아 변환·렌더한다.
// assets/resume.docx 를 fetch → mammoth.js 로 시맨틱 HTML 변환 → #resume-content 주입.
// docx 만 새로 커밋하면 코드 수정 없이 화면이 갱신된다.

const RESUME_URL = 'assets/jslee7518.docx';

// docx 의 단락 스타일 이름을 의미 있는 HTML 태그로 매핑 (선택적 보강).
const STYLE_MAP = [
  "p[style-name='Title'] => h1.resume-title:fresh",
  "p[style-name='Subtitle'] => p.resume-subtitle:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
];

async function load() {
  const host = document.getElementById('resume-content');
  if (!host) return;

  if (!window.mammoth) {
    showError(host, 'mammoth 라이브러리를 불러오지 못했습니다. 네트워크(CDN) 연결을 확인해주세요.');
    return;
  }

  try {
    const res = await fetch(RESUME_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const arrayBuffer = await res.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer }, { styleMap: STYLE_MAP });

    if (result.messages && result.messages.length) {
      console.warn('[resume] mammoth messages:', result.messages);
    }

    const html = (result.value || '').trim();
    host.innerHTML = html || '<p class="resume-empty">// 이력서 내용이 비어 있습니다</p>';
    host.classList.remove('is-loading');
  } catch (err) {
    console.error('[resume] load failed:', err);
    showError(
      host,
      `이력서를 불러오지 못했습니다: ${err.message}` +
        '<br><br><code>assets/jslee7518.docx</code> 파일이 리포지토리에 있는지 확인해주세요.'
    );
  }

  if (window.lucide) window.lucide.createIcons();
}

function showError(host, message) {
  host.classList.remove('is-loading');
  host.innerHTML = `<p class="resume-error">${message}</p>`;
}

load();
