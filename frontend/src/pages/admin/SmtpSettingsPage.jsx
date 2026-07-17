import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSmtpSettings, updateSmtpSettings } from '../../api/referenceDataApi';

export default function SmtpSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSmtpSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateSmtpSettings({
        ...settings,
        port: Number(settings.port),
        otpTtlMinutes: Number(settings.otpTtlMinutes),
      });
      toast.success(t('adminSmtp.savedToast'));
    } catch (err) {
      if (err.code === 'FORBIDDEN') setError(t('adminSmtp.errors.forbidden'));
      else setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-afriland-gray-600">{t('common.loading')}</p>;
  if (!settings) return <p className="text-visa-refused">{t('common.error')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('adminSmtp.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('adminSmtp.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">{t('adminSmtp.host')}</label>
            <input className="form-input" value={settings.host} onChange={(e) => update('host', e.target.value)} required />
          </div>
          <div>
            <label className="form-label">{t('adminSmtp.port')}</label>
            <input
              type="number"
              className="form-input"
              value={settings.port}
              onChange={(e) => update('port', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">{t('adminSmtp.username')}</label>
            <input className="form-input" value={settings.username} onChange={(e) => update('username', e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t('adminSmtp.fromName')}</label>
            <input className="form-input" value={settings.fromName} onChange={(e) => update('fromName', e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t('adminSmtp.fromEmail')}</label>
            <input
              type="email"
              className="form-input"
              value={settings.fromEmail}
              onChange={(e) => update('fromEmail', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t('adminSmtp.otpTtl')}</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={settings.otpTtlMinutes}
              onChange={(e) => update('otpTtlMinutes', e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.secure} onChange={(e) => update('secure', e.target.checked)} />
          {t('adminSmtp.secure')}
        </label>

        {/* Le mot de passe SMTP n'est jamais renvoyé par l'API : on ne l'écrase
            que si l'administrateur en saisit un nouveau. */}
        <div>
          <label className="form-label">{t('adminSmtp.password')}</label>
          <input
            type="password"
            className="form-input"
            placeholder={t('adminSmtp.passwordPlaceholder')}
            value={settings.password || ''}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </div>
  );
}
