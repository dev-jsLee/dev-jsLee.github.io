import { getParam } from '/js/common.js';
import { createEvent, getEventDetail, updateEvent } from '/js/services/events-client.js';

const form = document.getElementById('event-form');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const noTimeCheckbox = document.getElementById('no-time');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const timeFieldsWrapper = document.getElementById('time-fields');
const pageTitle = document.getElementById('page-title');
const submitBtn = document.getElementById('submit-btn');
const titleError = document.getElementById('title-error');
const timeError = document.getElementById('time-error');
const titleCount = document.getElementById('title-count');
const descCount = document.getElementById('desc-count');

const eventId = getParam('id');
const isEditMode = !!eventId;

if (isEditMode) {
  pageTitle.textContent = '일정 수정';
  submitBtn.textContent = '수정';
  document.title = 'CalDAVchat — 일정 수정';
}

function updateCharCount(input, counter, max) {
  counter.textContent = `${input.value.length} / ${max}`;
}

function showError(input, errorEl, message) {
  errorEl.textContent = message;
  if (input) input.classList.add('has-error');
}

function clearError(input, errorEl) {
  errorEl.textContent = '';
  if (input) input.classList.remove('has-error');
}

function setTimeFieldsDisabled(disabled) {
  timeFieldsWrapper.classList.toggle('disabled', disabled);
  startTimeInput.disabled = disabled;
  endTimeInput.disabled = disabled;
  if (disabled) {
    startTimeInput.value = '';
    endTimeInput.value = '';
    clearError(null, timeError);
  }
}

async function prefillForm() {
  if (!isEditMode) return;

  try {
    const res = await getEventDetail(eventId);
    if (!res.ok) return;

    const event = await res.json();

    titleInput.value = event.title || '';
    descInput.value = event.description || '';
    updateCharCount(titleInput, titleCount, 200);
    updateCharCount(descInput, descCount, 2000);

    if (!event.startTime) {
      noTimeCheckbox.checked = true;
      setTimeFieldsDisabled(true);
    } else {
      startTimeInput.value = event.startTime.slice(0, 16);
      if (event.endTime) {
        endTimeInput.value = event.endTime.slice(0, 16);
      }
    }
  } catch {
    /* network error — form stays empty */
  }
}

prefillForm();

titleInput.addEventListener('input', () => {
  updateCharCount(titleInput, titleCount, 200);
  clearError(titleInput, titleError);
});

descInput.addEventListener('input', () => {
  updateCharCount(descInput, descCount, 2000);
});

noTimeCheckbox.addEventListener('change', () => {
  setTimeFieldsDisabled(noTimeCheckbox.checked);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  clearError(titleInput, titleError);
  clearError(null, timeError);

  let hasError = false;

  const title = titleInput.value.trim();
  if (!title) {
    showError(titleInput, titleError, '제목을 입력해주세요');
    titleInput.focus();
    hasError = true;
  }

  if (!noTimeCheckbox.checked) {
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    if (start && end && new Date(end) <= new Date(start)) {
      showError(null, timeError, '종료 시간은 시작 시간 이후여야 합니다');
      if (!hasError) endTimeInput.focus();
      hasError = true;
    }
  }

  if (hasError) return;

  const data = { title };
  const desc = descInput.value.trim();
  if (desc) data.description = desc;

  if (!noTimeCheckbox.checked) {
    if (startTimeInput.value) {
      data.startTime = new Date(startTimeInput.value).toISOString();
    }
    if (endTimeInput.value) {
      data.endTime = new Date(endTimeInput.value).toISOString();
    }
  } else {
    data.startTime = null;
    data.endTime = null;
  }

  submitBtn.disabled = true;
  try {
    const res = isEditMode
      ? await updateEvent(eventId, data)
      : await createEvent(data);

    if (res.ok) {
      window.location.href = '/calendar.html';
    } else {
      const err = await res.json();
      showError(titleInput, titleError, err.message || '저장에 실패했습니다.');
    }
  } catch {
    showError(titleInput, titleError, '서버에 연결할 수 없습니다.');
  } finally {
    submitBtn.disabled = false;
  }
});
