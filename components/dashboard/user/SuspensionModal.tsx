'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, Coins, UserCheck } from 'lucide-react';

interface SuspensionModalProps {
  missedCallsCount: number;
  maxMissedAllowed: number;
  extraLifeUsed: boolean;
  cycleEndDate?: Date | null;
  enrollmentId?: string;
  onClose?: () => void;
  onPurchaseSuccess?: () => void;
}

export default function SuspensionModal({
  missedCallsCount,
  maxMissedAllowed,
  extraLifeUsed,
  cycleEndDate,
  enrollmentId,
  onClose,
  onPurchaseSuccess
}: SuspensionModalProps) {
  const [showModal, setShowModal] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!enrollmentId) {
      setError('No se encontró el enrollment del usuario');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch('/api/user/purchase-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId })
      });

      const data = await res.json();

      if (res.ok) {
        onPurchaseSuccess?.();
        setShowModal(false);
        // Recargar la página para reflejar los cambios
        window.location.reload();
      } else {
        setError(data.error || 'Error al comprar vida extra');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    onClose?.();
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Fin del ciclo';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 rounded-2xl max-w-2xl w-full border border-red-500/30 shadow-2xl shadow-red-500/20 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-600 to-red-700 p-6">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <AlertTriangle className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sistema Suspendido</h2>
              <p className="text-red-100/80 text-sm mt-1">
                Llamadas de Disciplina - Límite Alcanzado
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Status */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-red-300 font-medium">Faltas Acumuladas</span>
              <span className="text-4xl font-bold text-red-400">
                {missedCallsCount}/{maxMissedAllowed}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                style={{ width: `${(missedCallsCount / maxMissedAllowed) * 100}%` }}
              />
            </div>
          </div>

          {/* Message */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-300 text-center leading-relaxed">
              Has alcanzado el límite de <span className="text-red-400 font-bold">{maxMissedAllowed} faltas</span> en tus llamadas de disciplina. 
              Tu sistema permanecerá <span className="text-red-400 font-bold">suspendido</span> hasta el{' '}
              <span className="text-white font-semibold">{formatDate(cycleEndDate)}</span>.
            </p>
          </div>

          {/* Options */}
          {!extraLifeUsed && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center mb-6">
                ¿Cómo recuperar acceso?
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Opción 1: Coordinador */}
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-500/20 p-3 rounded-lg">
                      <UserCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">Coordinador</h4>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Contacta a tu coordinador para solicitar una <span className="text-purple-400 font-semibold">tarea extraordinaria</span>. 
                    Al completarla exitosamente, te otorgará una vida extra.
                  </p>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-xs text-purple-300">
                    <strong>Nota:</strong> Solo puedes obtener 1 vida extra por ciclo
                  </div>
                </div>

                {/* Opción 2: Puntos Cuánticos */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-yellow-500/20 p-3 rounded-lg">
                      <Coins className="h-6 w-6 text-yellow-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">Comprar Vida</h4>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Usa <span className="text-yellow-400 font-semibold">500 Puntos Cuánticos</span> para comprar una vida extra 
                    y reactivar tu acceso inmediatamente.
                  </p>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-semibold py-3 rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? 'Procesando...' : 'Comprar Vida - 500 PC'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {extraLifeUsed && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <p className="text-gray-400">
                Ya has utilizado tu vida extra en este ciclo. Tu sistema permanecerá en <span className="text-red-400 font-semibold">modo escala de grises</span> hasta el inicio del próximo ciclo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900/50 px-8 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Este sistema permanecerá en <span className="text-gray-400 font-semibold">modo escala de grises</span> hasta que se reactive tu acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
