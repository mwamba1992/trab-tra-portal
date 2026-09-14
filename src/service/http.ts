import axios, { type AxiosInstance } from 'axios';
import { Config } from '@/utils/Config';

const http: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('tra_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry) {
      const refreshToken = localStorage.getItem('tra_refresh_token');
      if (refreshToken) {
        original._retry = true;
        try {
          const res = await axios.post(`${Config.API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          localStorage.setItem('tra_access_token', accessToken);
          localStorage.setItem('tra_refresh_token', newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return http(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default http;
