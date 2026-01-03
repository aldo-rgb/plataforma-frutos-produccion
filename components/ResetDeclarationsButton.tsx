'use client';

import { useState } from 'react';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

interface ResetDeclarationsButtonProps {
  onReset?: () => void;
}

export default function ResetDeclarationsButton({ onReset }: ResetDeclarationsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canReset, setCanReset] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const checkCanReset = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/student/reset-declarations');
      const data = await res.json();
      
      if (data.success) {
        setCanReset(data.canReset);
        setReason(data.reason);
        if (data.canReset) {
          setShowModal(true);
        } else {
          setShowBlockedModal(true);
        }
      }
    } catch (error) {
      console.error('Error al verificar reinicio:', error);
      alert('Error al verificar si puedes reiniciar');
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/reset-declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ ' + data.message);
        setShowModal(false);
        
        // Recargar la página para reflejar cambios
        window.location.reload();
        
        if (onReset) onReset();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      console.error('Error al reiniciar declaraciones:', error);
      alert('Error al reiniciar declaraciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={checkCanReset}
        disabled={checking}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
      >
        {checking ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <RotateCcw className="w-5 h-5" />
        )}
        Reiniciar Declaraciones
      </button>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">¿Reiniciar Declaraciones?</h2>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm leading-relaxed">
                Esta acción <strong>eliminará todas tus declaraciones</strong>, objetivos, acciones y frecuencias actuales.
              </p>
              <p className="text-yellow-200 text-sm mt-2">
                Tendrás que completar el wizard desde cero.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong>¿Por qué reiniciar?</strong>
              </p>
              <ul className="text-blue-200 text-xs mt-2 space-y-1 list-disc list-inside">
                <li>Cambio significativo en tu vida</li>
                <li>Nueva perspectiva o enfoque</li>
                <li>Unirse a una nueva visión/programa</li>
                <li>Actualizar completamente tus metas</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    Sí, Reiniciar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de bloqueo por ciclo activo */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
            {/* Efecto de brillo animado */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl animate-pulse">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Ciclo en Progreso</h2>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5 mb-6">
              <p className="text-purple-100 text-base leading-relaxed font-medium">
                {reason}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong className="text-blue-300">💡 ¿Qué puedes hacer?</strong>
              </p>
              <ul className="text-blue-200 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Completa tu ciclo actual</li>
                <li>Espera a que termine la visión</li>
                <li>Luego podrás reiniciar tus declaraciones</li>
              </ul>
            </div>

            <button
              onClick={() => setShowBlockedModal(false)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
