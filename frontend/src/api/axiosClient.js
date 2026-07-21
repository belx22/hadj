import axios from 'axios';

// Client HTTP unique de l'application : le backend Spring Boot est la seule
// source de données. Aucun repli en mémoire n'existe côté frontend.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('copilote-hadj-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('copilote-hadj-token');
      sessionStorage.removeItem('copilote-hadj-user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    // Le backend renvoie un code applicatif ({ code, message }) : on l'expose sur
    // `error.code` pour que les écrans le traitent tel quel (DUPLICATE_PILGRIM,
    // DUPLICATE_PHONE, PARTIAL_NOT_ALLOWED...). Sans cela, `error.code` porterait
    // le code interne d'axios (ERR_BAD_REQUEST).
    const backendCode = error.response?.data?.code;
    if (backendCode) error.code = backendCode;
    return Promise.reject(error);
  }
);

export default axiosClient;
