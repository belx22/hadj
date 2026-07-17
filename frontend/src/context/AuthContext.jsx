import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginApi, loginEncadreur as loginEncadreurApi, verifyLoginOtp as verifyLoginOtpApi } from '../api/authApi';

const TOKEN_KEY = 'copilote-hadj-token';
const USER_KEY = 'copilote-hadj-user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  async function login(username, password) {
    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(username, password);
      // 2FA : le backend peut demander un code OTP (aucun token à ce stade).
      if (data.otpRequired) {
        return { otpRequired: true, maskedEmail: data.maskedEmail };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      return { otpRequired: false, user: data.user };
    } catch (err) {
      setError(err.code || 'LOGIN_ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function verifyLoginOtp(username, otp) {
    setLoading(true);
    setError(null);
    try {
      const { token, user: loggedUser } = await verifyLoginOtpApi(username, otp);
      localStorage.setItem(TOKEN_KEY, token);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      setError(err.code || 'LOGIN_ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function loginEncadreur(username, password) {
    setLoading(true);
    setError(null);
    try {
      const { token, user: loggedUser } = await loginEncadreurApi(username, password);
      localStorage.setItem(TOKEN_KEY, token);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      setError(err.code || 'LOGIN_ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, error, login, verifyLoginOtp, loginEncadreur, logout, isAuthenticated: Boolean(user) }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
