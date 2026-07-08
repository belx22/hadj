import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { usePilgrim } from '../../context/PilgrimContext';

export default function VisaPelerinLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = usePilgrim();
  const [idNumber, setIdNumber] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(idNumber.trim(), secret.trim());
      navigate('/visa/pelerin/dossier');
    } catch {
      setError(t('visa.notFound'));
    }
  }

  return (
    <AuthLayout subtitle={t('visa.pilgrimLoginSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="idNumber">{t('visa.idNumber')}</label>
          <input id="idNumber" className="form-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
        </div>
        <div>
          <label className="form-label" htmlFor="secret">{t('visa.phoneOrPassword')}</label>
          <input
            id="secret"
            className="form-input"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-afriland-gray-600">{t('visa.phoneOrPasswordHelp')}</p>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? t('common.loading') : t('visa.checkStatus')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-afriland-gray-600">
        {t('visa.notRegisteredYet')}{' '}
        <Link to="/inscription" className="font-semibold text-afriland-red hover:underline">
          {t('visa.registerOnline')}
        </Link>
      </p>
    </AuthLayout>
  );
}
