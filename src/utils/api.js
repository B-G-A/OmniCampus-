const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Format API response errors into clean objects.
 */
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Perform a fetch request with JWT authentication headers.
 */
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach token if available
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If unauthorized (401), clean credentials if desired, or let AuthContext handle it.
      const errorMsg = data.message || response.statusText || 'An error occurred';
      throw new ApiError(errorMsg, response.status, data.code);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error', 500, 'NETWORK_ERROR');
  }
};

const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => 
    request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(body), 
      ...options 
    }),
  put: (endpoint, body, options) => 
    request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(body), 
      ...options 
    }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
  
  // For file uploads (skip JSON Content-Type headers)
  upload: async (endpoint, formData) => {
    const url = `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem('accessToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(data.message || 'Upload failed', response.status, data.code);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Upload error', 500, 'UPLOAD_ERROR');
    }
  }
};

export default api;
export { ApiError };
