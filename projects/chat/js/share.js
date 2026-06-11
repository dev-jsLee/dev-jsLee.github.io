import { $, getParam, formatDate, formatTime } from '/js/common.js';
import { api } from '/js/api.js';
import { toggleTheme } from '/js/theme.js';

$('#theme-toggle-btn')?.addEventListener('click', toggleTheme);

function formatEventDateTime(startTime, endTime) {
  if (!startTime) return null;
  const dateStr = formatDate(startTime);
  const startStr = formatTime(startTime);
  if (endTime) {
    const endStr = formatTime(endTime);
    return `${dateStr} ${startStr} ~ ${endStr}`;
  }
  return `${dateStr} ${startStr}`;
}

function renderError(container, icon, title, desc) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'share-error';

  const iconEl = document.createElement('div');
  iconEl.className = 'share-error-icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('p');
  titleEl.className = 'share-error-title';
  titleEl.textContent = title;

  wrapper.append(iconEl, titleEl);

  if (desc) {
    const descEl = document.createElement('p');
    descEl.className = 'share-error-desc';
    descEl.textContent = desc;
    wrapper.appendChild(descEl);
  }

  container.appendChild(wrapper);
}

function renderEventCard(event) {
  const card = document.createElement('div');
  card.className = 'shared-event-card card';

  const title = document.createElement('h2');
  title.className = 'shared-event-title';
  title.textContent = event.title;
  card.appendChild(title);

  if (event.description) {
    const desc = document.createElement('p');
    desc.className = 'shared-event-desc';
    desc.textContent = event.description;
    card.appendChild(desc);
  }

  const meta = document.createElement('div');
  meta.className = 'shared-event-meta';

  const dateTimeStr = formatEventDateTime(event.startTime, event.endTime);
  const dateItem = createMetaItem('📅', dateTimeStr || '');
  if (!dateTimeStr) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-gray';
    badge.textContent = '시간 미정';
    dateItem.appendChild(badge);
  }
  meta.appendChild(dateItem);

  meta.appendChild(createMetaItem('👥', `참여자 ${event.participantCount}명`));

  card.appendChild(meta);
  return card;
}

function createMetaItem(icon, text) {
  const item = document.createElement('div');
  item.className = 'meta-item';

  const iconEl = document.createElement('span');
  iconEl.className = 'meta-item-icon';
  iconEl.textContent = icon;

  item.appendChild(iconEl);

  if (text) {
    const textEl = document.createElement('span');
    textEl.textContent = text;
    item.appendChild(textEl);
  }

  return item;
}

function renderCta(container, data) {
  const section = document.createElement('div');
  section.className = 'cta-section';

  if (!data.isAuthenticated) {
    const link = document.createElement('a');
    const token = getParam('token');
    const returnUrl = encodeURIComponent('/share.html?token=' + token);
    link.href = '/index.html?returnUrl=' + returnUrl;
    link.className = 'btn btn-primary btn-lg';
    link.textContent = '로그인하고 참여하기';
    section.appendChild(link);
  } else if (!data.isParticipant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-lg';
    btn.textContent = '참여하기';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const res = await api.post(`/events/${data.id}/join`);
        if (res.ok) {
          btn.textContent = '✅ 참여 완료';
          btn.className = 'btn btn-ghost btn-lg';
          setTimeout(() => {
            window.location.href = '/event-detail.html?id=' + data.id;
          }, 1000);
        } else {
          const err = await res.json().catch(() => ({}));
          if (res.status === 409) {
            btn.textContent = '✅ 이미 참여 중입니다';
            btn.className = 'btn btn-ghost btn-lg';
          } else {
            alert(err.message || '참여에 실패했습니다.');
            btn.disabled = false;
          }
        }
      } catch {
        alert('서버에 연결할 수 없습니다.');
        btn.disabled = false;
      }
    });
    section.appendChild(btn);
  } else {
    const joined = document.createElement('p');
    joined.className = 'already-joined';
    joined.textContent = '✅ 이미 참여 중입니다';
    section.appendChild(joined);

    const detailLink = document.createElement('a');
    detailLink.href = `/event-detail.html?id=${data.id}`;
    detailLink.className = 'btn btn-secondary';
    detailLink.textContent = '일정 상세 보기';
    section.appendChild(detailLink);
  }

  container.appendChild(section);
}

async function renderShare() {
  const token = getParam('token');
  const content = $('#share-content');

  if (!token) {
    renderError(content, '❌', '링크 토큰이 없습니다', 'URL에 token 파라미터가 필요합니다');
    return;
  }

  content.innerHTML = '<div class="empty-state"><p class="empty-state-title">불러오는 중...</p></div>';

  try {
    const res = await api.get(`/share/${token}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      renderError(content, '❌', '유효하지 않은 링크입니다',
        err.message || '만료되었거나 존재하지 않는 공유 링크입니다');
      return;
    }

    const data = await res.json();

    content.innerHTML = '';
    content.appendChild(renderEventCard(data));
    renderCta(content, data);
  } catch {
    renderError(content, '⚠️', '서버에 연결할 수 없습니다', '잠시 후 다시 시도해주세요');
  }
}

renderShare();
