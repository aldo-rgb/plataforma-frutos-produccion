'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import SmartTask from '@/components/dashboard/SmartTask';
import SpecialMissionTask from '@/components/dashboard/SpecialMissionTask';
import EvidenceModal from '@/components/dashboard/EvidenceModal';
import DashboardCalendarHeader from '@/components/dashboard/DashboardCalendarHeader';
import UserLevelBadge from '@/components/dashboard/UserLevelBadge';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, TrendingUp, Check, Zap } from 'lucide-react';

interface Task {
  id: string | number; // Puede ser number (carta) o string (admin)
  taskId?: number;
  submissionId?: number;
  tipo: 'CARTA' | 'EXTRAORDINARIA' | 'EVENTO';
  texto: string;
  area: string;
  areaIcon: string;
  metaContext: string;
  fechaProgramada: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'SUBMITTED' | 'EXPIRED';
  evidenceStatus?: string;
  evidenciaUrl?: string | null;
  feedbackMentor?: string | null;
  pointsReward: number;
  requiereEvidencia: boolean;
  deadline?: string;
  horaLimite?: string;
  lugar?: string;
  horaEvento?: string;
  accionId?: number;
  metaId?: number;
  postponeCount?: number;
  completedAt?: string | null;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  enRevision: number;
  overdue: number;
  completionRate: number;
}

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    pending: 0,
    enRevision: 0,
    overdue: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [evidenceModal, setEvidenceModal] = useState<{
    isOpen: boolean;
    task: Task | null;
  }>({ isOpen: false, task: null });

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Usar zona-ejecucion endpoint que incluye tareas wizard + extraordinarias
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/tareas/zona-ejecucion?date=${dateStr}`);
      const data = await response.json();
      
      if (data.tareasHoy) {
        console.log('📦 Tareas recibidas del servidor:', data.tareasHoy);
        console.log('📦 Tareas retrasadas:', data.tareasRetrasadas);
        console.log('📦 Breakdown:', data.breakdown);
        
        // Filtrar misiones especiales vencidas (EXPIRED o que ya pasó el deadline)
        const allTasks = data.tareasHoy.filter((t: any) => {
          // Si es una misión especial (EXTRAORDINARIA o EVENTO)
          if (t.tipo === 'EXTRAORDINARIA' || t.tipo === 'EVENTO') {
            // Filtrar si está EXPIRED
            if (t.status === 'EXPIRED') {
              console.log(`🚫 Filtrando tarea EXPIRED: ${t.texto}`);
              return false;
            }
            // Filtrar si ya pasó el deadline
            if (t.deadline) {
              const deadlineDate = new Date(t.deadline);
              const now = new Date();
              if (deadlineDate < now) {
                console.log(`🚫 Filtrando tarea con deadline vencido: ${t.texto} (${t.deadline})`);
                return false;
              }
            }
          }
          return true;
        });
        
        console.log('✅ Tareas después del filtro:', allTasks);
        
        setTasks(allTasks);
        
        // Usar el breakdown del backend que ya tiene el conteo correcto
        const retrasadasCarta = data.breakdown?.retrasadasCarta || 0;
        
        // Calcular stats
        const stats = {
          total: allTasks.length,
          completed: allTasks.filter((t: any) => t.status === 'COMPLETED').length,
          pending: allTasks.filter((t: any) => t.status === 'PENDING').length,
          enRevision: allTasks.filter((t: any) => t.status === 'SUBMITTED').length,
          overdue: retrasadasCarta, // Solo tareas de carta retrasadas
          completionRate: allTasks.length > 0 
            ? Math.round((allTasks.filter((t: any) => t.status === 'COMPLETED').length / allTasks.length) * 100)
            : 0
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Adapter para convertir tareas al formato esperado por SmartTask
  const adaptTaskForSmartTask = (task: Task) => {
    if (task.tipo === 'CARTA') {
      // Tareas de carta ya tienen la estructura correcta
      return {
        id: task.taskId || 0,
        accionId: task.accionId || 0,
        metaId: task.metaId || 0,
        title: task.texto,
        areaType: task.area,
        identity: task.metaContext,
        dueDate: task.fechaProgramada,
        status: task.status as 'PENDING' | 'COMPLETED' | 'SKIPPED',
        postponeCount: task.postponeCount || 0,
        completedAt: task.completedAt,
        evidenceUrl: task.evidenciaUrl,
        evidenceStatus: task.evidenceStatus as any,
        feedbackMentor: task.feedbackMentor,
        tipo: 'CARTA'
      };
    } else {
      // Tareas extraordinarias y eventos (misiones especiales)
      return {
        id: task.submissionId || 0,
        accionId: 0,
        metaId: 0,
        title: task.texto,
        areaType: task.area,
        identity: task.metaContext,
        dueDate: task.fechaProgramada,
        status: task.status as 'PENDING' | 'COMPLETED' | 'SKIPPED',
        postponeCount: 0,
        completedAt: task.status === 'COMPLETED' ? new Date().toISOString() : null,
        evidenceUrl: task.evidenciaUrl,
        evidenceStatus: task.evidenceStatus as any,
        feedbackMentor: task.feedbackMentor,
        tipo: task.tipo,
        deadline: task.deadline,
        horaLimite: task.horaLimite,
        pointsReward: task.pointsReward
      };
    }
  };

  const handleTaskUpdate = async (taskId: number, action: 'POSTPONE', days?: number) => {
    try {
      if (action === 'POSTPONE' && days) {
        const response = await fetch('/api/tasks/postpone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, daysToAdd: days })
        });

        const data = await response.json();

        if (data.success) {
          // Mostrar mensaje
          if (data.mentorNotified) {
            alert(data.message);
          }

          // Remover de la lista actual
          setTasks(prev => prev.filter(task => task.id !== taskId));
          setStats(prev => ({
            ...prev,
            total: prev.total - 1,
            pending: prev.pending - 1
          }));
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Hubo un error al actualizar la tarea');
    }
  };

  const handleUploadEvidence = (taskId: number, accionId: number, metaId: number) => {
    const task = tasks.find(t => {
      if (t.tipo === 'CARTA') {
        return t.taskId === taskId;
      } else {
        return t.submissionId === taskId;
      }
    });
    
    if (task) {
      setEvidenceModal({
        isOpen: true,
        task: task
      });
    }
  };

  const handleSubmitEvidence = async (file: File, description: string) => {
    if (!evidenceModal.task) return;

    const task = evidenceModal.task;

    try {
      // Crear FormData para subir el archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('descripcion', description);

      let response;
      
      // Determinar qué endpoint usar según el tipo de tarea
      if (task.tipo === 'CARTA') {
        // Tareas del wizard/carta
        const metaId = task.metaId || 0;
        const accionId = task.accionId || 0;
        const taskInstanceId = task.taskId || 0;
        
        console.log('📤 Enviando evidencia carta:', { metaId, accionId, taskInstanceId });
        
        if (!metaId || !accionId || !taskInstanceId) {
          throw new Error('Faltan datos de la tarea. Por favor recarga la página.');
        }
        
        formData.append('metaId', metaId.toString());
        formData.append('accionId', accionId.toString());
        formData.append('taskInstanceId', taskInstanceId.toString());
        
        response = await fetch('/api/evidencia/completar', {
          method: 'POST',
          body: formData
        });
      } else {
        // Tareas extraordinarias
        const submissionId = task.submissionId || 0;
        
        console.log('📤 Enviando evidencia misión:', { submissionId });
        
        if (!submissionId) {
          throw new Error('Faltan datos de la misión. Por favor recarga la página.');
        }
        
        formData.append('submissionId', submissionId.toString());
        
        response = await fetch('/api/evidencias/upload', {
          method: 'POST',
          body: formData
        });
      }

      const data = await response.json();

      if (data.success || response.ok) {
        // Actualizar la tarea en el estado con la evidencia y el nuevo status
        setTasks(prev => prev.map(t => 
          t.id === task.id
            ? { 
                ...t, 
                evidenciaUrl: data.evidencia?.fotoUrl || data.url,
                evidenceStatus: 'PENDING',
                status: task.tipo === 'CARTA' ? 'PENDING' : 'SUBMITTED'
              }
            : t
        ));

        // El componente EvidenceModal muestra su animación de éxito
        // y se cierra automáticamente después de 2 segundos
      } else {
        throw new Error(data.error || 'Error al subir evidencia');
      }
    } catch (error) {
      console.error('Error submitting evidence:', error);
      throw error;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Calendario semanal pequeño
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
  });

  const CircularProgress = () => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stats.completionRate / 100) * circumference;

    return (
      <div className="relative w-20 h-20">
        <svg className="transform -rotate-90 w-20 h-20">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-800"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-purple-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{stats.completionRate}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      
      {/* HEADER ESTILO THINGS */}
      <div className="border-b border-gray-800 bg-[#0f111a] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <DashboardCalendarHeader
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            stats={stats}
          />
        </div>
      </div>

      {/* USER LEVEL BADGE - Sistema de Recompensas */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
        <UserLevelBadge mode="full" />
      </div>

      {/* STATS BAR */}
      {stats.total > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-400">Total:</span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Completadas:</span>
              <span className="font-bold text-green-400">{stats.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-400">Pendientes:</span>
              <span className="font-bold text-yellow-400">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-blue-500 ${stats.enRevision > 0 ? 'animate-pulse' : ''}`}></div>
              <span className="text-gray-400">En Revisión:</span>
              <span className={`font-bold ${stats.enRevision > 0 ? 'text-blue-400' : 'text-gray-600'}`}>{stats.enRevision}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-red-500 ${stats.overdue > 0 ? 'animate-pulse' : ''}`}></div>
              <span className="text-gray-400">Retrasadas:</span>
              <span className={`font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-gray-600'}`}>{stats.overdue}</span>
            </div>
          </div>
        </div>
      )}

      {/* TASK LIST */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles size={48} className="text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              {isToday(selectedDate) ? '¡Sin tareas por hoy!' : 'Sin tareas para este día'}
            </h3>
            <p className="text-sm text-gray-600 max-w-sm">
              {isToday(selectedDate) 
                ? 'Disfruta tu día libre o crea nuevas metas en tu Carta FRUTOS.' 
                : 'No hay tareas programadas para esta fecha.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Misiones Especiales (Extraordinarias y Eventos) */}
            {tasks.some(t => t.tipo === 'EXTRAORDINARIA' || t.tipo === 'EVENTO') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-purple-400 font-bold mt-6 mb-3">
                  <Zap size={14} />
                  Misiones Especiales
                </div>
                {tasks
                  .filter(t => t.tipo === 'EXTRAORDINARIA' || t.tipo === 'EVENTO')
                  .map(task => (
                    <SpecialMissionTask 
                      key={task.id} 
                      task={adaptTaskForSmartTask(task)} 
                      onUploadEvidence={handleUploadEvidence}
                    />
                  ))}
              </>
            )}

            {/* Separar tareas retrasadas */}
            {tasks.some(t => t.tipo === 'CARTA' && t.status === 'PENDING' && (t.postponeCount || 0) > 0) && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-red-400 font-bold mt-6 mb-3">
                  <TrendingUp size={14} className="rotate-180" />
                  Tareas Retrasadas
                </div>
                {tasks
                  .filter(t => t.tipo === 'CARTA' && t.status === 'PENDING' && (t.postponeCount || 0) > 0)
                  .map(task => (
                    <SmartTask 
                      key={task.id} 
                      task={adaptTaskForSmartTask(task)} 
                      onUpdate={handleTaskUpdate}
                      onUploadEvidence={handleUploadEvidence}
                    />
                  ))}
              </>
            )}

            {/* Tareas pendientes normales */}
            {tasks.some(t => t.tipo === 'CARTA' && t.status === 'PENDING' && (t.postponeCount || 0) === 0) && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 font-bold mt-6 mb-3">
                  Pendientes
                </div>
                {tasks
                  .filter(t => t.tipo === 'CARTA' && t.status === 'PENDING' && (t.postponeCount || 0) === 0)
                  .map(task => (
                    <SmartTask 
                      key={task.id} 
                      task={adaptTaskForSmartTask(task)} 
                      onUpdate={handleTaskUpdate}
                      onUploadEvidence={handleUploadEvidence}
                    />
                  ))}
              </>
            )}

            {/* Tareas completadas */}
            {tasks.some(t => t.status === 'COMPLETED') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-green-500/50 font-bold mt-8 mb-3">
                  <Check size={14} />
                  Completadas
                </div>
                {tasks
                  .filter(t => t.status === 'COMPLETED')
                  .map(task => (
                    <SmartTask 
                      key={task.id} 
                      task={adaptTaskForSmartTask(task)} 
                      onUpdate={handleTaskUpdate}
                      onUploadEvidence={handleUploadEvidence}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Evidencia */}
      <EvidenceModal
        isOpen={evidenceModal.isOpen}
        onClose={() => setEvidenceModal({ isOpen: false, task: null })}
        task={evidenceModal.task}
        onSubmit={handleSubmitEvidence}
      />
    </div>
  );
}
