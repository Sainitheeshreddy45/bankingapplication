import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let navigate = null;
let logoutHandler = null;

export const injectNavigator = (nav) => {
  navigate = nav;
};

export const injectLogoutAction = (fn) => {
  logoutHandler = fn;
};

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config || {};

    if (config.skipAuthInterceptor) {
      return Promise.reject(err);
    }

    // 🛡️ ONLY trigger logout if it's a 401 AND specifically marked as an expired session
    const isSessionExpired = 
      err.response?.status === 401 && 
      err.response?.data?.errorCode === 'SESSION_EXPIRED';

    if (isSessionExpired) {
      try {
        await logoutHandler?.();
      } catch (logoutError) {
        console.error("Global auth clean-up handler exception:", logoutError);
      }

      localStorage.clear();
      sessionStorage.clear();

      if (navigate) {
        navigate('/login', { replace: true });
      } else {
        window.location.href = '/login';
      }
    }

    // Any other error (400, 403, 500, or a non-session 401) is safely passed through
    return Promise.reject(err);
  }
);

export default apiClient;