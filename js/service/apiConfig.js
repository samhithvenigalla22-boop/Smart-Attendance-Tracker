/**
 * apiConfig.js
 * Centralized Axios Configuration & HTTP Client
 * Adheres strictly to js/service/ folder rules in PDF specification:
 * - Axios calls LIVE ONLY in js/service/
 * - NO DOM manipulation in this layer
 * - Centralizes JSON Server Base URL
 */

import { handleApiError } from '../../exception/apiException.js';

// Resolve Axios instance (available via CDN script or module environment)
const getAxios = () => {
  if (typeof window !== 'undefined' && window.axios) {
    return window.axios;
  }
  if (typeof axios !== 'undefined') {
    return axios;
  }
  throw new Error('Axios library not found. Please ensure Axios script is included in HTML.');
};

export const BASE_URL = 'http://localhost:3000';

export const apiClient = getAxios().create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Response interceptor to catch any unhandled Axios network failures
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return rejected promise with standardized ApiException
    const endpoint = error.config ? error.config.url : '';
    const method = error.config ? error.config.method.toUpperCase() : 'REQUEST';
    const apiException = handleApiError(error, endpoint, method);
    return Promise.reject(apiException);
  }
);
