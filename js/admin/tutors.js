/**
 * Admin Tutors Page JavaScript
 */

document.addEventListener('DOMContentLoaded', loadTutors);

async function loadTutors() {
    try {
        const result = await apiGet('/api/admin/tutors');
        
        if (result && result.success) {
            renderTutors(result.data);
        }
    } catch (error) {
        document.getElementById('tutor-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>조교 목록을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderTutors(tutors) {
    const listContainer = document.getElementById('tutor-list');
    
    if (!tutors || tutors.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users" size="64"></i>
                <p>등록된 조교가 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = tutors.map(tutor => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3>${tutor.name}</h3>
                    <p style="color: var(--gray-600); margin-top: 0.5rem;">
                        <i data-lucide="phone"></i> ${tutor.phone}
                        ${tutor.email ? `<i data-lucide="mail" style="margin-left: 1rem;"></i> ${tutor.email}` : ''}
                    </p>
                    ${tutor.subjects && tutor.subjects.length > 0 ? `
                    <div style="margin-top: 1rem;">
                        <strong>담당 과목:</strong>
                        ${tutor.subjects.map(s => `<span class="badge badge-success">${s}</span>`).join(' ')}
                    </div>
                    ` : ''}
                    ${tutor.schedules && tutor.schedules.length > 0 ? `
                    <div style="margin-top: 1rem;">
                        <strong>근무 시간:</strong> ${tutor.schedules.length}개 설정됨
                    </div>
                    ` : ''}
                </div>
                <div>
                    <a href="/admin/users" class="btn btn-sm btn-secondary">
                        <i data-lucide="settings"></i>
                        계정 관리
                    </a>
                </div>
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = html;
    lucide.createIcons();
}

