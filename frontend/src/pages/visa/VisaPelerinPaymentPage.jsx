import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePilgrim } from '../../context/PilgrimContext';
import {
  createVersementOnline,
  createGroupedVersementOnline,
  lookupBeneficiary,
  getOnlinePaymentConfig,
  createOnlinePayment,
  confirmOnlinePayment,
} from '../../api/visaApi';
import { loadPayHub } from '../../utils/paymentHub';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import PilgrimBottomNav from '../../components/layout/PilgrimBottomNav';
import PilgrimTopNav from '../../components/layout/PilgrimTopNav';
import StatCard from '../../components/ui/StatCard';
import PaymentCodeCard from '../../components/ui/PaymentCodeCard';
import QrScannerModal from '../../components/ui/QrScannerModal';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, formatDate, formatAccountNumber, normalizeAccountNumber } from '../../utils/formatters';
import { AGENCIES, VERSEMENT_METHODS, VERSEMENT_STATUS_COLORS, getAgencyByCode } from '../../utils/constants';
import { parseVersementQrCode } from '../../utils/qrcode';

const EMPTY_FORM = { method: 'MOBILE_MONEY_ORANGE', amount: '', reference: '', agency: '', receiptImage: null, receiptImageName: '', otherDetails: '', accountNumber: '' };
const EMPTY_BENEFICIARY = { idNumber: '', amount: '', lookup: null };
const MAX_RECEIPT_SIZE = 1_500_000; // ~1.5 Mo avant encodage base64

export default function VisaPelerinPaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, login, logout } = usePilgrim();

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([{ ...EMPTY_BENEFICIARY }]);
  const [groupResult, setGroupResult] = useState(null);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(dossier?.versements || []);

  // Le bouton « Payer en ligne » n'apparaît que si le Payment Hub est activé et
  // configuré côté serveur (la clé d'API et le secret n'atteignent jamais le navigateur).
  useEffect(() => {
    getOnlinePaymentConfig()
      .then((c) => setOnlineEnabled(Boolean(c?.enabled)))
      .catch(() => setOnlineEnabled(false));
  }, []);

  if (!dossier) {
    return <Navigate to="/visa/pelerin" replace />;
  }

  const remaining = dossier.balance - dossier.pendingAmount;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function handleReceiptChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECEIPT_SIZE) {
      setError(t('paymentPage.errors.receiptTooLarge'));
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, receiptImage: reader.result, receiptImageName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  function handleLogout() {
    logout();
    navigate('/visa/pelerin');
  }

  function updateBeneficiary(index, field, value) {
    setBeneficiaries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value, lookup: field === 'idNumber' ? null : row.lookup } : row))
    );
    setError(null);
  }

  function addBeneficiary() {
    setBeneficiaries((prev) => [...prev, { ...EMPTY_BENEFICIARY }]);
  }

  function removeBeneficiary(index) {
    setBeneficiaries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleBeneficiaryLookup(index) {
    const idNumber = beneficiaries[index].idNumber.trim();
    if (!idNumber) return;
    setBeneficiaries((prev) => prev.map((row, i) => (i === index ? { ...row, lookup: { checking: true } } : row)));
    const result = await lookupBeneficiary(idNumber, dossier.season);
    setBeneficiaries((prev) => prev.map((row, i) => (i === index ? { ...row, lookup: result } : row)));
  }

  function handleQrScanned(rawText) {
    setScannerOpen(false);
    const parsed = parseVersementQrCode(rawText);
    if (!parsed.valid) {
      setError(t('paymentPage.errors.qrInvalid'));
      return;
    }
    setQrData(parsed);
    setError(null);
    setForm((prev) => ({
      ...prev,
      reference: parsed.reference,
      agency: getAgencyByCode(parsed.agencyCode) || prev.agency,
      amount: parsed.montant != null ? String(parsed.montant) : prev.amount,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setGroupResult(null);

    if (form.method === 'AGENCE' && (!form.agency || !form.reference.trim())) {
      setError(t('paymentPage.errors.agencyRefRequired'));
      return;
    }
    if (form.method !== 'AGENCE' && !form.reference.trim()) {
      setError(t('paymentPage.errors.mobileRefRequired'));
      return;
    }
    if (form.method === 'AUTRE' && !form.otherDetails.trim()) {
      setError(t('paymentPage.errors.otherDetailsRequired'));
      return;
    }

    if (isGrouped) {
      if (beneficiaries.some((b) => !b.idNumber.trim() || !b.lookup?.found)) {
        setError(t('paymentPage.errors.beneficiaryNotFound'));
        return;
      }
      if (beneficiaries.some((b) => !Number(b.amount) || Number(b.amount) <= 0)) {
        setError(t('paymentPage.errors.amountRequired'));
        return;
      }

      setSubmitting(true);
      try {
        const result = await createGroupedVersementOnline(dossier.idNumber, dossier.phone, {
          method: form.method,
          reference: form.reference.trim(),
          agency: form.method === 'AGENCE' ? form.agency : null,
          receiptImage: form.method === 'AGENCE' ? form.receiptImage : null,
          qrData: form.method === 'AGENCE' ? qrData : null,
          otherDetails: form.method === 'AUTRE' ? form.otherDetails.trim() : null,
          accountNumber: form.accountNumber.trim() || null,
          beneficiaries: beneficiaries.map((b) => ({ idNumber: b.idNumber.trim(), amount: Number(b.amount) })),
        });
        await login(dossier.idNumber, dossier.phone);
        setForm(EMPTY_FORM);
        setQrData(null);
        setBeneficiaries([{ ...EMPTY_BENEFICIARY }]);
        setGroupResult(result);
        setSuccess(true);
      } catch (err) {
        setError(err.code === 'AMOUNT_TOO_HIGH' ? t('paymentPage.errors.amountTooHigh') : t('common.error'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Pas de paiement fractionné : le pèlerin règle la totalité de la somme
    // exigée en une seule fois (montant = solde restant).
    const amount = remaining;
    if (!amount || amount <= 0) {
      setError(t('paymentPage.errors.amountRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await createVersementOnline(dossier.idNumber, dossier.phone, {
        method: form.method,
        amount,
        reference: form.reference.trim(),
        agency: form.method === 'AGENCE' ? form.agency : null,
        receiptImage: form.method === 'AGENCE' ? form.receiptImage : null,
        qrData: form.method === 'AGENCE' ? qrData : null,
        otherDetails: form.method === 'AUTRE' ? form.otherDetails.trim() : null,
        accountNumber: form.accountNumber.trim() || null,
      });
      await login(dossier.idNumber, dossier.phone);
      setForm(EMPTY_FORM);
      setQrData(null);
      setSuccess(true);
    } catch (err) {
      setError(err.code === 'PARTIAL_NOT_ALLOWED' ? t('paymentPage.errors.fullAmountRequired') : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  // Paiement en ligne : le serveur crée le paiement (clé d'API côté serveur) et
  // renvoie l'adresse de règlement ; on ouvre la fenêtre du Hub. Au succès on
  // reconfirme auprès du serveur (source de vérité) avant d'afficher le résultat.
  async function handlePayOnline() {
    setError(null);
    setSuccess(false);
    setPayingOnline(true);
    try {
      const { paymentId, checkoutUrl } = await createOnlinePayment(dossier.idNumber, dossier.phone);
      const PayHub = await loadPayHub();
      PayHub.open({
        checkoutUrl,
        onSuccess: async () => {
          try {
            await confirmOnlinePayment(paymentId);
            await login(dossier.idNumber, dossier.phone);
            setSuccess(true);
          } catch {
            setError(t('common.error'));
          } finally {
            setPayingOnline(false);
          }
        },
        onError: () => {
          setError(t('paymentPage.online.failed'));
          setPayingOnline(false);
        },
        onClose: () => setPayingOnline(false),
      });
    } catch (err) {
      setError(err.code === 'NOTHING_DUE' ? t('paymentPage.complete') : t('paymentPage.online.unavailable'));
      setPayingOnline(false);
    }
  }

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        <button type="button" onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
          {t('common.logout')}
        </button>
      </Header>
      <PilgrimTopNav />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-afriland-black">{t('paymentPage.title')}</h1>
            <p className="text-sm text-afriland-gray-600">
              {dossier.pilgrimFirstName} {dossier.pilgrimLastName} — {dossier.idNumber}
            </p>
          </div>
          <Link to="/visa/pelerin/dossier" className="text-sm font-semibold text-afriland-red hover:underline">
            {t('paymentPage.backToDossier')}
          </Link>
        </div>

        <PaymentCodeCard code={dossier.paymentCode} />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label={t('paymentPage.target')} value={formatCurrency(dossier.targetAmount)} />
          <StatCard label={t('paymentPage.validated')} value={formatCurrency(dossier.amountPaid)} accent="text-visa-granted" />
          <StatCard label={t('paymentPage.pending')} value={formatCurrency(dossier.pendingAmount)} accent="text-visa-pending" />
          <StatCard label={t('paymentPage.remaining')} value={formatCurrency(Math.max(remaining, 0))} accent="text-afriland-red" />
        </div>

        {success && (
          <div className="card border-visa-pending/40 bg-visa-pending/5">
            <p className="text-sm font-semibold text-yellow-800">{t('paymentPage.pendingNotice')}</p>
            {groupResult && (
              <div className="mt-3 space-y-1 text-xs text-afriland-gray-700">
                <p className="font-semibold text-afriland-black">
                  {t('paymentPage.groupedPayment.confirmation', { id: groupResult.groupPaymentId })}
                </p>
                {groupResult.beneficiaries.map((b) => (
                  <p key={b.idNumber}>
                    {b.name} ({b.idNumber}) — {formatCurrency(b.amount)}
                    {b.encadreurCode ? ` — ${t('bordereau.encadreur')}: ${b.encadreurCode}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {remaining <= 0 && (
          <div className="card border-visa-granted/30 bg-visa-granted/5">
            <p className="text-sm font-semibold text-visa-granted">{t('paymentPage.complete')}</p>
          </div>
        )}

        {onlineEnabled && remaining > 0 && (
          <div className="card space-y-3 border-afriland-red/30 bg-afriland-red/5">
            <div>
              <p className="text-sm font-semibold text-afriland-black">{t('paymentPage.online.title')}</p>
              <p className="text-xs text-afriland-gray-600">{t('paymentPage.online.help')}</p>
            </div>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handlePayOnline}
              disabled={payingOnline}
            >
              {payingOnline ? t('common.loading') : t('paymentPage.online.pay', { amount: formatCurrency(remaining) })}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
            <p className="text-sm font-semibold text-afriland-black">{t('paymentPage.newPayment')}</p>

            <label className="flex items-center gap-2 text-sm text-afriland-gray-700">
              <input
                type="checkbox"
                checked={isGrouped}
                onChange={(e) => {
                  setIsGrouped(e.target.checked);
                  setError(null);
                }}
              />
              {t('paymentPage.groupedPayment.toggle')}
            </label>
            {isGrouped && <p className="text-xs text-afriland-gray-600">{t('paymentPage.groupedPayment.help')}</p>}

            <div>
              <label className="form-label" htmlFor="payment-method">{t('paymentPage.method')}</label>
              {/* Menu déroulant : les champs additionnels s'affichent selon le
                  moyen de paiement choisi (agence → scan/reçu, autre → précision). */}
              <select
                id="payment-method"
                className="form-input"
                value={form.method}
                onChange={(e) => update('method', e.target.value)}
              >
                {VERSEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{t(`paymentPage.methods.${method}`)}</option>
                ))}
              </select>
            </div>

            {form.method === 'AGENCE' && (
              <div className="rounded-md border border-dashed border-afriland-gray-400 p-3">
                <p className="text-sm font-medium text-afriland-black">{t('paymentPage.scanCta')}</p>
                <p className="mt-1 text-xs text-afriland-gray-600">{t('paymentPage.scanCtaHelp')}</p>
                <button type="button" className="btn-secondary mt-2" onClick={() => setScannerOpen(true)}>
                  {t('paymentPage.scanButton')}
                </button>
                {qrData && (
                  <div className="mt-3 rounded-md bg-afriland-gray-50 p-3 text-xs text-afriland-gray-600">
                    <p className="mb-1 font-semibold text-visa-granted">{t('paymentPage.scanSuccess')}</p>
                    <p>{t('paymentPage.qrAccountNumber')} : <span className="font-mono">{qrData.accountNumber}</span></p>
                    <p>{t('paymentPage.qrOperationDate')} : {qrData.operationDate ? formatDate(qrData.operationDate) : '—'}</p>
                    <p>{t('paymentPage.qrCodeCaisse')} : <span className="font-mono">{qrData.codeCaisse}</span></p>
                    <p>{t('paymentPage.qrTypeOperation')} : {qrData.typeOperation || '—'}</p>
                  </div>
                )}
              </div>
            )}

            {form.method === 'AGENCE' && (
              <div>
                <label className="form-label">{t('bordereau.agency')}</label>
                <select className="form-input" value={form.agency} onChange={(e) => update('agency', e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {AGENCIES.map((agency) => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
            )}

            {form.method === 'AGENCE' && (
              <div>
                <label className="form-label">{t('paymentPage.receiptUpload')}</label>
                <input type="file" accept="image/*,.pdf" className="form-input" onChange={handleReceiptChange} />
                {form.receiptImageName && (
                  <p className="mt-1 text-xs text-visa-granted">{t('paymentPage.receiptAttached', { name: form.receiptImageName })}</p>
                )}
                <p className="mt-1 text-xs text-afriland-gray-600">{t('paymentPage.receiptUploadHelp')}</p>
              </div>
            )}

            <div>
              <label className="form-label">
                {form.method === 'AGENCE' ? t('paymentPage.agencyReference') : t('paymentPage.mobileReference')}
              </label>
              <input className="form-input" value={form.reference} onChange={(e) => update('reference', e.target.value)} />
            </div>

            {form.method === 'AUTRE' && (
              <div>
                <label className="form-label">{t('paymentPage.otherDetails')}</label>
                <input
                  className="form-input"
                  value={form.otherDetails}
                  onChange={(e) => update('otherDetails', e.target.value)}
                  placeholder={t('paymentPage.otherDetailsPlaceholder')}
                />
              </div>
            )}

            <div>
              <label className="form-label">
                {t('paymentPage.accountNumber')} <span className="text-afriland-gray-400">({t('common.optional')})</span>
              </label>
              {/* Saisi/affiché groupé (1005 0001 00000043207 68) mais stocké en
                  chiffres seuls (100500010000004320768) côté système. */}
              <input
                className="form-input font-mono"
                inputMode="numeric"
                value={formatAccountNumber(form.accountNumber)}
                onChange={(e) => update('accountNumber', normalizeAccountNumber(e.target.value))}
                placeholder={t('paymentPage.accountNumberPlaceholder')}
              />
            </div>

            {isGrouped ? (
              <div className="space-y-3">
                <label className="form-label">{t('paymentPage.groupedPayment.beneficiaries')}</label>
                {beneficiaries.map((b, index) => (
                  <div key={index} className="space-y-1 rounded-md border border-afriland-gray-300 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
                      <input
                        className="form-input"
                        placeholder={t('bordereau.idNumber')}
                        value={b.idNumber}
                        onChange={(e) => updateBeneficiary(index, 'idNumber', e.target.value)}
                        onBlur={() => handleBeneficiaryLookup(index)}
                      />
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        placeholder={t('paymentPage.amount')}
                        value={b.amount}
                        onChange={(e) => updateBeneficiary(index, 'amount', e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                        onClick={() => removeBeneficiary(index)}
                        disabled={beneficiaries.length === 1}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                    {b.lookup?.checking && (
                      <p className="text-xs text-afriland-gray-600">{t('common.loading')}</p>
                    )}
                    {b.lookup && !b.lookup.checking && b.lookup.found && (
                      <p className="text-xs text-visa-granted">
                        {b.lookup.name} — {t('bordereau.encadreur')}: {b.lookup.encadreurCode || '—'}
                      </p>
                    )}
                    {b.lookup && !b.lookup.checking && b.lookup.found === false && (
                      <p className="text-xs text-visa-refused">{t('paymentPage.groupedPayment.notFound')}</p>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-secondary text-xs" onClick={addBeneficiary}>
                  {t('paymentPage.groupedPayment.addBeneficiary')}
                </button>
                <p className="text-xs text-afriland-gray-600">
                  {t('paymentPage.groupedPayment.total', {
                    amount: formatCurrency(beneficiaries.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)),
                  })}
                </p>
              </div>
            ) : remaining > 0 ? (
              <div>
                <label className="form-label">{t('paymentPage.amount')}</label>
                {/* Paiement en une fois : montant figé au solde total exigé. */}
                <div className="form-input flex items-center justify-between bg-afriland-gray-50">
                  <span className="font-bold text-afriland-red">{formatCurrency(remaining)}</span>
                  <span className="text-xs text-afriland-gray-600">{t('paymentPage.fullAmountOnly')}</span>
                </div>
                <p className="mt-1 text-xs text-afriland-gray-600">{t('paymentPage.noInstallmentHelp')}</p>
              </div>
            ) : (
              <p className="text-xs text-afriland-gray-600">{t('paymentPage.groupedPayment.ownComplete')}</p>
            )}

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={submitting || (!isGrouped && remaining <= 0)}>
              {submitting ? t('common.loading') : t('paymentPage.submit')}
            </button>
        </form>

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('visa.paymentHistory')}</p>
          {/* Défilement horizontal sur mobile : le tableau garde une largeur
              minimale lisible plutôt que d'écraser ses colonnes. */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.date')}</th>
                <th className="py-2">{t('paymentPage.method')}</th>
                <th className="py-2">{t('paymentPage.reference')}</th>
                <th className="py-2 text-right">{t('bordereau.amountPaid')}</th>
                <th className="py-2 text-right">{t('paymentPage.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {pageItems.map((v) => {
                const colors = VERSEMENT_STATUS_COLORS[v.status];
                return (
                  <tr key={v.id}>
                    <td className="py-2">{formatDate(v.createdAt)}</td>
                    <td className="py-2">{t(`paymentPage.methods.${v.method}`)}</td>
                    <td className="py-2 font-mono text-xs">{v.reference}</td>
                    <td className="py-2 text-right">{formatCurrency(v.amount)}</td>
                    <td className="py-2 text-right">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', colors.bg, colors.text)}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', colors.dot)} />
                        {t(`paymentPage.statuses.${v.status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {dossier.versements.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="-mx-5 -mb-5 mt-3">
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      </main>

      <Footer />
      <PilgrimBottomNav />

      {scannerOpen && (
        <QrScannerModal onScan={handleQrScanned} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}
