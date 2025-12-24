'use client';

import { useState, useEffect } from 'react';
import { Heart, Sparkles, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface PurchaseLifeModalProps {
  enrollmentId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseLifeModal({ enrollmentId, isOpen, onClose, onSuccess }: PurchaseLifeModalProps) {
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarInfo();
    }
  }, [isOpen, enrollmentId]);

  const cargarInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/user/purchase-life?enrollmentId=${enrollmentId}`);
      const data = await res.json();

      if (data.success) {
        setInfo(data);
      } else {
        setError(data.error || 'Error cargando información');
      }
    } catch (err) {
      console.error('Error cargando info:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarCompra = async () => {
    if (!confirm('¿Estás seguro de que deseas comprar una vida extra?\n\nEsto te costará ' + info.cost + ' puntos cuánticos y reseteará tus strikes a 0.')) {
      return;
    }

    setComprando(true);
    setError(null);

    try {
      const res = await fetch('/api/user/purchase-life', {
        method: 'POST',
        body: JSON.stringify({ enrollmentId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nPuntos gastados: ${data.pointsSpent}\nPuntos restantes: ${data.remainingPoints}`);
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Error al procesar compra');
      }
    } catch (err) {
      console.error('Error comprando vida:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setComprando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f111a] border-2 border-purple-500/30 rounded-2xl max-w-md w-full shadow-2xl">
        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Heart className="text-white fill-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Comprar Vida Extra</h3>
                <p className="text-xs text-gray-400">Recupera tus oportunidades con puntos cuánticos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              disabled={comprando}
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Cargando información...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertTriangle className="mx-auto mb-3 text-red-500" size={48} />
              <p className="text-red-400 font-medium mb-2">Error</p>
              <p className="text-gray-400 text-sm">{error}</p>
              <button
                onClick={cargarInfo}
                className="mt-4 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Reintentar
              </button>
            </div>
          ) : info ? (
            <div className="space-y-4">
              {/* ADVERTENCIA SI YA USÓ VIDA EXTRA */}
              {info.extraLifeUsed && (
                <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="text-red-400 font-bold mb-1">Vida Extra No Disponible</h4>
                      <p className="text-sm text-gray-300 mb-2">
                        Ya utilizaste tu única vida extra disponible en este programa.
                      </p>
                      <p className="text-xs text-gray-400">
                        <strong>Otorgada por:</strong> {
                          info.extraLifeGrantedBy === 'COORDINADOR' ? 'Coordinador' :
                          info.extraLifeGrantedBy === 'DIRECTOR' ? 'Director' :
                          info.extraLifeGrantedBy === 'ADMIN' ? 'Administrador' :
                          'Compra con puntos'
                        }
                      </p>
                      {info.extraLifeGrantedAt && (
                        <p className="text-xs text-gray-400">
                          <strong>Fecha:</strong> {new Date(info.extraLifeGrantedAt).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ESTADO ACTUAL */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <p className="text-xs text-gray-400 mb-2">Tu estado actual</p>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(info.maxStrikes)].map((_, i) => {
                        const vidasRestantes = info.maxStrikes - info.currentStrikes;
                        return (
                          <Heart 
                            key={i} 
                            size={16}
                            className={i < vidasRestantes ? 'text-red-500 fill-red-500' : 'text-gray-600'} 
                          />
                        );
                      })}
                    </div>
                    <span className="text-sm font-bold text-gray-200">
                      {info.maxStrikes - info.currentStrikes}/{info.maxStrikes} vidas
                    </span>
                  </div>
                </div>
                
                {info.currentStrikes > 0 && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-500/30">
                    <AlertTriangle size={14} />
                    <span>Tienes {info.currentStrikes} {info.currentStrikes === 1 ? 'falta registrada' : 'faltas registradas'}</span>
                  </div>
                )}

                {info.isSuspended && (
                  <div className="flex items-center gap-2 text-xs text-red-500 bg-red-900/30 px-3 py-2 rounded-lg border border-red-500 mt-2 font-bold">
                    <AlertTriangle size={14} />
                    <span>⚠️ CUENTA SUSPENDIDA - Esta compra te reactivará</span>
                  </div>
                )}
              </div>

              {/* COSTO */}
              <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/30">
                <p className="text-xs text-gray-400 mb-2">Costo de vida extra</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={20} />
                    <span className="text-2xl font-bold text-white">{info.cost}</span>
                    <span className="text-sm text-gray-400">puntos cuánticos</span>
                  </div>
                </div>
              </div>

              {/* SALDO ACTUAL */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">Tus puntos actuales</p>
                  <span className={`text-xl font-bold ${info.canPurchase ? 'text-green-400' : 'text-red-400'}`}>
                    {info.currentPoints}
                  </span>
                </div>
                
                {!info.canPurchase && (
                  <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-500/30">
                    <AlertTriangle size={14} />
                    <span>Te faltan {info.missing} puntos para comprar esta vida</span>
                  </div>
                )}
                
                {info.canPurchase && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg border border-green-500/30">
                    <CheckCircle size={14} />
                    <span>Tienes suficientes puntos. Después te quedarán {info.currentPoints - info.cost}.</span>
                  </div>
                )}
              </div>

              {/* ¿QUÉ OBTIENES? */}
              <div className="bg-purple-900/10 rounded-lg p-4 border border-purple-500/20">
                <p className="text-xs text-gray-400 mb-3">¿Qué obtienes?</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="text-purple-400" size={16} />
                    <span>Tus strikes se resetean a <strong>0</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="text-purple-400" size={16} />
                    <span>Recuperas todas tus vidas ({info.maxStrikes}/{info.maxStrikes})</span>
                  </li>
                  {info.isSuspended && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-400" size={16} />
                      <span><strong>Tu cuenta será reactivada</strong></span>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <CheckCircle className="text-purple-400" size={16} />
                    <span>Continúas con tu programa normalmente</span>
                  </li>
                </ul>
              </div>

              {/* BOTONES */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={comprando}
                  className="flex-1 px-4 py-3 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                >
                  {info.extraLifeUsed ? 'Cerrar' : 'Cancelar'}
                </button>
                {!info.extraLifeUsed && (
                  <button
                    onClick={confirmarCompra}
                    disabled={!info.canPurchase || comprando}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {comprando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Heart size={18} className="fill-white" />
                        Comprar Vida Extra
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
