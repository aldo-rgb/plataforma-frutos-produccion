'use client';

import { useEffect, useState } from 'react';
import { MapPin, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface DetectorZonaHorariaProps {
  userTimezone: string;
  onUpdateConfirm: (newTimezone: string) => void;
}

export default function DetectorZonaHoraria({ userTimezone, onUpdateConfirm }: DetectorZonaHorariaProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [detectedZone, setDetectedZone] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    // 1. Obtener la zona real del navegador donde está el usuario AHORA
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 2. Comparar con la zona guardada en la Base de Datos
    if (userTimezone && browserZone !== userTimezone) {
      setDetectedZone(browserZone);
      setShowBanner(true);
    }
  }, [userTimezone]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/user/update-timezone', {
        method: 'POST',
        body: JSON.stringify({ timezone: detectedZone }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        setShowBanner(false);
        onUpdateConfirm(detectedZone);
        setShowSuccessModal(true);
        
        // Recargar después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error actualizando zona horaria:', error);
      setShowErrorModal(true);
    } finally {
      setUpdating(false);
    }
  };

  if (!showBanner && !showSuccessModal && !showErrorModal) return null;

  return (
    <>
      {/* Modal de detección - Centrado y elegante */}
      {showBanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-2xl shadow-2xl border border-indigo-500/50 max-w-2xl w-full mx-4 animate-in zoom-in duration-300 overflow-hidden">
            
            {/* Header con icono animado */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16"></div>
              
              <div className="relative flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl animate-pulse shadow-lg">
                  <MapPin className="text-yellow-300 w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Nueva Zona Horaria Detectada
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    Actualiza tu perfil para ver horarios correctos
                  </p>
                </div>
              </div>
            </div>

            {/* Body con información */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-lg mt-1">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Parece que has viajado o cambiado de ubicación. Tu perfil está configurado para 
                      <span className="font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded mx-1">
                        {userTimezone}
                      </span>
                      pero detectamos que estás en
                      <span className="font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded mx-1">
                        {detectedZone}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-300 space-y-1">
                    <p className="font-semibold text-white">Al actualizar tus horarios:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Tus llamadas de disciplina se ajustarán automáticamente</li>
                      <li>Las mentorías mostrarán horarios correctos</li>
                      <li>Tu disponibilidad se sincronizará con la nueva zona</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="bg-slate-900/50 backdrop-blur-sm p-6 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowBanner(false)}
                disabled={updating}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Mantener horario actual
              </button>
              
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className={`w-5 h-5 ${updating ? 'animate-spin' : ''}`} />
                {updating ? 'Actualizando...' : 'Actualizar mis horarios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-green-500/30 p-8 max-w-md w-full mx-4 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-green-500/20 rounded-full p-4 mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                ¡Zona Horaria Actualizada!
              </h3>
              
              <p className="text-slate-300 mb-4">
                Tus horarios ahora se muestran en <span className="font-mono text-green-400">{detectedZone}</span>
              </p>
              
              <div className="bg-slate-800/50 rounded-lg p-4 w-full mb-6">
                <p className="text-sm text-slate-400">
                  Recargando la página para aplicar los cambios...
                </p>
                <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-red-500/30 p-8 max-w-md w-full mx-4 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/20 rounded-full p-4 mb-4">
                <AlertCircle className="w-16 h-16 text-red-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                Error al Actualizar
              </h3>
              
              <p className="text-slate-300 mb-6">
                No pudimos actualizar tu zona horaria. Por favor, intenta de nuevo más tarde.
              </p>
              
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
