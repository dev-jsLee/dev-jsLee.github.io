const BASE_URL = '/api';

/**
 * Retrieve JWT token from localStorage
 * @returns {string|null} JWT token or null if not found
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Parse error response and return standardized error object
 * @param {Response} response - Fetch response object
 * @returns {Promise<{statusCode: number, message: string, error: string}>}
 */
export async function handleApiError(response) {
  try {
    const data = await response.json();
    return {
      statusCode: data.statusCode || response.status,
      message: data.message || 'Unknown error',
      error: data.error || 'Error',
    };
  } catch {
    return {
      statusCode: response.status,
      message: 'Failed to parse error response',
      error: 'Error',
    };
  }
}

/**
 * Fetch wrapper with automatic Authorization header and error handling
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} path - API path (e.g., '/events')
 * @param {object|null} body - Request body (optional)
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(method, path, body = null) {
  const token = getToken();
  const hasFormData = body instanceof FormData;
  const headers = {};

  if (!hasFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = hasFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  // Handle 401 Unauthorized - clear token and redirect to login with returnUrl
  if (response.status === 401) {
    localStorage.removeItem('token');
    const currentPath = window.location.pathname + window.location.search;
    if (!currentPath.startsWith('/index.html')) {
      window.location.href = '/index.html?returnUrl=' + encodeURIComponent(currentPath);
    } else {
      window.location.href = '/index.html';
    }
    return response;
  }

  return response;
}

/**
 * API client object with convenience methods
 */
export const api = {
  /**
   * GET request
   * @param {string} path - API path
   * @returns {Promise<Response>}
   */
  get(path) {
    return fetchWithAuth('GET', path);
  },

  /**
   * POST request
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<Response>}
   */
  post(path, body) {
    return fetchWithAuth('POST', path, body);
  },

  postForm(path, formData) {
    return fetchWithAuth('POST', path, formData);
  },

  /**
   * PATCH request
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<Response>}
   */
  patch(path, body) {
    return fetchWithAuth('PATCH', path, body);
  },

  /**
   * DELETE request
   * @param {string} path - API path
   * @returns {Promise<Response>}
   */
  delete(path) {
    return fetchWithAuth('DELETE', path);
  },
};
