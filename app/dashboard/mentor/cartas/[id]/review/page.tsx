'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  ChevronDown,
  ChevronUp,
  Calendar,
  Target,
  MessageSquare,
  Trophy,
  Sparkles,
  Lock
} from 'lucide-react';
import Link from 'next/link';

// ========== INTERFACES ==========
interface Accion {
  id: number;
  texto: string;
  frequency: string;
  assignedDays: number[];
  specificDate: string | null;
  completada: boolean;
  requiereEvidencia: boolean;
}

interface Meta {
  id: number;
  categoria: string;
  orden: number;
  declaracionPoder: string | null;
  metaPrincipal: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorFeedback: string | null;
  acciones: Accion[];
}

interface CartaData {
  carta: {
    id: number;
    estado: string;
    fechaCreacion: string;
    fechaActualizacion: string;
    autorizadoMentor: boolean;
    autorizadoCoord: boolean;
  };
  usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    enrollment: {
      cycleType: string;
      cycleStartDate: string;
      cycleEndDate: string;
      status: string;
    } | null;
  };
  metas: Meta[];
}

const DIAS_SEMANA = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' }
];

const AREAS_CONFIG = [
  { key: 'finanzas', nombre: 'Finanzas', icono: '💰', color: 'green' },
  { key: 'relaciones', nombre: 'Relaciones', icono: '❤️', color: 'pink' },
  { key: 'salud', nombre: 'Salud', icono: '🏃', color: 'blue' },
  { key: 'ocio', nombre: 'Ocio', icono: '⏰', color: 'purple' },
  { key: 'talentos', nombre: 'Talentos', icono: '💼', color: 'yellow' },
  { key: 'pazMental', nombre: 'Paz Mental', icono: '🙏', color: 'cyan' },
  { key: 'servicioTrans', nombre: 'Servicio Trans.', icono: '🌟', color: 'indigo' },
  { key: 'servicioComun', nombre: 'Servicio Com.', icono: '🤝', color: 'teal' }
];

export default function CartaReviewPage() {
  const router = useRouter();
  const params = useParams();
  const cartaId = parseInt(params?.id as string);

  const [cartaData, setCartaData] = useState<CartaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  
  // Estado de revisión: cada meta tiene su propio estado
  const [metasReview, setMetasReview] = useState<Record<number, {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    mentorFeedback: string;
  }>>({});

  // Modal de feedback
  const [feedbackModal, setFeedbackModal] = useState<{
    metaId: number | null;
    isOpen: boolean;
    feedback: string;
  }>({
    metaId: null,
    isOpen: false,
    feedback: ''
  });

  useEffect(() => {
    if (cartaId) {
      loadCartaData();
    }
  }, [cartaId]);

  const loadCartaData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mentor/carta/${cartaId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar carta');
      }

      const data = await response.json();
      setCartaData(data);

      // Inicializar estados de revisión con los valores actuales
      const initialReview: Record<number, any> = {};
      data.metas.forEach((meta: Meta) => {
        initialReview[meta.id] = {
          status: meta.status || 'PENDING',
          mentorFeedback: meta.mentorFeedback || ''
        };
      });
      setMetasReview(initialReview);

      // Expandir todas las áreas por defecto
      const allAreas = new Set<string>(data.metas.map((m: Meta) => m.categoria));
      setExpandedAreas(allAreas);
    } catch (err: any) {
      console.error('Error loading carta:', err);
      setError(err.message || 'Error al cargar carta');
    } finally {
      setLoading(false);
    }
  };


  // ========== FUNCIONES DE REVISIÓN ==========
  
  const handleToggleEvidence = async (accionId: number, currentValue: boolean) => {
    const newValue = !currentValue;
    
    try {
      // Actualización optimista del UI
      if (cartaData) {
        const updatedMetas = cartaData.metas.map(meta => ({
          ...meta,
          acciones: meta.acciones.map(accion => 
            accion.id === accionId 
              ? { ...accion, requiereEvidencia: newValue }
              : accion
          )
        }));
        setCartaData({ ...cartaData, metas: updatedMetas });
      }

      const response = await fetch(`/api/mentor/acciones/${accionId}/toggle-evidence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiereEvidencia: newValue })
      });

      if (!response.ok) {
        // Revertir el cambio optimista si falla
        await loadCartaData();
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling evidence:', error);
      // Revertir el cambio optimista si falla
      await loadCartaData();
      alert('Error al actualizar configuración de evidencia');
    }
  };

  const handleApprove = (metaId: number) => {
    setMetasReview(prev => ({
      ...prev,
      [metaId]: {
        status: 'APPROVED',
        mentorFeedback: ''
      }
    }));
  };

  const handleReject = (metaId: number) => {
    setFeedbackModal({
      metaId,
      isOpen: true,
      feedback: metasReview[metaId]?.mentorFeedback || ''
    });
  };

  const handleSaveFeedback = () => {
    if (!feedbackModal.metaId || !feedbackModal.feedback.trim()) {
      alert('❌ Debes proporcionar un comentario para el rechazo');
      return;
    }

    setMetasReview(prev => ({
      ...prev,
      [feedbackModal.metaId!]: {
        status: 'REJECTED',
        mentorFeedback: feedbackModal.feedback
      }
    }));

    setFeedbackModal({ metaId: null, isOpen: false, feedback: '' });
  };

  const handleSubmitReview = async () => {
    try {
      // Verificar que todas las metas tengan un estado asignado
      const allReviewed = cartaData!.metas.every(meta => 
        metasReview[meta.id]?.status !== 'PENDING'
      );

      if (!allReviewed) {
        // Notificación de error
        const Toast = document.createElement('div');
        Toast.className = 'fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-red-400/30 backdrop-blur-sm animate-shake';
        Toast.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="font-bold text-lg">❌ Faltan metas por revisar</p>
              <p class="text-sm text-red-100">Debes aprobar o rechazar todas las metas antes de enviar</p>
            </div>
          </div>
        `;
        document.body.appendChild(Toast);
        setTimeout(() => {
          Toast.style.transition = 'all 0.5s ease-out';
          Toast.style.opacity = '0';
          Toast.style.transform = 'translateX(-50%) translateY(-20px)';
          setTimeout(() => Toast.remove(), 500);
        }, 4000);
        return;
      }

      setSubmitting(true);

      // Preparar datos de revisión
      const reviewPayload = {
        metasReview: Object.entries(metasReview).map(([metaId, review]) => ({
          metaId: parseInt(metaId),
          status: review.status,
          mentorFeedback: review.mentorFeedback
        }))
      };

      const response = await fetch(`/api/mentor/carta/${cartaId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar revisión');
      }

      const result = await response.json();

      if (result.allApproved) {
        // Notificación de aprobación total
        const Toast = document.createElement('div');
        Toast.className = 'fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-emerald-400/30 backdrop-blur-sm';
        Toast.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-8 h-8 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-bold text-lg">🎉 Carta aprobada completamente</p>
              <p class="text-sm text-emerald-100">Las tareas se generarán automáticamente para el usuario</p>
            </div>
          </div>
        `;
        document.body.appendChild(Toast);
        setTimeout(() => {
          Toast.style.transition = 'all 0.5s ease-out';
          Toast.style.opacity = '0';
          Toast.style.transform = 'translateX(-50%) translateY(-20px)';
          setTimeout(() => Toast.remove(), 500);
        }, 4000);
      } else {
        // Notificación de revisión guardada
        const Toast = document.createElement('div');
        Toast.className = 'fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-blue-400/30 backdrop-blur-sm';
        Toast.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-bold text-lg">✅ Revisión guardada exitosamente</p>
              <p class="text-sm text-blue-100">El usuario recibirá notificación de los cambios solicitados</p>
            </div>
          </div>
        `;
        document.body.appendChild(Toast);
        setTimeout(() => {
          Toast.style.transition = 'all 0.5s ease-out';
          Toast.style.opacity = '0';
          Toast.style.transform = 'translateX(-50%) translateY(-20px)';
          setTimeout(() => Toast.remove(), 500);
        }, 4000);
      }

      router.push('/dashboard/mentor/cartas');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArea = (categoria: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  };

  const getFrequencyLabel = (frequency: string, assignedDays: number[], specificDate: string | null) => {
    if (frequency === 'ONE_TIME' && specificDate) {
      return `📅 ${new Date(specificDate).toLocaleDateString('es-MX')}`;
    }
    if (frequency === 'DAILY') {
      return '📅 Diaria';
    }
    if (frequency === 'WEEKLY') {
      const dias = assignedDays.map(d => DIAS_SEMANA.find(dia => dia.id === d)?.label).filter(Boolean).join(', ');
      return `📅 ${dias}`;
    }
    if (frequency === 'MONTHLY') {
      const dias = assignedDays.map(d => DIAS_SEMANA.find(dia => dia.id === d)?.label).filter(Boolean).join(', ');
      return `📅 Mensual: ${dias}`;
    }
    return '📅 Sin frecuencia';
  };

  const getAreaConfig = (categoria: string) => {
    return AREAS_CONFIG.find(a => a.key === categoria) || AREAS_CONFIG[0];
  };

  // Agrupar metas por categoría
  const metasPorCategoria = (cartaData?.metas || []).reduce((acc, meta) => {
    if (!acc[meta.categoria]) {
      acc[meta.categoria] = [];
    }
    acc[meta.categoria].push(meta);
    return acc;
  }, {} as Record<string, Meta[]>);

  // Calcular estadísticas
  const totalMetas = cartaData?.metas.length || 0;
  const metasAprobadas = Object.values(metasReview).filter(r => r.status === 'APPROVED').length;
  const metasRechazadas = Object.values(metasReview).filter(r => r.status === 'REJECTED').length;
  const metasPendientes = totalMetas - metasAprobadas - metasRechazadas;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Cargando carta...</p>
        </div>
      </div>
    );
  }

  if (error || !cartaData) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <Link 
          href="/dashboard/mentor/cartas"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cartas
        </Link>
        
        <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-700 p-8 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-red-300 font-bold text-xl text-center mb-2">Error al cargar carta</h3>
          <p className="text-red-400 text-center">{error || 'Carta no encontrada'}</p>
          <div className="mt-6 text-center">
            <button 
              onClick={loadCartaData}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link 
          href="/dashboard/mentor/cartas"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cartas
        </Link>
        
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-700/30 rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🎓 Revisión de Carta F.R.U.T.O.S.
              </h1>
              <p className="text-slate-300">
                <strong>{cartaData.usuario.nombre}</strong> • {cartaData.usuario.email}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Enviada: {new Date(cartaData.carta.fechaActualizacion).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Estadísticas */}
            <div className="flex gap-4">
              <div className="text-center bg-green-900/20 border border-green-600 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{metasAprobadas}</div>
                <div className="text-xs text-green-300">Aprobadas</div>
              </div>
              <div className="text-center bg-red-900/20 border border-red-600 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{metasRechazadas}</div>
                <div className="text-xs text-red-300">Rechazadas</div>
              </div>
              <div className="text-center bg-yellow-900/20 border border-yellow-600 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{metasPendientes}</div>
                <div className="text-xs text-yellow-300">Pendientes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto space-y-6">
        {Object.entries(metasPorCategoria).map(([categoria, metas]) => {
          const areaConfig = getAreaConfig(categoria);
          const isExpanded = expandedAreas.has(categoria);

          return (
            <div 
              key={categoria}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-700/50 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header del Área */}
              <button
                onClick={() => toggleArea(categoria)}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{areaConfig.icono}</div>
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-white">{areaConfig.nombre}</h2>
                    <p className="text-slate-400 text-sm">{metas.length} {metas.length === 1 ? 'objetivo' : 'objetivos'}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-6 h-6 text-purple-400" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-purple-400" />
                )}
              </button>

              {/* Contenido del Área */}
              {isExpanded && (
                <div className="p-6 pt-0 space-y-6">
                  {metas.map((meta, metaIndex) => {
                    const reviewStatus = metasReview[meta.id];
                    const statusColor = 
                      reviewStatus?.status === 'APPROVED' ? 'green' :
                      reviewStatus?.status === 'REJECTED' ? 'red' :
                      'slate';

                    return (
                      <div 
                        key={meta.id}
                        className={`bg-slate-950/50 rounded-xl p-6 border-2 ${
                          reviewStatus?.status === 'APPROVED' ? 'border-green-500/50 bg-green-900/10' :
                          reviewStatus?.status === 'REJECTED' ? 'border-red-500/50 bg-red-900/10' :
                          'border-slate-700'
                        }`}
                      >
                        {/* Número de Objetivo */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 bg-${areaConfig.color}-900/30 border border-${areaConfig.color}-600 rounded-full`}>
                              <span className={`text-${areaConfig.color}-300 font-bold text-sm`}>
                                Objetivo {metaIndex + 1}
                              </span>
                            </div>
                            {reviewStatus?.status === 'APPROVED' && (
                              <CheckCircle2 className="w-6 h-6 text-green-400" />
                            )}
                            {reviewStatus?.status === 'REJECTED' && (
                              <XCircle className="w-6 h-6 text-red-400" />
                            )}
                          </div>

                          {/* Botones de Revisión */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(meta.id)}
                              disabled={reviewStatus?.status === 'APPROVED'}
                              className={`p-2 rounded-lg transition-all ${
                                reviewStatus?.status === 'APPROVED'
                                  ? 'bg-green-600 text-white cursor-not-allowed'
                                  : 'bg-green-900/30 border border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                              }`}
                              title="Aprobar"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(meta.id)}
                              disabled={reviewStatus?.status === 'REJECTED'}
                              className={`p-2 rounded-lg transition-all ${
                                reviewStatus?.status === 'REJECTED'
                                  ? 'bg-red-600 text-white cursor-not-allowed'
                                  : 'bg-red-900/30 border border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                              }`}
                              title="Rechazar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Declaración de Poder */}
                        {meta.declaracionPoder && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-yellow-400" />
                              <label className="text-sm font-semibold text-yellow-300">
                                Declaración
                              </label>
                            </div>
                            <p className="text-white bg-slate-900/70 p-4 rounded-lg border border-slate-700">
                              {meta.declaracionPoder}
                            </p>
                          </div>
                        )}

                        {/* Acciones */}
                        {meta.acciones && meta.acciones.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Trophy className="w-4 h-4 text-purple-400" />
                              <label className="text-sm font-semibold text-purple-300">
                                Acciones Programadas SMART ({meta.acciones.length})
                              </label>
                            </div>
                            <div className="space-y-2">
                              {meta.acciones.map((accion, idx) => (
                                <div 
                                  key={accion.id}
                                  className="flex items-center gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                >
                                  {/* Número de acción */}
                                  <div className="flex-shrink-0 w-7 h-7 bg-purple-900/50 border border-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-purple-300 text-xs font-bold">{idx + 1}</span>
                                  </div>

                                  {/* Contenido de la acción */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white mb-1 break-words">{accion.texto}</p>
                                    <p className="text-slate-400 text-xs">
                                      {getFrequencyLabel(accion.frequency, accion.assignedDays, accion.specificDate)}
                                    </p>
                                  </div>

                                  {/* Toggle de Evidencia */}
                                  <div className="flex-shrink-0">
                                    <button
                                      onClick={() => handleToggleEvidence(accion.id, accion.requiereEvidencia)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                        accion.requiereEvidencia
                                          ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-900/50'
                                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                      }`}
                                      title={accion.requiereEvidencia ? 'Evidencia fotográfica obligatoria' : 'Solo Honor Code (sin evidencia)'}
                                    >
                                      <span className="text-base">{accion.requiereEvidencia ? '📸' : '🚫'}</span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {accion.requiereEvidencia ? 'SÍ' : 'NO'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Feedback del Rechazo */}
                        {reviewStatus?.status === 'REJECTED' && reviewStatus.mentorFeedback && (
                          <div className="mt-4 bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-red-300 font-semibold text-sm mb-1">Comentario de rechazo:</p>
                                <p className="text-red-200">{reviewStatus.mentorFeedback}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Botón de Enviar Revisión */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t-2 border-purple-700/50 p-6 rounded-t-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-slate-300">
              <p className="font-semibold">Progreso de revisión:</p>
              <p className="text-sm">
                {metasAprobadas + metasRechazadas} de {totalMetas} revisadas
                {metasPendientes > 0 && (
                  <span className="text-yellow-400 ml-2">
                    ({metasPendientes} pendientes)
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={metasPendientes > 0 || submitting}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-3 ${
                metasPendientes > 0 || submitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/50'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Enviar Revisión Completa
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Feedback */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-2xl w-full p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-8 h-8 text-red-400" />
              <h3 className="text-2xl font-bold text-white">Comentario de Rechazo</h3>
            </div>

            <p className="text-slate-300 mb-4">
              Explica por qué rechazas esta meta. El usuario verá este comentario y podrá editar su carta.
            </p>

            <textarea
              value={feedbackModal.feedback}
              onChange={(e) => setFeedbackModal(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder="Ej: La meta no es específica. Por favor indica una cantidad exacta y una fecha límite."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              autoFocus
            />

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setFeedbackModal({ metaId: null, isOpen: false, feedback: '' })}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFeedback}
                disabled={!feedbackModal.feedback.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Rechazar con Comentario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
