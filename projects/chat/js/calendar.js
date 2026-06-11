import { getAvatarColor, getInitials } from '/js/common.js';
import {
  createEvent,
  exportEventsIcs,
  getCurrentUser,
  getEvents,
  importEventsIcs,
} from '/js/services/events-client.js';
import { toggleTheme } from '/js/theme.js';
import {
  renderCalendarEventList,
  renderCalendarGrid,
  toLocalDateStr,
} from '/js/views/calendar-view.js';

document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let selectedDateStr = null;

let cachedEvents = [];
let currentUser = null;

const exportIcsBtn = document.getElementById('export-ics-btn');
const importIcsBtn = document.getElementById('import-ics-btn');
const icsFileInput = document.getElementById('ics-file-input');

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

async function exportEventsAsIcs() {
  if (!exportIcsBtn) return;

  exportIcsBtn.disabled = true;
  try {
    const res = await exportEventsIcs();
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'ICS 내보내기에 실패했습니다.');
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    const filename = getFilenameFromContentDisposition(disposition, 'caldavchat-events.ics');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('서버에 연결할 수 없습니다.');
  } finally {
    exportIcsBtn.disabled = false;
  }
}

async function importEventsFromIcs(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await importEventsIcs(formData);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'ICS 가져오기에 실패했습니다.');
      return;
    }

    const result = await res.json();
    const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
    const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
    const firstWarning = warningCount > 0 ? result.warnings[0] : null;
    const firstError = errorCount > 0 ? result.errors[0] : null;

    const detailLines = [];
    if (firstWarning && firstWarning.message) {
      detailLines.push(`첫 경고: ${firstWarning.message}`);
    }
    if (firstError && firstError.message) {
      const code = firstError.code ? `(${firstError.code}) ` : '';
      const summary = firstError.summary ? ` - ${firstError.summary}` : '';
      detailLines.push(`첫 오류: ${code}${firstError.message}${summary}`);
    }

    const processed = Number.isFinite(result.totalProcessed) ? result.totalProcessed : (result.created + result.updated + result.skipped + errorCount);

    alert(`가져오기 완료\n처리 대상: ${processed}개\n생성: ${result.created}개\n업데이트: ${result.updated}개\n건너뜀: ${result.skipped}개\n경고: ${warningCount}개\n오류: ${errorCount}개${detailLines.length ? `\n\n${detailLines.join('\n')}` : ''}`);

    await loadEvents();
    renderCalendar();
    if (selectedDateStr) {
      renderEventList(selectedDateStr);
    }
  } catch {
    alert('서버에 연결할 수 없습니다.');
  }
}

async function loadCurrentUser() {
  try {
    const res = await getCurrentUser();
    if (res.ok) {
      currentUser = await res.json();
    }
  } catch {
    currentUser = null;
  }
}

async function loadEvents() {
  try {
    const res = await getEvents({ limit: 200 });
    if (res.ok) {
      const result = await res.json();
      cachedEvents = result.data || [];
    }
  } catch {
    cachedEvents = [];
  }
}

function getEventsForDate(dateStr) {
  return cachedEvents.filter((event) => toLocalDateStr(event.startTime) === dateStr);
}

function updateAvatar() {
  const avatar = document.getElementById('nav-avatar');
  if (!avatar) return;
  if (currentUser) {
    const displayStr = currentUser.email || currentUser.displayName || '?';
    avatar.textContent = getInitials(displayStr);
    avatar.style.background = getAvatarColor(displayStr);
  } else {
    avatar.textContent = '?';
    avatar.style.background = 'var(--color-text-muted)';
  }
}

function setupAvatarClickHandler() {
  const navAvatar = document.getElementById('nav-avatar');
  if (!navAvatar) return;
  navAvatar.style.cursor = 'pointer';
  navAvatar.addEventListener('click', () => {
    window.location.href = '/profile.html';
  });
}

if (exportIcsBtn) {
  exportIcsBtn.addEventListener('click', exportEventsAsIcs);
}

if (importIcsBtn && icsFileInput) {
  importIcsBtn.addEventListener('click', () => {
    icsFileInput.value = '';
    icsFileInput.click();
  });

  icsFileInput.addEventListener('change', async () => {
    const file = icsFileInput.files && icsFileInput.files[0] ? icsFileInput.files[0] : null;
    await importEventsFromIcs(file);
  });
}

function renderCalendar() {
  const gridEl = document.getElementById('calendar-grid');
  const titleEl = document.getElementById('calendar-month-title');
  renderCalendarGrid({
    gridEl,
    titleEl,
    currentYear,
    currentMonth,
    selectedDateStr,
    today,
    getEventsForDate,
    onSelectDate: (dateStr) => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderEventList(dateStr);
    },
  });
}

function renderEventList(dateStr) {
  const titleEl = document.getElementById('event-list-title');
  const listEl = document.getElementById('event-list');
  renderCalendarEventList({
    titleEl,
    listEl,
    dateStr,
    events: getEventsForDate(dateStr),
  });
}

document.getElementById('cal-prev').addEventListener('click', () => {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else {
    currentMonth -= 1;
  }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear += 1;
  } else {
    currentMonth += 1;
  }
  renderCalendar();
});

const fabBtn = document.getElementById('fab-create');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCreateBtn = document.getElementById('modal-create-btn');
const modalDateHint = document.getElementById('modal-date-hint');
const modalTitleInput = document.getElementById('modal-event-title');

function getFocusableElements() {
  return Array.from(
    modalOverlay.querySelectorAll('input, button, a, [tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.disabled && el.offsetParent !== null);
}

function handleFocusTrap(e) {
  if (e.key !== 'Tab') return;
  const focusable = getFocusableElements();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
    return;
  }

  if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal() {
  modalOverlay.style.display = 'flex';
  if (selectedDateStr) {
    const date = new Date(`${selectedDateStr}T00:00:00`);
    modalDateHint.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  } else {
    modalDateHint.textContent = '';
  }
  modalTitleInput.focus();
  document.addEventListener('keydown', handleFocusTrap);
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalTitleInput.value = '';
  document.removeEventListener('keydown', handleFocusTrap);
  fabBtn.focus();
}

fabBtn.addEventListener('click', openModal);
modalCancelBtn.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.style.display !== 'none') closeModal();
});

modalCreateBtn.addEventListener('click', async () => {
  const title = modalTitleInput.value.trim();
  if (!title) {
    modalTitleInput.focus();
    return;
  }

  modalCreateBtn.disabled = true;
  try {
    const body = { title };
    if (selectedDateStr) {
      body.startTime = `${selectedDateStr}T09:00:00`;
    }
    const res = await createEvent(body);
    if (res.ok) {
      closeModal();
      await loadEvents();
      renderCalendar();
      if (selectedDateStr) renderEventList(selectedDateStr);
    } else {
      const err = await res.json();
      alert(err.message || '일정 생성에 실패했습니다.');
    }
  } catch {
    alert('서버에 연결할 수 없습니다.');
  } finally {
    modalCreateBtn.disabled = false;
  }
});

async function init() {
  await Promise.all([loadCurrentUser(), loadEvents()]);
  updateAvatar();
  setupAvatarClickHandler();
  renderCalendar();
}

init();
