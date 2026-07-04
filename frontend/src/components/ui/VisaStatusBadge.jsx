import { useTranslation } from 'react-i18next';
import { VISA_STATUS_COLORS } from '../../utils/constants';

export default function VisaStatusBadge({ status }) {
  const { t } = useTranslation();
  const colors = VISA_STATUS_COLORS[status] || VISA_STATUS_COLORS.EN_ATTENTE;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {t(`visa.statuses.${status}`)}
    </span>
  );
}
