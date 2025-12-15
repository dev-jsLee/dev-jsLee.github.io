/**
 * Admin Subjects Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadSubjects();
});

// ===== 카테고리 관리 =====

async function loadCategories() {
    try {
        const result = await apiGet('/api/admin/subject-categories');
        
        if (result && result.success) {
            renderCategories(result.data);
        }
    } catch (error) {
        document.getElementById('category-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>카테고리를 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderCategories(categories) {
    const container = document.getElementById('category-list');
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="folder" size="48"></i>
                <p>등록된 카테고리가 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const html = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem;">
            ${categories.map(category => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                    <div>
                        <strong>${category.name}</strong>
                        ${category.description ? `<span style="margin-left: 1rem; color: var(--gray-600);">${category.description}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-secondary" onclick="showEditCategoryModal(${category.id}, '${category.name}', '${category.description || ''}', ${category.display_order})">
                            <i data-lucide="edit"></i>
                            수정
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">
                            <i data-lucide="trash-2"></i>
                            삭제
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

function showCreateCategoryModal() {
    const formHtml = `
        <form id="category-form" onsubmit="createCategory(event)">
            <div class="form-group">
                <label>카테고리 이름 <span class="required">*</span></label>
                <input type="text" name="name" placeholder="예: Backend" required>
            </div>
            
            <div class="form-group">
                <label>설명</label>
                <input type="text" name="description" placeholder="예: 백엔드 개발">
            </div>
            
            <div class="form-group">
                <label>표시 순서</label>
                <input type="number" name="display_order" value="0" min="0">
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
    
    openModal('카테고리 추가', formHtml);
}

function showEditCategoryModal(categoryId, name, description, displayOrder) {
    const formHtml = `
        <form id="category-form" onsubmit="updateCategory(event, ${categoryId})">
            <div class="form-group">
                <label>카테고리 이름 <span class="required">*</span></label>
                <input type="text" name="name" value="${name}" required>
            </div>
            
            <div class="form-group">
                <label>설명</label>
                <input type="text" name="description" value="${description || ''}">
            </div>
            
            <div class="form-group">
                <label>표시 순서</label>
                <input type="number" name="display_order" value="${displayOrder}" min="0">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    수정
                </button>
            </div>
        </form>
    `;
    
    openModal('카테고리 수정', formHtml);
}

async function createCategory(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        description: formData.get('description') || '',
        display_order: parseInt(formData.get('display_order') || '0')
    };
    
    try {
        const result = await apiPost('/api/admin/subject-categories', data);
        
        if (result && result.success) {
            showAlert('카테고리가 추가되었습니다.', 'success');
            closeModal();
            loadCategories();
            loadSubjects(); // 과목 목록도 다시 로드
        }
    } catch (error) {
        // Error already handled
    }
}

async function updateCategory(event, categoryId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        name: formData.get('name'),
        description: formData.get('description') || '',
        display_order: parseInt(formData.get('display_order') || '0')
    };
    
    try {
        const result = await apiPut(`/api/admin/subject-categories/${categoryId}`, data);
        
        if (result && result.success) {
            showAlert('카테고리가 수정되었습니다.', 'success');
            closeModal();
            loadCategories();
            loadSubjects(); // 과목 목록도 다시 로드
        }
    } catch (error) {
        // Error already handled
    }
}

async function deleteCategory(categoryId) {
    if (!confirmAction('이 카테고리를 삭제하시겠습니까? 해당 카테고리에 속한 과목이 있으면 삭제할 수 없습니다.')) {
        return;
    }
    
    try {
        const result = await apiDelete(`/api/admin/subject-categories/${categoryId}`);
        
        if (result && result.success) {
            showAlert('카테고리가 삭제되었습니다.', 'success');
            loadCategories();
            loadSubjects(); // 과목 목록도 다시 로드
        }
    } catch (error) {
        // Error already handled
    }
}

// ===== 과목 관리 =====

let categories = [];

async function loadSubjects() {
    try {
        // 카테고리도 함께 로드
        const categoryResult = await apiGet('/api/admin/subject-categories');
        if (categoryResult && categoryResult.success) {
            categories = categoryResult.data;
        }
        
        const result = await apiGet('/api/admin/subjects');
        
        if (result && result.success) {
            renderSubjects(result.data);
        }
    } catch (error) {
        document.getElementById('subject-list').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" size="48"></i>
                <p>과목을 불러오는데 실패했습니다.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderSubjects(subjectsData) {
    const container = document.getElementById('subject-list');
    
    if (subjectsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book" size="48"></i>
                <p>등록된 과목이 없습니다.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem;">';
    
    subjectsData.forEach(group => {
        const category = group.category;
        const subjects = group.subjects;
        
        html += `
            <div style="border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden;">
                <div style="padding: 1rem; background: var(--primary-color); color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>${category.name} ${category.description ? `- ${category.description}` : ''}</span>
                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white;" onclick="toggleCategory(${category.id})">
                        <i data-lucide="chevron-down" id="category-icon-${category.id}"></i>
                    </button>
                </div>
                <div id="category-subjects-${category.id}" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    ${subjects.length === 0 ? `
                        <div style="padding: 1rem; text-align: center; color: var(--gray-600);">
                            이 카테고리에 속한 과목이 없습니다.
                        </div>
                    ` : subjects.map(subject => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--gray-50); border-radius: var(--border-radius);">
                            <div>
                                <strong>${subject.name}</strong>
                                ${subject.description ? `<span style="margin-left: 1rem; color: var(--gray-600);">${subject.description}</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-sm btn-secondary" onclick="showEditSubjectModal(${subject.id}, ${subject.category_id}, '${subject.name}', '${subject.description || ''}', ${subject.display_order})">
                                    <i data-lucide="edit"></i>
                                    수정
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSubject(${subject.id})">
                                    <i data-lucide="trash-2"></i>
                                    삭제
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    lucide.createIcons();
}

function toggleCategory(categoryId) {
    const subjectsDiv = document.getElementById(`category-subjects-${categoryId}`);
    const icon = document.getElementById(`category-icon-${categoryId}`);
    
    if (subjectsDiv.style.display === 'none') {
        subjectsDiv.style.display = 'flex';
        icon.setAttribute('data-lucide', 'chevron-down');
    } else {
        subjectsDiv.style.display = 'none';
        icon.setAttribute('data-lucide', 'chevron-right');
    }
    lucide.createIcons();
}

function showCreateSubjectModal() {
    if (categories.length === 0) {
        showAlert('먼저 카테고리를 추가해주세요.', 'error');
        return;
    }
    
    const categoryOptions = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
    
    const formHtml = `
        <form id="subject-form" onsubmit="createSubject(event)">
            <div class="form-group">
                <label>카테고리 <span class="required">*</span></label>
                <select name="category_id" required>
                    <option value="">선택해주세요</option>
                    ${categoryOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>과목 이름 <span class="required">*</span></label>
                <input type="text" name="name" placeholder="예: Python" required>
            </div>
            
            <div class="form-group">
                <label>설명</label>
                <input type="text" name="description" placeholder="예: Python 프로그래밍">
            </div>
            
            <div class="form-group">
                <label>표시 순서</label>
                <input type="number" name="display_order" value="0" min="0">
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
    
    openModal('과목 추가', formHtml);
}

function showEditSubjectModal(subjectId, categoryId, name, description, displayOrder) {
    const categoryOptions = categories.map(cat => 
        `<option value="${cat.id}" ${cat.id === categoryId ? 'selected' : ''}>${cat.name}</option>`
    ).join('');
    
    const formHtml = `
        <form id="subject-form" onsubmit="updateSubject(event, ${subjectId})">
            <div class="form-group">
                <label>카테고리 <span class="required">*</span></label>
                <select name="category_id" required>
                    <option value="">선택해주세요</option>
                    ${categoryOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>과목 이름 <span class="required">*</span></label>
                <input type="text" name="name" value="${name}" required>
            </div>
            
            <div class="form-group">
                <label>설명</label>
                <input type="text" name="description" value="${description || ''}">
            </div>
            
            <div class="form-group">
                <label>표시 순서</label>
                <input type="number" name="display_order" value="${displayOrder}" min="0">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    취소
                </button>
                <button type="submit" class="btn btn-primary">
                    수정
                </button>
            </div>
        </form>
    `;
    
    openModal('과목 수정', formHtml);
}

async function createSubject(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        category_id: parseInt(formData.get('category_id')),
        name: formData.get('name'),
        description: formData.get('description') || '',
        display_order: parseInt(formData.get('display_order') || '0')
    };
    
    try {
        const result = await apiPost('/api/admin/subjects', data);
        
        if (result && result.success) {
            showAlert('과목이 추가되었습니다.', 'success');
            closeModal();
            loadSubjects();
        }
    } catch (error) {
        // Error already handled
    }
}

async function updateSubject(event, subjectId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        category_id: parseInt(formData.get('category_id')),
        name: formData.get('name'),
        description: formData.get('description') || '',
        display_order: parseInt(formData.get('display_order') || '0')
    };
    
    try {
        const result = await apiPut(`/api/admin/subjects/${subjectId}`, data);
        
        if (result && result.success) {
            showAlert('과목이 수정되었습니다.', 'success');
            closeModal();
            loadSubjects();
        }
    } catch (error) {
        // Error already handled
    }
}

async function deleteSubject(subjectId) {
    if (!confirmAction('이 과목을 삭제하시겠습니까? 이 과목을 담당하는 조교가 있으면 삭제할 수 없습니다.')) {
        return;
    }
    
    try {
        const result = await apiDelete(`/api/admin/subjects/${subjectId}`);
        
        if (result && result.success) {
            showAlert('과목이 삭제되었습니다.', 'success');
            loadSubjects();
        }
    } catch (error) {
        // Error already handled
    }
}

