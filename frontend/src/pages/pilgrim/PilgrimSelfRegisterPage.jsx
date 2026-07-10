import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import AuthLayout from '../../components/layout/AuthLayout';
import { usePilgrim } from '../../context/PilgrimContext';
import { registerPilgrimOnline } from '../../api/visaApi';
import { checkDuplicate } from '../../api/bordereauApi';
import { getEncadreurs, getOfficialPrice } from '../../api/referenceDataApi';
import { validateBordereau } from '../../utils/validators';
import { formatCurrency } from '../../utils/formatters';
import { CURRENT_SEASON, PILGRIM_TYPES, REGIONS } from '../../utils/constants';

// Formulaire volontairement réduit à l'essentiel : le statut (Nouveau) est
// déduit automatiquement — un agent peut toujours l'affiner plus tard via le
// module Bordereau. Le nombre de pèlerins n'apparaît que pour un encadreur.
const EMPTY_FORM = {
  pilgrimLastName: '',
  pilgrimFirstName: '',
  phone: '',
  email: '',
  idNumber: '',
  region: '',
  encadreurId: '',
  pilgrimType: 'PELERIN',
  pilgrimStatus: 'NOUVEAU',
  pilgrimCount: 1,
  season: CURRENT_SEASON,
};

export default function PilgrimSelfRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login: loginPilgrim } = usePilgrim();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [encadreurs, setEncadreurs] = useState([]);
  const [officialPrice, setOfficialPrice] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    getEncadreurs({ region: form.region || undefined }).then(setEncadreurs);
  }, [form.region]);

  useEffect(() => {
    getOfficialPrice(form.season, form.pilgrimType).then(setOfficialPrice);
  }, [form.season, form.pilgrimType]);

  // Inscription individuelle : toujours 1 pèlerin (le champ n'est pas exposé).
  const targetAmount = useMemo(() => officialPrice, [officialPrice]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleIdBlur() {
    if (!form.idNumber.trim()) return;
    setCheckingDuplicate(true);
    try {
      const isDuplicate = await checkDuplicate(form.idNumber.trim(), form.season);
      setDuplicateWarning(isDuplicate);
    } finally {
      setCheckingDuplicate(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateBordereau(form, t, { requireAgency: false, requireEmail: false });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (duplicateWarning) {
      setSubmitError(t('bordereau.duplicateBlocked'));
      return;
    }

    setSubmitting(true);
    try {
      await registerPilgrimOnline({ ...form, pilgrimCount: Number(form.pilgrimCount) });
      await loginPilgrim(form.idNumber.trim(), form.phone.trim());
      navigate('/visa/pelerin/paiement');
    } catch (err) {
      if (err.code === 'DUPLICATE_PILGRIM') {
        setSubmitError(t('bordereau.errors.duplicate', { season: form.season }));
      } else {
        setSubmitError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle={t('pilgrimRegister.subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('bordereau.pilgrimLastName')} error={errors.pilgrimLastName} required>
            <input
              className={clsx('form-input', errors.pilgrimLastName && 'form-input-error')}
              value={form.pilgrimLastName}
              onChange={(e) => update('pilgrimLastName', e.target.value)}
            />
          </Field>

          <Field label={t('bordereau.pilgrimFirstName')} error={errors.pilgrimFirstName} required>
            <input
              className={clsx('form-input', errors.pilgrimFirstName && 'form-input-error')}
              value={form.pilgrimFirstName}
              onChange={(e) => update('pilgrimFirstName', e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('bordereau.phone')} error={errors.phone} help={t('bordereau.phoneHelp')} required>
          <input
            className={clsx('form-input', errors.phone && 'form-input-error')}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
            inputMode="numeric"
          />
        </Field>

        <Field label={t('bordereau.idNumber')} error={errors.idNumber} required>
          <input
            className={clsx('form-input', (errors.idNumber || duplicateWarning) && 'form-input-error')}
            value={form.idNumber}
            onChange={(e) => update('idNumber', e.target.value)}
            onBlur={handleIdBlur}
          />
          {checkingDuplicate && <p className="mt-1 text-xs text-afriland-gray-600">{t('bordereau.checkDuplicate')}</p>}
          {duplicateWarning && !checkingDuplicate && (
            <p className="form-error">{t('bordereau.errors.duplicate', { season: form.season })}</p>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('bordereau.region')} error={errors.region} required>
            <select
              className={clsx('form-input', errors.region && 'form-input-error')}
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
            >
              <option value="">{t('common.select')}</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </Field>

          <Field label={t('pilgrimRegister.chooseEncadreur')} error={errors.encadreurId} required>
            <select
              className={clsx('form-input', errors.encadreurId && 'form-input-error')}
              value={form.encadreurId}
              onChange={(e) => update('encadreurId', e.target.value)}
            >
              <option value="">{t('common.select')}</option>
              {encadreurs.map((enc) => (
                <option key={enc.id} value={enc.id}>{enc.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Auto-inscription : le pèlerin choisit son type. Le nombre de pèlerins
            n'apparaît pas ici (il vaut toujours 1 pour une inscription
            individuelle) — un encadreur inscrit son groupe depuis son portail. */}
        <Field label={t('bordereau.pilgrimType')} error={errors.pilgrimType} required>
          <select
            className={clsx('form-input', errors.pilgrimType && 'form-input-error')}
            value={form.pilgrimType}
            onChange={(e) => update('pilgrimType', e.target.value)}
          >
            {PILGRIM_TYPES.map((type) => (
              <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>
            ))}
          </select>
        </Field>

        <div className="rounded-lg bg-afriland-gray-50 p-3">
          <p className="text-xs font-medium uppercase text-afriland-gray-600">{t('pilgrimRegister.targetAmount')}</p>
          <p className="text-lg font-bold text-afriland-red">{formatCurrency(targetAmount)}</p>
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting || checkingDuplicate}>
          {submitting ? t('common.loading') : t('pilgrimRegister.submit')}
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({ label, error, help, required, children }) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="ml-0.5 text-afriland-red">*</span>}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-afriland-gray-600">{help}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
