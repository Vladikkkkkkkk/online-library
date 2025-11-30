/**
 * Get the base API URL without /api suffix
 * @returns {string} Base URL without /api
 */
export const getBaseApiUrl = () => {
  // Default port is 3001 based on backend configuration
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // Remove /api suffix if present and trailing slashes
  return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

/**
 * Get the full API URL with /api prefix
 * @returns {string} Full API URL
 */
export const getApiUrl = () => {
  return `${getBaseApiUrl()}/api`;
};

