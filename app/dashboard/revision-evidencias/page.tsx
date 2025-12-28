'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Loader2, Target, Users, Zap, 
  Clock, AlertTriangle, MessageSquare, ShieldCheck, Star, X, RefreshCw
} from 'lucide-react';

interface Evidencia {
  id: number;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
    profileImage: string | null;
  };
  Accion: {
    nombre: string;
    puntosRecompensa: number;
    categoria: string;
  };
  Meta: {
    objetivo: string;
  } | null;
  fotoUrl: string;
  descripcion: string | null;
  fechaSubida: string;
  estado: string;
  comentarioMentor: string | null;
  intentosCorreccion: number;
}

export default function RevisionEvidenciasPage() {
  const [pendientes, setPendientes] = useState<Evidencia[]>([]);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  
  // Modal de rechazo
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<Evidencia | null>(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');

  useEffect(() => {
    cargarEvidencias();
  }, []);

  const cargarEvidencias = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/evidencia/revisar');
      if (res.ok) {
        const data = await res.json();
        setPendientes(data.evidencias || []);
      }
    } catch (error) {
      console.error('Error al cargar evidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (evidenciaId: number, puntos: number) => {
    setProcesando(evidenciaId);

    try {
      const res = await fetch('/api/evidencia/revisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evidenciaId, 
          accion: 'APROBAR',
          puntosRecompensa: puntos,
          comentarioMentor: '¡Excelente trabajo!'
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al aprobar');
      }
      
      setPendientes(prev => prev.filter(e => e.id !== evidenciaId));
      
      setToastType('success');
      setToastMessage(`APROBADA. Puntos Cuánticos (${puntos}) liberados.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);

    } catch (error) {
      setToastType('error');
      setToastMessage(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setProcesando(null);
    }
  };

  const abrirModalRechazo = (evidencia: Evidencia) => {
    setEvidenciaSeleccionada(evidencia);
    setComentarioRechazo('');
    setShowRechazoModal(true);
  };

  const handleRechazo = async (tipoRechazo: 'DEFINITIVO' | 'REQUIERE_ACTUALIZACION') => {
    if (!evidenciaSeleccionada) return;
    
    if (!comentarioRechazo.trim()) {
      alert('Por favor, proporciona un comentario explicando el motivo del rechazo');
      return;
    }

    setProcesando(evidenciaSeleccionada.id);
    setShowRechazoModal(false);

    try {
      const res = await fetch('/api/evidencia/revisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evidenciaId: evidenciaSeleccionada.id, 
          accion: tipoRechazo === 'DEFINITIVO' ? 'RECHAZAR_DEFINITIVO' : 'RECHAZAR_REQUIERE_ACTUALIZACION',
          comentarioMentor: comentarioRechazo
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al rechazar');
      }
      
      setPendientes(prev => prev.filter(e => e.id !== evidenciaSeleccionada.id));
      
      setToastType('success');
      setToastMessage(
        tipoRechazo === 'DEFINITIVO' 
          ? 'Evidencia rechazada definitivamente. Tarea marcada como no lograda.'
          : 'Evidencia rechazada. Usuario notificado para subir nueva evidencia.'
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);

    } catch (error) {
      setToastType('error');
      setToastMessage(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setProcesando(null);
      setEvidenciaSeleccionada(null);
      setComentarioRechazo('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* --- TOAST DE REVISIÓN --- */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className={`bg-slate-900 border ${toastType === 'success' ? 'border-green-500/50 shadow-green-500/20' : 'border-red-500/50 shadow-red-500/20'} text-white px-6 py-4 rounded-2xl flex items-center gap-4`}>
            <div className={`h-10 w-10 ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center shadow-lg`}>
              {toastType === 'success' ? <CheckCircle size={24} className="text-slate-900" /> : <XCircle size={24} className="text-slate-900" />}
            </div>
            <div>
              <h4 className="font-bold text-sm">REVISIÓN COMPLETA</h4>
              <p className="text-xs text-slate-400">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RECHAZO */}
      {showRechazoModal && evidenciaSeleccionada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <XCircle className="text-red-400" />
                Rechazar Evidencia
              </h3>
              <button onClick={() => setShowRechazoModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Usuario:</p>
              <p className="text-white font-semibold">{evidenciaSeleccionada.Usuario.nombre}</p>
              <p className="text-sm text-slate-400 mt-2">Acción:</p>
              <p className="text-white">{evidenciaSeleccionada.Accion.nombre}</p>
              {evidenciaSeleccionada.intentosCorreccion > 0 && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Esta evidencia ya ha sido corregida {evidenciaSeleccionada.intentosCorreccion} vez(es)
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Comentario para el participante: <span className="text-red-400">*</span>
              </label>
              <textarea
                value={comentarioRechazo}
                onChange={(e) => setComentarioRechazo(e.target.value)}
                placeholder="Explica por qué se rechaza y qué debe mejorar..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleRechazo('DEFINITIVO')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500 border border-red-500/50 text-red-400 hover:text-white rounded-lg font-semibold transition-all"
              >
                <XCircle size={20} />
                Rechazar Definitivamente (Sin posibilidad de corrección)
              </button>
              
              <button
                onClick={() => handleRechazo('REQUIERE_ACTUALIZACION')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500 border border-yellow-500/50 text-yellow-400 hover:text-white rounded-lg font-semibold transition-all"
              >
                <RefreshCw size={20} />
                Solicitar Nueva Evidencia (Permitir corrección)
              </button>

              <button
                onClick={() => setShowRechazoModal(false)}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300">
                <strong>Rechazo Definitivo:</strong> Marca la tarea como no lograda y la quita de pendientes/retrasadas. No genera puntos nunca.<br/>
                <strong>Solicitar Nueva Evidencia:</strong> El usuario puede corregir y volver a subir la evidencia. Si se aprueba después, SÍ genera puntos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">
            Bandeja de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Integridad</span>
          </h1>
          <p className="text-slate-400 mt-2">Valida las acciones del Líder para liberar su recompensa.</p>
        </div>
        <div className="bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Pendientes</p>
            <p className="text-xl font-black text-white">{pendientes.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendientes.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900 rounded-3xl border border-white/10">
                  <CheckCircle size={48} className="mx-auto mb-4 text-green-500/50" />
                  <p>¡El Quantum está limpio! No hay evidencias pendientes.</p>
              </div>
          ) : (
              pendientes.map((evidencia) => (
                  <div key={evidencia.id} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                      
                      {/* Header y Info */}
                      <div className="p-4 flex items-center justify-between border-b border-white/5">
                          <div className='flex items-center gap-3'>
                              {evidencia.Usuario.profileImage ? (
                                <img src={evidencia.Usuario.profileImage} alt={evidencia.Usuario.nombre} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                  {evidencia.Usuario.nombre.charAt(0)}
                                </div>
                              )}
                              <div>
                                  <h3 className="font-bold text-white text-sm">{evidencia.Usuario.nombre}</h3>
                                  <p className="text-xs text-slate-500">{new Date(evidencia.fechaSubida).toLocaleDateString('es-MX')} • {evidencia.Accion.categoria}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-yellow-400">
                             <Zap size={14} fill="currentColor" /> {evidencia.Accion.puntosRecompensa} PC
                          </div>
                      </div>

                      {/* Estado */}
                      {evidencia.estado === 'REQUIERE_CORRECCION' && (
                        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2">
                          <RefreshCw size={16} className="text-yellow-400" />
                          <span className="text-xs font-semibold text-yellow-400">
                            Requiere corrección (Intento {evidencia.intentosCorreccion + 1})
                          </span>
                        </div>
                      )}

                      {/* Meta y Evidencia (Foto) */}
                      <div className="p-4 flex-1">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-2">Acción:</div>
                          <p className="text-white font-medium mb-4">{evidencia.Accion.nombre}</p>

                          <div className="h-48 bg-slate-950 relative flex items-center justify-center text-slate-700 rounded-lg overflow-hidden border border-white/5">
                              {evidencia.fotoUrl ? (
                                <img src={evidencia.fotoUrl} alt="Evidencia" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-xs text-slate-700">
                                    [Sin imagen]
                                </div>
                              )}
                              <button className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <Star size={24} className="text-yellow-400" />
                              </button>
                          </div>

                          {evidencia.descripcion && (
                            <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                              <strong>Descripción:</strong> {evidencia.descripcion}
                            </div>
                          )}

                          {evidencia.comentarioMentor && (
                            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                              <strong>Feedback anterior:</strong> {evidencia.comentarioMentor}
                            </div>
                          )}
                      </div>

                      {/* Acciones del Mentor */}
                      <div className="p-4 grid grid-cols-2 gap-3 mt-auto border-t border-white/5">
                          <button 
                              onClick={() => abrirModalRechazo(evidencia)}
                              disabled={procesando === evidencia.id}
                              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-bold disabled:opacity-50"
                          >
                              {procesando === evidencia.id ? <Loader2 size={16} className='animate-spin' /> : <XCircle size={18} />} 
                              Rechazar
                          </button>
                          <button 
                              onClick={() => handleAprobar(evidencia.id, evidencia.Accion.puntosRecompensa)}
                              disabled={procesando === evidencia.id}
                              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-bold disabled:opacity-50"
                          >
                              {procesando === evidencia.id ? <Loader2 size={16} className='animate-spin' /> : <ShieldCheck size={18} />} 
                              Aprobar
                          </button>
                      </div>
                  </div>
              ))
          )}
        </div>
      )}

    </div>
  );
}