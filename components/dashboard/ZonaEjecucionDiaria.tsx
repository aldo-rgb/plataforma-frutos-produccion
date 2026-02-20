'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Clock, CheckCircle, AlertCircle, Upload, X, Zap, Calendar, Eye, User, Star, Target } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface Tarea {
  id: string; // Changed: puede ser "carta-123" o "admin-456"
  taskId?: number; // ID original de TaskInstance
  submissionId?: number; // ID de TaskSubmission si es admin
  tipo: 'CARTA' | 'EXTRAORDINARIA' | 'EVENTO' | 'PERSONAJE' | 'SALTO_CUANTICO' | 'TRAINER_MISSION';
  texto: string;
  area: string;
  areaIcon: string;
  metaContext: string;
  fechaProgramada: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'SUBMITTED' | 'EXPIRED' | 'REJECTED';
  evidenceStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  evidenciaUrl?: string;
  pointsReward?: number;
  requiereEvidencia?: boolean;
  lugar?: string | null;
  horaEvento?: string | null;
  deadline?: string | null; // Fecha + Hora límite combinadas
  horaLimite?: string | null;
  feedbackMentor?: string | null; // Feedback del mentor cuando rechaza
}

interface ZonaEjecucionData {
  tareasHoy: Tarea[];
  tareasRetrasadas: Tarea[];
  totalHoy: number;
  totalRetrasadas: number;
  isDropped?: boolean; // Usuario marcado como DROP
}

export default function ZonaEjecucionDiaria() {
  const toast = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'hoy' | 'retrasadas'>('hoy');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ZonaEjecucionData | null>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null); // Changed to string
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null); // Para tareas sin evidencia
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewEvidenceModal, setShowViewEvidenceModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    comentario: ''
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTareas();
    // Update current time every minute for countdown
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Función para calcular tiempo restante
  const getTimeRemaining = (deadline: string | null | undefined, horaLimite: string | null | undefined) => {
    if (!deadline) return null;
    
    // CRÍTICO: deadline viene como UTC, extraer componentes UTC para reconstruir en local
    const deadlineUTC = new Date(deadline);
    const year = deadlineUTC.getUTCFullYear();
    const month = deadlineUTC.getUTCMonth();
    const day = deadlineUTC.getUTCDate();
    
    // Reconstruir fecha en hora local
    const deadlineDate = new Date(year, month, day);
    
    if (horaLimite) {
      const [hours, minutes] = horaLimite.split(':');
      deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      deadlineDate.setHours(23, 59, 59, 999);
    }
    
    const diff = deadlineDate.getTime() - currentTime.getTime();
    if (diff <= 0) return { expired: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      expired: false,
      hours,
      minutes,
      isUrgent: hours < 24 // Menos de 24 horas
    };
  };

  const loadTareas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tareas/zona-ejecucion');
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Tareas cargadas:', result);
        setData(result);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('Error al cargar tareas:', errorData);
        toast.error('Error al cargar tareas');
      }
    } catch (error) {
      console.error('Error loading tareas:', error);
      toast.error('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = (tarea: Tarea) => {
    setSelectedTask(tarea);
    setShowUploadModal(true);
    setUploadForm({ file: null, comentario: '' });
  };

  const openViewEvidenceModal = (tarea: Tarea) => {
    console.log('🔍 DEBUG Ver Evidencia - Tarea seleccionada:', {
      id: tarea.id,
      texto: tarea.texto,
      evidenceStatus: tarea.evidenceStatus,
      evidenciaUrl: tarea.evidenciaUrl
    });
    setSelectedTask(tarea);
    setShowViewEvidenceModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedTask(null);
    setUploadForm({ file: null, comentario: '' });
  };

  const closeViewEvidenceModal = () => {
    setShowViewEvidenceModal(false);
    setSelectedTask(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUploadEvidencia = async () => {
    if (!selectedTask || !uploadForm.file) {
      toast.error('Debes seleccionar una imagen');
      return;
    }

    setUploadingTaskId(selectedTask.id); // Now using the composite ID
    
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      
      // Detectar si es tarea de carta o admin
      if (selectedTask.tipo === 'CARTA' && selectedTask.taskId) {
        formData.append('taskId', selectedTask.taskId.toString());
      } else if ((selectedTask.tipo === 'EXTRAORDINARIA' || selectedTask.tipo === 'EVENTO') && selectedTask.submissionId) {
        formData.append('submissionId', selectedTask.submissionId.toString());
      }
      
      formData.append('comentario', uploadForm.comentario);

      const response = await fetch('/api/evidencias/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('✅ ¡Evidencia enviada! Tu mentor la revisará pronto');
        closeUploadModal();
        await loadTareas(); // Recargar las tareas
      } else {
        const error = await response.json();
        toast.error('Error al subir evidencia: ' + (error.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error uploading evidencia:', error);
      toast.error('Error al subir evidencia');
    } finally {
      setUploadingTaskId(null);
    }
  };

  // Completar tarea sin evidencia (como personajes)
  const handleCompleteSimple = async (tarea: Tarea) => {
    if (!tarea.submissionId) {
      toast.error('Error: No se encontró el ID de la tarea');
      return;
    }

    setCompletingTaskId(tarea.id);
    
    try {
      const response = await fetch('/api/tareas/complete-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: tarea.submissionId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ ¡Tarea completada! +${data.pointsEarned} puntos`);
        await loadTareas(); // Recargar las tareas
      } else {
        toast.error(data.error || 'Error al completar la tarea');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Error al completar la tarea');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const getStatusBadge = (tarea: Tarea) => {
    // Si la tarea está completada
    if (tarea.status === 'COMPLETED') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500 text-green-300 rounded-full text-xs font-bold">
          <CheckCircle className="w-3 h-3" />
          Completada
        </div>
      );
    }

    // Si la evidencia fue rechazada
    if (tarea.status === 'REJECTED') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500 text-red-300 rounded-full text-xs font-bold animate-pulse">
          <AlertCircle className="w-3 h-3" />
          Rechazada - Reenviar
        </div>
      );
    }

    // Si tiene evidencia en revisión (SUBMITTED)
    // Para misiones del trainer, SUBMITTED = Terminada (el participante ya hizo su parte)
    if (tarea.status === 'SUBMITTED') {
      if (tarea.tipo === 'TRAINER_MISSION') {
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500 text-green-300 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" />
            Terminada
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500 text-blue-300 rounded-full text-xs font-bold">
          <Clock className="w-3 h-3" />
          Mentor revisando
        </div>
      );
    }

    // Si la evidencia fue aprobada (legacy check)
    if (tarea.evidenceStatus === 'APPROVED') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500 text-green-300 rounded-full text-xs font-bold">
          <CheckCircle className="w-3 h-3" />
          Aprobada
        </div>
      );
    }

    return null;
  };

  const getActionButton = (tarea: Tarea) => {
    // Si está completada o aprobada, no mostrar botón
    if (tarea.status === 'COMPLETED' || tarea.evidenceStatus === 'APPROVED') {
      return null;
    }

    // Para SALTO_CUANTICO, botón especial que lleva a /dashboard/hoy
    if (tarea.tipo === 'SALTO_CUANTICO') {
      return (
        <button
          onClick={() => router.push('/dashboard/hoy')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-amber-500/20"
        >
          <Zap className="w-4 h-4" />
          Completar
        </button>
      );
    }

    // Si tiene evidencia pendiente de revisión (PENDING)
    if (tarea.evidenceStatus === 'PENDING') {
      return (
        <button
          onClick={() => openViewEvidenceModal(tarea)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20"
        >
          <Eye className="w-4 h-4" />
          Ver Evidencia
        </button>
      );
    }

    // Si tiene evidencia en revisión (SUBMITTED)
    // Para misiones del trainer, SUBMITTED = completada, mostrar botón de "Ver Evidencia"
    if (tarea.status === 'SUBMITTED') {
      if (tarea.tipo === 'TRAINER_MISSION') {
        return (
          <button
            onClick={() => openViewEvidenceModal(tarea)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20"
          >
            <Eye className="w-4 h-4" />
            Ver Evidencia
          </button>
        );
      }
      return (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/50 text-blue-200 text-sm font-bold rounded-lg cursor-not-allowed"
        >
          <Clock className="w-4 h-4" />
          En Revisión
        </button>
      );
    }

    // Si fue rechazada, botón especial para reenviar
    if (tarea.status === 'REJECTED') {
      return (
        <button
          onClick={() => openUploadModal(tarea)}
          disabled={uploadingTaskId === tarea.id}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 animate-pulse"
        >
          <Upload className="w-4 h-4" />
          Reenviar Evidencia
        </button>
      );
    }

    return (
      <button
        onClick={() => openUploadModal(tarea)}
        disabled={uploadingTaskId === tarea.id}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
      >
        {uploadingTaskId === tarea.id ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Subir Evidencia
          </>
        )}
      </button>
    );
  };

  // Ordenar tareas: las más próximas a vencer arriba
  const tareas = React.useMemo(() => {
    const tareasArray = activeTab === 'hoy' ? (data?.tareasHoy || []) : (data?.tareasRetrasadas || []);
    
    return [...tareasArray].sort((a, b) => {
      // Si ambas tienen deadline, ordenar por tiempo restante
      if (a.deadline && b.deadline) {
        const timeA = getTimeRemaining(a.deadline, a.horaLimite);
        const timeB = getTimeRemaining(b.deadline, b.horaLimite);
        
        // Si ambas tienen tiempo calculado
        if (timeA && timeB && !timeA.expired && !timeB.expired) {
          const totalMinutesA = (timeA.hours * 60) + timeA.minutes;
          const totalMinutesB = (timeB.hours * 60) + timeB.minutes;
          return totalMinutesA - totalMinutesB; // Menor tiempo primero
        }
      }
      
      // Si no tienen deadline o están expiradas, mantener orden original
      return 0;
    });
  }, [data, activeTab, currentTime]);

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-6 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="ml-3 text-slate-400">Cargando misiones...</span>
        </div>
      </div>
    );
  }

  // Si el usuario está marcado como DROP, mostrar mensaje especial y ocultar tareas
  if (data?.isDropped) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 border border-red-900/50 shadow-2xl mb-6 overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Acceso Suspendido</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Tu participación en el programa ha sido pausada. Contacta a tu coordinador para más información.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 bg-slate-800/50 border-b border-slate-700 gap-3">
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl flex items-center gap-2">
              🚀 Zona de Ejecución
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Hoy es día de ganar</p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-lg p-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('hoy')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'hoy'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HOY ({data?.totalHoy || 0})
            </button>
            <button
              onClick={() => setActiveTab('retrasadas')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-all ${
                activeTab === 'retrasadas'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RETRASADAS
              {data && data.totalRetrasadas > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded animate-pulse">
                  {data.totalRetrasadas}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {tareas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-semibold">
                🎉 ¡Todo listo para hoy!
              </p>
              <p className="text-slate-500 text-sm mt-2 mb-6">
                No tienes tareas pendientes. Disfruta tu día o revisa tus metas programadas en HOY 
              </p>
              
              {/* Botón para ir a la carta */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/40 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Zap className="text-purple-400" size={24} />
                  <h3 className="text-white font-bold text-lg">Revisa tu Progreso</h3>
                </div>
                <p className="text-slate-300 text-sm mb-4">
                  Ve a tus <strong className="text-purple-400">Objetivos</strong> para ver tus metas programadas.
                </p>
                <a
                  href="/dashboard/carta"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/30"
                >
                  <Zap size={18} />
                  Ver mis Objetivos
                </a>
              </div>
            </div>
          ) : (
            tareas.map((tarea) => {
              const isExpired = tarea.status === 'EXPIRED';
              const timeRemaining = tarea.tipo === 'EXTRAORDINARIA' && !isExpired 
                ? getTimeRemaining(tarea.deadline, tarea.horaLimite) 
                : null;
              
              // Estilos diferentes según tipo y estado
              const getCardStyle = () => {
                if (isExpired) {
                  return 'opacity-70 grayscale bg-gradient-to-r from-gray-900/60 to-gray-800/40 border-2 border-red-900/50';
                }
                
                // Amarillo si tiene evidencia pendiente de revisión
                if (tarea.evidenceStatus === 'PENDING') {
                  return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-2 border-yellow-500/70 shadow-lg shadow-yellow-500/30';
                }
                
                if (tarea.tipo === 'EVENTO') {
                  return 'bg-gradient-to-r from-purple-900/40 to-purple-800/20 border-2 border-purple-500/70 shadow-lg shadow-purple-500/30';
                } else if (tarea.tipo === 'EXTRAORDINARIA') {
                  return 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 border-2 border-amber-500/70 shadow-lg shadow-amber-500/30';
                } else if (tarea.tipo === 'PERSONAJE') {
                  return 'bg-gradient-to-r from-violet-900/40 to-fuchsia-900/20 border-2 border-violet-500/70 shadow-lg shadow-violet-500/30';
                } else if (tarea.tipo === 'SALTO_CUANTICO') {
                  return 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20';
                }
                return 'bg-gradient-to-r from-slate-800/40 to-slate-800/10 border border-slate-700/50 hover:border-indigo-500/50';
              };

              const getBadge = () => {
                if (isExpired && tarea.tipo === 'EXTRAORDINARIA') {
                  return (
                    <div className="absolute -top-2 -right-2 bg-red-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border-2 border-red-700 z-20">
                      💀 EXPIRADA - 0 PC
                    </div>
                  );
                }
                
                if (tarea.tipo === 'EVENTO') {
                  return (
                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1 z-20">
                      <Calendar className="w-3 h-3" />
                      EVENTO +{tarea.pointsReward || 0} PC
                    </div>
                  );
                } else if (tarea.tipo === 'EXTRAORDINARIA') {
                  return (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20">
                      <Zap className="w-3 h-3" />
                      +{tarea.pointsReward || 0} PC
                    </div>
                  );
                } else if (tarea.tipo === 'PERSONAJE') {
                  return (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20">
                      <User className="w-3 h-3" />
                      +{tarea.pointsReward || 0} PC
                    </div>
                  );
                } else if (tarea.tipo === 'SALTO_CUANTICO') {
                  return (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20">
                      <Zap className="w-3 h-3" />
                      SALTO CUÁNTICO
                    </div>
                  );
                }
                return null;
              };

              return (
                <div
                  key={tarea.id}
                  className={`relative flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl transition-all group ${getCardStyle()}`}
                >
                  {/* Watermark de EXPIRADO solo para EXTRAORDINARIAS */}
                  {isExpired && tarea.tipo === 'EXTRAORDINARIA' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <span className="text-2xl sm:text-5xl font-black text-red-900/30 -rotate-12 border-4 border-red-900/30 px-4 sm:px-6 py-1 sm:py-2 rounded-lg select-none">
                        PERDISTE {tarea.pointsReward || 0} PC
                      </span>
                    </div>
                  )}
                  
                  {getBadge()}
                  
                  {/* Countdown Timer para TODAS las tareas extraordinarias y eventos */}
                  {(tarea.tipo === 'EXTRAORDINARIA' || tarea.tipo === 'EVENTO') && timeRemaining && !timeRemaining.expired && (
                    <div className={`absolute -top-2 -left-2 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg flex items-center gap-1 z-20 ${
                      timeRemaining.isUrgent ? 'bg-red-600 animate-pulse' : 'bg-orange-500'
                    }`}>
                      ⏱ {timeRemaining.hours}h {timeRemaining.minutes}m
                    </div>
                  )}
                  
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Icono del área */}
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 ${
                      isExpired ? 'bg-gray-800/50' :
                      tarea.tipo === 'EVENTO' ? 'bg-purple-900/50' : 
                      tarea.tipo === 'EXTRAORDINARIA' ? 'bg-amber-900/50' :
                      tarea.tipo === 'PERSONAJE' ? 'bg-violet-900/50' :
                      'bg-indigo-900/30'
                    }`}>
                      {tarea.areaIcon}
                    </div>
                    
                    {/* Info de la tarea */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-white font-medium text-sm sm:text-base leading-snug ${isExpired ? 'line-through decoration-red-500/50' : ''}`}>
                        {tarea.texto}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {tarea.metaContext}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500">{tarea.area}</p>
                    </div>
                  </div>
                  
                  {/* Action Button - En móvil va abajo */}
                  <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 flex justify-end">
                    {isExpired ? (
                      <div className="text-center">
                        <button
                          disabled
                          className="px-3 sm:px-4 py-2 bg-gray-900 text-gray-600 rounded-lg cursor-not-allowed opacity-50 border border-gray-800 text-xs sm:text-sm"
                        >
                          Expirada
                        </button>
                      </div>
                    ) : tarea.status === 'APPROVED' || tarea.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Completada
                      </div>
                    ) : tarea.tipo === 'PERSONAJE' ? (
                      <button
                        onClick={() => router.push('/dashboard/hoy')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg transition-all shadow-lg shadow-violet-500/30 text-xs sm:text-sm font-medium"
                      >
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        ¡Completar!
                      </button>
                    ) : tarea.tipo === 'SALTO_CUANTICO' ? (
                      <button
                        onClick={() => router.push('/dashboard/hoy')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg transition-all shadow-lg shadow-amber-500/30 text-xs sm:text-sm font-medium"
                      >
                        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Completar
                      </button>
                    ) : tarea.tipo === 'TRAINER_MISSION' ? (
                      <button
                        onClick={() => router.push('/dashboard/hoy')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/30 text-xs sm:text-sm font-medium"
                      >
                        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Completar
                      </button>
                    ) : tarea.evidenceStatus === 'PENDING' ? (
                      <button
                        onClick={() => router.push('/dashboard/hoy')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Ver
                      </button>
                    ) : tarea.requiereEvidencia !== false ? (
                      <button
                        onClick={() => router.push('/dashboard/hoy')}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-purple-500/30 text-xs sm:text-sm font-medium"
                      >
                        <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Subir</span> Evidencia
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteSimple(tarea)}
                        disabled={completingTaskId === tarea.id}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all shadow-lg shadow-green-500/30 text-xs sm:text-sm font-medium disabled:opacity-50"
                      >
                        {completingTaskId === tarea.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            Completando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Completar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Subir Evidencia</h3>
              <button
                onClick={closeUploadModal}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tarea info */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400">Tarea:</p>
                <p className="text-white font-medium">{selectedTask.texto}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedTask.metaContext}</p>
              </div>

              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Foto de Evidencia *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">
                      {uploadForm.file ? uploadForm.file.name : 'Seleccionar foto'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Comentarios (opcional)
                </label>
                <textarea
                  value={uploadForm.comentario}
                  onChange={(e) => setUploadForm({ ...uploadForm, comentario: e.target.value })}
                  placeholder="Agrega cualquier nota para tu mentor..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={closeUploadModal}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadEvidencia}
                  disabled={!uploadForm.file || uploadingTaskId !== null}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingTaskId ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Evidencia */}
      {showViewEvidenceModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  📸 Evidencia Subida
                </h3>
                <button
                  onClick={closeViewEvidenceModal}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Task Info */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Tarea</p>
                <p className="text-white font-medium">{selectedTask.texto}</p>
                <p className="text-sm text-indigo-400 mt-1">{selectedTask.area}</p>
              </div>

              {/* Evidence Image */}
              {selectedTask.evidenciaUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                  <img
                    src={selectedTask.evidenciaUrl}
                    alt="Evidencia"
                    className="w-full h-auto object-contain max-h-[500px]"
                    onError={(e) => {
                      console.error('❌ Error cargando imagen:', selectedTask.evidenciaUrl);
                      e.currentTarget.src = '/placeholder-image.png';
                    }}
                  />
                </div>
              ) : (
                <div className="p-8 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                  <p className="text-slate-400">No se encontró la evidencia</p>
                  <p className="text-xs text-slate-500 mt-1">URL: {selectedTask.evidenciaUrl || 'null'}</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-center gap-2 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-amber-300 font-medium">
                  Evidencia pendiente de revisión por tu mentor
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={closeViewEvidenceModal}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
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
