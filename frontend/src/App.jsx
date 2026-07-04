import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PilgrimProvider } from './context/PilgrimContext';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PilgrimProvider>
          <AppRouter />
        </PilgrimProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
