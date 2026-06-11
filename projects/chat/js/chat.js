import { $, getParam, formatRelativeTime, formatDate, getInitials, getAvatarColor } from '/js/common.js';
import { api } from '/js/api.js';

const roomId = getParam('roomId');
let lastSenderId = null;
let lastDateStr = null;
let currentUser = null;

const titleEl = $('#chat-room-title');
const countEl = $('#participant-count');
const messagesEl = $('#messages-container');
const inputEl = $('#chat-input');
const sendBtn = $('#chat-send-btn');
const backLink = $('#back-link');
const moreBtn = $('#more-btn');
const moreMenu = $('#more-menu');
const exportBtn = $('#export-btn');

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function createAvatar(email) {
  const el = document.createElement('div');
  el.className = 'message-avatar';
  el.style.backgroundColor = getAvatarColor(email);
  el.textContent = getInitials(email);
  return el;
}

function createMessageEl(msg, continued) {
  const item = document.createElement('div');
  item.className = continued ? 'message-item message-item--continued' : 'message-item';

  if (!continued) {
    item.appendChild(createAvatar(msg.senderEmail || msg.senderId));
  }

  const content = document.createElement('div');
  content.className = 'message-content';

  if (!continued) {
    const header = document.createElement('div');
    header.className = 'message-header';

    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = msg.senderEmail || msg.senderId;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatRelativeTime(msg.createdAt);

    header.appendChild(sender);
    header.appendChild(time);
    content.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'message-body';
  body.textContent = msg.message;
  content.appendChild(body);

  item.appendChild(content);
  return item;
}

function createDateDivider(isoStr) {
  const el = document.createElement('div');
  el.className = 'date-divider';
  el.textContent = formatDate(isoStr);
  return el;
}

async function loadCurrentUser() {
  try {
    const res = await api.get('/me');
    if (res.ok) {
      currentUser = await res.json();
    }
  } catch { /* ignore */ }
}

function setupHeader() {
  // Without a room-detail API, show minimal header
  titleEl.textContent = '채팅';
  countEl.textContent = '';
  backLink.href = '/calendar.html';
}

function showEmpty() {
  messagesEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-state-icon';
  icon.textContent = '\uD83D\uDCAC';

  const title = document.createElement('p');
  title.className = 'empty-state-title';
  title.textContent = '첫 메시지를 보내보세요';

  wrapper.appendChild(icon);
  wrapper.appendChild(title);
  messagesEl.appendChild(wrapper);
}

async function renderMessages() {
  if (!roomId) {
    showEmpty();
    return;
  }

  try {
    const res = await api.get(`/chat/${roomId}/messages?limit=100`);
    if (!res.ok) {
      showEmpty();
      return;
    }

    const result = await res.json();
    const messages = result.data || [];

    if (!messages.length) {
      showEmpty();
      return;
    }

    messagesEl.innerHTML = '';
    lastSenderId = null;
    lastDateStr = null;

    messages.forEach(msg => {
      if (!lastDateStr || !isSameDay(lastDateStr, msg.createdAt)) {
        messagesEl.appendChild(createDateDivider(msg.createdAt));
        lastDateStr = msg.createdAt;
        lastSenderId = null;
      }

      const continued = lastSenderId === msg.senderId;
      messagesEl.appendChild(createMessageEl(msg, continued));
      lastSenderId = msg.senderId;
    });

    scrollToBottom();
  } catch {
    showEmpty();
  }
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || !roomId) return;

  const emptyState = messagesEl.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  // Optimistic local append
  const now = new Date().toISOString();
  const localMsg = {
    id: `msg-local-${Date.now()}`,
    senderId: currentUser ? currentUser.id : 'me',
    senderEmail: currentUser ? currentUser.email : 'me',
    message: text,
    createdAt: now,
  };

  if (!lastDateStr || !isSameDay(lastDateStr, now)) {
    messagesEl.appendChild(createDateDivider(now));
    lastDateStr = now;
    lastSenderId = null;
  }

  const continued = lastSenderId === localMsg.senderId;
  messagesEl.appendChild(createMessageEl(localMsg, continued));
  lastSenderId = localMsg.senderId;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  scrollToBottom();

  // Send to API
  try {
    await api.post(`/chat/${roomId}/messages`, { message: text });
  } catch {
    /* message sent optimistically; if fails, user will see stale on refresh */
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

async function exportChat() {
  if (!roomId) return;

  try {
    const res = await api.get(`/chat/${roomId}/export`);
    if (!res.ok) {
      alert('채팅 내보내기에 실패했습니다.');
      return;
    }

    const messages = await res.json();
    if (!messages.length) return;

    const chatTitle = titleEl.textContent || '채팅';
    let text = `[${chatTitle}] 채팅 내보내기\n${'='.repeat(40)}\n\n`;
    messages.forEach(msg => {
      const date = new Date(msg.createdAt);
      text += `[${date.toLocaleString('ko-KR')}] ${msg.senderEmail || msg.senderId}: ${msg.message}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${roomId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('채팅 내보내기에 실패했습니다.');
  }

  moreMenu.classList.remove('is-open');
}

function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
}

inputEl.addEventListener('input', autoResize);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

moreBtn.addEventListener('click', () => {
  moreMenu.classList.toggle('is-open');
});

document.addEventListener('click', (e) => {
  if (!moreMenu.contains(e.target) && !moreBtn.contains(e.target)) {
    moreMenu.classList.remove('is-open');
  }
});

exportBtn.addEventListener('click', exportChat);

async function init() {
  await loadCurrentUser();
  setupHeader();
  await renderMessages();
}

init();
