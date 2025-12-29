'use client';

import { Phone, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BloqueoNotificationProps {
  estado: 'ACTIVO' | 'BLOQUEADO' | 'BLOQUEADO_DEFINITIVO';
  llamadasPerdidas: number;
  mensaje: string;
  coordinador: {
    nombre: string;
    email: string;
    telefono: string;
  } | null;
  onClose?: () => void;
}

export default function BloqueoNotification({
  estado,
  llamadasPerdidas,
  mensaje,
  coordinador,
  onClose
}: BloqueoNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || estado === 'ACTIVO') return null;

  const esBloqueado = estado === 'BLOQUEADO';
  const esDefinitivo = estado === 'BLOQUEADO_DEFINITIVO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4">
        {/* Card principal */}
        <div className="bg-gradient-to-br from-red-900 to-red-950 rounded-2xl shadow-2xl border border-red-700/50 overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                {esDefinitivo ? (
                  <XCircle className="w-16 h-16 text-white" />
                ) : (
                  <AlertTriangle className="w-16 h-16 text-white" />
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {esDefinitivo ? '⛔ Cuenta Bloqueada' : '⚠️ Cuenta Suspendida'}
            </h2>
            <p className="text-red-100 text-lg">
              {llamadasPerdidas} llamadas perdidas
            </p>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            {/* Mensaje principal */}
            <div className="bg-red-950/50 border border-red-700/30 rounded-xl p-4">
              <p className="text-white text-center leading-relaxed">
                {mensaje}
              </p>
            </div>

            {/* Información de vida extra */}
            {esBloqueado && (
              <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 border border-orange-700/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-orange-300 mb-1">
                      💡 Puedes recuperar tu acceso
                    </h3>
                    <p className="text-orange-100/80 text-sm">
                      Contacta a tu coordinador para que te asigne una <span className="font-semibold">tarea extraordinaria</span>.
                      Al completarla y ser aprobada, ganarás una vida extra y tu cuenta será reactivada.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advertencia de bloqueo definitivo */}
            {esDefinitivo && (
              <div className="bg-gradient-to-br from-purple-900/30 to-red-900/30 border border-purple-700/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-purple-300 mb-1">
                      ⛔ Bloqueo Definitivo
                    </h3>
                    <p className="text-purple-100/80 text-sm">
                      Ya usaste tu vida extra. Tu cuenta permanecerá bloqueada hasta que finalice tu visión actual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información del coordinador */}
            {coordinador && (
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/30 rounded-xl p-5">
                <h3 className="font-bold text-blue-300 mb-4 text-center flex items-center justify-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contacta a tu Coordinador
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-blue-950/40 rounded-lg p-3">
                    <span className="text-blue-200 text-sm">Nombre:</span>
                    <span className="text-white font-semibold">{coordinador.nombre}</span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-blue-950/40 rounded-lg p-3">
                    <span className="text-blue-200 text-sm">Email:</span>
                    <a 
                      href={`mailto:${coordinador.email}`}
                      className="text-cyan-300 hover:text-cyan-200 font-medium underline"
                    >
                      {coordinador.email}
                    </a>
                  </div>
                  
                  <div className="flex items-center justify-between bg-blue-950/40 rounded-lg p-3">
                    <span className="text-blue-200 text-sm">Teléfono:</span>
                    <a 
                      href={`tel:${coordinador.telefono}`}
                      className="text-cyan-300 hover:text-cyan-200 font-medium text-lg"
                    >
                      {coordinador.telefono}
                    </a>
                  </div>
                </div>

                {esBloqueado && (
                  <div className="mt-4 p-3 bg-cyan-900/20 rounded-lg">
                    <p className="text-cyan-100 text-sm text-center">
                      📞 Llámalo para solicitar una tarea extraordinaria
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Botón de cerrar (solo si puede cerrar) */}
            {onClose && estado !== 'BLOQUEADO_DEFINITIVO' && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className="w-full py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all shadow-lg"
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
