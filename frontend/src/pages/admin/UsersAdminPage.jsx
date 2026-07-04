import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getUsers, createUser, updateUser, getEncadreurs } from '../../api/referenceDataApi';
import { AGENCIES, ROLES } from '../../utils/constants';

const EMPTY_FORM = { username: '', password: '', name: '', role: ROLES.OPERATEUR_HADJ, agency: AGENCIES[0], encadreurId: '' };

export default function UsersAdminPage() {
  const { t } = useTranslation();
  const { user: actor } = useAuth();
  const [users, setUsers] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function reload() {
    setLoading(true);
    getUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    getEncadreurs({ onlyActive: false }).then(setEncadreurs);
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { username: form.username.trim(), password: form.password, name: form.name.trim(), role: form.role };
      if (form.role === ROLES.ENCADREUR) {
        payload.encadreurId = form.encadreurId;
      } else {
        payload.agency = form.agency;
      }
      await createUser(payload, actor);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') setError(t('adminUsers.errors.usernameTaken'));
      else setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u) {
    await updateUser(u.id, { active: !u.active }, actor);
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('adminUsers.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('adminUsers.subtitle')}</p>
      </div>

      <form onSubmit={handleCreate} className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input className="form-input" placeholder={t('auth.username')} value={form.username} onChange={(e) => update('username', e.target.value)} />
        <input type="password" className="form-input" placeholder={t('auth.password')} value={form.password} onChange={(e) => update('password', e.target.value)} />
        <input className="form-input" placeholder={t('adminUsers.name')} value={form.name} onChange={(e) => update('name', e.target.value)} />

        <select className="form-input" value={form.role} onChange={(e) => update('role', e.target.value)}>
          {Object.values(ROLES).map((role) => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
        </select>

        {form.role === ROLES.ENCADREUR ? (
          <select className="form-input" value={form.encadreurId} onChange={(e) => update('encadreurId', e.target.value)}>
            <option value="">{t('bordereau.encadreur')}</option>
            {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
          </select>
        ) : (
          <select className="form-input" value={form.agency} onChange={(e) => update('agency', e.target.value)}>
            {AGENCIES.map((agency) => <option key={agency} value={agency}>{agency}</option>)}
          </select>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('adminUsers.add')}
        </button>

        {error && <p className="form-error sm:col-span-2 lg:col-span-3">{error}</p>}
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('auth.username')}</th>
              <th className="px-4 py-3">{t('adminUsers.name')}</th>
              <th className="px-4 py-3">{t('adminUsers.role')}</th>
              <th className="px-4 py-3">{t('adminEncadreurs.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{t(`roles.${u.role}`)}</td>
                <td className="px-4 py-3">
                  <span className={u.active === false ? 'text-visa-refused font-semibold' : 'text-visa-granted font-semibold'}>
                    {u.active === false ? t('adminEncadreurs.inactive') : t('adminEncadreurs.active')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => toggleActive(u)}>
                    {u.active === false ? t('adminEncadreurs.activate') : t('adminEncadreurs.deactivate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
