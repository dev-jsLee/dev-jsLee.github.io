const MANIFEST_URL = 'projects/manifest.json';
const GITMODULES_URL = '.gitmodules';

async function load() {
  const [manifest, gitmodulesText] = await Promise.all([
    fetchJson(MANIFEST_URL),
    fetchText(GITMODULES_URL),
  ]);

  const submoduleSlugs = parseGitmodules(gitmodulesText);
  const cards = mergeCards(manifest.projects ?? [], submoduleSlugs);

  renderHero(manifest.site ?? {});
  renderGrid(cards);
  renderFooter(manifest.site ?? {});

  if (window.lucide) window.lucide.createIcons();
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.json();
}

async function fetchText(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    return r.ok ? await r.text() : '';
  } catch {
    return '';
  }
}

function parseGitmodules(text) {
  const slugs = new Set();
  const re = /^\s*path\s*=\s*projects\/([^\s/]+)\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) slugs.add(m[1]);
  return slugs;
}

function mergeCards(manifestProjects, submoduleSlugs) {
  const bySlug = new Map();

  for (const p of manifestProjects) {
    if (!p.slug) continue;
    bySlug.set(p.slug, { ...p, status: submoduleSlugs.has(p.slug) ? 'ok' : 'manifest-only' });
  }

  for (const slug of submoduleSlugs) {
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { slug, status: 'stub' });
    }
  }

  const cards = [...bySlug.values()];
  cards.sort((a, b) => {
    const oa = a.order ?? 9999;
    const ob = b.order ?? 9999;
    if (oa !== ob) return oa - ob;
    return a.slug.localeCompare(b.slug);
  });
  return cards;
}

function renderHero(site) {
  setText('[data-hero="developer"]', site.developer ?? '');
  setText('[data-hero="tagline"]', site.tagline ?? '');

  const linksHost = document.querySelector('[data-hero="links"]');
  if (linksHost) {
    linksHost.innerHTML = '';
    const links = Array.isArray(site.links) ? site.links : [];
    for (const link of links) {
      const a = document.createElement('a');
      a.className = 'hero-link';
      a.href = link.url ?? '#';
      if (a.href.startsWith('http')) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', link.icon ?? 'link');
      icon.className = 'icon';
      a.appendChild(icon);
      a.appendChild(document.createTextNode(' ' + (link.label ?? '')));
      linksHost.appendChild(a);
    }
  }
}

function renderGrid(cards) {
  const grid = document.getElementById('project-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '아직 등록된 프로젝트가 없습니다.';
    grid.appendChild(empty);
    return;
  }

  for (const card of cards) {
    grid.appendChild(card.status === 'stub' ? renderStubCard(card) : renderCard(card));
  }
}

function renderCard(card) {
  const a = document.createElement('a');
  a.className = 'project-card';
  const entry = card.entry || 'index.html';
  a.href = `projects/${card.slug}/${entry}`;

  const header = document.createElement('div');
  header.className = 'project-card-header';
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', card.icon ?? 'folder');
  icon.className = 'icon';
  header.appendChild(icon);
  const title = document.createElement('div');
  title.className = 'project-card-title';
  title.textContent = card.title || card.slug;
  header.appendChild(title);
  a.appendChild(header);

  if (card.subtitle) {
    const sub = document.createElement('div');
    sub.className = 'project-card-subtitle';
    sub.textContent = card.subtitle;
    a.appendChild(sub);
  }

  if (card.description) {
    const desc = document.createElement('p');
    desc.className = 'project-card-description';
    desc.textContent = card.description;
    a.appendChild(desc);
  }

  if (Array.isArray(card.tech) && card.tech.length > 0) {
    const meta = document.createElement('div');
    meta.className = 'project-card-meta';
    for (const tag of card.tech) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      meta.appendChild(span);
    }
    a.appendChild(meta);
  }

  if (card.role) {
    const role = document.createElement('div');
    role.className = 'project-card-role';
    const strong = document.createElement('strong');
    strong.textContent = '역할:';
    role.appendChild(strong);
    role.appendChild(document.createTextNode(' ' + card.role));
    a.appendChild(role);
  }

  if (card.status === 'manifest-only') {
    a.appendChild(makeBadge('서브모듈 미등록', 'orphan'));
  }

  return a;
}

function renderStubCard(card) {
  const a = document.createElement('a');
  a.className = 'project-card stub';
  a.href = `projects/${card.slug}/index.html`;

  const header = document.createElement('div');
  header.className = 'project-card-header';
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', 'package');
  icon.className = 'icon';
  header.appendChild(icon);
  const title = document.createElement('div');
  title.className = 'project-card-title';
  title.textContent = card.slug;
  header.appendChild(title);
  a.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'project-card-subtitle';
  sub.textContent = '메타데이터 미입력';
  a.appendChild(sub);

  const desc = document.createElement('p');
  desc.className = 'project-card-description';
  desc.textContent = '이 서브모듈은 .gitmodules에는 등록되었지만 manifest.json에 정보가 없습니다. npm run admin 으로 채워주세요.';
  a.appendChild(desc);

  a.appendChild(makeBadge('META MISSING', 'stub'));
  return a;
}

function makeBadge(text, variant) {
  const badge = document.createElement('span');
  badge.className = `project-card-badge badge-${variant}`;
  badge.textContent = text;
  return badge;
}

function renderFooter(site) {
  setText('[data-hero="footer"]', site.footer ?? '');
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

load().catch((err) => {
  console.error('[landing] load failed:', err);
  const grid = document.getElementById('project-grid');
  if (grid) {
    grid.innerHTML = `<p class="empty-state">manifest.json 로드 실패: ${err.message}</p>`;
  }
});
