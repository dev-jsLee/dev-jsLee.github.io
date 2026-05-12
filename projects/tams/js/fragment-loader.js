/**
 * Fragment Loader for SPA
 * HTML fragments를 동적으로 로드하여 페이지에 삽입
 */

class FragmentLoader {
    constructor(basePath = '') {
        // base.html이 html 폴더 안에 있으므로, 같은 디렉토리를 기준으로 함
        this.basePath = basePath || '';
        this.cache = new Map();
    }

    /**
     * Fragment를 로드하여 지정된 컨테이너에 삽입
     * @param {string} fragmentPath - Fragment 파일 경로 (예: 'components/navbar')
     * @param {HTMLElement} container - 삽입할 컨테이너 요소
     * @param {boolean} append - true면 추가, false면 교체 (기본값: false)
     */
    async loadFragment(fragmentPath, container, append = false) {
        if (!container) {
            console.error('Container element is required');
            return;
        }

        try {
            // 캐시 확인
            if (this.cache.has(fragmentPath)) {
                const content = this.cache.get(fragmentPath);
                if (append) {
                    container.insertAdjacentHTML('beforeend', content);
                } else {
                    container.innerHTML = content;
                }
                this.initializeFragment(container);
                return;
            }

            // Fragment 파일 로드
            const path = this.basePath ? `${this.basePath}/${fragmentPath}.html` : `${fragmentPath}.html`;
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load fragment: ${fragmentPath}`);
            }

            const html = await response.text();
            
            // 캐시에 저장
            this.cache.set(fragmentPath, html);

            // 컨테이너에 삽입
            if (append) {
                container.insertAdjacentHTML('beforeend', html);
            } else {
                container.innerHTML = html;
            }

            // Fragment 초기화 (스크립트 실행 등)
            this.initializeFragment(container);
        } catch (error) {
            console.error(`Error loading fragment ${fragmentPath}:`, error);
            container.innerHTML = `<div class="error">Fragment를 불러올 수 없습니다: ${fragmentPath}</div>`;
        }
    }

    /**
     * Fragment 초기화 (스크립트 실행, 아이콘 초기화 등)
     */
    initializeFragment(container) {
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 스크립트 태그 실행
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // src 속성이 있으면 새로운 스크립트 태그 생성
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                // 인라인 스크립트는 내용 복사
                newScript.textContent = oldScript.textContent;
            }
            
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    /**
     * data-fragment 속성을 가진 모든 요소의 fragment 로드
     */
    async loadAllFragments(container = document) {
        const fragmentElements = container.querySelectorAll('[data-fragment]');
        const promises = Array.from(fragmentElements).map(async (element) => {
            const fragmentPath = element.getAttribute('data-fragment');
            await this.loadFragment(fragmentPath, element);
        });
        await Promise.all(promises);
    }

    /**
     * 페이지 콘텐츠 로드
     * @param {string} pagePath - 페이지 경로 (예: 'admin/dashboard')
     * @param {HTMLElement} container - 삽입할 컨테이너 요소
     */
    async loadPage(pagePath, container) {
        await this.loadFragment(pagePath, container);
    }

    /**
     * 캐시 클리어
     */
    clearCache() {
        this.cache.clear();
    }
}

// 전역 인스턴스 생성
// 각 페이지에서 상대 경로로 fragment를 로드하므로 basePath는 빈 문자열
const fragmentLoader = new FragmentLoader('');

// 페이지 로드 시 자동으로 fragment 로드
document.addEventListener('DOMContentLoaded', () => {
    fragmentLoader.loadAllFragments();
});

