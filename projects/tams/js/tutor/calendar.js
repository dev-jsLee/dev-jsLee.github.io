/**
 * Tutor Calendar Page JavaScript
 * 멘토와 동일한 형태의 월 단위 달력 뷰
 */

let currentMonth = dayjs(); // 현재 표시 중인 월
let monthlyData = {}; // 날짜별 예약 데이터 { 'YYYY-MM-DD': { appointments: [...] } }

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateMonthDisplay();
    loadMonthlySchedule();
});

// 월 변경
function changeMonth(months) {
    currentMonth = currentMonth.add(months, 'month');
    updateMonthDisplay();
    loadMonthlySchedule();
}

// 월 표시 업데이트
function updateMonthDisplay() {
    const display = document.getElementById('current-month-display');
    if (display) {
        display.textContent = currentMonth.format('YYYY년 M월');
    }
}

// 월 단위 스케줄 로드
async function loadMonthlySchedule() {
    try {
        // 현재 월의 시작일과 종료일 계산 (5주 범위)
        const startDate = currentMonth.startOf('month').startOf('week'); // 월의 첫 주 월요일
        const endDate = startDate.add(5, 'weeks').subtract(1, 'day'); // 5주 후 일요일
        
        const result = await apiGet(
            `/api/tutor/appointments?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
        );
        
        if (result && result.success) {
            // 날짜별로 데이터 정리
            monthlyData = {};
            result.data.forEach(apt => {
                const dateKey = apt.date;
                if (!monthlyData[dateKey]) {
                    monthlyData[dateKey] = { appointments: [] };
                }
                monthlyData[dateKey].appointments.push(apt);
            });
            renderCalendar();
        }
    } catch (error) {
        document.getElementById('calendar-container').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>달력을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// 달력 렌더링
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    
    // 현재 월의 시작일과 종료일 계산 (5주 범위)
    const startDate = currentMonth.startOf('month').startOf('week'); // 월의 첫 주 월요일
    const endDate = startDate.add(5, 'weeks').subtract(1, 'day'); // 5주 후 일요일
    
    // 요일 헤더
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    
    let html = '<div class="calendar-grid">';
    
    // 요일 헤더
    html += '<div class="calendar-weekdays">';
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    html += '</div>';
    
    // 날짜 그리드
    html += '<div class="calendar-days">';
    
    let currentDate = startDate;
    const today = dayjs();
    
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const dateKey = currentDate.format('YYYY-MM-DD');
        const isCurrentMonth = currentDate.month() === currentMonth.month();
        const isToday = currentDate.isSame(today, 'day');
        const isPast = currentDate.isBefore(today, 'day');
        
        const dateData = monthlyData[dateKey];
        const appointments = dateData ? dateData.appointments : [];
        
        // PENDING 상태가 있는지 확인 (외곽선 표시용)
        const hasPending = appointments.some(apt => apt.status === 'PENDING');
        
        // 상태별로 그룹화
        const statusGroups = {
            PENDING: appointments.filter(apt => apt.status === 'PENDING'),
            CONFIRMED: appointments.filter(apt => apt.status === 'CONFIRMED'),
            COMPLETED: appointments.filter(apt => apt.status === 'COMPLETED'),
            CANCELLED: appointments.filter(apt => apt.status === 'CANCELLED')
        };
        
        html += `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${hasPending ? 'has-pending' : ''}" 
                 onclick="showDateDetail('${dateKey}')">
                <div class="day-number">${currentDate.date()}</div>
                <div class="day-slots">
                    ${renderAppointmentDots(statusGroups)}
                </div>
            </div>
        `;
        
        currentDate = currentDate.add(1, 'day');
    }
    
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
    lucide.createIcons();
}

// 예약 점 렌더링
function renderAppointmentDots(statusGroups) {
    const totalCount = Object.values(statusGroups).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalCount === 0) {
        return '';
    }
    
    // 최대 10개까지만 표시
    const maxDots = 10;
    let displayed = 0;
    let html = '<div class="slot-dots">';
    
    // PENDING (주황색)
    statusGroups.PENDING.forEach(apt => {
        if (displayed < maxDots) {
            html += `<span class="slot-dot pending" title="승인 대기: ${apt.start_time}"></span>`;
            displayed++;
        }
    });
    
    // CONFIRMED (초록색)
    statusGroups.CONFIRMED.forEach(apt => {
        if (displayed < maxDots) {
            html += `<span class="slot-dot confirmed" title="승인 완료: ${apt.start_time}"></span>`;
            displayed++;
        }
    });
    
    // COMPLETED (파란색)
    statusGroups.COMPLETED.forEach(apt => {
        if (displayed < maxDots) {
            html += `<span class="slot-dot completed" title="완료됨: ${apt.start_time}"></span>`;
            displayed++;
        }
    });
    
    const remaining = totalCount - displayed;
    if (remaining > 0) {
        html += `<span class="slot-dot-more" title="+${remaining}개 더">+${remaining}</span>`;
    }
    
    html += '</div>';
    return html;
}

// 날짜 클릭 시 상세 정보 모달 표시
async function showDateDetail(dateStr) {
    const dateData = monthlyData[dateStr];
    if (!dateData || !dateData.appointments || dateData.appointments.length === 0) {
        return;
    }
    
    const date = dayjs(dateStr);
    const appointments = dateData.appointments.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
    });
    
    // 뷰 상태 저장 (전역 변수)
    window.currentDateView = window.currentDateView || 'list';
    window.currentDateStr = dateStr;
    
    const modalHtml = `
        <div class="date-detail-modal">
            <div class="modal-header">
                <h3>${date.format('YYYY년 M월 D일 (ddd)')}</h3>
            </div>
            <div class="view-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border-color);">
                <button class="view-tab ${window.currentDateView === 'list' ? 'active' : ''}" 
                        onclick="switchDateView('list', '${dateStr}', this)">
                    목록 뷰
                </button>
                <button class="view-tab ${window.currentDateView === 'grid' ? 'active' : ''}" 
                        onclick="switchDateView('grid', '${dateStr}', this)">
                    시간대별 뷰
                </button>
            </div>
            <div class="modal-body" id="date-detail-content" style="max-height: 70vh; overflow-y: auto;">
                ${window.currentDateView === 'list' ? renderAppointmentList(appointments) : renderTimeGrid(appointments, dateStr)}
            </div>
        </div>
    `;
    
    openModal(`${date.format('M월 D일')} 일정`, modalHtml);
    lucide.createIcons();
}

// 뷰 전환 함수
function switchDateView(view, dateStr, buttonElement) {
    window.currentDateView = view;
    const dateData = monthlyData[dateStr];
    if (!dateData || !dateData.appointments) {
        return;
    }
    
    const appointments = dateData.appointments.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
    });
    
    const content = document.getElementById('date-detail-content');
    if (content) {
        content.innerHTML = view === 'list' 
            ? renderAppointmentList(appointments) 
            : renderTimeGrid(appointments, dateStr);
        lucide.createIcons();
    }
    
    // 탭 활성화 상태 업데이트
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
}

// 시간대별 그리드 렌더링
function renderTimeGrid(appointments, dateStr) {
    if (!appointments || appointments.length === 0) {
        return `
            <div class="empty-state">
                <i data-lucide="calendar-x" size="48"></i>
                <p>이 날짜에는 일정이 없습니다.</p>
            </div>
        `;
    }
    
    // 시간대별로 예약 그룹화
    const timeSlots = {};
    appointments.forEach(apt => {
        const time = apt.start_time; // "14:00"
        if (!timeSlots[time]) {
            timeSlots[time] = [];
        }
        timeSlots[time].push(apt);
    });
    
    let html = '<div class="schedule-grid-modal">';
    
    // 헤더
    html += '<div class="grid-header">';
    html += '<div class="grid-cell time-header">시간</div>';
    html += '<div class="grid-cell tutor-header">예약 정보</div>';
    html += '</div>';
    
    // 시간대별 행 생성 (09:00 - 18:00, 30분 단위)
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of [0, 30]) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const slotAppointments = timeSlots[time] || [];
            
            html += '<div class="grid-row">';
            html += `<div class="grid-cell time-cell">${time}</div>`;
            html += renderTimeSlotCell(time, slotAppointments);
            html += '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

// 시간 슬롯 셀 렌더링
function renderTimeSlotCell(time, appointments) {
    if (appointments.length === 0) {
        return `<div class="grid-cell slot unavailable"></div>`;
    }
    
    // 첫 번째 예약만 표시 (여러 개인 경우 +N 표시)
    const firstAppt = appointments[0];
    const statusClass = getStatusClass(firstAppt.status);
    const studentName = firstAppt.student?.name || '알 수 없음';
    const countText = appointments.length > 1 ? ` (+${appointments.length - 1})` : '';
    
    return `
        <div class="grid-cell slot ${statusClass}" 
             onclick="showTimeSlotDetail('${time}', [${appointments.map(a => a.id).join(',')}])" 
             style="cursor: pointer;" 
             title="${appointments.map(a => `${a.start_time} - ${a.student?.name || '알 수 없음'}`).join(', ')}">
            <span class="student-tag ${statusClass}">${studentName}${countText}</span>
        </div>
    `;
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(status) {
    const classes = {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    };
    return classes[status] || 'unavailable';
}

// 특정 시간대의 예약 찾기
function findAppointmentByTime(appointments, time) {
    return appointments.filter(apt => apt.start_time === time);
}

// 시간 슬롯 클릭 시 상세 정보 표시
async function showTimeSlotDetail(time, appointmentIds) {
    if (!appointmentIds || appointmentIds.length === 0) {
        return;
    }
    
    // 첫 번째 예약의 상세 정보 표시
    await showAppointmentDetail(appointmentIds[0]);
}

// 예약 목록 렌더링
function renderAppointmentList(appointments) {
    if (!appointments || appointments.length === 0) {
        return `
            <div class="empty-state">
                <i data-lucide="calendar-x" size="48"></i>
                <p>이 날짜에는 일정이 없습니다.</p>
            </div>
        `;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    
    appointments.forEach(apt => {
        html += `
            <div class="appointment-card" onclick="showAppointmentDetail(${apt.id})" style="cursor: pointer;">
                <div class="appointment-header">
                    <div class="time-info">
                        <i data-lucide="clock"></i>
                        ${apt.start_time}
                        ${apt.duration_minutes ? `(${apt.duration_minutes}분)` : ''}
                    </div>
                    <span class="badge badge-${getStatusBadge(apt.status)}">
                        ${getStatusText(apt.status)}
                    </span>
                </div>
                
                <div class="appointment-body">
                    <div class="info-row">
                        <i data-lucide="user"></i>
                        <strong>${apt.student?.name || '알 수 없음'}</strong>
                    </div>
                    ${apt.mentor ? `
                    <div class="info-row">
                        <i data-lucide="user-check"></i>
                        ${apt.mentor.name || '알 수 없음'} ${apt.mentor.phone ? `(${apt.mentor.phone})` : ''}
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <i data-lucide="book"></i>
                        ${apt.subjects || '과목 정보 없음'}
                    </div>
                    ${apt.description ? `
                    <div class="info-row description">
                        <i data-lucide="file-text"></i>
                        ${apt.description}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function getStatusBadge(status) {
    const badges = {
        PENDING: 'warning',
        CONFIRMED: 'success',
        COMPLETED: 'success',
        CANCELLED: 'danger'
    };
    return badges[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        PENDING: '대기중',
        CONFIRMED: '확정됨',
        COMPLETED: '완료됨',
        CANCELLED: '취소됨'
    };
    return texts[status] || status;
}

async function showAppointmentDetail(appointmentId) {
    try {
        const result = await apiGet(`/api/tutor/appointments/${appointmentId}`);
        
        if (!result || !result.success) {
            showAlert('예약 정보를 불러오는데 실패했습니다.', 'error');
            return;
        }
        
        const apt = result.data;
        
        const detailHtml = `
            <div class="appointment-body">
                <div class="info-row">
                    <i data-lucide="user"></i>
                    <strong>학생:</strong> ${apt.student?.name || '알 수 없음'}
                </div>
                <div class="info-row">
                    <i data-lucide="user-check"></i>
                    <strong>멘토:</strong> ${apt.mentor?.name || '알 수 없음'} (${apt.mentor?.phone || ''})
                </div>
                <div class="info-row">
                    <i data-lucide="calendar"></i>
                    <strong>날짜:</strong> ${formatDate(apt.date)}
                </div>
                <div class="info-row">
                    <i data-lucide="clock"></i>
                    <strong>시간:</strong> ${apt.start_time} (${apt.duration_minutes}분)
                </div>
                <div class="info-row">
                    <i data-lucide="book"></i>
                    <strong>과목:</strong> ${apt.subjects || '과목 정보 없음'}
                </div>
                ${apt.description ? `
                <div class="info-row description">
                    <i data-lucide="file-text"></i>
                    ${apt.description}
                </div>
                ` : ''}
                <div class="info-row">
                    <i data-lucide="tag"></i>
                    <strong>상태:</strong> 
                    <span class="badge badge-${getStatusBadge(apt.status)}">
                        ${getStatusText(apt.status)}
                    </span>
                </div>
            </div>
            
            ${apt.status === 'PENDING' ? `
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeModal()">
                    닫기
                </button>
                <button class="btn btn-danger" onclick="rejectAppointmentFromDetail(${apt.id})">
                    <i data-lucide="x"></i>
                    거부하기
                </button>
                <button class="btn btn-success" onclick="approveAppointmentFromDetail(${apt.id})">
                    <i data-lucide="check"></i>
                    승인하기
                </button>
            </div>
            ` : apt.status === 'CONFIRMED' ? `
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeModal()">
                    닫기
                </button>
                <button class="btn btn-success" onclick="completeAppointment(${apt.id})">
                    <i data-lucide="check-circle"></i>
                    완료 처리
                </button>
            </div>
            ` : `
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeModal()">
                    닫기
                </button>
            </div>
            `}
        `;
        
        openModal('예약 상세', detailHtml);
        
    } catch (error) {
        // Error already handled
    }
}

async function approveAppointmentFromDetail(appointmentId) {
    if (!confirmAction('이 신청을 승인하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiPost(`/api/tutor/appointments/${appointmentId}/approve`, {});
        
        if (result && result.success) {
            showAlert('신청이 승인되었습니다.', 'success');
            closeModal();
            loadMonthlySchedule();
        }
    } catch (error) {
        // Error already handled
    }
}

function rejectAppointmentFromDetail(appointmentId) {
    const formHtml = `
        <form id="reject-form" onsubmit="submitRejectFromDetail(event, ${appointmentId})">
            <div class="form-group">
                <label>거부 사유 <span class="required">*</span></label>
                <textarea name="reason" rows="4" required
                          placeholder="거부 사유를 입력해주세요"></textarea>
                <small class="text-muted">멘토가 이 사유를 확인할 수 있습니다.</small>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-danger">
                    거부하기
                </button>
            </div>
        </form>
    `;
    
    openModal('신청 거부', formHtml);
}

async function submitRejectFromDetail(event, appointmentId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const reason = formData.get('reason');
    
    try {
        const result = await apiPost(`/api/tutor/appointments/${appointmentId}/reject`, {
            reason: reason
        });
        
        if (result && result.success) {
            showAlert('신청이 거부되었습니다.', 'success');
            closeModal();
            loadMonthlySchedule();
        }
    } catch (error) {
        // Error already handled
    }
}

async function completeAppointment(appointmentId) {
    if (!confirmAction('이 예약을 완료 처리하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiPost(`/api/tutor/appointments/${appointmentId}/complete`, {});
        
        if (result && result.success) {
            showAlert('완료 처리되었습니다.', 'success');
            closeModal();
            loadMonthlySchedule();
        }
    } catch (error) {
        // Error already handled
    }
}
