// Chargement paresseux du widget Payment Hub (fenêtre de règlement hébergée).
// Le script n'est injecté qu'au moment où le pèlerin lance un paiement en ligne.
const WIDGET_URL = 'https://pay.bbcomplex.com/widget/pay.js';

let loading = null;

export function loadPayHub() {
  if (typeof window !== 'undefined' && window.PayHub) return Promise.resolve(window.PayHub);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WIDGET_URL;
    script.async = true;
    script.onload = () => {
      if (window.PayHub) resolve(window.PayHub);
      else reject(new Error('PAYHUB_UNAVAILABLE'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('PAYHUB_LOAD_FAILED'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
