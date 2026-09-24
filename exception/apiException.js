/**
 * apiException.js
 * Centralized API & Network Exception Handling
 * Adheres strictly to exception/ folder rules in PDF specification
 */

export class ApiException extends Error {
  constructor(message, status = 500, endpoint = '', rawError = null) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.endpoint = endpoint;
    this.rawError = rawError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Normalizes Axios/network errors into an ApiException.
 * Dispatches an error event so UI layers can display user-friendly notifications.
 * 
 * @param {Error} error - The caught Axios error
 * @param {string} endpoint - The target API endpoint
 * @param {string} operation - e.g. "fetch students", "create subject"
 * @returns {ApiException} Normalized exception instance
 */
export function handleApiError(error, endpoint = '', operation = 'API Operation') {
  let status = 500;
  let userMessage = `Failed to perform ${operation}. Please try again.`;

  if (error.response) {
    // Server responded with a status code outside 2xx
    status = error.response.status;
    const serverMsg = error.response.data?.message || error.response.statusText;

    switch (status) {
      case 400:
        userMessage = `Bad request during ${operation}. ${serverMsg || 'Invalid data provided.'}`;
        break;
      case 404:
        userMessage = `Requested resource not found at ${endpoint}.`;
        break;
      case 409:
        userMessage = `Conflict occurred during ${operation}. Resource already exists.`;
        break;
      case 500:
        userMessage = `Internal server error during ${operation}.`;
        break;
      default:
        userMessage = `Server error (${status}) during ${operation}. ${serverMsg || ''}`;
        break;
    }
  } else if (error.request) {
    // The request was made but no response was received (JSON Server offline / network loss)
    status = 0;
    userMessage = `Cannot connect to JSON Server at http://localhost:3000. Please ensure the server is running (npm run server).`;
  } else {
    // Something happened setting up the request
    userMessage = error.message || `An unexpected error occurred during ${operation}.`;
  }

  const apiEx = new ApiException(userMessage, status, endpoint, error);

  // Dispatch a global event so the active view can display a notification toast
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent('app:api-error', {
        detail: {
          message: userMessage,
          status,
          endpoint,
          timestamp: apiEx.timestamp
        }
      })
    );
  }

  console.error(`[API Exception] [${operation}] Status: ${status} | Endpoint: ${endpoint}`, error);
  return apiEx;
}
