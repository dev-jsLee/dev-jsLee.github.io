/**
 * Admin Users Page JavaScript
 */

// Load users on page load
document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
    try {
        const result = await apiGet('/api/admin/users');
        
        if (result && result.success) {
            renderUsers(result.data);
        }
    } catch (error) {
        document.getElementById('user-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="64"></i>
                <p>사용자 목록을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderUsers(users) {
    const listContainer = document.getElementById('user-list');
    
    if (!users || users.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users" size="64"></i>
                <p>등록된 사용자가 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>이름</th>
                    <th>전화번호</th>
                    <th>이메일</th>
                    <th>역할</th>
                    <th>권한</th>
                    <th>상태</th>
                    <th>작업</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td><strong>${user.name}</strong></td>
                        <td>${user.phone}</td>
                        <td>${user.email || '-'}</td>
                        <td>
                            <span class="badge badge-${user.role.toLowerCase()}">
                                ${getRoleText(user.role)}
                            </span>
                        </td>
                        <td>${user.permission_level || 'USER'}</td>
                        <td>
                            <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
                                ${user.is_active ? '활성' : '비활성'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="showEditUserModal(${user.id})">
                                <i data-lucide="edit"></i>
                                수정
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    listContainer.innerHTML = html;
    lucide.createIcons();
}

function getRoleText(role) {
    const texts = {
        ADMIN: '관리자',
        MENTOR: '멘토',
        TUTOR: '조교'
    };
    return texts[role] || role;
}

function showCreateUserModal() {
    const formHtml = `
        <form id="user-form" onsubmit="createUser(event)">
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
                <label>이메일</label>
                <input type="email" name="email" 
                       placeholder="user@example.com">
            </div>
            
            <div class="form-group">
                <label>비밀번호 <span class="required">*</span></label>
                <input type="password" name="password" required>
            </div>
            
            <div class="form-group">
                <label>역할 <span class="required">*</span></label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="role" value="MENTOR" checked>
                        멘토
                    </label>
                    <label>
                        <input type="radio" name="role" value="TUTOR">
                        조교
                    </label>
                    <label>
                        <input type="radio" name="role" value="ADMIN">
                        관리자
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label>권한 <span class="required">*</span></label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="permission_level" value="USER" checked>
                        USER
                    </label>
                    <label>
                        <input type="radio" name="permission_level" value="MANAGER">
                        MANAGER
                    </label>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    생성하기
                </button>
            </div>
        </form>
    `;
    
    openModal('계정 생성', formHtml);
}

async function createUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate phone
    if (!isValidPhone(data.phone)) {
        showAlert('올바른 전화번호 형식이 아닙니다.', 'error');
        return;
    }
    
    try {
        const result = await apiPost('/api/admin/users', data);
        
        if (result && result.success) {
            showAlert('계정이 생성되었습니다.', 'success');
            closeModal();
            loadUsers();
        }
    } catch (error) {
        // Error already handled
    }
}

async function showEditUserModal(userId) {
    try {
        const result = await apiGet(`/api/admin/users/${userId}`);
        
        if (!result || !result.success) {
            showAlert('사용자 정보를 불러오는데 실패했습니다.', 'error');
            return;
        }
        
        const user = result.data;
        
        const formHtml = `
            <form id="user-form" onsubmit="updateUser(event, ${userId})">
                <div class="form-group">
                    <label>이름 <span class="required">*</span></label>
                    <input type="text" name="name" value="${user.name}" required>
                </div>
                
                <div class="form-group">
                    <label>전화번호</label>
                    <input type="tel" value="${user.phone}" disabled>
                    <small class="text-muted">전화번호는 수정할 수 없습니다.</small>
                </div>
                
                <div class="form-group">
                    <label>이메일</label>
                    <input type="email" name="email" value="${user.email || ''}">
                </div>
                
                <div class="form-group">
                    <label>새 비밀번호</label>
                    <input type="password" name="password" 
                           placeholder="변경하려면 입력하세요">
                    <small class="text-muted">비워두면 변경되지 않습니다.</small>
                </div>
                
                <div class="form-group">
                    <label>역할 <span class="required">*</span></label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="role" value="MENTOR" ${user.role === 'MENTOR' ? 'checked' : ''}>
                            멘토
                        </label>
                        <label>
                            <input type="radio" name="role" value="TUTOR" ${user.role === 'TUTOR' ? 'checked' : ''}>
                            조교
                        </label>
                        <label>
                            <input type="radio" name="role" value="ADMIN" ${user.role === 'ADMIN' ? 'checked' : ''}>
                            관리자
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>권한 <span class="required">*</span></label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="permission_level" value="USER" ${user.permission_level === 'USER' ? 'checked' : ''}>
                            USER
                        </label>
                        <label>
                            <input type="radio" name="permission_level" value="MANAGER" ${user.permission_level === 'MANAGER' ? 'checked' : ''}>
                            MANAGER
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>상태</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="is_active" value="true" ${user.is_active ? 'checked' : ''}>
                            활성
                        </label>
                        <label>
                            <input type="radio" name="is_active" value="false" ${!user.is_active ? 'checked' : ''}>
                            비활성
                        </label>
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
        
        openModal('계정 수정', formHtml);
        
    } catch (error) {
        // Error already handled
    }
}

async function updateUser(event, userId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert is_active to boolean
    data.is_active = data.is_active === 'true';
    
    // Remove password if empty
    if (!data.password) {
        delete data.password;
    }
    
    try {
        const result = await apiPut(`/api/admin/users/${userId}`, data);
        
        if (result && result.success) {
            showAlert('계정이 수정되었습니다.', 'success');
            closeModal();
            loadUsers();
        }
    } catch (error) {
        // Error already handled
    }
}

function filterUsers() {
    // TODO: Implement filtering
    console.log('Filter users');
}

