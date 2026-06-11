/**
 * Soul Fingerprint - Frontend App
 * Pure vanilla JS, no frameworks
 */

const API = '/api';
let currentPage = 1;
let currentQuery = '';
let currentSiteId = null;

// ─── Init ───

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    search('', 1);

    document.getElementById('searchBtn').addEventListener('click', () => {
        currentQuery = document.getElementById('searchInput').value;
        search(currentQuery, 1);
    });

    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            currentQuery = e.target.value;
            search(currentQuery, 1);
        }
    });

    document.getElementById('regBtn').addEventListener('click', submitRequest);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('openNewTab').addEventListener('click', openInNewTab);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

// ─── Search ───

async function search(query, page) {
    currentPage = page;
    const params = new URLSearchParams({ page, per_page: 20 });
    if (query) params.set('q', query);

    try {
        const res = await fetch(`${API}/sites?${params}`);
        const data = await res.json();
        renderResults(data);
        renderPagination(data);
    } catch (err) {
        document.getElementById('results').innerHTML =
            '<p style="color: var(--red)">검색 중 오류가 발생했습니다.</p>';
    }
}

function renderResults(data) {
    const el = document.getElementById('results');
    if (!data.sites || data.sites.length === 0) {
        el.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">검색 결과가 없습니다.</p>';
        return;
    }

    el.innerHTML = data.sites.map(site => `
        <div class="site-card" onclick="openDetail(${site.id})">
            <div class="domain">${escapeHtml(site.domain)}</div>
            <div class="meta">
                <span class="badge badge-${site.has_robots}">${robotsLabel(site.has_robots)}</span>
                ${site.category ? `<span>${escapeHtml(site.category)}</span>` : ''}
                ${site.last_checked ? `<span>확인: ${formatDate(site.last_checked)}</span>` : ''}
            </div>
            ${site.ai_policy_summary ? `<div class="summary">${escapeHtml(site.ai_policy_summary)}</div>` : ''}
        </div>
    `).join('');
}

function renderPagination(data) {
    const el = document.getElementById('pagination');
    if (data.pages <= 1) { el.innerHTML = ''; return; }

    let buttons = '';
    const start = Math.max(1, data.page - 3);
    const end = Math.min(data.pages, data.page + 3);

    if (data.page > 1) {
        buttons += `<button onclick="search('${escapeAttr(currentQuery)}', ${data.page - 1})">‹</button>`;
    }
    for (let i = start; i <= end; i++) {
        buttons += `<button class="${i === data.page ? 'active' : ''}" onclick="search('${escapeAttr(currentQuery)}', ${i})">${i}</button>`;
    }
    if (data.page < data.pages) {
        buttons += `<button onclick="search('${escapeAttr(currentQuery)}', ${data.page + 1})">›</button>`;
    }

    el.innerHTML = buttons;
}

// ─── Detail Modal ───

async function openDetail(siteId) {
    currentSiteId = siteId;
    try {
        const res = await fetch(`${API}/sites/${siteId}`);
        const site = await res.json();
        renderModal(site);
        document.getElementById('modalOverlay').classList.add('active');
    } catch (err) {
        console.error('Detail load error:', err);
    }
}

function renderModal(site) {
    document.getElementById('modalTitle').textContent = site.domain;

    let botsHtml = '';
    if (site.ai_bots_detail) {
        try {
            const bots = JSON.parse(site.ai_bots_detail);
            botsHtml = `
                <div class="detail-section">
                    <h3>AI Bot Policies</h3>
                    <div class="bot-list">
                        ${Object.entries(bots).map(([bot, status]) => `
                            <div class="bot-item">
                                <span class="bot-name">${escapeHtml(bot)}</span>
                                <span class="badge badge-${status === 'allowed' ? 'yes' : status === 'blocked' ? 'no' : 'unknown'}">${escapeHtml(status)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (e) { /* ignore parse errors */ }
    }

    document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
            <h3>Status</h3>
            <p>
                <span class="badge badge-${site.has_robots}">${robotsLabel(site.has_robots)}</span>
                ${site.category ? `&nbsp; Category: ${escapeHtml(site.category)}` : ''}
            </p>
            ${site.last_checked ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.3rem;">Last checked: ${formatDate(site.last_checked)}</p>` : ''}
        </div>

        ${site.ai_policy_summary ? `
        <div class="detail-section">
            <h3>AI Policy Summary</h3>
            <p>${escapeHtml(site.ai_policy_summary)}</p>
        </div>
        ` : ''}

        ${botsHtml}

        ${site.robots_txt ? `
        <div class="detail-section">
            <h3>robots.txt</h3>
            <div class="robots-content">${escapeHtml(site.robots_txt)}</div>
        </div>
        ` : ''}

        <div class="detail-section" style="color: var(--text-muted); font-size: 0.8rem;">
            <p>Registered by: ${escapeHtml(site.registered_by || 'unknown')}</p>
            <p>robots.txt URL: <a href="${escapeAttr(site.robots_url || '')}" target="_blank" style="color: var(--accent);">${escapeHtml(site.robots_url || 'N/A')}</a></p>
        </div>
    `;
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    currentSiteId = null;
}

function openInNewTab() {
    if (currentSiteId) {
        window.open(`/site.html?id=${currentSiteId}`, '_blank');
    }
}

// ─── Register ───

async function submitRequest() {
    const domain = document.getElementById('regDomain').value.trim();
    const robotsUrl = document.getElementById('regRobotsUrl').value.trim();
    const requestedBy = document.getElementById('regRequestedBy').value.trim();

    if (!domain) {
        showRegResult('도메인을 입력해주세요.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                robots_url: robotsUrl || undefined,
                requested_by: requestedBy || undefined
            })
        });
        const data = await res.json();

        if (res.ok) {
            showRegResult(`${domain} 등록 요청이 접수되었습니다.`, 'success');
            document.getElementById('regDomain').value = '';
            document.getElementById('regRobotsUrl').value = '';
            document.getElementById('regRequestedBy').value = '';
        } else {
            showRegResult(data.error || '요청 실패', 'error');
        }
    } catch (err) {
        showRegResult('서버 연결 오류', 'error');
    }
}

function showRegResult(msg, type) {
    const el = document.getElementById('regResult');
    el.textContent = msg;
    el.style.color = type === 'success' ? 'var(--green)' : 'var(--red)';
}

// ─── Stats ───

async function loadStats() {
    try {
        const res = await fetch(`${API}/stats`);
        const data = await res.json();
        document.getElementById('stats').textContent =
            `등록 사이트: ${data.total_sites}개 · robots.txt 있음: ${data.has_robots}개 · 없음: ${data.no_robots}개 · 대기 중 요청: ${data.pending_requests}개`;
    } catch (err) {
        // silent fail
    }
}

// ─── Helpers ───

function robotsLabel(status) {
    const labels = { yes: 'robots.txt ✓', no: 'robots.txt ✗', unknown: '미확인', error: '오류' };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
