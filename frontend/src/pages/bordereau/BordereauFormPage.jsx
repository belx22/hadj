import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { createBordereau, checkDuplicate, getEncadreurs, getOfficialPrice } from '../../api/bordereauApi';
import { generateBordereauReceipt } from '../../utils/pdf';
import { formatCurrency } from '../../utils/formatters';
import { validateBordereau } from '../../utils/validators';
import { AGENCIES, CURRENT_SEASON, PILGRIM_STATUSES, PILGRIM_TYPES, REGIONS } from '../../utils/constants';

const EMPTY_FORM = {
  reference: '',
  pilgrimLastName: '',
  pilgrimFirstName: '',
  phone: '',
  idNumber: '',
  region: '',
  agency: '',
  encadreurId: '',
  pilgrimType: 'PELERIN',
  pilgrimStatus: 'NOUVEAU',
  pilgrimCount: 1,
  season: CURRENT_SEASON,
  onlinePriority: false,
};

export default function BordereauFormPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [form, setForm] = useState({ ...EMPTY_FORM, agency: user?.agency || '' });
  const [errors, setErrors] = useState({});
  const [encadreurs, setEncadreurs] = useState([]);
  const [officialPrice, setOfficialPrice] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdBordereau, setCreatedBordereau] = useState(null);

  useEffect(() => {
    getEncadreurs().then(setEncadreurs);
    getOfficialPrice(form.season).then(setOfficialPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.season]);

  const computedAmount = useMemo(
    () => (Number(form.pilgrimCount) || 0) * officialPrice,
    [form.pilgrimCount, officialPrice]
  );

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
    setCreatedBordereau(null);

    const validationErrors = validateBordereau(form, t);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (duplicateWarning) {
      setSubmitError(t('bordereau.duplicateBlocked'));
      return;
    }

    setSubmitting(true);
    try {
      const record = await createBordereau(
        { ...form, pilgrimCount: Number(form.pilgrimCount) },
        user
      );
      setCreatedBordereau(record);
      setForm({ ...EMPTY_FORM, agency: user?.agency || '' });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('bordereau.newTitle')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('bordereau.subtitle')}</p>
      </div>

      {createdBordereau && (
        <div className="card border-visa-granted/30 bg-visa-granted/5">
          <p className="font-semibold text-visa-granted">{t('bordereau.submitSuccess')}</p>
          <p className="mt-1 text-sm text-afriland-gray-600">
            {t('bordereau.receiptId')} : <span className="font-mono">{createdBordereau.id}</span>
          </p>
          <p className="text-sm text-afriland-gray-600">{t('bordereau.smsSent', { phone: createdBordereau.phone })}</p>
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={() => generateBordereauReceipt(createdBordereau)}
          >
            {t('bordereau.generateReceipt')}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('bordereau.reference')}>
          <input className="form-input" value={form.reference} onChange={(e) => update('reference', e.target.value)} />
        </Field>

        <Field label={t('bordereau.season')}>
          <input className="form-input bg-afriland-gray-50" value={form.season} disabled />
        </Field>

        <Field label={t('bordereau.pilgrimLastName')} error={errors.pilgrimLastName}>
          <input
            className={clsx('form-input', errors.pilgrimLastName && 'form-input-error')}
            value={form.pilgrimLastName}
            onChange={(e) => update('pilgrimLastName', e.target.value)}
          />
        </Field>

        <Field label={t('bordereau.pilgrimFirstName')} error={errors.pilgrimFirstName}>
          <input
            className={clsx('form-input', errors.pilgrimFirstName && 'form-input-error')}
            value={form.pilgrimFirstName}
            onChange={(e) => update('pilgrimFirstName', e.target.value)}
          />
        </Field>

        <Field label={t('bordereau.phone')} error={errors.phone} help={t('bordereau.phoneHelp')}>
          <input
            className={clsx('form-input', errors.phone && 'form-input-error')}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
            inputMode="numeric"
          />
        </Field>

        <Field label={t('bordereau.idNumber')} error={errors.idNumber}>
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

        <Field label={t('bordereau.region')} error={errors.region}>
          <select
            className={clsx('form-input', errors.region && 'form-input-error')}
            value={form.region}
            onChange={(e) => update('region', e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </Field>

        <Field label={t('bordereau.agency')} error={errors.agency}>
          <select
            className={clsx('form-input', errors.agency && 'form-input-error')}
            value={form.agency}
            onChange={(e) => update('agency', e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {AGENCIES.map((agency) => (
              <option key={agency} value={agency}>{agency}</option>
            ))}
          </select>
        </Field>

        <Field label={t('bordereau.encadreur')} error={errors.encadreurId}>
          <select
            className={clsx('form-input', errors.encadreurId && 'form-input-error')}
            value={form.encadreurId}
            onChange={(e) => update('encadreurId', e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {encadreurs.map((enc) => (
              <option key={enc.id} value={enc.id}>{enc.name}</option>
            ))}
          </select>
        </Field>

        <Field label={t('bordereau.pilgrimType')}>
          <select className="form-input" value={form.pilgrimType} onChange={(e) => update('pilgrimType', e.target.value)}>
            {PILGRIM_TYPES.map((type) => (
              <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>
            ))}
          </select>
        </Field>

        <Field label={t('bordereau.pilgrimStatus')}>
          <select className="form-input" value={form.pilgrimStatus} onChange={(e) => update('pilgrimStatus', e.target.value)}>
            {PILGRIM_STATUSES.map((status) => (
              <option key={status} value={status}>{t(`bordereau.pilgrimStatuses.${status}`)}</option>
            ))}
          </select>
        </Field>

        <Field label={t('bordereau.pilgrimCount')} error={errors.pilgrimCount}>
          <input
            type="number"
            min="1"
            className={clsx('form-input', errors.pilgrimCount && 'form-input-error')}
            value={form.pilgrimCount}
            onChange={(e) => update('pilgrimCount', e.target.value)}
          />
        </Field>

        <Field label={t('bordereau.computedAmount')}>
          <input className="form-input bg-afriland-gray-50 font-semibold" value={formatCurrency(computedAmount)} disabled />
        </Field>

        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="onlinePriority"
            type="checkbox"
            checked={form.onlinePriority}
            onChange={(e) => update('onlinePriority', e.target.checked)}
            className="h-4 w-4 rounded border-afriland-gray-400 text-afriland-red focus:ring-afriland-red"
          />
          <label htmlFor="onlinePriority" className="text-sm text-afriland-gray-600">{t('bordereau.onlinePriority')}</label>
        </div>

        {submitError && <p className="form-error sm:col-span-2">{submitError}</p>}

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={submitting || checkingDuplicate}>
            {submitting ? t('common.loading') : t('common.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, help, children }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-afriland-gray-600">{help}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
