// TAMS - Students Management

// Load students list
async function loadStudents() {
    try {
        const result = await apiGet('/api/mentor/students');
        
        if (result && result.success) {
            renderStudentList(result.data);
        }
    } catch (error) {
        document.getElementById('student-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>학생 목록을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// Render student list
function renderStudentList(students) {
    const listContainer = document.getElementById('student-list');
    
    if (!students || students.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users" size="64"></i>
                <p>등록된 학생이 없습니다.</p>
                <button class="btn btn-primary mt-4" onclick="showCreateStudentModal()">
                    <i data-lucide="plus"></i>
                    첫 학생 등록하기
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = `
        <div class="student-grid">
            ${students.map(student => `
                <div class="student-card">
                    <div class="student-header">
                        <h3>${student.name}</h3>
                        <span class="badge ${student.weekly_appointments >= 2 ? 'badge-danger' : 'badge-success'}">
                            이번 주 ${student.weekly_appointments || 0}/2
                        </span>
                    </div>
                    <div class="student-body">
                        <p>
                            <i data-lucide="phone"></i>
                            ${student.phone}
                        </p>
                        ${student.current_courses ? `
                        <p>
                            <i data-lucide="book"></i>
                            ${student.current_courses}
                        </p>
                        ` : ''}
                        ${student.notes ? `
                        <p class="text-muted" style="font-size: 0.875rem;">
                            <i data-lucide="file-text"></i>
                            ${student.notes}
                        </p>
                        ` : ''}
                    </div>
                    <div class="student-footer">
                        <button class="btn btn-sm btn-primary" onclick="showScheduleForStudent(${student.id})">
                            <i data-lucide="calendar-plus"></i>
                            보충 신청
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="showEditModal(${student.id})">
                            <i data-lucide="edit"></i>
                            수정
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    listContainer.innerHTML = html;
    lucide.createIcons();
}

// Show create student modal
function showCreateStudentModal() {
    const formHtml = `
        <form id="student-form" onsubmit="createStudent(event)">
            <div class="form-group">
                <label>이름 <span class="required">*</span></label>
                <input type="text" name="name" required>
            </div>
            
            <div class="form-group">
                <label>전화번호 <span class="required">*</span></label>
                <input type="tel" name="phone" 
                       oninput="formatPhone(this)" 
                       placeholder="010-0000-0000" 
                       required>
            </div>
            
            <div class="form-group">
                <label>수강 과목</label>
                <input type="text" name="current_courses" 
                       placeholder="예: Python기초, 웹개발">
            </div>
            
            <div class="form-group">
                <label>특이사항</label>
                <textarea name="notes" rows="3" 
                          placeholder="학생에 대한 메모나 특이사항을 입력하세요"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    등록하기
                </button>
            </div>
        </form>
    `;
    
    openModal('학생 등록', formHtml);
}

// Create student
async function createStudent(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate phone number
    if (!isValidPhone(data.phone)) {
        showAlert('올바른 전화번호 형식이 아닙니다. (010-0000-0000)', 'error');
        return;
    }
    
    try {
        const result = await apiPost('/api/mentor/students', data);
        
        if (result && result.success) {
            showAlert('학생이 등록되었습니다.', 'success');
            closeModal();
            loadStudents(); // Reload list
        }
    } catch (error) {
        // Error already handled by apiPost
    }
}

// Show edit modal
async function showEditModal(studentId) {
    try {
        const result = await apiGet(`/api/mentor/students/${studentId}`);
        
        if (!result || !result.success) {
            showAlert('학생 정보를 불러오는데 실패했습니다.', 'error');
            return;
        }
        
        const student = result.data;
        
        const formHtml = `
            <form id="student-form" onsubmit="updateStudent(event, ${studentId})">
                <div class="form-group">
                    <label>이름 <span class="required">*</span></label>
                    <input type="text" name="name" value="${student.name}" required>
                </div>
                
                <div class="form-group">
                    <label>전화번호</label>
                    <input type="tel" name="phone" value="${student.phone}" disabled>
                    <small class="text-muted">전화번호는 수정할 수 없습니다.</small>
                </div>
                
                <div class="form-group">
                    <label>수강 과목</label>
                    <input type="text" name="current_courses" 
                           value="${student.current_courses || ''}">
                </div>
                
                <div class="form-group">
                    <label>특이사항</label>
                    <textarea name="notes" rows="3">${student.notes || ''}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-danger" 
                            onclick="deleteStudent(${studentId})">
                        <i data-lucide="trash-2"></i>
                        삭제
                    </button>
                    <div style="display: flex; gap: var(--spacing-3);">
                        <button type="button" class="btn btn-secondary" 
                                onclick="closeModal()">
                            취소
                        </button>
                        <button type="submit" class="btn btn-primary">
                            저장
                        </button>
                    </div>
                </div>
            </form>
        `;
        
        openModal('학생 정보 수정', formHtml);
        
    } catch (error) {
        // Error already handled by apiGet
    }
}

// Update student
async function updateStudent(event, studentId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const result = await apiPut(`/api/mentor/students/${studentId}`, data);
        
        if (result && result.success) {
            showAlert('학생 정보가 수정되었습니다.', 'success');
            closeModal();
            loadStudents();
        }
    } catch (error) {
        // Error already handled by apiPut
    }
}

// Delete student
async function deleteStudent(studentId) {
    if (!confirmAction('정말 삭제하시겠습니까?\n관련된 예약 정보도 함께 삭제됩니다.')) {
        return;
    }
    
    try {
        const result = await apiDelete(`/api/mentor/students/${studentId}`);
        
        if (result && result.success) {
            showAlert('학생이 삭제되었습니다.', 'success');
            closeModal();
            loadStudents();
        }
    } catch (error) {
        // Error already handled by apiDelete
    }
}

// Show schedule for student (redirect to schedule page)
function showScheduleForStudent(studentId) {
    window.location.href = `/mentor/schedule?student_id=${studentId}`;
}

// 전화번호 포맷팅 함수
function formatPhone(input) {
    let numbers = input.value.replace(/[^0-9]/g, '');
    if (numbers.length > 11) {
        numbers = numbers.substring(0, 11);
    }
    let formatted = '';
    if (numbers.length <= 3) {
        formatted = numbers;
    } else if (numbers.length <= 7) {
        formatted = numbers.substring(0, 3) + '-' + numbers.substring(3);
    } else {
        formatted = numbers.substring(0, 3) + '-' + numbers.substring(3, 7) + '-' + numbers.substring(7);
    }
    input.value = formatted;
}

// 전화번호 유효성 검사
function isValidPhone(phone) {
    const normalized = phone.replace(/[^0-9]/g, '');
    return normalized.length >= 10 && normalized.length <= 11;
}

