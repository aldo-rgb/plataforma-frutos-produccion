'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[#050B14]">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              ⚠️ Error del Sistema
            </h1>
            <p className="text-gray-400 mb-6">
              Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
