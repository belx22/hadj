import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import AuthLayout from '../../components/layout/AuthLayout';
import { usePilgrim } from '../../context/PilgrimContext';
import { registerPilgrimOnline } from '../../api/visaApi';
import { checkDuplicate } from '../../api/bordereauApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { validateBordereau } from '../../utils/validators';
import { CURRENT_SEASON, PILGRIM_TYPES, REGIONS, isEncadreurPilgrimType } from '../../utils/constants';

// Formulaire volontairement réduit à l'essentiel : le statut (Nouveau) est
// déduit automatiquement. Le montant cible n'est pas affiché ici (il n'apparaît
// qu'une fois connecté, dans l'espace pèlerin). Le choix « avec / sans frais de
// l'encadreur » n'est proposé que pour le type Encadreur.
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
  includesEncadreurFees: false,
  includeInGroupTotal: true,
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
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isEncadreur = isEncadreurPilgrimType(form.pilgrimType);
  // Région et encadreur ne concernent que le pèlerin : un encadreur, un officiel
  // ou un GUH ne se voient pas affecter d'encadreur.
  const isPelerin = form.pilgrimType === 'PELERIN';

  useEffect(() => {
    getEncadreurs({ region: form.region || undefined }).then(setEncadreurs);
  }, [form.region]);

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'pilgrimType' && !isEncadreurPilgrimType(value)) next.includesEncadreurFees = false;
      // En quittant le type Pèlerin, on efface la région et l'encadreur (non
      // pertinents pour encadreur / officiel / GUH).
      if (field === 'pilgrimType' && value !== 'PELERIN') {
        next.region = '';
        next.encadreurId = '';
      }
      return next;
    });
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

    const validationErrors = validateBordereau(form, t, {
      requireAgency: false,
      requireEmail: false,
      requireEncadreur: isPelerin,
      requireRegion: isPelerin,
    });
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
      // Après connexion, on passe d'abord par le dossier avant le paiement.
      navigate('/visa/pelerin/dossier');
    } catch (err) {
      if (err.code === 'DUPLICATE_PILGRIM') {
        setSubmitError(t('bordereau.errors.duplicate', { season: form.season }));
      } else if (err.code === 'DUPLICATE_PHONE') {
        setSubmitError(t('bordereau.errors.duplicatePhone'));
      } else if (err.code === 'ENCADREUR_NOT_REGISTERED') {
        setSubmitError(t('pilgrimRegister.errors.encadreurNotRegistered'));
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

        {/* Région et encadreur : réservés au type Pèlerin. */}
        {isPelerin && (
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
        )}

        {/* Type de pèlerin + nombre de personnes. Pour un pèlerin, le nombre
            correspond aux personnes pour qui il paie ; pour un encadreur, au
            nombre de pèlerins qu'il gère. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <Field
            label={isEncadreur ? t('pilgrimRegister.pilgrimsToManage') : t('pilgrimRegister.personsToPay')}
            error={errors.pilgrimCount}
            required
          >
            <input
              type="number"
              min="1"
              inputMode="numeric"
              className={clsx('form-input', errors.pilgrimCount && 'form-input-error')}
              value={form.pilgrimCount}
              onChange={(e) => update('pilgrimCount', e.target.value)}
            />
          </Field>
        </div>

        {/* L'encadreur paie ses frais sans commission ; il choisit d'intégrer son
            propre montant au total à collecter de son groupe, ou de le suivre à part. */}
        {isEncadreur && (
          <Field label={t('pilgrimRegister.includeInGroupTotal')} help={t('pilgrimRegister.includeInGroupTotalHelp')}>
            <select
              className="form-input"
              value={form.includeInGroupTotal ? 'YES' : 'NO'}
              onChange={(e) => update('includeInGroupTotal', e.target.value === 'YES')}
            >
              <option value="YES">{t('pilgrimRegister.includeInGroupYes')}</option>
              <option value="NO">{t('pilgrimRegister.includeInGroupNo')}</option>
            </select>
          </Field>
        )}

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
