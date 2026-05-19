const state = {
  manifest: null,
  gitmodules: [],
  selected: { type: 'site' },
  dirty: false,
  lastSaved: null,
};

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);
const isLocalEnv = ALLOWED_HOSTS.has(location.hostname);

const els = {
  envWarning: document.getElementById('env-warning'),
  saveBtn: document.getElementById('save-btn'),
  dirty: document.getElementById('dirty-indicator'),
  saved: document.getElementById('saved-indicator'),
  selectSite: document.getElementById('select-site'),
  addProject: document.getElementById('add-project'),
  projectList: document.getElementById('project-list'),
  formHost: document.getElementById('form-host'),
};

function setDirty(v) {
  state.dirty = v;
  els.dirty.textContent = v ? '저장되지 않은 변경' : '변경 없음';
  els.dirty.classList.toggle('dirty', v);
}

function statusOf(slug) {
  const inManifest = state.manifest.projects.some((p) => p.slug === slug);
  const inGit = state.gitmodules.includes(slug);
  if (inManifest && inGit) return 'ok';
  if (inGit) return 'stub';
  return 'orphan';
}

function statusLabel(s) {
  return { ok: 'OK', stub: 'META MISSING', orphan: 'ORPHAN' }[s];
}

function unionSlugs() {
  const set = new Set();
  for (const p of state.manifest.projects) set.add(p.slug);
  for (const s of state.gitmodules) set.add(s);
  return [...set].sort();
}

function renderSidebar() {
  els.projectList.innerHTML = '';
  for (const slug of unionSlugs()) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-item';
    if (state.selected.type === 'project' && state.selected.slug === slug) {
      btn.classList.add('active');
    }
    const title = document.createElement('span');
    title.className = 'list-item-title';
    const slugSpan = document.createElement('span');
    slugSpan.textContent = slug;
    title.appendChild(slugSpan);
    const pill = document.createElement('span');
    const s = statusOf(slug);
    pill.className = `status-pill pill-${s}`;
    pill.textContent = statusLabel(s);
    title.appendChild(pill);
    btn.appendChild(title);

    const proj = state.manifest.projects.find((p) => p.slug === slug);
    if (proj && proj.title) {
      const sub = document.createElement('span');
      sub.className = 'list-item-sub';
      sub.textContent = proj.title;
      btn.appendChild(sub);
    }

    btn.addEventListener('click', () => selectProject(slug));
    li.appendChild(btn);
    els.projectList.appendChild(li);
  }

  els.selectSite.classList.toggle('active', state.selected.type === 'site');
}

function selectSite() {
  state.selected = { type: 'site' };
  renderSidebar();
  renderSiteForm();
}

function selectProject(slug) {
  let proj = state.manifest.projects.find((p) => p.slug === slug);
  if (!proj) {
    proj = newStubProject(slug);
    state.manifest.projects.push(proj);
    setDirty(true);
  }
  state.selected = { type: 'project', slug };
  renderSidebar();
  renderProjectForm(slug);
}

function newStubProject(slug) {
  return {
    slug,
    title: '',
    subtitle: '',
    description: '',
    tech: [],
    role: '',
    category: 'personal',
    entry: 'index.html',
    icon: 'package',
    thumbnail: null,
    repoUrl: null,
    order: state.manifest.projects.length + 1,
  };
}

function renderSiteForm() {
  const tpl = document.getElementById('tpl-site-form');
  const node = tpl.content.cloneNode(true);
  els.formHost.innerHTML = '';
  els.formHost.appendChild(node);

  const site = state.manifest.site ?? {};
  bindField('developer', site, 'developer');
  bindField('tagline', site, 'tagline');
  bindField('footer', site, 'footer');
  bindField('repoUrl', site, 'repoUrl');

  const linksHost = els.formHost.querySelector('[data-list="links"]');
  renderLinks(linksHost, site);

  els.formHost.querySelector('[data-action="add-link"]').addEventListener('click', () => {
    site.links = Array.isArray(site.links) ? site.links : [];
    site.links.push({ label: '', url: '', icon: 'link' });
    state.manifest.site = site;
    setDirty(true);
    renderLinks(linksHost, site);
  });
}

function renderLinks(host, site) {
  host.innerHTML = '';
  const links = Array.isArray(site.links) ? site.links : [];
  const rowTpl = document.getElementById('tpl-link-row');
  links.forEach((link, i) => {
    const row = rowTpl.content.cloneNode(true);
    const li = row.querySelector('li');
    for (const field of ['label', 'url', 'icon']) {
      const inp = li.querySelector(`[data-link-field="${field}"]`);
      inp.value = link[field] ?? '';
      inp.addEventListener('input', () => {
        link[field] = inp.value;
        setDirty(true);
      });
    }
    li.querySelector('[data-action="remove-link"]').addEventListener('click', () => {
      links.splice(i, 1);
      site.links = links;
      setDirty(true);
      renderLinks(host, site);
    });
    host.appendChild(li);
  });
}

function renderProjectForm(slug) {
  const proj = state.manifest.projects.find((p) => p.slug === slug);
  if (!proj) return;

  const tpl = document.getElementById('tpl-project-form');
  const node = tpl.content.cloneNode(true);
  els.formHost.innerHTML = '';
  els.formHost.appendChild(node);

  els.formHost.querySelector('[data-display="slug-title"]').textContent = proj.title || proj.slug;
  const s = statusOf(proj.slug);
  const badge = els.formHost.querySelector('[data-display="status"]');
  badge.textContent = statusLabel(s);
  badge.className = `status-badge pill-${s}`;

  bindField('slug', proj, 'slug', { onChange: () => {
    els.formHost.querySelector('[data-display="slug-title"]').textContent = proj.title || proj.slug;
    renderSidebar();
  }});
  bindField('title', proj, 'title', { onChange: () => {
    els.formHost.querySelector('[data-display="slug-title"]').textContent = proj.title || proj.slug;
    renderSidebar();
  }});
  bindField('subtitle', proj, 'subtitle');
  bindField('description', proj, 'description');
  bindField('role', proj, 'role');
  bindField('category', proj, 'category');
  bindField('order', proj, 'order', { type: 'number' });
  bindField('entry', proj, 'entry');
  bindField('icon', proj, 'icon');
  bindField('repoUrl', proj, 'repoUrl');

  const techInput = els.formHost.querySelector('[data-field="tech"]');
  techInput.value = Array.isArray(proj.tech) ? proj.tech.join(', ') : '';
  techInput.addEventListener('input', () => {
    proj.tech = techInput.value.split(',').map((t) => t.trim()).filter(Boolean);
    setDirty(true);
  });

  els.formHost.querySelector('[data-action="delete-project"]').addEventListener('click', () => {
    if (!confirm(`'${proj.slug}' 카드를 manifest에서 삭제하시겠습니까?\n(.gitmodules는 영향받지 않습니다.)`)) return;
    state.manifest.projects = state.manifest.projects.filter((p) => p.slug !== proj.slug);
    setDirty(true);
    selectSite();
  });
}

function bindField(fieldName, target, key, opts = {}) {
  const el = els.formHost.querySelector(`[data-field="${fieldName}"]`);
  if (!el) return;
  const v = target[key];
  el.value = v == null ? '' : v;
  el.addEventListener('input', () => {
    let next = el.value;
    if (opts.type === 'number') {
      next = next === '' ? null : Number(next);
    } else if (next === '' && (key === 'thumbnail' || key === 'repoUrl')) {
      next = null;
    }
    target[key] = next;
    setDirty(true);
    if (opts.onChange) opts.onChange();
  });
}

async function loadState() {
  try {
    const r = await fetch('/api/state');
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json();
    state.manifest = data.manifest ?? emptyManifest();
    state.gitmodules = data.gitmodules ?? [];
    if (!state.manifest.site) state.manifest.site = {};
    if (!Array.isArray(state.manifest.projects)) state.manifest.projects = [];
    state.manifest.version = 1;
    setDirty(false);
    renderSidebar();
    renderSiteForm();
  } catch (e) {
    els.formHost.innerHTML = `<div class="form-card"><h2>로드 실패</h2><p class="muted">${e.message}</p><p class="muted">서버가 실행 중인지 확인하세요: <code>npm run admin</code></p></div>`;
  }
}

function emptyManifest() {
  return { version: 1, site: { links: [] }, projects: [] };
}

async function save() {
  if (!isLocalEnv) return;
  els.saveBtn.disabled = true;
  try {
    const r = await fetch('/api/manifest', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.manifest),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(result.error || `status ${r.status}`);
    state.lastSaved = new Date();
    els.saved.textContent = `저장됨 · ${state.lastSaved.toLocaleTimeString()}`;
    setDirty(false);
  } catch (e) {
    alert(`저장 실패: ${e.message}`);
  } finally {
    els.saveBtn.disabled = false;
  }
}

function initEnvGuard() {
  if (!isLocalEnv) {
    els.envWarning.classList.remove('hidden');
    els.saveBtn.disabled = true;
    els.saveBtn.title = '로컬에서만 저장 가능';
  }
}

function initEvents() {
  els.selectSite.addEventListener('click', selectSite);
  els.saveBtn.addEventListener('click', save);
  els.addProject.addEventListener('click', () => {
    const slug = prompt('새 카드의 slug를 입력하세요 (예: my-project)');
    if (!slug) return;
    const norm = slug.trim();
    if (!/^[a-z0-9][a-z0-9-_]*$/i.test(norm)) {
      alert('slug 형식이 잘못되었습니다 (영문/숫자/하이픈/언더스코어).');
      return;
    }
    if (state.manifest.projects.some((p) => p.slug === norm)) {
      alert('이미 존재하는 slug 입니다.');
      return;
    }
    state.manifest.projects.push(newStubProject(norm));
    setDirty(true);
    selectProject(norm);
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

initEnvGuard();
initEvents();
if (isLocalEnv) {
  loadState();
} else {
  els.formHost.innerHTML = '<div class="form-card"><h2>로컬 전용 도구</h2><p class="muted">상단 안내를 확인하세요.</p></div>';
}
