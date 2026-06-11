import { $, $$, getParam, getInitials, getAvatarColor, formatDate, formatTime } from '/js/common.js';
import { api } from '/js/api.js';

let currentStep = 1;
let eventData = null;
let currentUser = null;

function formatEventDateRange(startTime, endTime) {
  if (!startTime) return null;
  const dateStr = formatDate(startTime);
  const start = formatTime(startTime);
  if (endTime) {
    return `${dateStr} ${start} ~ ${formatTime(endTime)}`;
  }
  return `${dateStr} ${start}`;
}

function updateStepIndicator(step) {
  $$('.step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === step);
    el.classList.toggle('completed', s < step);
  });

  $$('.step-line').forEach(el => {
    const afterStep = parseInt(el.dataset.after, 10);
    el.classList.toggle('completed', afterStep < step);
  });
}

function setStep(step) {
  currentStep = step;
  updateStepIndicator(step);
  renderStepContent();
}

function renderEventSummaryCard() {
  const card = document.createElement('div');
  card.className = 'cancel-event-summary card';

  const title = document.createElement('h3');
  title.className = 'summary-title';
  title.textContent = eventData ? eventData.title : '일정';
  card.appendChild(title);

  const dateStr = eventData ? formatEventDateRange(eventData.startTime, eventData.endTime) : null;
  const dateRow = document.createElement('p');
  dateRow.className = 'summary-datetime';

  const icon = document.createElement('span');
  icon.className = 'summary-datetime-icon';
  icon.textContent = '📅';

  const dateText = document.createElement('span');
  dateText.textContent = dateStr || '시간 미정';

  dateRow.append(icon, dateText);
  card.appendChild(dateRow);

  if (eventData && eventData.description) {
    const desc = document.createElement('p');
    desc.className = 'summary-description';
    desc.textContent = eventData.description;
    card.appendChild(desc);
  }

  return card;
}

function renderStep1() {
  const view = document.createElement('div');
  view.className = 'step-view';

  view.appendChild(renderEventSummaryCard());

  const confirmMsg = document.createElement('div');
  confirmMsg.className = 'cancel-confirm-msg';

  const question = document.createElement('p');
  question.className = 'confirm-question';
  question.textContent = '이 일정을 취소하시겠습니까?';

  const notice = document.createElement('p');
  notice.className = 'confirm-notice';
  notice.textContent = '참여자들의 동의가 필요합니다.';

  confirmMsg.append(question, notice);
  view.appendChild(confirmMsg);

  const actions = document.createElement('div');
  actions.className = 'step-actions';

  const declareBtn = document.createElement('button');
  declareBtn.type = 'button';
  declareBtn.className = 'btn btn-danger btn-lg';
  declareBtn.textContent = '취소 선언';
  declareBtn.addEventListener('click', async () => {
    declareBtn.disabled = true;
    try {
      const eventId = getParam('id');
      const res = await api.post(`/events/${eventId}/cancel`);
      if (res.ok) {
        setStep(2);
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Already declared — move to step 2
          setStep(2);
        } else {
          alert(err.message || '취소 선언에 실패했습니다.');
          declareBtn.disabled = false;
        }
      }
    } catch {
      alert('서버에 연결할 수 없습니다.');
      declareBtn.disabled = false;
    }
  });

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn btn-ghost';
  backBtn.textContent = '돌아가기';
  backBtn.addEventListener('click', () => history.back());

  actions.append(declareBtn, backBtn);
  view.appendChild(actions);

  return view;
}

function renderVoteItem(participant) {
  const item = document.createElement('div');
  item.className = 'vote-item';

  const displayKey = participant.email || participant.userId || '?';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.backgroundColor = getAvatarColor(displayKey);
  avatar.textContent = getInitials(displayKey);

  const email = document.createElement('span');
  email.className = 'vote-email';
  email.textContent = displayKey;

  const roleBadge = document.createElement('span');
  const isHost = participant.role === 'host';
  roleBadge.className = `badge ${isHost ? 'badge-blue' : 'badge-gray'}`;
  roleBadge.textContent = isHost ? '주최자' : '참여자';

  item.append(avatar, email, roleBadge);
  return item;
}

function renderStep2() {
  const view = document.createElement('div');
  view.className = 'step-view';

  view.appendChild(renderEventSummaryCard());

  const participants = eventData ? eventData.participants : [];

  // Participants list card
  const voteListCard = document.createElement('div');
  voteListCard.className = 'card vote-list';

  const listTitle = document.createElement('div');
  listTitle.className = 'vote-progress-header';
  const listLabel = document.createElement('span');
  listLabel.className = 'vote-progress-label';
  listLabel.textContent = '참여자 목록';
  listTitle.appendChild(listLabel);
  voteListCard.appendChild(listTitle);

  participants.forEach(p => voteListCard.appendChild(renderVoteItem(p)));
  view.appendChild(voteListCard);

  const actions = document.createElement('div');
  actions.className = 'step-actions';

  const isHost = eventData && eventData.myRole === 'host';
  const currentUserId = currentUser ? currentUser.id : null;
  const isParticipant = !isHost && currentUserId &&
    participants.some(p => p.userId === currentUserId && p.role === 'participant');

  if (isParticipant) {
    const voteBtn = document.createElement('button');
    voteBtn.type = 'button';
    voteBtn.className = 'btn btn-primary';
    voteBtn.textContent = '동의하기';
    voteBtn.addEventListener('click', async () => {
      voteBtn.disabled = true;
      try {
        const eventId = getParam('id');
        const res = await api.post(`/events/${eventId}/cancel/vote`);
        if (res.ok) {
          voteBtn.textContent = '✅ 동의 완료';
          voteBtn.className = 'btn btn-ghost';
        } else {
          const err = await res.json().catch(() => ({}));
          if (res.status === 409) {
            voteBtn.textContent = '✅ 이미 동의함';
            voteBtn.className = 'btn btn-ghost';
          } else {
            alert(err.message || '투표에 실패했습니다.');
            voteBtn.disabled = false;
          }
        }
      } catch {
        alert('서버에 연결할 수 없습니다.');
        voteBtn.disabled = false;
      }
    });
    actions.appendChild(voteBtn);
  }

  if (isHost) {
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = '취소 확정';
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        const eventId = getParam('id');
        const res = await api.post(`/events/${eventId}/cancel/confirm`);
        if (res.ok) {
          setStep(3);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.message || '취소 확정에 실패했습니다.');
          confirmBtn.disabled = false;
        }
      } catch {
        alert('서버에 연결할 수 없습니다.');
        confirmBtn.disabled = false;
      }
    });
    actions.appendChild(confirmBtn);
  }

  if (actions.children.length > 0) {
    view.appendChild(actions);
  }

  return view;
}

function renderStep3() {
  const view = document.createElement('div');
  view.className = 'step-complete';

  const icon = document.createElement('div');
  icon.className = 'complete-icon';
  icon.textContent = '✅';

  const title = document.createElement('h2');
  title.className = 'complete-title';
  title.textContent = '취소가 확정되었습니다';

  const subtitle = document.createElement('p');
  subtitle.className = 'complete-subtitle';
  subtitle.textContent = '일정이 취소되었습니다.';

  const calendarBtn = document.createElement('a');
  calendarBtn.href = '/calendar.html';
  calendarBtn.className = 'btn btn-primary btn-lg';
  calendarBtn.textContent = '캘린더로 돌아가기';

  view.append(icon, title, subtitle, calendarBtn);
  return view;
}

function renderStepContent() {
  const content = $('#step-content');
  content.innerHTML = '';

  updateStepIndicator(currentStep);

  if (currentStep === 1) {
    content.appendChild(renderStep1());
  } else if (currentStep === 2) {
    content.appendChild(renderStep2());
  } else if (currentStep === 3) {
    content.appendChild(renderStep3());
  }
}

async function init() {
  const eventId = getParam('id');
  const content = $('#step-content');

  if (!eventId) {
    content.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '🔍';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = '일정 ID가 없습니다';
    empty.append(emptyIcon, emptyTitle);
    content.appendChild(empty);
    return;
  }

  content.innerHTML = '<div class="empty-state"><p class="empty-state-title">불러오는 중...</p></div>';

  // Load current user and event data in parallel
  try {
    const [userRes, eventRes] = await Promise.all([
      api.get('/me'),
      api.get(`/events/${eventId}`),
    ]);

    if (userRes.ok) {
      currentUser = await userRes.json();
    }

    if (!eventRes.ok) {
      content.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const emptyIcon = document.createElement('div');
      emptyIcon.className = 'empty-state-icon';
      emptyIcon.textContent = '🔍';
      const emptyTitle = document.createElement('p');
      emptyTitle.className = 'empty-state-title';
      emptyTitle.textContent = '일정을 찾을 수 없습니다';
      empty.append(emptyIcon, emptyTitle);
      content.appendChild(empty);
      return;
    }

    eventData = await eventRes.json();
  } catch {
    content.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '⚠️';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = '서버에 연결할 수 없습니다';
    empty.append(emptyIcon, emptyTitle);
    content.appendChild(empty);
    return;
  }

  // Determine initial step
  if (eventData.status === 'cancelled') {
    setStep(3);
  } else if (eventData.myRole === 'participant') {
    // Participant on cancel page likely means cancel was declared — go to vote step
    setStep(2);
  } else {
    setStep(1);
  }
}

init();
