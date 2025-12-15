/**
 * Tutor Settings Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    loadTemplateSettings();
    loadScheduleSettings();
    loadSubjectSettings();
    loadSlotGenerationStatus();
});

// ===== 템플릿 관리 =====

async function loadTemplateSettings() {
    try {
        const result = await apiGet('/api/tutor/schedule-templates');
        
        if (result && result.success) {
            renderTemplateSettings(result.data);
        }
    } catch (error) {
        document.getElementById('template-settings').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>템플릿을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderTemplateSettings(templates) {
    const container = document.getElementById('template-settings');
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clock" size="48"></i>
                <p>저장된 템플릿이 없습니다.</p>
                <button class="btn btn-primary mt-4" onclick="showCreateTemplateModal()">
                    <i data-lucide="plus"></i>
                    템플릿 추가
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
    
    const html = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem;">
            ${templates.map(template => {
                const dayNames = (template.day_of_week || []).map(d => daysOfWeek[d]).join(', ');
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                        <div>
                            <strong>${template.name}</strong>
                            <span style="margin-left: 1rem; color: var(--gray-600);">
                                ${dayNames} | ${template.start_time} ~ ${template.end_time}
                            </span>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-sm btn-primary" onclick="applyTemplate(${template.id})">
                                <i data-lucide="play"></i>
                                적용
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${template.id})">
                                <i data-lucide="trash-2"></i>
                                삭제
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

function showCreateTemplateModal() {
    const formHtml = `
        <form id="template-form" onsubmit="createTemplate(event)">
            <div class="form-group">
                <label>템플릿 이름 <span class="required">*</span></label>
                <input type="text" name="name" placeholder="예: 평일 오전 근무" required>
            </div>
            
            <div class="form-group">
                <label>요일 선택 <span class="required">*</span></label>
                <div class="checkbox-group" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                    <label><input type="checkbox" name="day_of_week" value="0">월요일</label>
                    <label><input type="checkbox" name="day_of_week" value="1">화요일</label>
                    <label><input type="checkbox" name="day_of_week" value="2">수요일</label>
                    <label><input type="checkbox" name="day_of_week" value="3">목요일</label>
                    <label><input type="checkbox" name="day_of_week" value="4">금요일</label>
                    <label><input type="checkbox" name="day_of_week" value="5">토요일</label>
                    <label><input type="checkbox" name="day_of_week" value="6">일요일</label>
                </div>
            </div>
            
            <div class="form-group">
                <label>근무 시간 <span class="required">*</span></label>
                <input type="text" 
                       id="template-time-range-input" 
                       name="time_range" 
                       placeholder="09001300 (09:00-13:00 형식으로 자동 포맷팅)"
                       maxlength="11"
                       required>
                <small style="color: var(--gray-600); margin-top: 0.25rem; display: block;">
                    숫자만 입력하세요. 예: 09001300 → 09:00-13:00
                </small>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    저장
                </button>
            </div>
        </form>
    `;
    
    openModal('템플릿 추가', formHtml);
    
    // 시간 입력 필드에 포맷팅 이벤트 리스너 추가
    setTimeout(() => {
        const timeInput = document.getElementById('template-time-range-input');
        if (timeInput) {
            // 백스페이스 감지를 위한 keydown 이벤트
            timeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    const cursorPos = e.target.selectionStart;
                    const value = e.target.value;
                    
                    // 특수기호 위치에 커서가 있으면 숫자만 삭제하도록 처리
                    if (cursorPos > 0 && (value[cursorPos - 1] === ':' || value[cursorPos - 1] === '-')) {
                        e.preventDefault();
                        // 특수기호 앞의 숫자 삭제
                        const beforeCursor = value.substring(0, cursorPos - 1);
                        const afterCursor = value.substring(cursorPos);
                        e.target.value = beforeCursor + afterCursor;
                        // 포맷팅 재적용
                        formatTimeInput(e.target);
                        // 커서 위치 조정 (숫자 삭제 후 위치)
                        const newPos = Math.max(0, cursorPos - 1);
                        e.target.setSelectionRange(newPos, newPos);
                    }
                }
            });
            
            // 입력 이벤트 - 항상 포맷팅 적용
            timeInput.addEventListener('input', (e) => {
                formatTimeInput(e.target);
            });
        }
    }, 100);
}

async function createTemplate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const timeRange = formData.get('time_range');
    const dayOfWeekCheckboxes = formData.getAll('day_of_week');
    
    if (dayOfWeekCheckboxes.length === 0) {
        showAlert('최소 1개 이상의 요일을 선택해주세요.', 'error');
        return;
    }
    
    // 시간 범위 파싱
    const timeMatch = timeRange.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!timeMatch) {
        showAlert('시간 형식이 올바르지 않습니다. 예: 09001300 또는 09:00-13:00', 'error');
        return;
    }
    
    const startTime = `${timeMatch[1]}:${timeMatch[2]}`;
    const endTime = `${timeMatch[3]}:${timeMatch[4]}`;
    
    const data = {
        name: formData.get('name'),
        day_of_week: dayOfWeekCheckboxes.map(d => parseInt(d)),
        start_time: startTime,
        end_time: endTime
    };
    
    try {
        const result = await apiPost('/api/tutor/schedule-templates', data);
        
        if (result && result.success) {
            showAlert('템플릿이 생성되었습니다.', 'success');
            closeModal();
            loadTemplateSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

async function applyTemplate(templateId) {
    if (!confirmAction('이 템플릿을 적용하시겠습니까? 기존 근무시간과 중복되는 경우 건너뜁니다.')) {
        return;
    }
    
    try {
        const result = await apiPost(`/api/tutor/schedule-templates/${templateId}/apply`);
        
        if (result && result.success) {
            showAlert(result.message, 'success');
            loadScheduleSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

async function deleteTemplate(templateId) {
    if (!confirmAction('이 템플릿을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiDelete(`/api/tutor/schedule-templates/${templateId}`);
        
        if (result && result.success) {
            showAlert('템플릿이 삭제되었습니다.', 'success');
            loadTemplateSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

// ===== 근무시간 관리 =====

async function loadScheduleSettings() {
    try {
        const result = await apiGet('/api/tutor/schedules');
        
        if (result && result.success) {
            renderScheduleSettings(result.data);
        }
    } catch (error) {
        document.getElementById('schedule-settings').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>근무 시간을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderScheduleSettings(schedules) {
    const container = document.getElementById('schedule-settings');
    
    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clock" size="48"></i>
                <p>설정된 근무 시간이 없습니다.</p>
                <button class="btn btn-primary mt-4" onclick="showAddScheduleModal()">
                    <i data-lucide="plus"></i>
                    근무 시간 추가
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const daysOfWeek = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
    
    const html = `
        <div style="padding: 1rem;">
            <div style="background: var(--info-bg, #e3f2fd); border-left: 4px solid var(--info-color, #2196f3); padding: 1rem; margin-bottom: 1rem; border-radius: var(--border-radius);">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i data-lucide="info" style="color: var(--info-color, #2196f3); flex-shrink: 0; margin-top: 0.25rem;"></i>
                    <div style="flex: 1;">
                        <strong style="display: block; margin-bottom: 0.5rem;">보충지도 슬롯 생성 필요</strong>
                        <p style="margin: 0; color: var(--gray-700); font-size: 0.875rem;">
                            근무 시간만 설정하면 멘토 달력에 표시되지 않습니다. 
                            멘토가 보충지도를 신청할 수 있도록 보충지도 슬롯을 생성해주세요.
                        </p>
                        <button class="btn btn-primary btn-sm mt-3" onclick="showGenerateSlotsModal()">
                            <i data-lucide="calendar-plus"></i>
                            보충지도 슬롯 생성
                        </button>
                    </div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${schedules.map(schedule => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                        <div>
                            <strong>${daysOfWeek[schedule.day_of_week]}</strong>
                            <span style="margin-left: 1rem; color: var(--gray-600);">
                                ${schedule.start_time} ~ ${schedule.end_time}
                            </span>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${schedule.id})">
                            <i data-lucide="trash-2"></i>
                            삭제
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

/**
 * 시간 입력 자동 포맷팅 함수
 * 예: "09001300" → "09:00-13:00"
 * 숫자 입력 시에만 특수기호 추가, 백스페이스 시 특수기호는 건드리지 않음
 */
function formatTimeInput(input) {
    // 숫자만 추출
    const numbers = input.value.replace(/[^0-9]/g, '');
    
    // 숫자 길이에 따라 포맷팅 적용
    let formatted = '';
    
    if (numbers.length === 0) {
        formatted = '';
    } else if (numbers.length <= 2) {
        // "09" → "09"
        formatted = numbers;
    } else if (numbers.length === 3) {
        // "090" → "09:0"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2);
    } else if (numbers.length <= 4) {
        // "0900" → "09:00"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2);
    } else if (numbers.length === 5) {
        // "09001" → "09:00-1"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2, 4) + '-' + numbers.substring(4);
    } else if (numbers.length <= 6) {
        // "090013" → "09:00-13"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2, 4) + '-' + numbers.substring(4);
    } else if (numbers.length === 7) {
        // "0900130" → "09:00-13:0"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2, 4) + '-' + 
                   numbers.substring(4, 6) + ':' + numbers.substring(6);
    } else {
        // "09001300" → "09:00-13:00"
        formatted = numbers.substring(0, 2) + ':' + numbers.substring(2, 4) + '-' + 
                   numbers.substring(4, 6) + ':' + numbers.substring(6, 8);
    }
    
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;
    const newLength = formatted.length;
    const lengthDiff = newLength - oldLength;
    
    input.value = formatted;
    
    // 커서 위치 조정 (숫자 입력 시에만 앞으로 이동)
    if (lengthDiff > 0) {
        // 특수기호가 추가된 경우 커서 위치 조정
        const newCursorPosition = Math.min(cursorPosition + lengthDiff, formatted.length);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
    } else {
        // 백스페이스 시 커서 위치 유지
        const newCursorPosition = Math.min(cursorPosition, formatted.length);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
    }
}

function showAddScheduleModal() {
    const formHtml = `
        <form id="schedule-form" onsubmit="addSchedule(event)">
            <div class="form-group">
                <label>요일 <span class="required">*</span></label>
                <select name="day_of_week" required>
                    <option value="">선택해주세요</option>
                    <option value="0">월요일</option>
                    <option value="1">화요일</option>
                    <option value="2">수요일</option>
                    <option value="3">목요일</option>
                    <option value="4">금요일</option>
                    <option value="5">토요일</option>
                    <option value="6">일요일</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>근무 시간 <span class="required">*</span></label>
                <input type="text" 
                       id="time-range-input" 
                       name="time_range" 
                       placeholder="09001300 (09:00-13:00 형식으로 자동 포맷팅)"
                       maxlength="11"
                       required>
                <small style="color: var(--gray-600); margin-top: 0.25rem; display: block;">
                    숫자만 입력하세요. 예: 09001300 → 09:00-13:00
                </small>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    추가
                </button>
            </div>
        </form>
    `;
    
    openModal('근무 시간 추가', formHtml);
    
    // 시간 입력 필드에 포맷팅 이벤트 리스너 추가
    setTimeout(() => {
        const timeInput = document.getElementById('time-range-input');
        if (timeInput) {
            // 백스페이스 감지를 위한 keydown 이벤트
            timeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    const cursorPos = e.target.selectionStart;
                    const value = e.target.value;
                    
                    // 특수기호 위치에 커서가 있으면 숫자만 삭제하도록 처리
                    if (cursorPos > 0 && (value[cursorPos - 1] === ':' || value[cursorPos - 1] === '-')) {
                        e.preventDefault();
                        // 특수기호 앞의 숫자 삭제
                        const beforeCursor = value.substring(0, cursorPos - 1);
                        const afterCursor = value.substring(cursorPos);
                        e.target.value = beforeCursor + afterCursor;
                        // 포맷팅 재적용
                        formatTimeInput(e.target);
                        // 커서 위치 조정 (숫자 삭제 후 위치)
                        const newPos = Math.max(0, cursorPos - 1);
                        e.target.setSelectionRange(newPos, newPos);
                    }
                }
            });
            
            // 입력 이벤트 - 항상 포맷팅 적용
            timeInput.addEventListener('input', (e) => {
                formatTimeInput(e.target);
            });
        }
    }, 100);
}

async function addSchedule(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const timeRange = formData.get('time_range');
    
    // 시간 범위 파싱 (예: "09:00-13:00" → start_time: "09:00", end_time: "13:00")
    const timeMatch = timeRange.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!timeMatch) {
        showAlert('시간 형식이 올바르지 않습니다. 예: 09001300 또는 09:00-13:00', 'error');
        return;
    }
    
    const startTime = `${timeMatch[1]}:${timeMatch[2]}`;
    const endTime = `${timeMatch[3]}:${timeMatch[4]}`;
    
    const data = {
        day_of_week: parseInt(formData.get('day_of_week')),
        start_time: startTime,
        end_time: endTime
    };
    
    try {
        const result = await apiPost('/api/tutor/schedules', data);
        
        if (result && result.success) {
            showAlert('근무 시간이 추가되었습니다. 멘토 달력에 표시되려면 보충지도 슬롯을 생성해주세요.', 'success');
            closeModal();
            loadScheduleSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

async function deleteSchedule(scheduleId) {
    if (!confirmAction('이 근무 시간을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiDelete(`/api/tutor/schedules/${scheduleId}`);
        
        if (result && result.success) {
            showAlert('근무 시간이 삭제되었습니다.', 'success');
            loadScheduleSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

function showGenerateSlotsModal() {
    const today = dayjs();
    const nextWeek = today.add(1, 'week');
    const defaultStartDate = today.format('YYYY-MM-DD');
    const defaultEndDate = nextWeek.add(3, 'weeks').format('YYYY-MM-DD');
    
    const formHtml = `
        <form id="generate-slots-form" onsubmit="generateSlots(event)">
            <div style="background: var(--info-bg, #e3f2fd); border-left: 4px solid var(--info-color, #2196f3); padding: 1rem; margin-bottom: 1rem; border-radius: var(--border-radius);">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i data-lucide="info" style="color: var(--info-color, #2196f3); flex-shrink: 0; margin-top: 0.25rem;"></i>
                    <div style="flex: 1;">
                        <p style="margin: 0; color: var(--gray-700); font-size: 0.875rem;">
                            설정된 근무 시간을 기반으로 보충지도 슬롯을 생성합니다. 
                            각 근무 시간대를 1시간 단위로 슬롯이 생성됩니다.
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>시작일 <span class="required">*</span></label>
                <input type="date" name="start_date" value="${defaultStartDate}" required>
            </div>
            
            <div class="form-group">
                <label>종료일 <span class="required">*</span></label>
                <input type="date" name="end_date" value="${defaultEndDate}" required>
                <small style="color: var(--gray-600); margin-top: 0.25rem; display: block;">
                    선택한 기간 내의 근무 시간에 해당하는 날짜에만 슬롯이 생성됩니다.
                </small>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    <i data-lucide="calendar-plus"></i>
                    슬롯 생성
                </button>
            </div>
        </form>
    `;
    
    openModal('보충지도 슬롯 생성', formHtml);
    lucide.createIcons();
}

async function generateSlots(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date');
    
    if (!startDate || !endDate) {
        showAlert('시작일과 종료일을 입력해주세요.', 'error');
        return;
    }
    
    if (startDate > endDate) {
        showAlert('시작일은 종료일보다 빠르거나 같아야 합니다.', 'error');
        return;
    }
    
    try {
        const result = await apiPost('/api/tutor/slots/generate', {
            start_date: startDate,
            end_date: endDate
        });
        
        if (result && result.success) {
            showAlert(result.message || `${result.data.created_count}개의 슬롯이 생성되었습니다.`, 'success');
            closeModal();
        }
    } catch (error) {
        // Error already handled
    }
}

async function loadSubjectSettings() {
    try {
        const result = await apiGet('/api/tutor/subjects');
        
        if (result && result.success) {
            // API 응답 형식: { available: [...], selected: [...] }
            const selectedSubjectNames = result.data.selected || [];
            const availableSubjects = result.data.available || [];
            
            // 선택된 과목 이름 찾기
            const selectedNames = [];
            availableSubjects.forEach(group => {
                group.subjects.forEach(subject => {
                    if (selectedSubjectNames.includes(subject.id)) {
                        selectedNames.push(subject.name);
                    }
                });
            });
            
            renderSubjectSettings(selectedNames);
        }
    } catch (error) {
        document.getElementById('subject-settings').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>과목 정보를 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderSubjectSettings(subjects) {
    const container = document.getElementById('subject-settings');
    
    if (!subjects || subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book" size="48"></i>
                <p>담당 과목이 설정되지 않았습니다.</p>
                <button class="btn btn-primary mt-4" onclick="showEditSubjectsModal()">
                    <i data-lucide="edit"></i>
                    과목 설정
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = `
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 1rem;">
            ${subjects.map(subject => `
                <span class="badge badge-success" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
                    ${subject}
                </span>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

async function showEditSubjectsModal() {
    try {
        const result = await apiGet('/api/tutor/subjects');
        
        if (!result || !result.success) {
            showAlert('과목 목록을 불러오는데 실패했습니다.', 'error');
            return;
        }
        
        const availableSubjects = result.data.available || [];
        const selectedSubjectIds = result.data.selected || [];
        
        // 카테고리별로 그룹화된 체크박스 생성
        let formHtml = `
            <form id="subjects-form" onsubmit="updateSubjects(event)">
                <div class="form-group">
                    <label>담당 가능 과목 <span class="required">*</span></label>
                    <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto;">
        `;
        
        availableSubjects.forEach(group => {
            const category = group.category;
            const subjects = group.subjects;
            
            formHtml += `
                <div style="border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 0.75rem;">
                    <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--primary-color);">
                        ${category.name} ${category.description ? `- ${category.description}` : ''}
                    </div>
                    <div class="checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;">
                        ${subjects.map(subject => `
                            <label>
                                <input type="checkbox" name="subjects" value="${subject.id}" ${selectedSubjectIds.includes(subject.id) ? 'checked' : ''}>
                                ${subject.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        formHtml += `
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        취소
                    </button>
                    <button type="submit" class="btn btn-primary">
                        저장
                    </button>
                </div>
            </form>
        `;
        
        openModal('담당 과목 설정', formHtml);
    } catch (error) {
        showAlert('과목 목록을 불러오는데 실패했습니다.', 'error');
    }
}

async function updateSubjects(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const subjectIds = formData.getAll('subjects').map(id => parseInt(id));

    if (subjectIds.length === 0) {
        showAlert('최소 1개 이상의 과목을 선택해주세요.', 'error');
        return;
    }

    try {
        const result = await apiPut('/api/tutor/subjects', { subjects: subjectIds });

        if (result && result.success) {
            showAlert('과목이 저장되었습니다.', 'success');
            closeModal();
            loadSubjectSettings();
        }
    } catch (error) {
        // Error already handled
    }
}

// ===== 슬롯 생성 관리 =====

async function loadSlotGenerationStatus() {
    try {
        // 최근 슬롯 생성 상태를 확인하기 위해 슬롯 목록을 조회
        const today = dayjs().format('YYYY-MM-DD');
        const nextWeek = dayjs().add(7, 'days').format('YYYY-MM-DD');

        const result = await apiGet(`/api/tutor/slots?start_date=${today}&end_date=${nextWeek}`);

        if (result && result.success) {
            renderSlotGenerationStatus(result.data);
        }
    } catch (error) {
        document.getElementById('slot-generation').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>슬롯 상태를 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderSlotGenerationStatus(slots) {
    const container = document.getElementById('slot-generation');

    if (!slots || slots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar" size="48"></i>
                <p>생성된 슬롯이 없습니다.</p>
                <small style="color: var(--gray-600); margin-top: 0.5rem; display: block;">
                    근무 시간을 설정한 후 슬롯을 생성하세요.
                </small>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // 상태별로 그룹화
    const statusGroups = {
        AVAILABLE: { label: '예약 가능', count: 0, color: 'success' },
        RESERVED: { label: '예약됨', count: 0, color: 'warning' }
    };

    slots.forEach(slot => {
        if (statusGroups[slot.status]) {
            statusGroups[slot.status].count++;
        }
    });

    const html = `
        <div style="padding: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                ${Object.entries(statusGroups).map(([status, info]) => `
                    <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--${info.color}-color);">
                            ${info.count}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">
                            ${info.label}
                        </div>
                    </div>
                `).join('')}
            </div>
            <small style="color: var(--gray-600); display: block;">
                최근 1주일 간의 슬롯 상태입니다.
            </small>
        </div>
    `;

    container.innerHTML = html;
}

function showGenerateSlotsModal() {
    const formHtml = `
        <form id="generate-slots-form" onsubmit="generateSlots(event)">
            <div class="form-group">
                <label>슬롯 생성 기간 <span class="required">*</span></label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="font-size: 0.875rem; color: var(--gray-600);">시작일</label>
                        <input type="date" name="start_date" required>
                    </div>
                    <div>
                        <label style="font-size: 0.875rem; color: var(--gray-600);">종료일</label>
                        <input type="date" name="end_date" required>
                    </div>
                </div>
                <small style="color: var(--gray-600); margin-top: 0.25rem; display: block;">
                    설정된 근무 시간에 따라 1시간 단위 슬롯이 자동 생성됩니다.
                </small>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    <i data-lucide="calendar-plus"></i>
                    슬롯 생성
                </button>
            </div>
        </form>
    `;

    openModal('슬롯 생성', formHtml);

    // 기본값 설정 (오늘부터 1주일)
    setTimeout(() => {
        const today = dayjs();
        const nextWeek = today.add(6, 'days');

        const startInput = document.querySelector('input[name="start_date"]');
        const endInput = document.querySelector('input[name="end_date"]');

        if (startInput && endInput) {
            startInput.value = today.format('YYYY-MM-DD');
            endInput.value = nextWeek.format('YYYY-MM-DD');
        }
    }, 100);
}

async function generateSlots(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date');

    if (!startDate || !endDate) {
        showAlert('시작일과 종료일을 입력해주세요.', 'error');
        return;
    }

    if (startDate > endDate) {
        showAlert('시작일은 종료일보다 빠르거나 같아야 합니다.', 'error');
        return;
    }

    try {
        const result = await apiPost('/api/tutor/slots/generate', {
            start_date: startDate,
            end_date: endDate
        });

        if (result && result.success) {
            showAlert(result.message, 'success');
            closeModal();
            loadSlotGenerationStatus();
        }
    } catch (error) {
        // Error already handled
    }
}

