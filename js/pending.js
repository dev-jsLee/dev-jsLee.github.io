// TAMS - Pending Appointments

document.addEventListener('DOMContentLoaded', () => {
    loadPendingAppointments();
});

async function loadPendingAppointments() {
    try {
        const result = await apiGet('/api/tutor/appointments/pending');
        
        if (result && result.success) {
            renderPendingList(result.data);
            updateBadge(result.data.length);
        }
    } catch (error) {
        document.getElementById('pending-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>승인 대기 목록을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function updateBadge(count) {
    document.getElementById('pending-badge').textContent = `${count}건`;
}

function renderPendingList(appointments) {
    const listContainer = document.getElementById('pending-list');
    
    if (appointments.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle" size="64"></i>
                <p>승인 대기 중인 신청이 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = appointments.map(apt => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div class="time-info">
                    <i data-lucide="clock"></i>
                    ${formatDate(apt.date)} ${apt.start_time}
                    ${apt.duration_minutes ? `(${apt.duration_minutes}분)` : ''}
                </div>
                <span class="badge badge-warning">대기중</span>
            </div>
            
            <div class="appointment-body">
                <div class="info-row">
                    <i data-lucide="user"></i>
                    <strong>${apt.student?.name || '알 수 없음'}</strong>
                    (${apt.mentor?.name || '알 수 없음'} - ${apt.mentor?.phone || ''})
                </div>
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
                <div class="info-row created">
                    <i data-lucide="calendar"></i>
                    신청: ${formatDateTime(apt.created_at)}
                </div>
            </div>
            
            <div class="appointment-footer">
                <button class="btn btn-danger" 
                        onclick="rejectAppointment(${apt.id})">
                    <i data-lucide="x"></i>
                    거부
                </button>
                <button class="btn btn-success" 
                        onclick="approveAppointment(${apt.id})">
                    <i data-lucide="check"></i>
                    승인하기
                </button>
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = html;
    lucide.createIcons();
}

async function approveAppointment(appointmentId) {
    if (!confirmAction('이 신청을 승인하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiPost(`/api/tutor/appointments/${appointmentId}/approve`, {});
        
        if (result && result.success) {
            showAlert('신청이 승인되었습니다.', 'success');
            loadPendingAppointments(); // Reload list
        }
    } catch (error) {
        // Error already handled
    }
}

function rejectAppointment(appointmentId) {
    const formHtml = `
        <form id="reject-form" onsubmit="submitReject(event, ${appointmentId})">
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

async function submitReject(event, appointmentId) {
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
            loadPendingAppointments(); // Reload list
        }
    } catch (error) {
        // Error already handled
    }
}

