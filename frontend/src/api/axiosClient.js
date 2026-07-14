import axios from 'axios';

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('copilote-hadj-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('copilote-hadj-token');
      localStorage.removeItem('copilote-hadj-user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    // Le backend renvoie un code applicatif ({ code, message }) : on l'expose sur
    // `error.code` pour que les écrans le traitent exactement comme en mode mock
    // (DUPLICATE_PILGRIM, DUPLICATE_PHONE, PARTIAL_NOT_ALLOWED...). Sans cela,
    // `error.code` porterait le code interne d'axios (ERR_BAD_REQUEST).
    const backendCode = error.response?.data?.code;
    if (backendCode) error.code = backendCode;
    return Promise.reject(error);
  }
);

export default axiosClient;
