import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Copilote Hadj — erreur applicative interceptée :', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-afriland-gray-50 px-4 text-center">
          <p className="text-4xl font-bold text-afriland-red">⚠</p>
          <p className="text-lg font-semibold text-afriland-black">{"Une erreur inattendue s'est produite"}</p>
          <p className="max-w-sm text-sm text-afriland-gray-600">
            {"Veuillez recharger la page. Si le problème persiste, contactez l'administrateur DSI."}
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => window.location.assign('/')}>
            {"Retour à l'accueil"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
