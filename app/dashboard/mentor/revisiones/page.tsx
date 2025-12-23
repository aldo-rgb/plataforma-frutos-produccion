'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, User, Calendar, Eye, CheckCircle, XCircle, 
  Loader2, AlertCircle, FileText, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CartaPendiente {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  estado: string;
  fechaEnvio: string;
  totalMetas: number;
  metas: any[];
}

export default function RevisionesPage() {
  const router = useRouter();
  const [cartas, setCartas] = useState<CartaPendiente[]>([]);
  const [cartaSeleccionada, setCartaSeleccionada] = useState<CartaPendiente | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [feedbackRechazo, setFeedbackRechazo] = useState('');
  const [expandedMeta, setExpandedMeta] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', type: 'success' });

  useEffect(() => {
    loadCartasPendientes();
  }, []);

  const loadCartasPendientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor/cartas-pendientes');
      const data = await response.json();

      if (response.ok) {
        setCartas(data.cartas || []);
      } else {
        mostrarToast('Error', data.error || 'No se pudieron cargar las cartas', 'error');
      }
    } catch (error) {
      console.error('Error al cargar cartas:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verDetalleCarta = async (cartaId: number) => {
    try {
      const response = await fetch(`/api/mentor/carta/${cartaId}`);
      const data = await response.json();

      if (response.ok) {
        setCartaSeleccionada(data.carta);
      } else {
        mostrarToast('Error', data.error || 'No se pudo cargar la carta', 'error');
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    }
  };

  const autorizarCarta = async () => {
    if (!cartaSeleccionada) return;

    if (!confirm(`¿Estás seguro de AUTORIZAR la carta de ${cartaSeleccionada.usuarioNombre}?`)) {
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch(`/api/mentor/carta/${cartaSeleccionada.id}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast('✅ Autorizada', `La carta de ${cartaSeleccionada.usuarioNombre} ha sido aprobada`, 'success');
        setCartaSeleccionada(null);
        loadCartasPendientes();
      } else {
        mostrarToast('Error', data.error || 'No se pudo aprobar la carta', 'error');
      }
    } catch (error) {
      console.error('Error al aprobar carta:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const rechazarCarta = async () => {
    if (!cartaSeleccionada) return;

    if (!feedbackRechazo.trim()) {
      mostrarToast('Advertencia', 'Debes proporcionar una razón para el rechazo', 'error');
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch(`/api/mentor/carta/${cartaSeleccionada.id}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackRechazo })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast('🔴 Rechazada', `Se ha notificado a ${cartaSeleccionada.usuarioNombre}`, 'success');
        setShowRechazarModal(false);
        setFeedbackRechazo('');
        setCartaSeleccionada(null);
        loadCartasPendientes();
      } else {
        mostrarToast('Error', data.error || 'No se pudo rechazar la carta', 'error');
      }
    } catch (error) {
      console.error('Error al rechazar carta:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const mostrarToast = (title: string, description: string, type: 'success' | 'error') => {
    setToastMessage({ title, description, type });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const getDiaLabel = (dia: string) => {
    const dias: Record<string, string> = {
      'L': 'Lunes', 'M': 'Martes', 'X': 'Miércoles',
      'J': 'Jueves', 'V': 'Viernes', 'S': 'Sábado', 'D': 'Domingo'
    };
    return dias[dia] || dia;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 ${
          toastMessage.type === 'success' ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'
        } border rounded-lg p-4 shadow-xl animate-fade-in`}>
          <h4 className="font-bold text-white text-sm">{toastMessage.title}</h4>
          <p className="text-slate-300 text-xs mt-1">{toastMessage.description}</p>
        </div>
      )}

      {/* Modal de Rechazo */}
      {showRechazarModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-red-500/30 max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <XCircle className="text-red-500" size={24} />
              Rechazar Carta
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Proporciona una razón clara para que {cartaSeleccionada?.usuarioNombre} pueda ajustar su carta:
            </p>
            <textarea
              value={feedbackRechazo}
              onChange={(e) => setFeedbackRechazo(e.target.value)}
              placeholder="Ej: Tus metas financieras son poco realistas. Por favor, ajusta los montos a algo más alcanzable en 90 días."
              className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRechazarModal(false);
                  setFeedbackRechazo('');
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={rechazarCarta}
                disabled={procesando || !feedbackRechazo.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Rechazar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <ClipboardCheck className="text-purple-400" size={32} />
            Torre de Control - Revisión de Cartas
          </h1>
          <p className="text-slate-400 text-sm">
            Revisa y autoriza las cartas F.R.U.T.O.S. enviadas por tus mentoreados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista de Cartas Pendientes */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 rounded-xl border border-purple-500/30 p-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-400" />
                Pendientes de Revisión
                <span className="ml-auto bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full">
                  {cartas.length}
                </span>
              </h2>

              {cartas.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="mx-auto mb-2" size={32} />
                  <p className="text-sm">No hay cartas pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartas.map((carta) => (
                    <div
                      key={carta.id}
                      onClick={() => verDetalleCarta(carta.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        cartaSeleccionada?.id === carta.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <User size={18} className="text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">
                            {carta.usuarioNombre}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{carta.usuarioEmail}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-500">
                              {new Date(carta.fechaEnvio).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                              {carta.totalMetas} metas definidas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalle de Carta Seleccionada */}
          <div className="lg:col-span-2">
            {!cartaSeleccionada ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
                <Eye className="mx-auto mb-4 text-slate-600" size={48} />
                <p className="text-slate-400">Selecciona una carta para revisar</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-purple-500/30 overflow-hidden">
                
                {/* Header de la carta */}
                <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-b border-purple-500/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/30 rounded-xl">
                        <User size={24} className="text-purple-300" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white">
                          {cartaSeleccionada.usuarioNombre}
                        </h2>
                        <p className="text-sm text-slate-400">{cartaSeleccionada.usuarioEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold border border-amber-500/30">
                        ⏳ En Revisión
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Enviada el {new Date(cartaSeleccionada.fechaEnvio).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contenido de metas */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-4">Metas Definidas</h3>
                  
                  <div className="space-y-4">
                    {cartaSeleccionada.metas.map((meta, index) => (
                      <div key={meta.id} className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                        
                        {/* Header de la meta */}
                        <div
                          onClick={() => setExpandedMeta(expandedMeta === index ? null : index)}
                          className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded">
                                {meta.categoria}
                              </span>
                              <span className="text-xs text-slate-500">Meta #{meta.orden}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">{meta.metaPrincipal}</h4>
                          </div>
                          {expandedMeta === index ? (
                            <ChevronUp className="text-slate-400" size={20} />
                          ) : (
                            <ChevronDown className="text-slate-400" size={20} />
                          )}
                        </div>

                        {/* Contenido expandido */}
                        {expandedMeta === index && (
                          <div className="p-4 border-t border-slate-700 space-y-4">
                            
                            {/* Declaración de Poder */}
                            {meta.declaracionPoder && (
                              <div className="bg-purple-500/10 rounded-lg p-3">
                                <h5 className="text-xs font-semibold text-purple-300 mb-1">
                                  ✨ Objetivo
                                </h5>
                                <p className="text-sm text-slate-300 italic">"{meta.declaracionPoder}"</p>
                              </div>
                            )}

                            {/* Acciones */}
                            <div>
                              <h5 className="text-xs font-semibold text-cyan-300 mb-2">
                                📋 Plan de Acción ({meta.acciones.length} acciones)
                              </h5>
                              <div className="space-y-2">
                                {meta.acciones.map((accion: any, idx: number) => (
                                  <div key={idx} className="bg-slate-800 rounded p-3">
                                    <p className="text-sm text-white mb-2">{accion.texto}</p>
                                    {accion.diasProgramados && accion.diasProgramados.length > 0 && (
                                      <div className="flex gap-1">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                                          <span
                                            key={dia}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                              accion.diasProgramados.includes(dia)
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-700 text-slate-500'
                                            }`}
                                            title={getDiaLabel(dia)}
                                          >
                                            {dia}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="border-t border-slate-700 p-6 bg-slate-900/50">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowRechazarModal(true)}
                      disabled={procesando}
                      className="py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={20} />
                      🔴 RECHAZAR
                    </button>
                    <button
                      onClick={autorizarCarta}
                      disabled={procesando}
                      className="py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {procesando ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          🟢 AUTORIZAR
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
