import { api } from '/js/api.js';
import { getInitials, getAvatarColor } from '/js/common.js';

const profileLoading = document.getElementById('profile-loading');
const profileContent = document.getElementById('profile-content');
const profileAvatar = document.getElementById('profile-avatar');
const profileEmail = document.getElementById('profile-email');
const profileDisplayName = document.getElementById('profile-display-name');
const profileAvatarUrl = document.getElementById('profile-avatar-url');
const saveBtn = document.getElementById('save-profile-btn');
const saveSuccess = document.getElementById('save-success');
const saveError = document.getElementById('save-error');
const logoutBtn = document.getElementById('logout-btn');

function renderAvatar(user) {
  profileAvatar.innerHTML = '';
  if (user.avatarUrl) {
    const img = document.createElement('img');
    img.src = user.avatarUrl;
    img.alt = user.displayName || user.email;
    img.onerror = () => {
      profileAvatar.innerHTML = '';
      profileAvatar.textContent = getInitials(user.email);
    };
    profileAvatar.appendChild(img);
  } else {
    profileAvatar.textContent = getInitials(user.email);
  }
  profileAvatar.style.background = getAvatarColor(user.email);
}

function hideMessages() {
  saveSuccess.hidden = true;
  saveError.hidden = true;
  saveError.textContent = '';
}

async function loadProfile() {
  hideMessages();
  profileLoading.style.display = '';
  profileContent.style.display = 'none';

  try {
    const res = await api.get('/me');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      profileLoading.textContent = err.message || '프로필을 불러올 수 없습니다.';
      return;
    }

    const user = await res.json();
    renderAvatar(user);
    profileEmail.value = user.email || '';
    profileDisplayName.value = user.displayName || '';
    profileAvatarUrl.value = user.avatarUrl || '';

    profileLoading.style.display = 'none';
    profileContent.style.display = '';
  } catch {
    profileLoading.textContent = '서버에 연결할 수 없습니다.';
  }
}

// Save profile
saveBtn.addEventListener('click', async () => {
  hideMessages();
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const displayName = profileDisplayName.value.trim();
    const avatarUrl = profileAvatarUrl.value.trim();

    const res = await api.patch('/me', { displayName, avatarUrl });

    if (res.ok) {
      saveSuccess.hidden = false;
      await loadProfile();
      setTimeout(() => { saveSuccess.hidden = true; }, 3000);
    } else {
      const err = await res.json().catch(() => ({}));
      saveError.textContent = err.message || '프로필 저장에 실패했습니다.';
      saveError.hidden = false;
    }
  } catch {
    saveError.textContent = '서버에 연결할 수 없습니다.';
    saveError.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logout even if server call fails
  }
  localStorage.removeItem('token');
  window.location.href = '/index.html';
});

// Load profile on page ready
document.addEventListener('DOMContentLoaded', loadProfile);
