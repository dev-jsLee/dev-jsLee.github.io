import { formatDate, formatTime, getAvatarColor, getInitials } from '/js/common.js';

function formatEventDateTime(startTime, endTime) {
  if (!startTime) return null;
  const dateStr = formatDate(startTime);
  const startTimeStr = formatTime(startTime);
  if (endTime) {
    const endTimeStr = formatTime(endTime);
    return `${dateStr} ${startTimeStr} ~ ${endTimeStr}`;
  }
  return `${dateStr} ${startTimeStr}`;
}

function renderParticipant(participant) {
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const displayKey = participant.displayName || participant.email || participant.userId || '?';
  avatar.style.backgroundColor = getAvatarColor(displayKey);
  avatar.textContent = getInitials(displayKey);

  const email = document.createElement('span');
  email.className = 'participant-email';
  email.textContent = participant.displayName || participant.email || '알 수 없음';

  const roleBadge = document.createElement('span');
  const isHost = participant.role === 'host';
  roleBadge.className = `badge ${isHost ? 'badge-blue' : 'badge-gray'}`;
  roleBadge.textContent = isHost ? '주최자' : '참여자';

  const item = document.createElement('div');
  item.className = 'participant-item';
  item.append(avatar, email, roleBadge);
  return item;
}

export function renderCenteredState(contentEl, icon, title) {
  contentEl.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `<div class="empty-state-icon">${icon}</div><p class="empty-state-title">${title}</p>`;
  contentEl.appendChild(empty);
}

export function renderEventDetailSections({
  contentEl,
  editBtn,
  event,
  eventId,
  onEnableChat,
  onCreateShareLink,
  onCopyLink,
  onExportIcs,
}) {
  editBtn.href = `/event-create.html?id=${eventId}`;
  editBtn.style.visibility = event.myRole === 'host' ? 'visible' : 'hidden';

  const dateStr = formatEventDateTime(event.startTime, event.endTime);
  const isHost = event.myRole === 'host';
  const participants = event.participants || [];

  contentEl.innerHTML = '';

  const infoCard = document.createElement('section');
  infoCard.className = 'detail-section card';

  const metaRow = document.createElement('div');
  metaRow.className = 'event-meta';

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge status-badge ${event.status === 'shared' ? 'badge-blue' : 'badge-gray'}`;
  statusBadge.textContent = event.status === 'shared' ? '공유됨' : '비공개';
  metaRow.appendChild(statusBadge);

  if (!dateStr) {
    const timeBadge = document.createElement('span');
    timeBadge.className = 'badge status-badge badge-gray';
    timeBadge.textContent = '시간 미정';
    metaRow.appendChild(timeBadge);
  }

  const title = document.createElement('h1');
  title.className = 'event-title';
  title.textContent = event.title;

  infoCard.append(metaRow, title);

  if (dateStr) {
    const dateEl = document.createElement('p');
    dateEl.className = 'event-datetime';
    const icon = document.createElement('span');
    icon.className = 'event-datetime-icon';
    icon.textContent = '📅';
    const text = document.createElement('span');
    text.textContent = dateStr;
    dateEl.append(icon, text);
    infoCard.appendChild(dateEl);
  }

  if (event.description) {
    const desc = document.createElement('p');
    desc.className = 'event-description';
    desc.textContent = event.description;
    infoCard.appendChild(desc);
  }

  contentEl.appendChild(infoCard);

  const participantCard = document.createElement('section');
  participantCard.className = 'detail-section card';

  const participantTitle = document.createElement('div');
  participantTitle.className = 'section-title';
  participantTitle.textContent = `참여자 (${participants.length}명)`;

  const participantList = document.createElement('div');
  participantList.className = 'participant-list';
  participants.forEach((participant) => participantList.appendChild(renderParticipant(participant)));

  participantCard.append(participantTitle, participantList);
  contentEl.appendChild(participantCard);

  const chatCard = document.createElement('section');
  chatCard.className = 'detail-section card';

  const chatTitle = document.createElement('div');
  chatTitle.className = 'section-title';
  chatTitle.textContent = '채팅';

  const chatActions = document.createElement('div');
  chatActions.className = 'section-actions';

  if (!event.hasChatRoom) {
    if (isHost) {
      const enableBtn = document.createElement('button');
      enableBtn.type = 'button';
      enableBtn.className = 'btn btn-secondary btn-enable-chat';
      enableBtn.textContent = '💬 채팅 활성화';
      enableBtn.addEventListener('click', async () => {
        enableBtn.disabled = true;
        const result = await onEnableChat();
        if (result.ok) {
          chatActions.innerHTML = '';
          const enterBtn = document.createElement('a');
          enterBtn.href = `/chat.html?roomId=${result.roomId}`;
          enterBtn.className = 'btn btn-primary';
          enterBtn.textContent = '💬 채팅방 입장';
          chatActions.appendChild(enterBtn);
          return;
        }
        alert(result.message || '채팅 활성화에 실패했습니다.');
        enableBtn.disabled = false;
      });
      chatActions.appendChild(enableBtn);
    } else {
      const notice = document.createElement('p');
      notice.className = 'chat-disabled-notice';
      notice.textContent = '채팅방이 없습니다';
      chatActions.appendChild(notice);
    }
  } else {
    const notice = document.createElement('p');
    notice.className = 'chat-disabled-notice';
    notice.textContent = '채팅방이 활성화되어 있습니다';
    chatActions.appendChild(notice);
  }

  chatCard.append(chatTitle, chatActions);
  contentEl.appendChild(chatCard);

  const shareCard = document.createElement('section');
  shareCard.className = 'detail-section card';

  const shareTitle = document.createElement('div');
  shareTitle.className = 'section-title';
  shareTitle.textContent = '공유 링크';

  const shareActions = document.createElement('div');
  shareActions.className = 'section-actions';

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'btn btn-secondary';
  shareBtn.textContent = '🔗 공유 링크 생성';

  const exportIcsBtn = document.createElement('button');
  exportIcsBtn.type = 'button';
  exportIcsBtn.className = 'btn btn-secondary';
  exportIcsBtn.textContent = '📥 .ics 내보내기';

  const linkDisplay = document.createElement('div');
  linkDisplay.className = 'share-link-display';
  linkDisplay.style.display = 'none';

  const linkUrl = document.createElement('span');
  linkUrl.className = 'share-link-url';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn btn-ghost btn-sm';
  copyBtn.textContent = '복사';

  linkDisplay.append(linkUrl, copyBtn);

  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    const result = await onCreateShareLink();
    if (result.ok) {
      linkUrl.textContent = result.shareUrl;
      linkDisplay.style.display = 'flex';
    } else {
      alert(result.message || '공유 링크 생성에 실패했습니다.');
    }
    shareBtn.disabled = false;
  });

  copyBtn.addEventListener('click', async () => {
    const result = await onCopyLink(linkUrl.textContent);
    if (!result.ok) return;
    const original = copyBtn.textContent;
    copyBtn.textContent = '복사됨!';
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1500);
  });

  exportIcsBtn.addEventListener('click', async () => {
    exportIcsBtn.disabled = true;
    const result = await onExportIcs();
    if (!result.ok) {
      alert(result.message || '.ics 내보내기에 실패했습니다.');
    }
    exportIcsBtn.disabled = false;
  });

  shareActions.append(exportIcsBtn, shareBtn, linkDisplay);
  shareCard.append(shareTitle, shareActions);
  contentEl.appendChild(shareCard);

  if (isHost) {
    const dangerZone = document.createElement('div');
    dangerZone.className = 'danger-zone';
    const cancelLink = document.createElement('a');
    cancelLink.href = `/event-cancel.html?id=${eventId}`;
    cancelLink.className = 'btn btn-danger btn-sm';
    cancelLink.textContent = '일정 취소 시작';
    dangerZone.appendChild(cancelLink);
    contentEl.appendChild(dangerZone);
  }
}
