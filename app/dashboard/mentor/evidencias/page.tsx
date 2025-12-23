'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, User, Calendar, Image as ImageIcon,
  Loader2, AlertCircle, Eye, Clock, Target
} from 'lucide-react';

interface EvidenciaPendiente {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  metaTitulo: string;
  categoria: string;
  accionTexto: string;
  fotoUrl: string;
  descripcion: string | null;
  fechaSubida: string;
  estado: string;
}

export default function RevisionEvidenciasPage() {
  const [evidencias, setEvidencias] = useState<EvidenciaPendiente[]>([]);
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<EvidenciaPendiente | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', type: 'success' });

  useEffect(() => {
    loadEvidenciasPendientes();
  }, []);

  const loadEvidenciasPendientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor/evidencias-pendientes');
      const data = await response.json();

      if (response.ok) {
        setEvidencias(data.evidencias || []);
      } else {
        mostrarToast('Error', data.error || 'No se pudieron cargar las evidencias', 'error');
      }
    } catch (error) {
      console.error('Error al cargar evidencias:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aprobarEvidencia = async () => {
    if (!evidenciaSeleccionada) return;

    if (!confirm(`¿Aprobar la evidencia de ${evidenciaSeleccionada.usuarioNombre}?\n\nSe otorgarán +25 puntos.`)) {
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch(`/api/mentor/evidencia/${evidenciaSeleccionada.id}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast('✅ Aprobada', `${evidenciaSeleccionada.usuarioNombre} ganó +${data.puntosOtorgados} puntos`, 'success');
        setEvidenciaSeleccionada(null);
        loadEvidenciasPendientes();
      } else {
        mostrarToast('Error', data.error || 'No se pudo aprobar la evidencia', 'error');
      }
    } catch (error) {
      console.error('Error al aprobar evidencia:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const rechazarEvidencia = async () => {
    if (!evidenciaSeleccionada) return;

    if (!comentarioRechazo.trim()) {
      mostrarToast('Advertencia', 'Debes proporcionar un comentario de rechazo', 'error');
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch(`/api/mentor/evidencia/${evidenciaSeleccionada.id}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario: comentarioRechazo })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast('🔴 Rechazada', `Se ha notificado a ${evidenciaSeleccionada.usuarioNombre}`, 'success');
        setShowRechazarModal(false);
        setComentarioRechazo('');
        setEvidenciaSeleccionada(null);
        loadEvidenciasPendientes();
      } else {
        mostrarToast('Error', data.error || 'No se pudo rechazar la evidencia', 'error');
      }
    } catch (error) {
      console.error('Error al rechazar evidencia:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
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
              Rechazar Evidencia
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Proporciona una razón para que {evidenciaSeleccionada?.usuarioNombre} pueda mejorar:
            </p>
            <textarea
              value={comentarioRechazo}
              onChange={(e) => setComentarioRechazo(e.target.value)}
              placeholder="Ej: La foto estaba borrosa. Por favor, sube una imagen más clara."
              className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRechazarModal(false);
                  setComentarioRechazo('');
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={rechazarEvidencia}
                disabled={procesando || !comentarioRechazo.trim()}
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
            <Eye className="text-cyan-400" size={32} />
            Revisión de Evidencias
          </h1>
          <p className="text-slate-400 text-sm">
            Revisa y valida las evidencias subidas por tus mentoreados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista de Evidencias Pendientes */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 rounded-xl border border-cyan-500/30 p-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-cyan-400" />
                Pendientes de Revisión
                <span className="ml-auto bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full">
                  {evidencias.length}
                </span>
              </h2>

              {evidencias.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="mx-auto mb-2" size={32} />
                  <p className="text-sm">No hay evidencias pendientes</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {evidencias.map((evidencia) => (
                    <div
                      key={evidencia.id}
                      onClick={() => setEvidenciaSeleccionada(evidencia)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        evidenciaSeleccionada?.id === evidencia.id
                          ? 'bg-cyan-500/20 border-cyan-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={evidencia.fotoUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">
                            {evidencia.usuarioNombre}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{evidencia.accionTexto}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                              {evidencia.categoria}
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

          {/* Detalle de Evidencia Seleccionada */}
          <div className="lg:col-span-2">
            {!evidenciaSeleccionada ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center h-full flex items-center justify-center">
                <div>
                  <ImageIcon className="mx-auto mb-4 text-slate-600" size={48} />
                  <p className="text-slate-400">Selecciona una evidencia para revisar</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-cyan-500/30 overflow-hidden">
                
                {/* Header de la evidencia */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-cyan-500/30 rounded-xl">
                        <User size={24} className="text-cyan-300" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white">
                          {evidenciaSeleccionada.usuarioNombre}
                        </h2>
                        <p className="text-sm text-slate-400">{evidenciaSeleccionada.usuarioEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold border border-amber-500/30 flex items-center gap-2">
                        <Clock size={14} />
                        Pendiente
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(evidenciaSeleccionada.fechaSubida).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>

                  {/* Contexto de la acción */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded">
                        {evidenciaSeleccionada.categoria}
                      </span>
                      <Target size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-400">{evidenciaSeleccionada.metaTitulo}</span>
                    </div>
                    <p className="text-white font-semibold">{evidenciaSeleccionada.accionTexto}</p>
                  </div>
                </div>

                {/* Imagen de evidencia */}
                <div className="p-6">
                  <div className="relative rounded-lg overflow-hidden mb-4">
                    <img
                      src={evidenciaSeleccionada.fotoUrl}
                      alt="Evidencia"
                      className="w-full h-auto max-h-[50vh] object-contain bg-slate-900"
                    />
                  </div>

                  {/* Descripción del usuario */}
                  {evidenciaSeleccionada.descripcion && (
                    <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Descripción:</p>
                      <p className="text-white">{evidenciaSeleccionada.descripcion}</p>
                    </div>
                  )}
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
                      onClick={aprobarEvidencia}
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
                          🟢 APROBAR (+25 pts)
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
