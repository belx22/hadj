import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { formatDate } from '../../utils/formatters';

// Parcours affiché au pèlerin : le tronc commun (En attente → En cours → Accordé)
// avec deux embranchements terminaux possibles (Refusé) ou intercalaires
// (Complément requis), reconstruits à partir de l'historique réel des statuts.
export default function VisaJourneyStepper({ status, statusHistory = [] }) {
  const { t } = useTranslation();

  const dateFor = (key) => statusHistory.find((h) => h.status === key)?.date;

  const isRefused = status === 'REFUSE';
  const isComplement = status === 'COMPLEMENT_REQUIS';

  const steps = [
    { key: 'EN_ATTENTE', date: dateFor('EN_ATTENTE') },
    { key: 'EN_COURS', date: dateFor('EN_COURS') },
    ...(isComplement ? [{ key: 'COMPLEMENT_REQUIS', date: dateFor('COMPLEMENT_REQUIS'), warn: true }] : []),
    isRefused ? { key: 'REFUSE', date: dateFor('REFUSE'), danger: true } : { key: 'ACCORDE', date: dateFor('ACCORDE') },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending';
        const isLast = index === steps.length - 1;
        return (
          <div key={step.key} className={clsx('flex flex-1 sm:flex-col', !isLast && 'sm:pr-2')}>
            <div className="flex items-center sm:w-full">
              <div
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  state === 'done' && 'bg-visa-granted text-white',
                  state === 'current' && step.danger && 'bg-visa-refused text-white',
                  state === 'current' && step.warn && 'bg-visa-complement text-white',
                  state === 'current' && !step.danger && !step.warn && 'bg-afriland-red text-white',
                  state === 'pending' && 'bg-afriland-gray-200 text-afriland-gray-600'
                )}
              >
                {state === 'done' ? '✓' : index + 1}
              </div>
              {!isLast && (
                <div
                  className={clsx(
                    'mx-2 hidden h-0.5 flex-1 sm:block',
                    state === 'done' ? 'bg-visa-granted' : 'bg-afriland-gray-200'
                  )}
                />
              )}
            </div>
            <div className="mt-2 pl-0 sm:pl-0">
              <p
                className={clsx(
                  'text-sm font-medium',
                  state === 'current' ? 'text-afriland-black' : 'text-afriland-gray-600'
                )}
              >
                {t(`visa.statuses.${step.key}`)}
              </p>
              <p className="text-xs text-afriland-gray-600">{step.date ? formatDate(step.date) : '—'}</p>
            </div>
            {!isLast && <div className="my-2 ml-4 h-4 w-0.5 bg-afriland-gray-200 sm:hidden" />}
          </div>
        );
      })}
    </div>
  );
}
