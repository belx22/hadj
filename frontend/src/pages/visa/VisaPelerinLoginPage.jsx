import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { usePilgrim } from '../../context/PilgrimContext';

export default function VisaPelerinLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = usePilgrim();
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(idNumber.trim(), phone.trim());
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
          <label className="form-label" htmlFor="phone">{t('visa.phone')}</label>
          <input
            id="phone"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
            inputMode="numeric"
            required
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? t('common.loading') : t('visa.checkStatus')}
        </button>
      </form>
    </AuthLayout>
  );
}
