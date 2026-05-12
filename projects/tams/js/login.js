/**
 * Login Page JavaScript
 */

// 전화번호 자동 포맷팅 (단순 버전 - 숫자만 저장, 표시 시 하이픈 삽입)
function formatPhone(input) {
    // 숫자만 추출
    let numbers = input.value.replace(/[^0-9]/g, '');
    
    // 11자리 제한
    if (numbers.length > 11) {
        numbers = numbers.substring(0, 11);
    }
    
    // 포맷팅: 숫자 개수에 따라 하이픈 위치 결정
    let formatted = '';
    if (numbers.length <= 3) {
        // 3자리 이하: 하이픈 없음 (예: "010")
        formatted = numbers;
    } else if (numbers.length <= 7) {
        // 4~7자리: 3번째 뒤에 하이픈 (예: "010-1234")
        formatted = numbers.substring(0, 3) + '-' + numbers.substring(3);
    } else {
        // 8자리 이상: 3번째, 7번째 뒤에 하이픈 (예: "010-1234-5678")
        formatted = numbers.substring(0, 3) + '-' + numbers.substring(3, 7) + '-' + numbers.substring(7);
    }
    
    input.value = formatted;
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');
    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alert');
    
    // 전화번호 입력 포맷팅 (input 이벤트만으로 처리)
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            formatPhone(e.target);
        });
    }
    
    // 로그인 폼 제출 처리
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',  // 쿠키 전송을 위해 필수
                    body: JSON.stringify({ phone, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // 토큰은 서버의 HTTP-only 쿠키에 저장됨
                    // 역할별 페이지로 리다이렉트
                    const role = data.data.user.role.toLowerCase();
                    window.location.href = `/${role}`;
                } else {
                    alertBox.textContent = data.error.message;
                    alertBox.className = 'alert error';
                    alertBox.style.display = 'block';
                }
            } catch (error) {
                alertBox.textContent = '로그인 중 오류가 발생했습니다.';
                alertBox.className = 'alert error';
                alertBox.style.display = 'block';
            }
        });
    }
});

