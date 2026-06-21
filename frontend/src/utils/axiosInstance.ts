import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:1338/api',
});

const getStoredJwt = () => {
  const keys = ['jwt', 'token', 'authToken'];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value && value !== 'undefined' && value !== 'null') {
      return value.replace(/^Bearer\s+/i, '');
    }
  }

  const jsonKeys = ['user', 'auth', 'authUser'];

  for (const key of jsonKeys) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      const jwt =
        parsed?.jwt ||
        parsed?.token ||
        parsed?.authToken ||
        parsed?.data?.jwt ||
        parsed?.data?.token;

      if (jwt) {
        return String(jwt).replace(/^Bearer\s+/i, '');
      }
    } catch {}
  }

  return null;
};

axiosInstance.interceptors.request.use((config) => {
  const jwt = getStoredJwt();

  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }

  return config;
});

export const setAuthToken = (jwt?: string) => {
  if (!jwt) return;

  localStorage.setItem('jwt', jwt);
  axiosInstance.defaults.headers.common.Authorization = `Bearer ${jwt}`;
};

export const clearAuthToken = () => {
  localStorage.removeItem('jwt');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');

  delete axiosInstance.defaults.headers.common.Authorization;
};

export default axiosInstance;