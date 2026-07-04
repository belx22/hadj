import clsx from 'clsx';
import { useToast } from '../../context/ToastContext';

const TYPE_STYLES = {
  success: 'border-visa-granted/30 bg-white text-visa-granted',
  error: 'border-visa-refused/30 bg-white text-visa-refused',
  info: 'border-afriland-gray-400 bg-white text-afriland-black',
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={clsx(
            'pointer-events-auto flex w-full max-w-sm items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg',
            TYPE_STYLES[toast.type]
          )}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-afriland-gray-400 hover:text-afriland-black"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
