import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuditLogs } from '../../api/auditApi';
import { formatDateTime } from '../../utils/formatters';

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-afriland-black">{t('nav.audit')}</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 font-medium">{log.action.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.target}</td>
                <td className="px-4 py-3">{log.user}</td>
                <td className="px-4 py-3">{formatDateTime(log.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
