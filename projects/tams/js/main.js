// TAMS - Common JavaScript Functions

// Initialize Day.js with Korean locale
dayjs.locale('ko');

// ==================== Authentication ====================

/**
 * Logout - call server API to clear JWT HTTP-only cookies
 * Then redirect to login page
 */
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // 서버에서 JWT 쿠키를 지웠으므로 로그인 페이지로 이동
        window.location.href = '/login';
    }
}

// Note: Authentication is handled via HTTP-only cookies on the server side.
// No client-side token management is needed.

// ==================== Modal Functions ====================

/**
 * Open modal with title and content
 */
function openModal(title, bodyHtml) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    modal.style.display = 'flex';
    
    // Re-initialize Lucide icons in modal
    lucide.createIcons();
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ==================== Navigation Functions ====================

/**
 * 현재 페이지의 역할 확인 (URL 경로에서 추출)
 * @returns {string} 'admin', 'mentor', 'tutor' 중 하나
 */
function getCurrentRole() {
    const path = window.location.pathname;
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/mentor/')) return 'mentor';
    if (path.includes('/tutor/')) return 'tutor';
    
    // 기본값은 경로에서 추론
    const segments = path.split('/').filter(s => s);
    if (segments.length > 0) {
        const firstSegment = segments[0];
        if (['admin', 'mentor', 'tutor'].includes(firstSegment)) {
            return firstSegment;
        }
    }
    
    return null;
}

/**
 * 현재 페이지 파일명 추출 (확장자 제외)
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    return filename.replace('.html', '');
}

/**
 * 역할별 네비게이션 링크 정의 (파일명만)
 */
const ROLE_NAV_ITEMS = {
    admin: [
        { name: '대시보드', file: 'dashboard.html', icon: 'layout-dashboard', id: 'dashboard' },
        { name: '계정 관리', file: 'users.html', icon: 'users', id: 'users' },
        { name: '조교 관리', file: 'tutors.html', icon: 'user-check', id: 'tutors' },
        { name: '통계', file: 'statistics.html', icon: 'bar-chart-2', id: 'statistics' },
        { name: '과목 관리', file: 'subjects.html', icon: 'book', id: 'subjects' },
        { name: '일정표', file: 'schedules.html', icon: 'calendar', id: 'schedules' }
    ],
    mentor: [
        { name: '대시보드', file: 'dashboard.html', icon: 'layout-dashboard', id: 'dashboard' },
        { name: '학생 관리', file: 'students.html', icon: 'users', id: 'students' },
        { name: '시간표', file: 'schedule.html', icon: 'calendar', id: 'schedule' },
        { name: '신청 현황', file: 'appointments.html', icon: 'clock', id: 'appointments' }
    ],
    tutor: [
        { name: '대시보드', file: 'dashboard.html', icon: 'layout-dashboard', id: 'dashboard' },
        { name: '승인 대기', file: 'pending.html', icon: 'bell', id: 'pending' },
        { name: '내 일정', file: 'calendar.html', icon: 'calendar-days', id: 'calendar' },
        { name: '설정', file: 'settings.html', icon: 'settings', id: 'settings' }
    ]
};

/**
 * 현재 페이지 경로를 기준으로 상대 경로 생성
 */
function getRelativePath(file) {
    const path = window.location.pathname;
    const segments = path.split('/').filter(s => s && !s.endsWith('.html'));
    const role = getCurrentRole();
    
    if (role) {
        // 역할별 폴더 안에 있으면 같은 폴더의 파일
        return `${file}`;
    }
    
    // 기본적으로 같은 디렉토리
    return file;
}

/**
 * 헤더 네비게이션 링크 초기화
 */
function initNavbarNavigation() {
    const role = getCurrentRole();
    if (!role) return;
    
    const navItems = ROLE_NAV_ITEMS[role];
    if (!navItems) return;
    
    const navbarNav = document.querySelector('[data-navbar-nav]');
    if (!navbarNav) return;
    
    const currentPage = getCurrentPage();
    // debug.js의 getDebugParam 함수가 있으면 사용, 없으면 빈 문자열
    const debugParam = (typeof getDebugParam === 'function') ? getDebugParam() : '';
    
    navbarNav.innerHTML = navItems.map(item => {
        const isActive = item.id === currentPage;
        const href = getRelativePath(item.file) + (debugParam || '');
        return `
            <a href="${href}" class="navbar-nav-item ${isActive ? 'active' : ''}" data-nav-id="${item.id}">
                <i data-lucide="${item.icon}"></i>
                <span>${item.name}</span>
            </a>
        `;
    }).join('');
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 사이드바 토글 함수 (모바일용)
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar[style*="display: block"], .sidebar:not([style*="display: none"])');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar) {
        // 역할에 맞는 사이드바 찾기
        const role = getCurrentRole();
        if (role) {
            const roleSidebar = document.querySelector(`.sidebar[data-role="${role}"]`);
            if (roleSidebar) {
                roleSidebar.style.display = 'block';
                roleSidebar.classList.toggle('open');
                createSidebarOverlay();
                return;
            }
        }
        return;
    }
    
    sidebar.classList.toggle('open');
    
    // 오버레이 생성/토글
    if (sidebar.classList.contains('open')) {
        createSidebarOverlay();
    } else {
        removeSidebarOverlay();
    }
}

/**
 * 사이드바 오버레이 생성
 */
function createSidebarOverlay() {
    if (document.getElementById('sidebar-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay active';
    overlay.onclick = () => {
        toggleSidebar();
    };
    document.body.appendChild(overlay);
}

/**
 * 사이드바 오버레이 제거
 */
function removeSidebarOverlay() {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * 사이드바 초기화 (역할에 맞는 사이드바 표시)
 */
function initSidebar() {
    const role = getCurrentRole();
    if (!role) return;
    
    // 모든 사이드바 숨기기
    document.querySelectorAll('.sidebar').forEach(sidebar => {
        sidebar.style.display = 'none';
    });
    
    // 현재 역할에 맞는 사이드바 표시
    const roleSidebar = document.querySelector(`.sidebar[data-role="${role}"]`);
    if (roleSidebar) {
        roleSidebar.style.display = 'block';
        
        // 현재 페이지 활성화
        const currentPage = getCurrentPage();
        roleSidebar.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href && href.includes(currentPage)) {
                item.classList.add('active');
            }
        });
    }
}

// DOMContentLoaded 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 사이드바 초기화는 fragment 로드 후 실행되어야 하므로 약간의 지연
    setTimeout(() => {
        initSidebar();
        initNavbarNavigation();
    }, 200);
});

// 전역 함수로 노출
window.toggleSidebar = toggleSidebar;

// ==================== Alert Functions ====================

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type: success, error, warning, info
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showAlert(message, type = 'success', duration = 3000) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    // Auto remove after duration
    setTimeout(() => {
        alert.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => alert.remove(), 300);
    }, duration);
}

// ==================== Format Functions ====================

/**
 * Format phone number (010-0000-0000)
 */
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 3 && value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    input.value = value;
}

/**
 * Format date using Day.js
 * @param {string} dateStr - Date string
 * @param {string} format - Format string (default: 'YYYY년 M월 D일 (ddd)')
 */
function formatDate(dateStr, format = 'YYYY년 M월 D일 (ddd)') {
    return dayjs(dateStr).format(format);
}

/**
 * Format datetime
 * @param {string} datetimeStr - Datetime string
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm')
 */
function formatDateTime(datetimeStr, format = 'YYYY-MM-DD HH:mm') {
    return dayjs(datetimeStr).format(format);
}

/**
 * Get relative time (e.g., "3시간 전")
 */
function getRelativeTime(datetimeStr) {
    return dayjs(datetimeStr).fromNow();
}

// ==================== API Helper Functions ====================

// 디자인 모드 확인 (API 호출 차단)
function isDesignMode() {
    // URL에 debug 파라미터가 있거나 DEFAULT_DEBUG_MODE가 true면 디자인 모드
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') !== 'false';
}

/**
 * Make authenticated API request
 * JWT authentication is handled via HTTP-only cookies automatically
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 */
async function apiRequest(url, options = {}) {
    // 디자인 모드에서는 API 호출 차단하고 빈 데이터 반환
    if (isDesignMode()) {
        console.log(`%c[DESIGN MODE] API 호출 차단: ${url}`, 'color: #888;');
        return [];
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'  // HTTP-only 쿠키 전송을 위해 필수
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        // Handle 401 Unauthorized - reload page to trigger server-side redirect
        if (response.status === 401) {
            window.location.reload();
            return null;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || '요청 처리 중 오류가 발생했습니다.');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showAlert(error.message, 'error');
        throw error;
    }
}

/**
 * GET request helper
 */
async function apiGet(url) {
    return apiRequest(url, { method: 'GET' });
}

/**
 * POST request helper
 */
async function apiPost(url, data) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * PUT request helper
 */
async function apiPut(url, data) {
    return apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * DELETE request helper
 */
async function apiDelete(url) {
    return apiRequest(url, { method: 'DELETE' });
}

// ==================== Validation Functions ====================

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==================== Utility Functions ====================

/**
 * Calculate end time from start time and duration
 * @param {string} startTime - Start time (HH:mm)
 * @param {number} duration - Duration in minutes
 * @returns {string} End time (HH:mm)
 */
function calculateEndTime(startTime, duration) {
    const [hour, minute] = startTime.split(':').map(Number);
    const totalMinutes = hour * 60 + minute + duration;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Confirm dialog with custom message
 */
function confirmAction(message) {
    return confirm(message);
}

// ==================== Initialization ====================

// 서버에서 인증을 처리하므로 클라이언트 측 인증 체크는 불필요
// JWT는 HTTP-only 쿠키로 관리되며, 서버가 자동으로 인증 확인
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});


