import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import jsQR from 'jsqr';

// Modale d'activation caméra + scan continu de QR code (via jsQR). La saisie
// manuelle reste toujours disponible en parallèle — ce composant ne fait
// qu'accélérer le remplissage du formulaire quand un bordereau papier est
// disponible. Un indicateur rouge (pastille + cadre de visée) montre en
// temps réel que le scan est actif, puis se fige au moment de la détection.
export default function QrScannerModal({ onScan, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [error, setError] = useState(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // L'accès caméra (getUserMedia) n'est disponible que dans un contexte
      // sécurisé : HTTPS ou localhost. En HTTP simple (ex : serveur de démo
      // http://IP:port), le navigateur bloque l'API et `navigator.mediaDevices`
      // est indéfini. On le détecte en amont pour afficher un message précis
      // plutôt qu'une erreur générique de permission.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(t('paymentPage.errors.cameraInsecure'));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
          setError(t('paymentPage.errors.cameraDenied'));
        } else {
          setError(t('paymentPage.errors.cameraUnavailable'));
        }
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          setDetected(true);
          window.setTimeout(() => onScan(result.data), 300);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-afriland-black">{t('paymentPage.scanTitle')}</p>
          <button type="button" onClick={onClose} className="text-afriland-gray-400 hover:text-afriland-black" aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        {error ? (
          <p className="form-error">{error}</p>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="w-full rounded-lg" muted playsInline />

              {/* Pastille rouge : indique que le scan est actif en temps réel */}
              <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1">
                <span
                  className={clsx(
                    'h-2 w-2 rounded-full bg-afriland-red',
                    !detected && 'animate-pulse'
                  )}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                  {detected ? t('paymentPage.scanDetected') : t('paymentPage.scanLive')}
                </span>
              </div>

              {/* Cadre de visée rouge : montre où positionner le QR code */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={clsx(
                    'aspect-square w-2/3 rounded-lg border-4 transition-all duration-200',
                    detected ? 'border-afriland-red' : 'border-afriland-red/70'
                  )}
                  style={detected ? { boxShadow: '0 0 0 4px rgba(200,16,46,0.35)' } : undefined}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-afriland-gray-600">{t('paymentPage.scanHelp')}</p>
          </>
        )}

        <button type="button" className="btn-secondary mt-3 w-full" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
