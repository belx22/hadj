import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { useToast } from '../../context/ToastContext';
import { requestPasswordReset, resetPasswordWithOtp } from '../../api/authApi';

const MIN_PASSWORD_LENGTH = 6;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  // « request » : on demande le code ; « verify » : on saisit code + nouveau mot de passe.
  const [step, setStep] = useState('request');
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleRequest(e) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) return;
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(identifier.trim());
      setMaskedEmail(result.maskedEmail);
      setStep('verify');
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('forgotPassword.errors.weakPassword', { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errors.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordWithOtp(identifier.trim(), otp.trim(), newPassword);
      toast.success(t('forgotPassword.successToast'));
      navigate('/login/staff');
    } catch (err) {
      if (err.code === 'INVALID_OTP') setError(t('forgotPassword.errors.invalidOtp'));
      else if (err.code === 'OTP_EXPIRED') setError(t('forgotPassword.errors.otpExpired'));
      else if (err.code === 'TOO_MANY_ATTEMPTS') setError(t('forgotPassword.errors.tooManyAttempts'));
      else if (err.code === 'WEAK_PASSWORD') setError(t('forgotPassword.errors.weakPassword', { min: MIN_PASSWORD_LENGTH }));
      else setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle={t('forgotPassword.subtitle')}>
      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="identifier">{t('forgotPassword.identifier')}</label>
            <input
              id="identifier"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
            <p className="mt-1 text-xs text-afriland-gray-600">{t('forgotPassword.identifierHelp')}</p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? t('common.loading') : t('forgotPassword.sendCode')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {/* L'email est masqué : on ne divulgue pas l'adresse complète. */}
          <div className="rounded-lg bg-afriland-gray-50 p-3">
            <p className="text-xs text-afriland-gray-600">
              {maskedEmail
                ? t('forgotPassword.codeSentTo', { email: maskedEmail })
                : t('forgotPassword.codeSentGeneric')}
            </p>
          </div>

          <div>
            <label className="form-label" htmlFor="otp">{t('forgotPassword.otp')}</label>
            <input
              id="otp"
              className="form-input tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="newPassword">{t('forgotPassword.newPassword')}</label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="confirmPassword">{t('forgotPassword.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? t('common.loading') : t('forgotPassword.resetButton')}
          </button>

          <button
            type="button"
            className="w-full text-xs font-semibold text-afriland-red hover:underline"
            onClick={() => setStep('request')}
          >
            {t('forgotPassword.backToRequest')}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link to="/login/staff" className="text-sm font-semibold text-afriland-red hover:underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </AuthLayout>
  );
}
