import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getEncadreurs, createEncadreur, updateEncadreur } from '../../api/referenceDataApi';
import { REGIONS } from '../../utils/constants';

const EMPTY_FORM = { name: '', region: REGIONS[0] };

export default function EncadreursAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  function reload() {
    setLoading(true);
    getEncadreurs({ onlyActive: false }).then((data) => {
      setEncadreurs(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await createEncadreur(form, user);
      setForm(EMPTY_FORM);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(enc) {
    setEditingId(enc.id);
    setEditValues({ name: enc.name, region: enc.region });
  }

  async function saveEdit(id) {
    await updateEncadreur(id, editValues, user);
    setEditingId(null);
    reload();
  }

  async function toggleActive(enc) {
    await updateEncadreur(enc.id, { active: !enc.active }, user);
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('adminEncadreurs.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('adminEncadreurs.subtitle')}</p>
      </div>

      <form onSubmit={handleCreate} className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          className="form-input"
          placeholder={t('adminEncadreurs.name')}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <select
          className="form-input"
          value={form.region}
          onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
        >
          {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('adminEncadreurs.add')}
        </button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('adminEncadreurs.name')}</th>
              <th className="px-4 py-3">{t('bordereau.region')}</th>
              <th className="px-4 py-3">{t('adminEncadreurs.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>}
            {!loading && encadreurs.map((enc) => (
              <tr key={enc.id}>
                {editingId === enc.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        className="form-input"
                        value={editValues.name}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="form-input"
                        value={editValues.region}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, region: e.target.value }))}
                      >
                        {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">{enc.active ? t('adminEncadreurs.active') : t('adminEncadreurs.inactive')}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => saveEdit(enc.id)}>{t('common.save')}</button>
                        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{enc.name}</td>
                    <td className="px-4 py-3">{enc.region}</td>
                    <td className="px-4 py-3">
                      <span className={enc.active ? 'text-visa-granted font-semibold' : 'text-visa-refused font-semibold'}>
                        {enc.active ? t('adminEncadreurs.active') : t('adminEncadreurs.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => startEdit(enc)}>
                          {t('adminEncadreurs.edit')}
                        </button>
                        <button type="button" className="text-xs font-semibold text-afriland-gray-600 hover:underline" onClick={() => toggleActive(enc)}>
                          {enc.active ? t('adminEncadreurs.deactivate') : t('adminEncadreurs.activate')}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
