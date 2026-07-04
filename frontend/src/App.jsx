import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ToastViewport from './components/ui/ToastViewport';
import { AuthProvider } from './context/AuthContext';
import { PilgrimProvider } from './context/PilgrimContext';
import { ToastProvider } from './context/ToastContext';
import SessionWatcher from './components/ui/SessionWatcher';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <PilgrimProvider>
              <SessionWatcher />
              <AppRouter />
              <ToastViewport />
            </PilgrimProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
