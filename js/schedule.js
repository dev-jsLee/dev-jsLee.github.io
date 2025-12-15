/**
 * TAMS - Mentor Schedule Calendar
 * 월 단위 달력으로 보충지도 신청 가능한 날짜를 시각화
 */

let currentMonth = dayjs(); // 현재 표시 중인 월
let monthlyData = {}; // 날짜별 슬롯 데이터 { 'YYYY-MM-DD': { slots: [...] } }
let allStudents = [];
let selectedDate = null; // 모달에서 선택된 날짜

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateMonthDisplay();
    loadMonthlySchedule();
    loadStudents();
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
            `/api/mentor/tutors/availability?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
        );
        
        if (result && result.success) {
            // 날짜별로 데이터 정리
            monthlyData = {};
            if (result.data.dates) {
                result.data.dates.forEach(dateInfo => {
                    monthlyData[dateInfo.date] = dateInfo;
                });
            }
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
        const slots = dateData ? dateData.slots : [];
        
        html += `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" 
                 onclick="${!isPast ? `showDateDetail('${dateKey}')` : ''}">
                <div class="day-number">${currentDate.date()}</div>
                <div class="day-slots">
                    ${renderSlotRows(slots)}
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

// 슬롯 행 렌더링 (조교별로 행 구분, 한 행에 4개씩)
function renderSlotRows(slotGroups) {
    if (!slotGroups || slotGroups.length === 0) {
        return '';
    }
    
    let html = '';
    
    // 각 slotGroup을 하나의 행으로 표시 (조교별)
    slotGroups.forEach((slotGroup, groupIndex) => {
        const times = slotGroup.times || [];
        const status = slotGroup.status || 'available';
        
        // 시간 순서대로 정렬
        const sortedTimes = [...times].sort((a, b) => a.localeCompare(b));
        
        // 한 행에 최대 4개씩 표시
        const dotsPerRow = 4;
        const rows = [];
        
        for (let i = 0; i < sortedTimes.length; i += dotsPerRow) {
            rows.push(sortedTimes.slice(i, i + dotsPerRow));
        }
        
        // 각 행 렌더링
        rows.forEach((row, rowIndex) => {
            const remaining = sortedTimes.length - (rowIndex + 1) * dotsPerRow;
            const isLastRow = rowIndex === rows.length - 1;
            
            html += '<div class="slot-row">';
            
            row.forEach(time => {
                html += `<span class="slot-dot ${status}" title="${time}"></span>`;
            });
            
            // 마지막 행에서 더 많은 슬롯이 있으면 + 표시
            if (isLastRow && remaining > 0) {
                html += `<span class="slot-dot-more" title="+${remaining}개 더">+${remaining}</span>`;
            }
            
            html += '</div>';
        });
    });
    
    return html;
}

// 날짜 클릭 시 상세 정보 모달 표시
async function showDateDetail(dateStr) {
    selectedDate = dayjs(dateStr);
    
    try {
        const result = await apiGet(`/api/mentor/tutors/availability?date=${dateStr}`);
        
        if (result && result.success) {
            renderDateDetailModal(dateStr, result.data.tutors);
        }
    } catch (error) {
        showAlert('일정을 불러오는데 실패했습니다.', 'error');
    }
}

// 날짜별 상세 모달 렌더링
function renderDateDetailModal(dateStr, tutors) {
    const date = dayjs(dateStr);
    
    const modalHtml = `
        <div class="date-detail-modal">
            <div class="modal-header">
                <h3>${date.format('YYYY년 M월 D일 (ddd)')}</h3>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                ${renderScheduleGrid(tutors, dateStr)}
            </div>
        </div>
    `;
    
    openModal(`${date.format('M월 D일')} 일정`, modalHtml);
}

// 타임그리드 렌더링 (모달 내부용)
function renderScheduleGrid(tutors, dateStr) {
    if (!tutors || tutors.length === 0) {
        return `
            <div class="empty-state">
                <i data-lucide="users-x" size="48"></i>
                <p>이 날짜에 근무하는 조교가 없습니다.</p>
            </div>
        `;
    }
    
    // 해당 날짜에 실제로 슬롯이 있는 조교만 필터링
    const tutorsWithSlots = tutors.filter(tutor => {
        return tutor.slots && tutor.slots.length > 0;
    });
    
    if (tutorsWithSlots.length === 0) {
        return `
            <div class="empty-state">
                <i data-lucide="users-x" size="48"></i>
                <p>이 날짜에 배정된 조교가 없습니다.</p>
            </div>
        `;
    }
    
    let html = '<div class="schedule-grid-modal">';
    
    // 헤더 생성
    html += '<div class="grid-header">';
    html += '<div class="grid-cell time-header">시간</div>';
    tutorsWithSlots.forEach(tutor => {
        html += `
            <div class="grid-cell tutor-header">
                <div class="tutor-name">${tutor.name}</div>
                <div class="tutor-subjects">${(tutor.subjects || []).join(', ')}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // 시간대별 행 생성 (09:00 - 18:00, 30분 단위)
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of [0, 30]) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            html += '<div class="grid-row">';
            html += `<div class="grid-cell time-cell">${time}</div>`;
            
            tutorsWithSlots.forEach(tutor => {
                const slot = findTimeSlot(tutor.slots || [], time);
                html += renderTimeSlot(tutor.id, tutor.name, time, slot, dateStr);
            });
            
            html += '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

// 시간 슬롯 찾기
function findTimeSlot(slots, time) {
    return slots.find(slot => slot.start_time === time);
}

// 시간 슬롯 렌더링
function renderTimeSlot(tutorId, tutorName, time, slot, dateStr) {
    if (!slot) {
        return `<div class="grid-cell slot unavailable"></div>`;
    }
    
    let statusClass = 'unavailable';
    let content = '';
    let onclick = '';
    
    if (slot.status === 'AVAILABLE') {
        statusClass = 'available';
        content = '<i data-lucide="plus"></i>';
        onclick = `onclick="showAppointmentModal(${tutorId}, '${tutorName}', '${time}', '${dateStr}')"`;
    } else if (slot.status === 'RESERVED' && slot.appointment) {
        const appt = slot.appointment;
        if (appt.status === 'PENDING') {
            statusClass = appt.is_own ? 'pending-own' : 'pending-other';
            content = `<span class="student-tag">${appt.student_name || '대기중'}</span>`;
        } else if (appt.status === 'CONFIRMED' || appt.status === 'COMPLETED') {
            statusClass = 'confirmed';
            content = `<span class="student-tag confirmed">${appt.student_name || '확정'}</span>`;
        }
    }
    
    return `
        <div class="grid-cell slot ${statusClass}" ${onclick}>
            ${content}
        </div>
    `;
}

// 학생 목록 로드
async function loadStudents() {
    try {
        const result = await apiGet('/api/mentor/students');
        
        if (result && result.success) {
            allStudents = result.data;
        }
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}

// 보충 신청 모달 표시
async function showAppointmentModal(tutorId, tutorName, time, dateStr) {
    if (allStudents.length === 0) {
        showAlert('먼저 학생을 등록해주세요.', 'warning');
        return;
    }
    
    const date = dayjs(dateStr);
    
    const formHtml = `
        <form id="appointment-form" onsubmit="createAppointment(event, ${tutorId}, '${time}', '${dateStr}')">
            <div class="form-group">
                <label>조교</label>
                <input type="text" value="${tutorName}" disabled>
            </div>
            
            <div class="form-group">
                <label>날짜</label>
                <input type="text" value="${date.format('YYYY년 M월 D일 (ddd)')}" disabled>
            </div>
            
            <div class="form-group">
                <label>시작 시간</label>
                <input type="text" id="start-time-display" value="${time}" disabled>
            </div>
            
            <div class="form-group">
                <label>시간 설정 <span class="required">*</span></label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="duration" value="30" onchange="updateTimeDisplay('${time}')"> 
                        30분
                    </label>
                    <label>
                        <input type="radio" name="duration" value="60" checked onchange="updateTimeDisplay('${time}')"> 
                        1시간
                    </label>
                    <label>
                        <input type="radio" name="duration" value="90" onchange="updateTimeDisplay('${time}')"> 
                        1시간 30분
                    </label>
                </div>
                <div id="time-range-display" style="margin-top: 0.5rem; color: var(--primary-color); font-weight: 500;">
                    ${time} - ${calculateEndTime(time, 60)}
                </div>
            </div>
            
            <div class="form-group">
                <label>학생 선택 <span class="required">*</span></label>
                <select name="student_id" required onchange="updateStudentInfo(this)">
                    <option value="">선택해주세요</option>
                    ${allStudents.map(s => `
                        <option value="${s.id}" 
                                data-weekly="${s.weekly_appointments || 0}"
                                ${(s.weekly_appointments || 0) >= 2 ? 'disabled' : ''}>
                            ${s.name} (이번 주 ${s.weekly_appointments || 0}/2)
                        </option>
                    `).join('')}
                </select>
                <div id="student-warning" class="warning" style="display: none;"></div>
            </div>
            
            <div class="form-group">
                <label>과목 선택 <span class="required">*</span></label>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="subjects" value="Python"> Python</label>
                    <label><input type="checkbox" name="subjects" value="Java"> Java</label>
                    <label><input type="checkbox" name="subjects" value="C/C++"> C/C++</label>
                    <label><input type="checkbox" name="subjects" value="JavaScript"> JavaScript</label>
                    <label><input type="checkbox" name="subjects" value="Database"> Database</label>
                    <label><input type="checkbox" name="subjects" value="Algorithm"> Algorithm</label>
                    <label><input type="checkbox" name="subjects" value="Web Development"> Web Development</label>
                </div>
                <input type="text" name="custom_subject" 
                       placeholder="기타 과목 입력" 
                       class="mt-2">
            </div>
            
            <div class="form-group">
                <label>상세 내용</label>
                <textarea name="description" rows="3" 
                          placeholder="보충이 필요한 내용을 자세히 적어주세요"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    신청하기
                </button>
            </div>
        </form>
    `;
    
    openModal('보충 신청', formHtml);
}

// 시간 표시 업데이트
function updateTimeDisplay(startTime) {
    const durationInput = document.querySelector('input[name="duration"]:checked');
    if (!durationInput) return;
    
    const duration = parseInt(durationInput.value);
    const endTime = calculateEndTime(startTime, duration);
    const display = document.getElementById('time-range-display');
    if (display) {
        display.textContent = `${startTime} - ${endTime}`;
    }
}

// 학생 정보 업데이트
function updateStudentInfo(select) {
    const option = select.selectedOptions[0];
    const weekly = parseInt(option?.dataset.weekly || 0);
    const warning = document.getElementById('student-warning');
    
    if (weekly >= 2) {
        warning.textContent = '⚠️ 이 학생은 이번 주에 이미 2회 신청했습니다.';
        warning.style.display = 'block';
    } else if (weekly === 1) {
        warning.textContent = '💡 이 학생은 이번 주에 1회 신청했습니다. (1회 가능)';
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

// 종료 시간 계산
function calculateEndTime(startTime, durationMinutes) {
    const [hour, minute] = startTime.split(':').map(Number);
    const start = dayjs().hour(hour).minute(minute);
    const end = start.add(durationMinutes, 'minute');
    return end.format('HH:mm');
}

// 보충 신청 생성
async function createAppointment(event, tutorId, startTime, dateStr) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // 슬롯 ID 찾기 (필요한 경우)
    // 현재는 tutor_id, date, start_time으로 슬롯을 찾아야 함
    // API에서 slot_id를 받아야 할 수도 있음
    
    // Collect subjects
    const subjects = [];
    formData.getAll('subjects').forEach(s => subjects.push(s));
    const customSubject = formData.get('custom_subject');
    if (customSubject && customSubject.trim()) subjects.push(customSubject.trim());
    
    if (subjects.length === 0) {
        showAlert('과목을 선택해주세요.', 'error');
        return;
    }
    
    // 먼저 해당 날짜의 슬롯 정보를 가져와서 slot_id 찾기
    try {
        const availabilityResult = await apiGet(`/api/mentor/tutors/availability?date=${dateStr}`);
        
        if (!availabilityResult || !availabilityResult.success) {
            showAlert('슬롯 정보를 가져오는데 실패했습니다.', 'error');
            return;
        }
        
        // 해당 조교의 해당 시간 슬롯 찾기
        let slotId = null;
        const tutors = availabilityResult.data.tutors || [];
        for (const tutor of tutors) {
            if (tutor.id === tutorId) {
                const slot = tutor.slots.find(s => s.start_time === startTime && s.status === 'AVAILABLE');
                if (slot) {
                    slotId = slot.id;
                    break;
                }
            }
        }
        
        if (!slotId) {
            showAlert('선택한 시간대가 더 이상 신청 가능하지 않습니다.', 'error');
            closeModal();
            loadMonthlySchedule(); // 달력 새로고침
            return;
        }
        
        const data = {
            student_id: parseInt(formData.get('student_id')),
            slot_id: slotId,
            subjects: subjects.join(', '),
            description: formData.get('description') || null
        };
        
        const result = await apiPost('/api/mentor/appointments', data);
        
        if (result && result.success) {
            showAlert(result.message || '신청이 완료되었습니다.', 'success');
            closeModal();
            loadMonthlySchedule(); // 달력 새로고침
        }
    } catch (error) {
        // Error already handled by apiPost
    }
}
