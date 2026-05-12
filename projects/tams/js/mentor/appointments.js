/**
 * Mentor Appointments Page JavaScript
 */

let currentStatus = 'PENDING';

document.addEventListener('DOMContentLoaded', () => {
    loadAppointments();
});

async function loadAppointments() {
    try {
        const url = currentStatus ? `/api/mentor/appointments?status=${currentStatus}` : '/api/mentor/appointments';
        const result = await apiGet(url);
        
        if (result && result.success) {
            renderAppointments(result.data);
            // 전체 목록을 가져와서 카운트 업데이트
            const allResult = await apiGet('/api/mentor/appointments');
            if (allResult && allResult.success) {
                updateCounts(allResult.data);
            }
        }
    } catch (error) {
        document.getElementById('appointment-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>신청 내역을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function updateCounts(appointments) {
    const counts = {
        PENDING: 0,
        CONFIRMED: 0,
        COMPLETED: 0,
        CANCELLED: 0
    };
    
    appointments.forEach(apt => {
        if (counts.hasOwnProperty(apt.status)) {
            counts[apt.status]++;
        }
    });
    
    document.getElementById('pending-count').textContent = counts.PENDING;
    document.getElementById('confirmed-count').textContent = counts.CONFIRMED;
    document.getElementById('completed-count').textContent = counts.COMPLETED;
    document.getElementById('cancelled-count').textContent = counts.CANCELLED;
}

function switchTab(status, button) {
    currentStatus = status;
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Reload appointments
    loadAppointments();
}

function renderAppointments(appointments) {
    const filtered = appointments.filter(apt => apt.status === currentStatus);
    const listContainer = document.getElementById('appointment-list');
    
    if (filtered.length === 0) {
        const messages = {
            PENDING: '대기 중인 신청이 없습니다.',
            CONFIRMED: '확정된 신청이 없습니다.',
            COMPLETED: '완료된 신청이 없습니다.',
            CANCELLED: '취소된 신청이 없습니다.'
        };
        
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox" size="64"></i>
                <p>${messages[currentStatus]}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = filtered.map(apt => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div class="time-info">
                    <i data-lucide="clock"></i>
                    ${formatDate(apt.date)} ${apt.start_time}
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
                <div class="info-row">
                    <i data-lucide="user-check"></i>
                    ${apt.tutor?.name || '알 수 없음'}
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
                ${apt.status === 'PENDING' ? `
                    <button class="btn btn-sm btn-danger" 
                            onclick="cancelAppointment(${apt.id})">
                        <i data-lucide="x"></i>
                        취소
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = html;
    lucide.createIcons();
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

async function cancelAppointment(appointmentId) {
    if (!confirmAction('정말 취소하시겠습니까?')) {
        return;
    }
    
    try {
        const result = await apiPost(`/api/mentor/appointments/${appointmentId}/cancel`, {});
        
        if (result && result.success) {
            showAlert('신청이 취소되었습니다.', 'success');
            loadAppointments();
        }
    } catch (error) {
        // Error already handled
    }
}

