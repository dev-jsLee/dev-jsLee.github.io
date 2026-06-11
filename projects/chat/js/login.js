import { getParam } from '/js/common.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const isLogin = tab.dataset.tab === 'login';
    loginForm.style.display = isLogin ? '' : 'none';
    registerForm.style.display = isLogin ? 'none' : '';

    loginError.textContent = '';
    registerError.textContent = '';
  });
});

function showError(el, message) {
  el.textContent = message;
}

function clearError(el) {
  el.textContent = '';
}

function setFormLoading(form, loading) {
  const btn = form.querySelector('.auth-submit-btn');
  const inputs = form.querySelectorAll('.auth-form-input');
  btn.disabled = loading;
  btn.textContent = loading
    ? (form.id === 'login-form' ? '로그인 중...' : '가입 중...')
    : (form.id === 'login-form' ? '로그인' : '회원가입');
  inputs.forEach(input => { input.disabled = loading; });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(loginError);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError(loginError, '이메일과 비밀번호를 입력하세요.');
    return;
  }

  setFormLoading(loginForm, true);
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

     if (!res.ok) {
       showError(loginError, data.message || '로그인에 실패했습니다.');
       return;
     }

     localStorage.setItem('token', data.token);
     const returnUrl = getParam('returnUrl');
     if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
       window.location.href = returnUrl;
     } else {
       window.location.href = '/calendar.html';
     }
  } catch {
    showError(loginError, '서버에 연결할 수 없습니다.');
  } finally {
    setFormLoading(loginForm, false);
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(registerError);

  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (!email || !password || !confirm) {
    showError(registerError, '모든 항목을 입력하세요.');
    return;
  }

  if (password.length < 6) {
    showError(registerError, '비밀번호는 6자 이상이어야 합니다.');
    return;
  }

  if (password !== confirm) {
    showError(registerError, '비밀번호가 일치하지 않습니다.');
    return;
  }

  setFormLoading(registerForm, true);
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

     if (!res.ok) {
       showError(registerError, data.message || '회원가입에 실패했습니다.');
       return;
     }

     localStorage.setItem('token', data.token);
     const returnUrl = getParam('returnUrl');
     if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
       window.location.href = returnUrl;
     } else {
       window.location.href = '/calendar.html';
     }
  } catch {
    showError(registerError, '서버에 연결할 수 없습니다.');
  } finally {
    setFormLoading(registerForm, false);
  }
});
