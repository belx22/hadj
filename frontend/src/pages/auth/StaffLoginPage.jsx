import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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

const OTP_ERRORS = {
  INVALID_OTP: 'auth.otpErrors.invalidOtp',
  OTP_EXPIRED: 'auth.otpErrors.otpExpired',
  TOO_MANY_ATTEMPTS: 'auth.otpErrors.tooManyAttempts',
};

export default function StaffLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, verifyLoginOtp, loading } = useAuth();
  const [step, setStep] = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [error, setError] = useState(null);

  function goToHome(user) {
    navigate(ROLE_HOME[user.role] || '/');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await login(username, password);
      if (res.otpRequired) {
        setMaskedEmail(res.maskedEmail);
        setOtp('');
        setStep('otp');
      } else {
        goToHome(res.user);
      }
    } catch (err) {
      const status = err.response?.status;
      setError(status === 401 ? t('auth.invalidCredentials') : t('auth.connectionError'));
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await verifyLoginOtp(username, otp.trim());
      goToHome(user);
    } catch (err) {
      const key = OTP_ERRORS[err.code];
      setError(key ? t(key) : t('auth.connectionError'));
    }
  }

  function backToCredentials() {
    setStep('credentials');
    setOtp('');
    setError(null);
  }

  if (step === 'otp') {
    return (
      <AuthLayout subtitle={t('auth.otpTitle')}>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-afriland-gray-600">
            {t('auth.otpSentTo', { email: maskedEmail || '' })}
          </p>
          <div>
            <label className="form-label" htmlFor="otp">{t('auth.otpCode')}</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="form-input tracking-[0.4em] text-center text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
              required
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading || otp.length < 6}>
            {loading ? t('common.loading') : t('auth.otpVerify')}
          </button>
          <div className="text-center">
            <button type="button" onClick={backToCredentials} className="text-sm font-semibold text-afriland-red hover:underline">
              {t('auth.otpBack')}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
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
        <div className="text-center">
          <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-afriland-red hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </div>
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
