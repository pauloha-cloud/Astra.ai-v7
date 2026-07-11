import axios from 'axios';

const API_URL = '/api';

// If API_URL is just the domain or an external URL that is failing, 
// we might want to ensure we are calling our own backend.
// For this full-stack app, relative paths are usually safer.
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to detect HTML responses (such as the platform's security/cookie check page)
// and throw a clean error so that the frontend doesn't treat HTML strings as valid JSON responses.
api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'string' &&
      (response.data.toLowerCase().includes('<!doctype html') || response.data.toLowerCase().includes('<html'))
    ) {
      const error = new Error('HTML response received instead of JSON. Please refresh or authenticate.');
      (error as any).isHtmlResponse = true;
      (error as any).htmlContent = response.data;
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error: any) {
    console.error('API Health Check Failed. BaseURL:', api.defaults.baseURL, 'FullURL:', api.getUri({ url: '/health' }), 'Error:', error.message);
    throw error;
  }
};
