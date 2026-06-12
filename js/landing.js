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
  renderAbout(manifest.site ?? {});
  renderGrid(cards);
  renderFooter(manifest.site ?? {});

  if (window.lucide) window.lucide.createIcons();
  initReveal();
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
    // manifest 에 정의된 프로젝트는 정상 처리 (외부 운영 사이트 등 로컬 폴더가 없을 수 있음)
    bySlug.set(p.slug, { ...p, status: 'ok' });
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
  setText('[data-hero="developer"]', stripBrackets(site.developer ?? ''));
  setText('[data-hero="tagline"]', stripBrackets(site.tagline ?? ''));

  // 포지션 탭 + 호버 시 관련 기술 펼침
  renderRoles(site);

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

// 포지션↔기술을 이분 그래프(nodes+links)로 모델링하고, 포지션별 인접 기술을 뽑아낸다.
// → 다대다(기술 하나가 여러 포지션에 연결) 표현 가능. 같은 데이터로 추후 작대기표 시각화도 가능.
function rolesFromSite(site) {
  const g = site.skillGraph;
  if (g && Array.isArray(g.nodes) && Array.isArray(g.links)) {
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    const positions = g.nodes.filter((n) => n.type === 'position');
    return positions.map((p) => {
      const tech = [];
      for (const e of g.links) {
        // 방향 무관하게 이 포지션에 인접한 노드를 모은다. lane 은 행(기반 언어) 묶음용.
        const fromPos = e.source === p.id;
        const otherId = fromPos ? e.target : e.target === p.id ? e.source : null;
        if (otherId == null) continue;
        const node = byId.get(otherId);
        tech.push({ id: otherId, label: node ? node.label ?? otherId : otherId, lane: e.lane ?? null });
      }
      return { position: p.label ?? p.id, icon: p.icon, tech, emphasis: !!p.emphasis };
    });
  }
  // 레거시 roles 폴백 — tech 문자열을 객체로 정규화
  if (Array.isArray(site.roles)) {
    return site.roles
      .filter((r) => r && r.position)
      .map((r) => ({
        position: r.position,
        icon: r.icon,
        emphasis: !!r.emphasis,
        tech: (Array.isArray(r.tech) ? r.tech : []).map((t) =>
          typeof t === 'string' ? { id: null, label: t, lane: null } : t
        ),
      }));
  }
  return [];
}

// 포지션 탭(가로) + 공용 패널: 탭을 호버/포커스/클릭하면 그 포지션의 기술이 아래로 펼쳐진다.
function renderRoles(site) {
  const host = document.querySelector('[data-hero="roles"]');
  if (!host) return;
  host.innerHTML = '';

  const roles = rolesFromSite(site);
  if (roles.length === 0) {
    // 그래프·roles 모두 없으면 레거시 평칩 스택으로 폴백
    const stack = Array.isArray(site.stack) ? site.stack : [];
    for (const item of stack) {
      const chip = document.createElement('span');
      chip.className = 'stack-chip';
      chip.textContent = item;
      host.appendChild(chip);
    }
    host.hidden = stack.length === 0;
    return;
  }
  host.hidden = false;

  const tabs = document.createElement('div');
  tabs.className = 'role-tabs';
  tabs.setAttribute('role', 'tablist');

  const panel = document.createElement('div');
  panel.className = 'role-panel';
  panel.setAttribute('role', 'tabpanel');

  const tabEls = [];
  let active = -1;

  function setActive(i) {
    if (i === active) return;
    active = i;
    tabEls.forEach((t, idx) => {
      const on = idx === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const tech = Array.isArray(roles[i].tech) ? roles[i].tech : [];
    panel.innerHTML = '';
    // lane 이 있으면 기반 언어별로 한 행씩(기반 언어를 맨 왼쪽), 없으면 평칩 wrap
    const grouped = tech.some((t) => t && t.lane);
    panel.classList.toggle('role-panel--grouped', grouped);
    if (grouped) {
      const order = [];
      const byLane = new Map();
      for (const t of tech) {
        const key = t.lane || `solo:${t.label}`;
        if (!byLane.has(key)) {
          byLane.set(key, []);
          order.push(key);
        }
        byLane.get(key).push(t);
      }
      for (const key of order) {
        const lane = document.createElement('div');
        lane.className = 'role-lane';
        for (const t of byLane.get(key)) lane.appendChild(makeChip(t));
        panel.appendChild(lane);
      }
    } else {
      for (const t of tech) panel.appendChild(makeChip(t));
    }
    // 전환 페이드: 다시 그린 뒤 다음 프레임에 보이게
    panel.classList.remove('is-shown');
    requestAnimationFrame(() => panel.classList.add('is-shown'));
  }

  // 칩 생성 — 기반 언어(lane 의 base)면 is-base 로 살짝 강조
  function makeChip(t) {
    const chip = document.createElement('span');
    chip.className = 'stack-chip';
    if (t.lane && t.id === t.lane) chip.classList.add('is-base');
    chip.textContent = t.label;
    return chip;
  }

  roles.forEach((role, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'role-tab';
    tab.setAttribute('role', 'tab');
    if (role.icon) {
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', role.icon);
      icon.className = 'icon';
      tab.appendChild(icon);
    }
    tab.appendChild(document.createTextNode(role.position));
    // 자신 있는 포지션: 스파클 배지 + 강조 스타일
    if (role.emphasis) {
      tab.classList.add('role-tab--strong');
      tab.title = '자신 있는 분야';
      const badge = document.createElement('i');
      badge.setAttribute('data-lucide', 'sparkles');
      badge.className = 'icon role-badge';
      tab.appendChild(badge);
    }
    tab.addEventListener('mouseenter', () => setActive(i));
    tab.addEventListener('focus', () => setActive(i));
    tab.addEventListener('click', () => setActive(i));
    tabEls.push(tab);
    tabs.appendChild(tab);
  });

  host.appendChild(tabs);
  host.appendChild(panel);
  setActive(0); // 기본은 첫 포지션 펼침
}

function renderAbout(site) {
  const section = document.getElementById('about-section');
  const host = document.getElementById('about-qa');
  if (!section || !host) return;

  const about = site.about ?? {};
  const qa = Array.isArray(about.qa) ? about.qa : [];

  if (qa.length === 0) {
    section.hidden = true;
    return;
  }

  setText('[data-about="heading"]', about.heading ?? '자기소개');

  host.innerHTML = '';
  qa.forEach((item, i) => {
    if (!item || (!item.q && !item.a)) return;

    const wrap = document.createElement('div');
    wrap.className = 'about-item';
    wrap.dataset.open = i === 0 ? 'true' : 'false';

    const trigger = document.createElement('button');
    trigger.className = 'about-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');

    const idx = document.createElement('span');
    idx.className = 'q-index';
    idx.textContent = String(i + 1).padStart(2, '0');
    trigger.appendChild(idx);

    const qText = document.createElement('span');
    qText.className = 'q-text';
    qText.innerHTML = renderInlineMarkdown(item.q ?? '');
    trigger.appendChild(qText);

    const chevron = document.createElement('i');
    chevron.setAttribute('data-lucide', 'chevron-down');
    chevron.className = 'q-chevron';
    trigger.appendChild(chevron);

    const panel = document.createElement('div');
    panel.className = 'about-panel';
    const panelInner = document.createElement('div');
    panelInner.className = 'about-panel-inner';
    const a = document.createElement('p');
    a.className = 'about-a';
    a.innerHTML = renderInlineMarkdown(item.a ?? '');
    panelInner.appendChild(a);
    panel.appendChild(panelInner);

    trigger.addEventListener('click', () => {
      const open = wrap.dataset.open === 'true';
      wrap.dataset.open = open ? 'false' : 'true';
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    host.appendChild(wrap);
  });

  section.hidden = false;
}

// 프로젝트 카테고리 그룹 — 정의된 순서대로, 항목이 있는 그룹만 렌더한다.
// 알 수 없는/미지정 category 는 마지막 그룹(개인)으로 모은다.
const CATEGORY_GROUPS = [
  { key: 'work', label: '실무' },
  { key: 'personal', label: '개인' },
];
const FALLBACK_CATEGORY = 'personal';

function renderGrid(cards) {
  const host = document.getElementById('project-groups');
  if (!host) return;
  host.innerHTML = '';

  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '// 아직 등록된 프로젝트가 없습니다';
    host.appendChild(empty);
    return;
  }

  // 카테고리별로 버킷에 담는다
  const knownKeys = CATEGORY_GROUPS.map((g) => g.key);
  const buckets = new Map(CATEGORY_GROUPS.map((g) => [g.key, []]));
  for (const card of cards) {
    const cat = knownKeys.includes(card.category) ? card.category : FALLBACK_CATEGORY;
    buckets.get(cat).push(card);
  }

  // 등장 애니메이션·액센트는 그룹을 가로질러 연속 인덱스로
  let i = 0;
  for (const group of CATEGORY_GROUPS) {
    const items = buckets.get(group.key);
    if (!items.length) continue; // 비어 있는 그룹은 건너뜀

    const groupEl = document.createElement('div');
    groupEl.className = 'project-group';

    const title = document.createElement('h3');
    title.className = 'project-group-title';
    title.textContent = group.label;
    title.dataset.count = items.length;
    groupEl.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'project-grid';

    for (const card of items) {
      const el = card.status === 'stub' ? renderStubCard(card) : renderCard(card);
      el.classList.add('reveal');
      el.style.transitionDelay = `${Math.min(i * 70, 350)}ms`;
      el.style.setProperty('--card-accent', CARD_ACCENTS[i % CARD_ACCENTS.length]);
      grid.appendChild(el);
      i++;
    }

    groupEl.appendChild(grid);
    host.appendChild(groupEl);
  }
}

// rotating accent palette — matched lightness/chroma, hue varies
const CARD_ACCENTS = [
  'var(--c-green)',
  'var(--c-sky)',
  'var(--c-violet)',
  'var(--c-amber)',
  'var(--c-coral)',
];

function makeThumb(card) {
  const thumb = document.createElement('div');
  thumb.className = 'project-thumb';
  // 명시 thumbnail 우선, 없으면 관례 경로(assets/thumbs/<slug>.png) 자동 시도.
  // 파일이 없으면 onerror 로 placeholder 로 폴백 — 사이트가 깨지지 않는다.
  const src = card.thumbnail || (card.slug ? `assets/thumbs/${card.slug}.png` : null);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = (card.title || card.slug) + ' 미리보기';
    img.loading = 'lazy';
    img.addEventListener('error', () => fillThumbPlaceholder(thumb, card));
    thumb.appendChild(img);
  } else {
    fillThumbPlaceholder(thumb, card);
  }
  return thumb;
}

function fillThumbPlaceholder(thumb, card) {
  thumb.innerHTML = '';
  thumb.classList.add('placeholder');
  const label = document.createElement('span');
  label.textContent = 'thumbnail';
  thumb.appendChild(label);
  // faint icon watermark
  const wm = document.createElement('i');
  wm.setAttribute('data-lucide', card.icon ?? 'folder');
  wm.className = 'icon-watermark';
  thumb.appendChild(wm);
  if (window.lucide) window.lucide.createIcons();
}

function renderCard(card) {
  const a = document.createElement('a');
  a.className = 'project-card';
  // 카드는 데모로 직행하지 않고 상세(케이스 스터디) 페이지로 — 설명 후 데모 링크 제공
  a.href = `project.html?slug=${encodeURIComponent(card.slug)}`;

  a.appendChild(makeThumb(card));

  const body = document.createElement('div');
  body.className = 'project-body';

  const title = document.createElement('div');
  title.className = 'project-card-title';
  title.appendChild(document.createTextNode(stripBrackets(card.title || card.slug)));
  const arrow = document.createElement('i');
  arrow.setAttribute('data-lucide', 'arrow-up-right');
  arrow.className = 'arrow';
  title.appendChild(arrow);
  body.appendChild(title);

  if (card.subtitle) {
    const sub = document.createElement('div');
    sub.className = 'project-card-subtitle';
    sub.textContent = stripBrackets(card.subtitle);
    body.appendChild(sub);
  }

  if (card.description) {
    const desc = document.createElement('p');
    desc.className = 'project-card-description';
    desc.textContent = stripBrackets(card.description);
    body.appendChild(desc);
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
    body.appendChild(meta);
  }

  if (card.role) {
    const role = document.createElement('div');
    role.className = 'project-card-role';
    const strong = document.createElement('strong');
    strong.textContent = 'ROLE';
    role.appendChild(strong);
    role.appendChild(document.createTextNode(stripBrackets(card.role)));
    body.appendChild(role);
  }

  a.appendChild(body);
  return a;
}

function renderStubCard(card) {
  const a = document.createElement('a');
  a.className = 'project-card stub';
  a.href = `projects/${card.slug}/index.html`;

  a.appendChild(makeBadge('META MISSING', 'stub'));
  a.appendChild(makeThumb(card));

  const body = document.createElement('div');
  body.className = 'project-body';

  const title = document.createElement('div');
  title.className = 'project-card-title';
  title.textContent = card.slug;
  body.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'project-card-subtitle';
  sub.textContent = '메타데이터 미입력';
  body.appendChild(sub);

  const desc = document.createElement('p');
  desc.className = 'project-card-description';
  desc.textContent = '이 서브모듈은 .gitmodules에는 등록되었지만 manifest.json에 정보가 없습니다. npm run admin 으로 채워주세요.';
  body.appendChild(desc);

  a.appendChild(body);
  return a;
}

function makeBadge(text, variant) {
  const badge = document.createElement('span');
  badge.className = `project-card-badge badge-${variant}`;
  badge.textContent = text;
  return badge;
}

function renderFooter(site) {
  setText('[data-hero="footer"]', stripBrackets(site.footer ?? ''));
  const repo = document.querySelector('[data-hero="repo"]');
  if (repo) {
    if (site.repoUrl) {
      repo.href = site.repoUrl;
      repo.hidden = false;
    } else {
      repo.hidden = true;
    }
  }
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || items.length === 0) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

// 콘텐츠에 남아있는 [플레이스홀더 대괄호] 정리 — 바깥을 감싼 한 쌍만 제거
function stripBrackets(text) {
  const t = String(text).trim();
  if (t.startsWith('[') && t.endsWith(']')) return t.slice(1, -1);
  return text;
}

// 안전한 인라인 마크다운: HTML을 먼저 이스케이프한 뒤 일부 문법만 변환.
// 지원: **굵게**, *기울임*, `코드`, [텍스트](url), 줄바꿈(\n)
function renderInlineMarkdown(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

load().catch((err) => {
  console.error('[landing] load failed:', err);
  const host = document.getElementById('project-groups');
  if (host) {
    host.innerHTML = `<p class="empty-state">manifest.json 로드 실패: ${err.message}</p>`;
  }
});
