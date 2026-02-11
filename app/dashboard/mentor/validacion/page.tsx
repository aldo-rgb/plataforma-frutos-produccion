'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, User, Calendar, Image as ImageIcon,
  Loader2, AlertCircle, Clock, Target, Award, Sparkles
} from 'lucide-react';

interface EvidenciaPendiente {
  id: number | string;
  tipo?: 'CARTA' | 'EXTRAORDINARIA';
  submissionId?: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  metaTitulo: string;
  categoria: string;
  accionTexto: string;
  fotoUrl: string;
  descripcion: string | null;
  fechaSubida: string;
  tiempoRelativo: string;
}

export default function ValidacionEvidenciasPage() {
  const [evidencias, setEvidencias] = useState<EvidenciaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<number | string | null>(null);
  const [feedbackRechazo, setFeedbackRechazo] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', type: 'success' });
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    loadEvidenciasPendientes();
  }, []);

  const loadEvidenciasPendientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentor/validacion-evidencias');
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

  const autorizarEvidencia = async (evidencia: EvidenciaPendiente, usuarioNombre: string) => {
    try {
      setProcesando(evidencia.id);
      
      let response;
      
      // Determinar endpoint según el tipo de evidencia
      if (evidencia.tipo === 'EXTRAORDINARIA' && evidencia.submissionId) {
        // Aprobar tarea extraordinaria
        response = await fetch(`/api/admin/submissions/${evidencia.submissionId}/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'APPROVED',
            feedback: '' 
          })
        });
      } else {
        // Aprobar evidencia de carta
        response = await fetch(`/api/mentor/evidencia/${evidencia.id}/aprobar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();

      if (response.ok) {
        // Mostrar animación de éxito
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        
        mostrarToast('✅ ¡Autorizada!', `${usuarioNombre} ganó puntos`, 'success');
        
        // Remover evidencia de la lista
        setEvidencias(prev => prev.filter(e => e.id !== evidencia.id));
      } else {
        mostrarToast('Error', data.error || 'No se pudo aprobar la evidencia', 'error');
      }
    } catch (error) {
      console.error('Error al aprobar evidencia:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const rechazarEvidencia = async (evidencia: EvidenciaPendiente, usuarioNombre: string) => {
    if (!feedbackRechazo.trim()) {
      mostrarToast('Advertencia', 'Debes escribir el motivo del rechazo', 'error');
      return;
    }

    try {
      setProcesando(evidencia.id);
      
      let response;
      
      // Determinar endpoint según el tipo de evidencia
      if (evidencia.tipo === 'EXTRAORDINARIA' && evidencia.submissionId) {
        // Rechazar tarea extraordinaria
        response = await fetch(`/api/admin/submissions/${evidencia.submissionId}/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'REJECTED',
            feedback: feedbackRechazo 
          })
        });
      } else {
        // Rechazar evidencia de carta
        response = await fetch(`/api/mentor/evidencia/${evidencia.id}/rechazar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comentario: feedbackRechazo })
        });
      }

      const data = await response.json();

      if (response.ok) {
        mostrarToast('🔴 Rechazada', `Se ha notificado a ${usuarioNombre}`, 'success');
        setRechazandoId(null);
        setFeedbackRechazo('');
        
        // Remover evidencia de la lista
        setEvidencias(prev => prev.filter(e => e.id !== evidencia.id));
      } else {
        mostrarToast('Error', data.error || 'No se pudo rechazar la evidencia', 'error');
      }
    } catch (error) {
      console.error('Error al rechazar evidencia:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const mostrarToast = (title: string, description: string, type: 'success' | 'error') => {
    setToastMessage({ title, description, type });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const getCategoriaColor = (categoria: string) => {
    const colores: Record<string, string> = {
      'FINANZAS': 'text-emerald-400 bg-emerald-500/10',
      'RELACIONES': 'text-rose-400 bg-rose-500/10',
      'TALENTOS': 'text-amber-400 bg-amber-500/10',
      'PAZ_MENTAL': 'text-sky-400 bg-sky-500/10',
      'OCIO': 'text-violet-400 bg-violet-500/10',
      'SALUD': 'text-red-400 bg-red-500/10',
      'COMUNIDAD': 'text-indigo-400 bg-indigo-500/10',
      'ENROLAMIENTO': 'text-cyan-400 bg-cyan-500/10'
    };
    return colores[categoria] || 'text-slate-400 bg-slate-500/10';
  };

  // Helper para normalizar URLs de evidencias
  // Las URLs locales como /evidencias/... necesitan el dominio base
  const getEvidenceUrl = (url: string) => {
    if (!url) return '';
    
    // Si ya es una URL completa (https://...), usarla directamente
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Si es una URL relativa, agregar el dominio de producción
    // En producción, los archivos locales se sirven desde el mismo dominio
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando evidencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      
      {/* Animación de Éxito */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/30">
          <div className="animate-bounce-slow">
            <div className="text-center">
              <div className="text-8xl mb-4">✅</div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400">
                +25 PUNTOS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 ${
          toastMessage.type === 'success' ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'
        } border rounded-lg p-4 shadow-xl animate-fade-in min-w-[300px]`}>
          <h4 className="font-bold text-white text-sm">{toastMessage.title}</h4>
          <p className="text-slate-300 text-xs mt-1">{toastMessage.description}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <Award className="text-cyan-400" size={32} />
            Validación de Evidencias
          </h1>
          <p className="text-slate-400 text-sm">
            Revisa las evidencias de tus participantes asignados
          </p>
        </div>

        {/* Estado Vacío */}
        {evidencias.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
            <div className="inline-flex p-4 bg-green-500/10 rounded-full mb-4">
              <Sparkles className="text-green-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Todo al día!</h2>
            <p className="text-slate-400 text-lg">Tus participantes están trabajando.</p>
            <p className="text-slate-500 text-sm mt-2">No hay evidencias pendientes de revisión</p>
          </div>
        ) : (
          /* Feed de Evidencias */
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 text-sm">
                <span className="font-bold text-cyan-400 text-lg">{evidencias.length}</span> evidencia{evidencias.length !== 1 ? 's' : ''} pendiente{evidencias.length !== 1 ? 's' : ''}
              </p>
            </div>

            {evidencias.map((evidencia) => (
              <div
                key={evidencia.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-cyan-500/30 transition-all"
              >
                {/* Header de la Tarjeta */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 border-b border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <User size={20} className="text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-lg">{evidencia.usuarioNombre}</h3>
                          {evidencia.tipo === 'EXTRAORDINARIA' && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded uppercase">
                              ⚡ Misión Especial
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCategoriaColor(evidencia.categoria)}`}>
                            {evidencia.categoria.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500 text-xs">•</span>
                          <span className="text-slate-400 text-xs">{evidencia.metaTitulo}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                        <Clock size={14} />
                        <span className="text-xs font-semibold">Pendiente</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{evidencia.tiempoRelativo}</p>
                    </div>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  {/* Acción */}
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <Target size={16} className="text-cyan-400 mt-1 flex-shrink-0" />
                      <p className="text-white font-semibold">{evidencia.accionTexto}</p>
                    </div>
                  </div>

                  {/* Imagen de Evidencia */}
                  <div className="relative rounded-lg overflow-hidden mb-4 bg-slate-900">
                    <img
                      src={getEvidenceUrl(evidencia.fotoUrl)}
                      alt="Evidencia"
                      className="w-full h-auto max-h-96 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Mostrar placeholder si la imagen no carga
                        target.style.display = 'none';
                        target.parentElement?.classList.add('min-h-48', 'flex', 'items-center', 'justify-center');
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'text-center text-slate-500';
                        errorDiv.innerHTML = `
                          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-xs">Imagen no disponible</p>
                          <p class="text-xs mt-1 text-slate-600 break-all max-w-xs">${evidencia.fotoUrl}</p>
                        `;
                        target.parentElement?.appendChild(errorDiv);
                      }}
                    />
                  </div>

                  {/* Descripción */}
                  {evidencia.descripcion && (
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-slate-400 mb-1 font-semibold">Descripción:</p>
                      <p className="text-white text-sm">{evidencia.descripcion}</p>
                    </div>
                  )}

                  {/* Formulario de Rechazo */}
                  {rechazandoId === evidencia.id ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                      <label className="block text-sm text-red-400 font-semibold mb-2">
                        Motivo del rechazo:
                      </label>
                      <textarea
                        value={feedbackRechazo}
                        onChange={(e) => setFeedbackRechazo(e.target.value)}
                        placeholder="Ej: La foto está borrosa, por favor vuelve a tomarla con mejor iluminación."
                        className="w-full h-24 bg-slate-900 border border-red-500/50 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-red-500"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setRechazandoId(null);
                            setFeedbackRechazo('');
                          }}
                          className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => rechazarEvidencia(evidencia, evidencia.usuarioNombre)}
                          disabled={procesando === evidencia.id || !feedbackRechazo.trim()}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          {procesando === evidencia.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              Confirmar Rechazo
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Botones de Acción */
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRechazandoId(evidencia.id)}
                        disabled={procesando === evidencia.id}
                        className="py-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg shadow-lg hover:shadow-red-500/20"
                      >
                        <XCircle size={24} />
                        🔴 RECHAZAR
                      </button>
                      <button
                        onClick={() => autorizarEvidencia(evidencia, evidencia.usuarioNombre)}
                        disabled={procesando === evidencia.id}
                        className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg shadow-lg hover:shadow-green-500/20"
                      >
                        {procesando === evidencia.id ? (
                          <>
                            <Loader2 size={24} className="animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={24} />
                            🟢 AUTORIZAR
                            <span className="ml-1 text-yellow-300 font-black">+25</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
