/**
 * Debug Panel for TAMS
 * 디버그 모드에서 페이지 네비게이션과 오류 로그를 제공
 * 
 * 사용법:
 * 1. URL에 ?debug=true 추가 (기본값: true)
 * 2. 또는 window.DEBUG_MODE = true; 설정
 * 3. 운영 환경에서 비활성화: ?debug=false 또는 DEFAULT_DEBUG_MODE = false
 */

// 기본 디버그 모드 설정 (운영 환경에서는 false로 변경)
const DEFAULT_DEBUG_MODE = true;

// 디버그 로그 저장소
const debugLogs = [];

// 무시할 오류 패턴 (디자인 확인 중에는 불필요한 오류들)
const IGNORED_ERROR_PATTERNS = [
    'is not valid JSON',
    '<!DOCTYPE',
    'Unexpected token',
    'installHook',
    'Failed to load resource',
    '/api/'  // API 호출 오류 무시 (백엔드 없을 때)
];

// 디버그 모드 확인
function isDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // URL에 debug=false가 명시되면 비활성화
    if (urlParams.get('debug') === 'false') {
        return false;
    }
    
    // URL에 debug=true가 있으면 활성화
    if (urlParams.get('debug') === 'true') {
        return true;
    }
    
    // 전역 변수 확인
    if (typeof window.DEBUG_MODE !== 'undefined') {
        return window.DEBUG_MODE === true;
    }
    
    // localStorage 확인
    if (localStorage.getItem('DEBUG_MODE') !== null) {
        return localStorage.getItem('DEBUG_MODE') === 'true';
    }
    
    // 기본값 반환
    return DEFAULT_DEBUG_MODE;
}

// 디버그 파라미터를 URL에 추가하는 헬퍼
function getDebugParam() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        return `?debug=${urlParams.get('debug')}`;
    }
    if (DEFAULT_DEBUG_MODE) {
        return '?debug=true';
    }
    return '';
}

// 링크에 디버그 파라미터 추가
function addDebugParamToLinks() {
    const debugParam = getDebugParam();
    if (!debugParam) return;
    
    // 디버그 패널 내 링크
    const debugLinks = document.querySelectorAll('#debug-panel .debug-nav a');
    debugLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('?')) {
            link.setAttribute('href', href + debugParam);
        }
    });
    
    // 사이드바 링크
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('?')) {
            link.setAttribute('href', href + debugParam);
        }
    });
    
    // 일반 버튼/링크 (main-content 내)
    const mainLinks = document.querySelectorAll('.main-content a[href$=".html"]');
    mainLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('?')) {
            link.setAttribute('href', href + debugParam);
        }
    });
}

// 디버그 패널 초기화
function initDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    
    if (isDebugMode()) {
        // 팝업 모드인 경우 자동으로 팝업 열기
        if (localStorage.getItem('DEBUG_POPUP_MODE') === 'true') {
            // dock 패널은 완전히 숨기기
            debugPanel.style.display = 'none';
            const reopenBtn = document.getElementById('debug-reopen-btn');
            if (reopenBtn) reopenBtn.style.display = 'none';
            
            // 팝업 창 열기 (약간의 지연을 두어 DOM이 준비되도록)
            setTimeout(() => {
                popoutDebugPanel();
            }, 200);
        } else {
            // dock 모드로 표시
            debugPanel.style.display = 'block';
        }
        
        // 현재 페이지 하이라이트
        highlightCurrentPage();
        
        // 링크에 디버그 파라미터 추가
        addDebugParamToLinks();
        
        // 오류 캡처 설정
        setupErrorCapture();
        
        console.log('%c[DEBUG] 디버그 패널이 활성화되었습니다.', 'color: #4CAF50; font-weight: bold;');
    }
}

// 현재 페이지 하이라이트
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop();
    
    const links = document.querySelectorAll('#debug-panel .debug-nav a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith(currentFile)) {
            link.classList.add('active');
        }
    });
}

// 오류 캡처 설정
function setupErrorCapture() {
    // 기존 console.error 저장
    const originalConsoleError = console.error;
    
    // console.error 오버라이드
    console.error = function(...args) {
        addDebugLog('ERROR', args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' '));
        
        originalConsoleError.apply(console, args);
    };
    
    // window.onerror - 전역 JS 오류 캡처
    window.onerror = function(message, source, lineno, colno, error) {
        addDebugLog('JS_ERROR', `${message}\n위치: ${source}:${lineno}:${colno}\n${error?.stack || ''}`);
        return false;
    };
    
    // unhandledrejection - Promise 오류 캡처
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        let message = 'Unhandled Promise Rejection';
        
        if (reason instanceof Error) {
            message = `${reason.name}: ${reason.message}\n${reason.stack || ''}`;
        } else if (typeof reason === 'string') {
            message = reason;
        } else {
            try {
                message = JSON.stringify(reason, null, 2);
            } catch (e) {
                message = String(reason);
            }
        }
        
        addDebugLog('PROMISE_ERROR', message);
    });
    
    // fetch 오버라이드 - API 오류 캡처
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        const startTime = Date.now();
        
        try {
            const response = await originalFetch.apply(this, args);
            const duration = Date.now() - startTime;
            
            if (!response.ok) {
                addDebugLog('API_ERROR', `${response.status} ${response.statusText}\nURL: ${url}\n소요시간: ${duration}ms`);
            }
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            addDebugLog('NETWORK_ERROR', `${error.message}\nURL: ${url}\n소요시간: ${duration}ms`);
            throw error;
        }
    };
}

// 오류가 무시 대상인지 확인
function shouldIgnoreError(message) {
    if (!message) return false;
    const msgStr = String(message);
    return IGNORED_ERROR_PATTERNS.some(pattern => msgStr.includes(pattern));
}

// 디버그 로그 추가
function addDebugLog(type, message) {
    // 무시할 오류인지 확인
    if (shouldIgnoreError(message)) {
        return;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        type,
        message,
        page: window.location.pathname
    };
    
    debugLogs.push(logEntry);
    
    // UI 업데이트
    updateDebugLogUI();
}

// 디버그 로그 UI 업데이트
function updateDebugLogUI() {
    const logContainer = document.getElementById('debug-log');
    const logCount = document.getElementById('debug-log-count');
    
    if (!logContainer) return;
    
    // 로그 카운트 업데이트
    if (logCount) {
        logCount.textContent = debugLogs.length;
    }
    
    // 로그 목록 렌더링
    logContainer.innerHTML = debugLogs.map((log, index) => `
        <div class="debug-log-entry debug-log-${log.type.toLowerCase()}">
            <div class="debug-log-header">
                <span class="debug-log-type">[${log.type}]</span>
                <span class="debug-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre class="debug-log-message">${escapeHtml(log.message)}</pre>
        </div>
    `).join('');
    
    // 스크롤을 맨 아래로
    logContainer.scrollTop = logContainer.scrollHeight;
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 디버그 로그 복사
function copyDebugLog() {
    if (debugLogs.length === 0) {
        alert('복사할 로그가 없습니다.');
        return;
    }
    
    const logText = debugLogs.map(log => 
        `[${log.timestamp}] [${log.type}] [${log.page}]\n${log.message}`
    ).join('\n\n---\n\n');
    
    const fullText = `=== TAMS 디버그 로그 ===
시간: ${new Date().toISOString()}
페이지: ${window.location.href}
UserAgent: ${navigator.userAgent}

=== 로그 목록 (${debugLogs.length}개) ===

${logText}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        alert('로그가 클립보드에 복사되었습니다.');
    }).catch(err => {
        console.error('클립보드 복사 실패:', err);
        // 폴백: textarea 사용
        const textarea = document.createElement('textarea');
        textarea.value = fullText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('로그가 클립보드에 복사되었습니다.');
    });
}

// 디버그 로그 삭제
function clearDebugLog() {
    debugLogs.length = 0;
    updateDebugLogUI();
}

// 디버그 패널 토글
// 디버그 패널 팝업 윈도우 참조
let debugPopupWindow = null;

function toggleDebugPanel() {
    const panel = document.getElementById('debug-panel');
    const reopenBtn = document.getElementById('debug-reopen-btn');
    
    if (panel.classList.contains('debug-panel-hidden')) {
        // 패널 열기
        panel.classList.remove('debug-panel-hidden');
        if (reopenBtn) reopenBtn.classList.remove('visible');
    } else {
        // 패널 닫기
        panel.classList.add('debug-panel-hidden');
        if (reopenBtn) reopenBtn.classList.add('visible');
    }
}

// 팝업 내용 업데이트
function updatePopupContent(popupWindow, debugPanel) {
    if (!popupWindow || popupWindow.closed || !debugPanel) return;
    
    try {
        // 팝업의 내용 영역만 업데이트
        const popupContentEl = popupWindow.document.querySelector('.debug-content');
        if (popupContentEl) {
            popupContentEl.outerHTML = debugPanel.querySelector('.debug-content').outerHTML;
            // 이벤트 리스너 다시 연결
            attachPopupEventListeners(popupWindow);
        }
    } catch (e) {
        console.warn('팝업 내용 업데이트 실패:', e);
    }
}

// 팝업 내부 링크 하이라이트
function highlightPopupLinks(popupWindow) {
    if (!popupWindow || popupWindow.closed) return;
    
    try {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop();
        
        popupWindow.document.querySelectorAll('.debug-nav a').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.endsWith(currentFile)) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.warn('팝업 링크 하이라이트 실패:', e);
    }
}

// 팝업 이벤트 리스너 연결 (팝업 내부에서 호출되는 경우를 위해)
function attachPopupEventListeners(popupWindow) {
    if (!popupWindow || popupWindow.closed) return;
    
    try {
        // 팝업 내부에서 실행될 코드를 문자열로 만들어 실행
        const script = popupWindow.document.createElement('script');
        script.textContent = `
            (function() {
                // 링크 클릭 시 부모 창에서 열기 (이미 연결된 경우 스킵)
                document.querySelectorAll('.debug-nav a').forEach(link => {
                    if (!link.dataset.listenerAttached) {
                        link.dataset.listenerAttached = 'true';
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            if (window.opener && !window.opener.closed) {
                                window.opener.location.href = this.href;
                            }
                        });
                    }
                });
                
                // 더미 데이터 토글 상태 복원
                const toggle = document.getElementById('dummy-data-toggle');
                if (toggle && window.opener && window.opener.isDummyDataMode) {
                    toggle.checked = window.opener.isDummyDataMode();
                    const label = document.getElementById('dummy-data-label');
                    if (label) label.textContent = toggle.checked ? 'ON' : 'OFF';
                }
            })();
        `;
        popupWindow.document.body.appendChild(script);
    } catch (e) {
        console.warn('팝업 이벤트 리스너 연결 실패:', e);
    }
}

// 디버그 패널을 별도 팝업 창으로 분리
function popoutDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    
    // 이미 팝업이 열려있으면 포커스만 (같은 origin의 팝업인 경우)
    if (debugPopupWindow && !debugPopupWindow.closed) {
        try {
            debugPopupWindow.focus();
            // 팝업의 내용을 현재 페이지 기준으로 업데이트
            updatePopupContent(debugPopupWindow, debugPanel);
            highlightPopupLinks(debugPopupWindow);
            return;
        } catch (e) {
            // cross-origin이거나 접근 불가능한 경우 새로 열기
            debugPopupWindow = null;
        }
    }
    
    // 팝업 윈도우 열기 (같은 이름으로 열어서 기존 팝업이 있으면 재사용)
    debugPopupWindow = window.open('', 'DebugPanel', 'width=280,height=600,resizable=yes,scrollbars=yes');
    
    if (!debugPopupWindow) {
        alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
        localStorage.removeItem('DEBUG_POPUP_MODE');
        return;
    }
    
    // 기존 팝업인지 확인 (이미 내용이 있으면 기존 팝업)
    try {
        const hasContent = debugPopupWindow.document && 
                          debugPopupWindow.document.body && 
                          debugPopupWindow.document.body.children.length > 0;
        
        if (hasContent) {
            // 기존 팝업에 연결 - 내용 업데이트
            debugPopupWindow.focus();
            updatePopupContent(debugPopupWindow, debugPanel);
            highlightPopupLinks(debugPopupWindow);
            // dock 패널 숨기기
            debugPanel.style.display = 'none';
            const reopenBtn = document.getElementById('debug-reopen-btn');
            if (reopenBtn) reopenBtn.style.display = 'none';
            return;
        }
    } catch (e) {
        // 접근 불가능한 경우 새로 생성 계속 진행
    }
    
    // 팝업 내용 구성
    const popupContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Debug Panel</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e1e1e;
            color: #fff;
            font-size: 12px;
            padding: 0;
        }
        .debug-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #4CAF50;
            color: white;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        .debug-content { padding: 12px; }
        .debug-section { margin-bottom: 16px; }
        .debug-section h4 {
            font-size: 11px;
            color: #aaa;
            text-transform: uppercase;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #444;
        }
        .debug-nav { display: flex; flex-direction: column; gap: 4px; }
        .debug-nav a {
            color: #ccc;
            text-decoration: none;
            padding: 6px 10px;
            border-radius: 4px;
            transition: all 0.2s;
            font-size: 11px;
        }
        .debug-nav a:hover {
            background: #444;
            color: #fff;
        }
        .debug-nav a.active {
            background: #4CAF50;
            color: white;
        }
        .debug-toggle-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
        }
        .debug-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .debug-switch input { opacity: 0; width: 0; height: 0; }
        .debug-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #555;
            transition: 0.3s;
            border-radius: 20px;
        }
        .debug-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        }
        input:checked + .debug-slider { background-color: #4CAF50; }
        input:checked + .debug-slider:before { transform: translateX(20px); }
        .debug-log {
            max-height: 200px;
            overflow-y: auto;
            background: #1a1a1a;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .debug-log-entry {
            padding: 6px 8px;
            border-bottom: 1px solid #333;
            font-family: monospace;
            font-size: 10px;
        }
        .debug-log-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .debug-log-type { color: #f44336; font-weight: bold; }
        .debug-log-time { color: #888; }
        .debug-log-message {
            color: #ffa726;
            white-space: pre-wrap;
            word-break: break-all;
            margin: 0;
            font-size: 10px;
        }
        .debug-badge {
            background: #f44336;
            color: white;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            margin-left: 4px;
        }
        .debug-actions { display: flex; gap: 4px; }
        .debug-btn {
            flex: 1;
            padding: 8px;
            background: #444;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
        }
        .debug-btn:hover { background: #555; }
    </style>
</head>
<body>
    <div class="debug-header">
        <span>🛠️ Debug Panel</span>
        <button onclick="window.opener.dockDebugPanel(); window.close();" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px;">📌 Dock</button>
    </div>
    ${debugPanel.querySelector('.debug-content').outerHTML}
    <script>
        // 링크 클릭 시 부모 창에서 열기
        document.querySelectorAll('.debug-nav a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                window.opener.location.href = this.href;
            });
        });
        
        // 더미 데이터 토글
        const toggle = document.getElementById('dummy-data-toggle');
        if (toggle) {
            toggle.addEventListener('change', function() {
                window.opener.toggleDummyData(this.checked);
                document.getElementById('dummy-data-label').textContent = this.checked ? 'ON' : 'OFF';
            });
        }
        
        // 복사/삭제 버튼
        document.querySelector('[onclick="copyDebugLog()"]')?.addEventListener('click', () => window.opener.copyDebugLog());
        document.querySelector('[onclick="clearDebugLog()"]')?.addEventListener('click', () => {
            window.opener.clearDebugLog();
            document.getElementById('debug-log').innerHTML = '';
            document.getElementById('debug-log-count').textContent = '0';
        });
        
        // 창이 닫힐 때 부모에 알림
        window.addEventListener('beforeunload', () => {
            if (window.opener) window.opener.debugPopupWindow = null;
        });
    </script>
</body>
</html>`;
    
    debugPopupWindow.document.write(popupContent);
    debugPopupWindow.document.close();
    
    // 팝업이 로드된 후 이벤트 리스너 연결 및 링크 하이라이트 (약간의 지연)
    setTimeout(() => {
        attachPopupEventListeners(debugPopupWindow);
        highlightPopupLinks(debugPopupWindow);
    }, 100);
    
    // 팝업 모드 상태 저장
    localStorage.setItem('DEBUG_POPUP_MODE', 'true');
    
    // 원래 패널 완전히 숨기기
    debugPanel.style.display = 'none';
    const reopenBtn = document.getElementById('debug-reopen-btn');
    if (reopenBtn) reopenBtn.style.display = 'none';
    
    // 팝업 창이 닫힐 때 처리
    const checkPopupClosed = setInterval(() => {
        if (debugPopupWindow && debugPopupWindow.closed) {
            clearInterval(checkPopupClosed);
            localStorage.removeItem('DEBUG_POPUP_MODE');
            // dock 모드로 복귀
            debugPanel.style.display = '';
            if (reopenBtn) reopenBtn.style.display = '';
        }
    }, 500);
}

// 팝업에서 다시 도킹
function dockDebugPanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) {
        panel.style.display = '';
        panel.classList.remove('debug-panel-hidden');
    }
    
    // 팝업 모드 상태 제거
    localStorage.removeItem('DEBUG_POPUP_MODE');
    
    // 팝업 창 닫기
    if (debugPopupWindow && !debugPopupWindow.closed) {
        debugPopupWindow.close();
    }
    debugPopupWindow = null;
    
    const reopenBtn = document.getElementById('debug-reopen-btn');
    if (reopenBtn) reopenBtn.style.display = '';
}

// DOMContentLoaded 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // fragment가 로드된 후 초기화 (약간의 지연)
    setTimeout(() => {
        initDebugPanel();
        initDummyDataToggle();
    }, 100);
});

// ==================== 더미 데이터 시스템 ====================

// 더미 데이터 모드 확인
function isDummyDataMode() {
    return localStorage.getItem('DUMMY_DATA_MODE') === 'true';
}

// 더미 데이터 토글
function toggleDummyData(enabled) {
    localStorage.setItem('DUMMY_DATA_MODE', enabled ? 'true' : 'false');
    
    const label = document.getElementById('dummy-data-label');
    if (label) {
        label.textContent = enabled ? 'ON' : 'OFF';
        label.style.color = enabled ? '#4CAF50' : '#aaa';
    }
    
    // 더미 데이터 적용
    if (enabled) {
        applyDummyData();
    } else {
        // 페이지 새로고침으로 원래 상태로 복원
        location.reload();
    }
}

// 더미 데이터 토글 상태 초기화
function initDummyDataToggle() {
    const toggle = document.getElementById('dummy-data-toggle');
    const label = document.getElementById('dummy-data-label');
    
    if (toggle && label) {
        const isEnabled = isDummyDataMode();
        toggle.checked = isEnabled;
        label.textContent = isEnabled ? 'ON' : 'OFF';
        label.style.color = isEnabled ? '#4CAF50' : '#aaa';
        
        // 이미 활성화 상태면 더미 데이터 적용
        if (isEnabled) {
            setTimeout(applyDummyData, 200);
        }
    }
}

// 더미 데이터 정의
const DUMMY_DATA = {
    users: [
        { id: 1, name: '김관리자', phone: '010-1234-5678', role: 'ADMIN' },
        { id: 2, name: '이멘토', phone: '010-2345-6789', role: 'MENTOR' },
        { id: 3, name: '박멘토', phone: '010-3456-7890', role: 'MENTOR' },
        { id: 4, name: '최조교', phone: '010-4567-8901', role: 'TUTOR' },
        { id: 5, name: '정조교', phone: '010-5678-9012', role: 'TUTOR' }
    ],
    students: [
        { id: 1, name: '홍길동', phone: '010-1111-2222', current_courses: 'Python, Java', notes: '열심히 하는 학생' },
        { id: 2, name: '김철수', phone: '010-2222-3333', current_courses: 'JavaScript', notes: '' },
        { id: 3, name: '이영희', phone: '010-3333-4444', current_courses: 'C++, Algorithm', notes: '알고리즘 보충 필요' },
        { id: 4, name: '박민수', phone: '010-4444-5555', current_courses: 'Database', notes: '' }
    ],
    tutors: [
        { id: 1, name: '최조교', phone: '010-4567-8901', subjects: ['Python', 'Java'], active: true },
        { id: 2, name: '정조교', phone: '010-5678-9012', subjects: ['JavaScript', 'React'], active: true },
        { id: 3, name: '강조교', phone: '010-6789-0123', subjects: ['C++', 'Algorithm'], active: false }
    ],
    appointments: [
        { id: 1, student: '홍길동', tutor: '최조교', date: '2024-12-16', time: '14:00', status: 'PENDING', subject: 'Python' },
        { id: 2, student: '김철수', tutor: '정조교', date: '2024-12-16', time: '15:00', status: 'CONFIRMED', subject: 'JavaScript' },
        { id: 3, student: '이영희', tutor: '최조교', date: '2024-12-17', time: '10:00', status: 'COMPLETED', subject: 'Java' },
        { id: 4, student: '박민수', tutor: '정조교', date: '2024-12-15', time: '11:00', status: 'CANCELLED', subject: 'React' }
    ],
    stats: {
        totalUsers: 15,
        monthlyAppointments: 42,
        completedAppointments: 28,
        activeTutors: 5
    }
};

// 더미 데이터 적용
function applyDummyData() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop().replace('.html', '');
    
    console.log('%c[DEBUG] 더미 데이터 적용 중...', 'color: #FF9800; font-weight: bold;');
    
    // 통계 카드 업데이트
    updateStatCards();
    
    // 페이지별 더미 데이터 적용
    if (currentFile.includes('users')) {
        renderDummyUserList();
    } else if (currentFile.includes('students')) {
        renderDummyStudentList();
    } else if (currentFile.includes('tutors') && !currentFile.includes('schedule')) {
        renderDummyTutorList();
    } else if (currentFile.includes('pending')) {
        renderDummyPendingList();
    } else if (currentFile.includes('appointments')) {
        renderDummyAppointmentList();
    } else if (currentFile.includes('schedule') || currentFile.includes('calendar')) {
        renderDummyCalendar();
    }
}

// 통계 카드 업데이트
function updateStatCards() {
    const statValues = document.querySelectorAll('.stat-value');
    const stats = DUMMY_DATA.stats;
    const values = [stats.totalUsers, stats.monthlyAppointments, stats.completedAppointments, stats.activeTutors];
    
    statValues.forEach((el, index) => {
        if (values[index] !== undefined) {
            el.textContent = values[index];
        }
    });
}

// 더미 사용자 목록 렌더링
function renderDummyUserList() {
    const container = document.getElementById('user-list');
    if (!container) return;
    
    const roleColors = { ADMIN: 'danger', MENTOR: 'info', TUTOR: 'success' };
    const roleNames = { ADMIN: '관리자', MENTOR: '멘토', TUTOR: '조교' };
    
    container.innerHTML = `
        <div class="user-grid">
            ${DUMMY_DATA.users.map(user => `
                <div class="card" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${user.name}</strong>
                            <span class="badge badge-${roleColors[user.role]}" style="margin-left: 8px;">${roleNames[user.role]}</span>
                        </div>
                        <div style="color: var(--gray-500);">${user.phone}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 학생 목록 렌더링
function renderDummyStudentList() {
    const container = document.getElementById('student-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="student-grid">
            ${DUMMY_DATA.students.map(student => `
                <div class="card" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="font-size: 1.1rem;">${student.name}</strong>
                            <p style="color: var(--gray-500); margin-top: 4px;">${student.phone}</p>
                            ${student.current_courses ? `<p style="margin-top: 4px;"><i data-lucide="book" style="width:14px;height:14px;display:inline;"></i> ${student.current_courses}</p>` : ''}
                            ${student.notes ? `<p style="color: var(--gray-400); font-size: 0.875rem; margin-top: 4px;">${student.notes}</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-primary">보충 신청</button>
                            <button class="btn btn-sm btn-secondary">수정</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 조교 목록 렌더링
function renderDummyTutorList() {
    const container = document.getElementById('tutor-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="tutor-grid">
            ${DUMMY_DATA.tutors.map(tutor => `
                <div class="card" style="margin-bottom: 1rem; ${!tutor.active ? 'opacity: 0.6;' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${tutor.name}</strong>
                            <span class="badge ${tutor.active ? 'badge-success' : 'badge-danger'}" style="margin-left: 8px;">
                                ${tutor.active ? '활성' : '비활성'}
                            </span>
                            <p style="color: var(--gray-500); margin-top: 4px;">${tutor.phone}</p>
                            <p style="margin-top: 4px;">${tutor.subjects.map(s => `<span class="badge badge-info" style="margin-right:4px;">${s}</span>`).join('')}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 대기 목록 렌더링
function renderDummyPendingList() {
    const container = document.getElementById('pending-list');
    const badge = document.getElementById('pending-badge');
    if (!container) return;
    
    const pendingItems = DUMMY_DATA.appointments.filter(a => a.status === 'PENDING');
    
    if (badge) {
        badge.textContent = `${pendingItems.length}건`;
    }
    
    if (pendingItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle" size="64"></i>
                <p>승인 대기 중인 신청이 없습니다.</p>
            </div>
        `;
    } else {
        container.innerHTML = pendingItems.map(item => `
            <div class="card" style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${item.student}</strong> - ${item.subject}
                        <p style="color: var(--gray-500); margin-top: 4px;">${item.date} ${item.time}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-success">승인</button>
                        <button class="btn btn-sm btn-danger">거절</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 신청 목록 렌더링
function renderDummyAppointmentList() {
    const container = document.getElementById('appointment-list');
    if (!container) return;
    
    const statusColors = { PENDING: 'warning', CONFIRMED: 'success', COMPLETED: 'info', CANCELLED: 'danger' };
    const statusNames = { PENDING: '대기중', CONFIRMED: '확정', COMPLETED: '완료', CANCELLED: '취소' };
    
    // 카운트 업데이트
    ['pending', 'confirmed', 'completed', 'cancelled'].forEach(status => {
        const countEl = document.getElementById(`${status}-count`);
        if (countEl) {
            const count = DUMMY_DATA.appointments.filter(a => a.status === status.toUpperCase()).length;
            countEl.textContent = count;
        }
    });
    
    container.innerHTML = DUMMY_DATA.appointments.map(item => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.student}</strong>
                    <span class="badge badge-${statusColors[item.status]}" style="margin-left: 8px;">${statusNames[item.status]}</span>
                    <p style="color: var(--gray-500); margin-top: 4px;">
                        ${item.date} ${item.time} | ${item.tutor} | ${item.subject}
                    </p>
                </div>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 달력 렌더링
function renderDummyCalendar() {
    const container = document.getElementById('calendar-container');
    const monthDisplay = document.getElementById('current-month-display');
    
    if (!container) return;
    
    // 현재 월 표시
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (monthDisplay) {
        monthDisplay.textContent = `${year}년 ${month + 1}월`;
    }
    
    // 요일 헤더
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    
    // 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 날의 요일 (월요일 = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    // 더미 슬롯 데이터 생성
    const dummySlots = generateDummySlots(year, month);
    
    let html = '<div class="calendar-grid">';
    
    // 요일 헤더
    html += '<div class="calendar-weekdays">';
    weekdays.forEach((day, idx) => {
        const isWeekend = idx >= 5;
        html += `<div class="calendar-weekday" style="${isWeekend ? 'color: var(--danger-color);' : ''}">${day}</div>`;
    });
    html += '</div>';
    
    // 날짜 그리드
    html += '<div class="calendar-days">';
    
    // 이전 달 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    
    // 현재 달 날짜
    const today = now.getDate();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const isToday = day === today;
        const isPast = day < today;
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const slots = dummySlots[dateKey] || [];
        
        const dayOfWeek = (startDayOfWeek + day - 1) % 7;
        const isWeekend = dayOfWeek >= 5;
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" 
                 style="cursor: ${isPast ? 'default' : 'pointer'};">
                <div class="day-number" style="${isWeekend ? 'color: var(--danger-color);' : ''}">${day}</div>
                <div class="day-slots">
                    ${renderDummySlotDots(slots)}
                </div>
            </div>
        `;
    }
    
    // 다음 달 빈 칸 (6주 맞추기)
    const totalCells = startDayOfWeek + lastDay.getDate();
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    
    html += '</div></div>';
    
    container.innerHTML = html;
    
    // 달력 스타일 추가
    addCalendarStyles();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 더미 슬롯 데이터 생성
function generateDummySlots(year, month) {
    const slots = {};
    const today = new Date().getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // 오늘 이후 날짜에 랜덤 슬롯 추가
    for (let day = today; day <= lastDay; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 70% 확률로 슬롯 있음
        if (Math.random() > 0.3) {
            const slotCount = Math.floor(Math.random() * 6) + 1; // 1~6개
            const daySlots = [];
            
            for (let i = 0; i < slotCount; i++) {
                const statuses = ['available', 'pending', 'confirmed'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const hour = 9 + Math.floor(Math.random() * 9); // 9시~17시
                daySlots.push({
                    time: `${String(hour).padStart(2, '0')}:00`,
                    status: status
                });
            }
            
            slots[dateKey] = daySlots.sort((a, b) => a.time.localeCompare(b.time));
        }
    }
    
    return slots;
}

// 더미 슬롯 점 렌더링
function renderDummySlotDots(slots) {
    if (!slots || slots.length === 0) return '';
    
    const maxDots = 6;
    const displaySlots = slots.slice(0, maxDots);
    
    let html = '<div class="slot-dots">';
    displaySlots.forEach(slot => {
        const colorMap = {
            'available': 'var(--success-color)',
            'pending': 'var(--warning-color)',
            'confirmed': 'var(--info-color)',
            'completed': 'var(--gray-400)'
        };
        const color = colorMap[slot.status] || 'var(--gray-300)';
        html += `<span class="slot-dot" style="background-color: ${color};" title="${slot.time} - ${slot.status}"></span>`;
    });
    
    if (slots.length > maxDots) {
        html += `<span class="slot-dot-more">+${slots.length - maxDots}</span>`;
    }
    
    html += '</div>';
    return html;
}

// 달력 스타일 동적 추가
function addCalendarStyles() {
    if (document.getElementById('dummy-calendar-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dummy-calendar-styles';
    style.textContent = `
        .calendar-grid {
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            overflow: hidden;
        }
        .calendar-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            background: var(--gray-100);
            border-bottom: 1px solid var(--border-color);
        }
        .calendar-weekday {
            padding: 1rem;
            text-align: center;
            font-weight: 600;
            color: var(--gray-700);
        }
        .calendar-days {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }
        .calendar-day {
            min-height: 100px;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            transition: background-color 0.2s;
        }
        .calendar-day:hover:not(.past):not(.other-month) {
            background-color: var(--gray-50);
        }
        .calendar-day.other-month {
            background-color: var(--gray-50);
            opacity: 0.5;
        }
        .calendar-day.today {
            background-color: var(--info-light);
        }
        .calendar-day.past {
            opacity: 0.5;
        }
        .day-number {
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }
        .slot-dots {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
        }
        .slot-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }
        .slot-dot-more {
            font-size: 10px;
            color: var(--gray-500);
        }
        .calendar-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
    `;
    document.head.appendChild(style);
}

// 전역 함수로 노출
window.copyDebugLog = copyDebugLog;
window.clearDebugLog = clearDebugLog;
window.toggleDebugPanel = toggleDebugPanel;
window.popoutDebugPanel = popoutDebugPanel;
window.dockDebugPanel = dockDebugPanel;
window.toggleDummyData = toggleDummyData;
window.isDummyDataMode = isDummyDataMode;
window.addDebugLog = addDebugLog;

