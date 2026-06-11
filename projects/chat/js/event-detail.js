import { getParam } from '/js/common.js';
import {
  createEventShareLink,
  enableEventChat,
  exportEventIcs,
  getEventDetail,
} from '/js/services/events-client.js';
import { renderCenteredState, renderEventDetailSections } from '/js/views/event-detail-view.js';

function getFilenameFromContentDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const match = headerValue.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function enableChat(eventId) {
  try {
    const res = await enableEventChat(eventId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.message || '채팅 활성화에 실패했습니다.' };
    }
    const data = await res.json();
    return { ok: true, roomId: data.roomId };
  } catch {
    return { ok: false, message: '서버에 연결할 수 없습니다.' };
  }
}

async function createShare(eventId) {
  try {
    const res = await createEventShareLink(eventId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.message || '공유 링크 생성에 실패했습니다.' };
    }
    const data = await res.json();
    return {
      ok: true,
      shareUrl: `${window.location.origin}/share.html?token=${data.token}`,
    };
  } catch {
    return { ok: false, message: '서버에 연결할 수 없습니다.' };
  }
}

async function copyLink(text) {
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function downloadEventIcs(eventId) {
  try {
    const res = await exportEventIcs(eventId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.message || '.ics 내보내기에 실패했습니다.' };
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    const filename = getFilenameFromContentDisposition(disposition, `event-${eventId}.ics`);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    return { ok: true };
  } catch {
    return { ok: false, message: '서버에 연결할 수 없습니다.' };
  }
}

async function renderEventDetail() {
  const eventId = getParam('id');
  const content = document.getElementById('event-detail-content');
  const editBtn = document.getElementById('edit-btn');

  if (!eventId) {
    renderCenteredState(content, '🔍', '일정 ID가 없습니다');
    editBtn.style.visibility = 'hidden';
    return;
  }

  renderCenteredState(content, '⏳', '불러오는 중...');

  let event;
  try {
    const res = await getEventDetail(eventId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      renderCenteredState(content, '🔍', err.message || '일정을 찾을 수 없습니다');
      editBtn.style.visibility = 'hidden';
      return;
    }
    event = await res.json();
  } catch {
    renderCenteredState(content, '⚠️', '서버에 연결할 수 없습니다');
    editBtn.style.visibility = 'hidden';
    return;
  }

  if (event.masked) {
    renderCenteredState(content, '🔒', '예약 있음');
    editBtn.style.visibility = 'hidden';
    return;
  }

  renderEventDetailSections({
    contentEl: content,
    editBtn,
    event,
    eventId,
    onEnableChat: () => enableChat(eventId),
    onCreateShareLink: () => createShare(eventId),
    onCopyLink: (text) => copyLink(text),
    onExportIcs: () => downloadEventIcs(eventId),
  });
}

renderEventDetail();
