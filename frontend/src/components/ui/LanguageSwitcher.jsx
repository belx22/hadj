import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();

  return (
    <div className={`inline-flex items-center rounded-full border border-afriland-gray-400 bg-white p-1 ${className}`}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            i18n.language === lang.code
              ? 'bg-afriland-red text-white'
              : 'text-afriland-gray-600 hover:bg-afriland-gray-50'
          }`}
          aria-pressed={i18n.language === lang.code}
        >
          {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
