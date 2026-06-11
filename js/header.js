// header.js — 모든 메인 페이지 상단에 공통 헤더(브랜드 + 사이트맵 + 테마 토글)를 주입한다.
// 테마는 시스템 설정을 기본으로 따르고, 사용자가 토글하면 localStorage 에 고정된다.

const THEME_KEY = 'theme';

// 사이트맵 — 헤더 네비게이션. 섹션 앵커는 어느 페이지에서든 index 로 이동.
const NAV = [
  { label: '홈', href: 'index.html' },
  { label: '자기소개', href: 'index.html#about-section' },
  { label: '프로젝트', href: 'index.html#projects' },
  { label: '이력서', href: 'resume.html' },
];

/* ---------- theme ---------- */
function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

// 현재 유효 테마: 명시 설정(data-theme) 우선, 없으면 시스템 설정
function currentTheme() {
  return document.documentElement.dataset.theme || systemTheme();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  updateToggleIcon(theme);
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* localStorage 사용 불가 시 무시 — 세션 한정으로만 적용 */
  }
}

function updateToggleIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  // 다크일 때 해 아이콘(→ 라이트로 전환), 라이트일 때 달 아이콘
  const icon = theme === 'dark' ? 'sun' : 'moon';
  btn.setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
  btn.innerHTML = `<i data-lucide="${icon}" class="icon"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

/* ---------- header markup ---------- */
function isActive(href) {
  const page = href.split('#')[0];
  const path = location.pathname.split('/').pop() || 'index.html';
  // 앵커 링크(자기소개/프로젝트)는 active 표시하지 않음 — 페이지 단위로만
  if (href.includes('#')) return false;
  return page === path || (page === 'index.html' && path === '');
}

function buildHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';

  const inner = document.createElement('div');
  inner.className = 'site-header-inner';

  // brand
  const brand = document.createElement('a');
  brand.className = 'site-brand';
  brand.href = 'index.html';
  brand.innerHTML = '<span class="brand-mark">~/</span>jsLee';
  inner.appendChild(brand);

  // right group
  const group = document.createElement('div');
  group.className = 'site-header-actions';

  // nav (sitemap)
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', '사이트맵');
  for (const item of NAV) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    if (isActive(item.href)) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
  group.appendChild(nav);

  // theme toggle
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.type = 'button';
  toggle.addEventListener('click', toggleTheme);
  group.appendChild(toggle);

  // mobile menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'nav-toggle';
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', '메뉴 열기');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = '<i data-lucide="menu" class="icon"></i>';
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  // 링크 클릭 시 모바일 메뉴 닫기
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  group.appendChild(menuBtn);

  inner.appendChild(group);
  header.appendChild(inner);
  return header;
}

function init() {
  document.body.insertAdjacentElement('afterbegin', buildHeader());
  updateToggleIcon(currentTheme());

  if (window.lucide) window.lucide.createIcons();

  // 명시 설정이 없을 때만 시스템 테마 변화에 반응
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (!storedTheme()) updateToggleIcon(currentTheme());
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
