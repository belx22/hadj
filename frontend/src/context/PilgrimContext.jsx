import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { pilgrimLogin } from '../api/visaApi';

const SESSION_KEY = 'copilote-hadj-pilgrim-session';

const PilgrimContext = createContext(null);

export function PilgrimProvider({ children }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const { idNumber, phone } = JSON.parse(raw);
    pilgrimLogin(idNumber, phone)
      .then(setDossier)
      .catch(() => sessionStorage.removeItem(SESSION_KEY));
  }, []);

  async function login(idNumber, phone) {
    setLoading(true);
    setError(null);
    try {
      const result = await pilgrimLogin(idNumber, phone);
      setDossier(result);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ idNumber, phone }));
      return result;
    } catch (err) {
      setError(err.code || 'LOOKUP_ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setDossier(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  const value = useMemo(() => ({ dossier, loading, error, login, logout }), [dossier, loading, error]);

  return <PilgrimContext.Provider value={value}>{children}</PilgrimContext.Provider>;
}

export function usePilgrim() {
  const ctx = useContext(PilgrimContext);
  if (!ctx) throw new Error('usePilgrim must be used within a PilgrimProvider');
  return ctx;
}
