/**
 * Admin Schedules Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    document.getElementById('start-date').value = today.toISOString().split('T')[0];
    document.getElementById('end-date').value = nextWeek.toISOString().split('T')[0];
    
    loadTutors();
});

async function loadTutors() {
    try {
        const result = await apiGet('/api/admin/tutors');
        
        if (result && result.success) {
            const tutorSelect = document.getElementById('tutor-filter');
            tutorSelect.innerHTML = '<option value="">전체 조교</option>';
            
            result.data.forEach(tutor => {
                const option = document.createElement('option');
                option.value = tutor.id;
                option.textContent = tutor.name;
                tutorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('조교 목록 로드 실패:', error);
    }
}

async function loadSchedules() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const tutorId = document.getElementById('tutor-filter').value;
    
    if (!startDate || !endDate) {
        showAlert('시작일과 종료일을 입력해주세요.', 'error');
        return;
    }
    
    try {
        let url = `/api/admin/schedules?start_date=${startDate}&end_date=${endDate}`;
        if (tutorId) {
            url += `&tutor_id=${tutorId}`;
        }
        
        const result = await apiGet(url);
        
        if (result && result.success) {
            renderSchedules(result.data);
        }
    } catch (error) {
        document.getElementById('schedule-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>일정을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderSchedules(schedulesData) {
    const container = document.getElementById('schedule-list');
    
    if (schedulesData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar" size="48"></i>
                <p>조회 기간 내 일정이 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 1.5rem;">';
    
    schedulesData.forEach(tutorSchedule => {
        const tutorName = tutorSchedule.tutor_name;
        const appointments = tutorSchedule.appointments;
        
        html += `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${tutorName} (${appointments.length}건)</h3>
                </div>
                <div style="padding: 1rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${appointments.map(appt => {
                            const statusBadge = appt.status === 'COMPLETED' 
                                ? '<span class="badge badge-success">완료</span>'
                                : '<span class="badge badge-primary">확정</span>';
                            
                            const subjects = Array.isArray(appt.subjects) 
                                ? appt.subjects.join(', ') 
                                : appt.subjects || '';
                            
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: start; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <strong>${appt.date} ${appt.start_time}</strong>
                                            ${statusBadge}
                                        </div>
                                        <div style="color: var(--gray-600); margin-bottom: 0.25rem;">
                                            학생: ${appt.student_name}
                                        </div>
                                        ${subjects ? `<div style="color: var(--gray-600); margin-bottom: 0.25rem;">과목: ${subjects}</div>` : ''}
                                        ${appt.description ? `<div style="color: var(--gray-600); font-size: 0.875rem;">${appt.description}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    lucide.createIcons();
}

