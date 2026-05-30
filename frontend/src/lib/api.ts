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

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error: any) {
    console.error('API Health Check Failed. BaseURL:', api.defaults.baseURL, 'FullURL:', api.getUri({ url: '/health' }), 'Error:', error.message);
    throw error;
  }
};
