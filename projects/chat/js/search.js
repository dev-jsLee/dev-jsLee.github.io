import { $, getParam, formatDate, formatTime } from '/js/common.js';
import { api } from '/js/api.js';

const inputEl = $('#search-input');
const btnEl = $('#search-btn');
const countEl = $('#search-result-count');
const resultsEl = $('#search-results');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function highlightText(text, keyword) {
  if (!keyword || !text) return escapeHtml(text || '');
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safe = escapeHtml(text);
  const safeKeyword = escapeHtml(keyword);
  const escapedSafe = safeKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(escapedSafe, 'gi'), match => `<mark class="highlight">${match}</mark>`);
}

function formatEventDateTime(event) {
  if (!event.startTime) return '<span class="badge badge-gray">시간 미정</span>';
  const dateStr = formatDate(event.startTime);
  const timeStr = formatTime(event.startTime);
  return `${dateStr} ${timeStr}`;
}

function statusBadge(status) {
  if (status === 'shared') return '<span class="badge badge-blue">공유됨</span>';
  return '<span class="badge badge-gray">비공개</span>';
}

async function searchEvents(keyword) {
  const kw = keyword.trim();
  if (!kw) return [];

  try {
    const res = await api.get(`/events/search?keyword=${encodeURIComponent(kw)}`);
    if (!res.ok) return [];
    const result = await res.json();
    return result.data || [];
  } catch {
    return null; // network error
  }
}

async function renderResults(keyword) {
  if (!keyword || !keyword.trim()) {
    countEl.textContent = '';
    resultsEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🔍</div>' +
        '<p class="empty-state-title">검색어를 입력해 주세요</p>' +
      '</div>';
    return;
  }

  // Show loading state
  countEl.textContent = '검색 중...';
  resultsEl.innerHTML = '';

  const results = await searchEvents(keyword);

  if (results === null) {
    countEl.textContent = '';
    resultsEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">⚠️</div>' +
        '<p class="empty-state-title">서버에 연결할 수 없습니다</p>' +
      '</div>';
    return;
  }

  countEl.textContent = `${results.length}개의 일정을 찾았습니다`;

  if (!results.length) {
    resultsEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🔍</div>' +
        '<p class="empty-state-title">검색 결과가 없습니다</p>' +
        '<p class="empty-state-desc">"<span class="empty-state-keyword">' + escapeHtml(keyword) + '</span>"에 대한 결과가 없습니다</p>' +
      '</div>';
    return;
  }

  resultsEl.innerHTML = results.map(event =>
    '<a href="/event-detail.html?id=' + event.id + '" class="event-card">' +
      '<div class="event-card-header">' +
        '<h3 class="event-card-title">' + highlightText(event.title, keyword) + '</h3>' +
        statusBadge(event.status) +
      '</div>' +
      (event.description
        ? '<p class="event-card-desc">' + highlightText(event.description, keyword) + '</p>'
        : '') +
      '<div class="event-card-meta">' +
        '<span>📅 ' + formatEventDateTime(event) + '</span>' +
        '<span>👥 ' + event.participantCount + '명</span>' +
        (event.hasChatRoom ? '<span>💬 채팅</span>' : '') +
      '</div>' +
    '</a>'
  ).join('');
}

function doSearch() {
  const kw = inputEl.value.trim();
  const url = new URL(window.location.href);
  if (kw) {
    url.searchParams.set('keyword', kw);
  } else {
    url.searchParams.delete('keyword');
  }
  window.history.pushState({}, '', url);
  renderResults(kw);
}

const initialKeyword = getParam('keyword') || '';
inputEl.value = initialKeyword;
renderResults(initialKeyword);

btnEl.addEventListener('click', doSearch);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});
