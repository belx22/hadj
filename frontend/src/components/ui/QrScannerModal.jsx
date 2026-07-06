import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jsQR from 'jsqr';

// Modale d'activation caméra + scan continu de QR code (via jsQR). La saisie
// manuelle reste toujours disponible en parallèle — ce composant ne fait
// qu'accélérer le remplissage du formulaire quand un bordereau papier est
// disponible.
export default function QrScannerModal({ onScan, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
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
      } catch {
        if (!cancelled) setError(t('paymentPage.errors.cameraUnavailable'));
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
          onScan(result.data);
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
            <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
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
