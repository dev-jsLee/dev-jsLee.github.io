// project.js — 제네릭 프로젝트 상세(케이스 스터디) 페이지.
// project.html?slug=<slug> 로 들어오면 manifest.json 에서 해당 프로젝트를 찾아
// 설명 위주로 렌더하고, 마지막에 라이브 데모·저장소 링크를 건다.

const MANIFEST_URL = 'projects/manifest.json';

const CATEGORY_LABEL = { work: '실무', personal: '개인' };

async function load() {
  const host = document.getElementById('project-detail');
  if (!host) return;

  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) {
    showError(host, '프로젝트가 지정되지 않았습니다. (project.html?slug=… 형식이 필요합니다)');
    return;
  }

  try {
    const manifest = await fetchJson(MANIFEST_URL);
    const project = (manifest.projects ?? []).find((p) => p.slug === slug);
    if (!project) {
      showError(host, `'${slug}' 프로젝트를 manifest 에서 찾을 수 없습니다.`);
      return;
    }
    render(host, project);
  } catch (err) {
    console.error('[project] load failed:', err);
    showError(host, `프로젝트 정보를 불러오지 못했습니다: ${err.message}`);
  }

  if (window.lucide) window.lucide.createIcons();
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.json();
}

function render(host, project) {
  document.title = `${stripBrackets(project.title || project.slug)} — jsLee`;

  const detail = project.detail ?? {};
  const article = document.createElement('article');
  article.className = 'detail';

  // back
  const back = document.createElement('a');
  back.className = 'detail-back';
  back.href = 'index.html#projects';
  back.innerHTML = '<i data-lucide="arrow-left" class="icon"></i> 프로젝트 목록';
  article.appendChild(back);

  // head
  article.appendChild(renderHead(project, detail));

  // body sections (내용 있는 것만)
  const sections = [
    { title: '개요', body: detail.overview },
    { title: '문제 · 배경', body: detail.problem },
    { title: '역할 · 기여', body: detail.contribution || project.role },
    { title: '배운 점', body: detail.learnings },
  ];
  for (const s of sections) {
    const el = renderTextSection(s.title, s.body);
    if (el) article.appendChild(el);
  }

  // 주요 기능 (목록)
  const features = renderFeatures(detail.features);
  if (features) article.appendChild(features);

  // 스크린샷
  const shots = renderScreenshots(detail.screenshots, project);
  if (shots) article.appendChild(shots);

  // 하단 CTA
  article.appendChild(renderFootCta(project, detail));

  host.classList.remove('is-loading');
  host.innerHTML = '';
  host.appendChild(article);
}

function renderHead(project, detail) {
  const head = document.createElement('header');
  head.className = 'detail-head';

  const cat = CATEGORY_LABEL[project.category];
  if (cat) {
    const badge = document.createElement('span');
    badge.className = 'detail-category';
    badge.textContent = cat;
    head.appendChild(badge);
  }

  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = stripBrackets(project.title || project.slug);
  head.appendChild(h1);

  if (project.subtitle) {
    const sub = document.createElement('p');
    sub.className = 'detail-subtitle';
    sub.textContent = stripBrackets(project.subtitle);
    head.appendChild(sub);
  }

  if (Array.isArray(project.tech) && project.tech.length) {
    const tech = document.createElement('div');
    tech.className = 'detail-tech';
    for (const t of project.tech) {
      const chip = document.createElement('span');
      chip.className = 'tag';
      chip.textContent = t;
      tech.appendChild(chip);
    }
    head.appendChild(tech);
  }

  // 상단 CTA (라이브 데모 · 저장소)
  head.appendChild(renderCta(project, detail));
  return head;
}

// 라이브 데모/사이트 URL — 외부 운영 사이트(liveUrl)가 있으면 그것을, 없으면 로컬 데모를.
function demoUrlOf(project) {
  if (project.liveUrl) return project.liveUrl;
  const entry = project.entry || 'index.html';
  return `projects/${project.slug}/${entry}`;
}

function applyDemoLink(a, project) {
  const url = demoUrlOf(project);
  a.href = url;
  if (/^https?:\/\//.test(url)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
}

function renderCta(project, detail) {
  const cta = document.createElement('div');
  cta.className = 'detail-cta';

  const demo = document.createElement('a');
  demo.className = 'cta cta-primary';
  applyDemoLink(demo, project);
  demo.innerHTML = '<i data-lucide="external-link" class="icon"></i> 라이브 데모';
  cta.appendChild(demo);

  if (project.repoUrl) {
    const repo = document.createElement('a');
    repo.className = 'cta cta-secondary';
    repo.href = project.repoUrl;
    repo.target = '_blank';
    repo.rel = 'noopener';
    repo.innerHTML = '<i data-lucide="github" class="icon"></i> 저장소';
    cta.appendChild(repo);
  }

  // detail.links 의 추가 링크
  const extra = Array.isArray(detail.links) ? detail.links : [];
  for (const link of extra) {
    const a = document.createElement('a');
    a.className = 'cta cta-secondary';
    a.href = link.url ?? '#';
    if ((a.href || '').startsWith('http')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', link.icon ?? 'link');
    icon.className = 'icon';
    a.appendChild(icon);
    a.appendChild(document.createTextNode(' ' + (link.label ?? '링크')));
    cta.appendChild(a);
  }

  return cta;
}

function renderTextSection(title, body) {
  const text = body ? stripBrackets(body) : '';
  if (!text.trim()) return null;

  const section = document.createElement('section');
  section.className = 'detail-section';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  section.appendChild(h2);

  const p = document.createElement('div');
  p.className = 'detail-prose';
  p.innerHTML = renderInlineMarkdown(text);
  section.appendChild(p);

  return section;
}

function renderFeatures(features) {
  const items = (Array.isArray(features) ? features : [])
    .map((f) => stripBrackets(f))
    .filter((f) => f && f.trim());
  if (!items.length) return null;

  const section = document.createElement('section');
  section.className = 'detail-section';

  const h2 = document.createElement('h2');
  h2.textContent = '주요 기능';
  section.appendChild(h2);

  const ul = document.createElement('ul');
  ul.className = 'detail-features';
  for (const f of items) {
    const li = document.createElement('li');
    li.innerHTML = renderInlineMarkdown(f);
    ul.appendChild(li);
  }
  section.appendChild(ul);
  return section;
}

function renderScreenshots(screenshots, project) {
  const shots = (Array.isArray(screenshots) ? screenshots : []).filter((s) => s && s.src);
  if (!shots.length) return null;

  const section = document.createElement('section');
  section.className = 'detail-section';

  const h2 = document.createElement('h2');
  h2.textContent = '스크린샷';
  section.appendChild(h2);

  const grid = document.createElement('div');
  grid.className = 'detail-shots';
  for (const shot of shots) {
    const fig = document.createElement('figure');
    fig.className = 'detail-shot';
    const img = document.createElement('img');
    img.src = shot.src;
    img.alt = shot.caption || `${stripBrackets(project.title || project.slug)} 스크린샷`;
    img.loading = 'lazy';
    fig.appendChild(img);
    if (shot.caption) {
      const cap = document.createElement('figcaption');
      cap.textContent = shot.caption;
      fig.appendChild(cap);
    }
    grid.appendChild(fig);
  }
  section.appendChild(grid);
  return section;
}

function renderFootCta(project, detail) {
  const foot = document.createElement('div');
  foot.className = 'detail-foot';

  const demo = document.createElement('a');
  demo.className = 'cta cta-primary cta-lg';
  applyDemoLink(demo, project);
  demo.innerHTML = '<i data-lucide="external-link" class="icon"></i> 라이브 데모 열기';
  foot.appendChild(demo);

  const back = document.createElement('a');
  back.className = 'cta cta-ghost';
  back.href = 'index.html#projects';
  back.textContent = '← 프로젝트 목록으로';
  foot.appendChild(back);

  return foot;
}

function showError(host, message) {
  host.classList.remove('is-loading');
  host.innerHTML = `<p class="detail-error">${message}</p>` +
    '<p class="detail-error-back"><a href="index.html#projects">← 프로젝트 목록으로</a></p>';
}

/* ---- 공통 헬퍼 (landing.js 와 동일 규약) ---- */
function stripBrackets(text) {
  const t = String(text ?? '').trim();
  if (t.startsWith('[') && t.endsWith(']')) return t.slice(1, -1);
  return text ?? '';
}

// 안전한 인라인 마크다운: HTML 이스케이프 후 일부 문법만 변환
function renderInlineMarkdown(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

load();
