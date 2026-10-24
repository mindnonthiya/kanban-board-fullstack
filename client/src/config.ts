import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Global response interceptor for session expiration
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/' && currentPath !== '/register') {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
