export const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
