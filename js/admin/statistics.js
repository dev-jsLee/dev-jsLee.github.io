/**
 * Admin Statistics Page JavaScript
 */

document.addEventListener('DOMContentLoaded', loadStatistics);

async function loadStatistics() {
    try {
        const result = await apiGet('/api/admin/statistics');
        
        if (result && result.success) {
            renderStatistics(result.data);
        }
    } catch (error) {
        showAlert('통계를 불러오는데 실패했습니다.', 'error');
    }
}

function renderStatistics(stats) {
    // Update stat cards
    document.getElementById('total-appointments').textContent = stats.total_appointments || 0;
    document.getElementById('completed-appointments').textContent = stats.completed_appointments || 0;
    document.getElementById('active-tutors').textContent = stats.active_tutors || 0;
    document.getElementById('active-mentors').textContent = stats.active_mentors || 0;
    
    // Render charts (placeholder implementation)
    renderAppointmentsChart();
    renderTutorsChart();
    renderStatusChart();
}

function renderAppointmentsChart() {
    const ctx = document.getElementById('appointments-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1주', '2주', '3주', '4주'],
            datasets: [{
                label: '신청 건수',
                data: [12, 19, 15, 25],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderTutorsChart() {
    const ctx = document.getElementById('tutors-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['조교 A', '조교 B', '조교 C'],
            datasets: [{
                label: '처리 건수',
                data: [20, 25, 15],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderStatusChart() {
    const ctx = document.getElementById('status-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['대기중', '확정됨', '완료됨', '취소됨'],
            datasets: [{
                data: [8, 12, 32, 3],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

