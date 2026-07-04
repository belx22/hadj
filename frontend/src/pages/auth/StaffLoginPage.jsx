import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  SUPERVISEUR: '/dashboard',
  GESTIONNAIRE_HADJ: '/dashboard',
  ADMIN_DSI: '/dashboard',
  OPERATEUR_HADJ: '/bordereaux',
  ENCADREUR: '/visa/encadreur',
};

const DEMO_ACCOUNTS = [
  { username: 'superviseur', password: 'superviseur123', role: 'Superviseur' },
  { username: 'gestionnaire', password: 'gestionnaire123', role: 'Gestionnaire Hadj' },
  { username: 'operateur', password: 'operateur123', role: 'Opérateur Hadj' },
  { username: 'encadreur1', password: 'encadreur123', role: 'Encadreur' },
  { username: 'admin', password: 'admin123', role: 'Admin DSI' },
];

export default function StaffLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(username, password);
      navigate(ROLE_HOME[user.role] || '/');
    } catch {
      setError(t('auth.invalidCredentials'));
    }
  }

  return (
    <AuthLayout subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="username">{t('auth.username')}</label>
          <input
            id="username"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? t('common.loading') : t('auth.loginButton')}
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-afriland-gray-400 p-3">
        <p className="mb-2 text-xs font-semibold text-afriland-gray-600">{t('auth.demoAccounts')}</p>
        <ul className="space-y-1 text-xs text-afriland-gray-600">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.username} className="flex justify-between gap-2">
              <span className="font-medium text-afriland-black">{acc.role}</span>
              <span>{acc.username} / {acc.password}</span>
            </li>
          ))}
        </ul>
      </div>
    </AuthLayout>
  );
}
