import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Écoute l'événement déclenché par l'intercepteur Axios en cas de 401 (session
// expirée côté backend) et ramène l'utilisateur à l'écran de connexion.
export default function SessionWatcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const { error } = useToast();

  useEffect(() => {
    function handleUnauthorized() {
      if (isAuthenticated) {
        logout();
        error(t('auth.sessionExpired'));
        navigate('/login/staff');
      }
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [isAuthenticated, logout, error, navigate, t]);

  return null;
}
