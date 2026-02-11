'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import SmartTask from '@/components/dashboard/SmartTask';
import SpecialMissionTask from '@/components/dashboard/SpecialMissionTask';
import TrainerMissionCard from '@/components/dashboard/TrainerMissionCard';
import EvidenceModal from '@/components/dashboard/EvidenceModal';
import PersonalTaskModal from '@/components/dashboard/PersonalTaskModal';
import PersonalTaskCard from '@/components/dashboard/PersonalTaskCard';
import DashboardCalendarHeader from '@/components/dashboard/DashboardCalendarHeader';
import UserLevelBadge from '@/components/dashboard/UserLevelBadge';
import UpcomingCallCard from '@/components/dashboard/UpcomingCallCard';
import ArchetypeTaskCard from '@/components/dashboard/ArchetypeTaskCard';
import MetamorfosisTaskCard from '@/components/dashboard/MetamorfosisTaskCard';
import ParticipantSurveyBanner from '@/components/surveys/ParticipantSurveyBanner';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, TrendingUp, Check, Zap, Phone, Plus, Target, User, X, CalendarDays } from 'lucide-react';

interface Task {
  id: string | number; // Puede ser number (carta) o string (admin/trainer)
  taskId?: number;
  submissionId?: number;
  missionId?: number;
  tipo: 'CARTA' | 'EXTRAORDINARIA' | 'EVENTO' | 'TRAINER_MISSION';
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
  // Campos específicos de TRAINER_MISSION
  trainerMessage?: string;
  trainer?: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  template?: {
    id: number;
    title: string;
    type: string;
    instructions?: string;
    hasQuestions: boolean;
    questionsCount: number;
    tags: string[];
  };
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  enRevision: number;
  overdue: number;
  completionRate: number;
}

interface UpcomingCall {
  id: number | string;
  type: 'DISCIPLINE' | 'VISION' | 'GC_CALL';
  callType?: 'MENTOR' | 'GAME_CHANGER';
  scheduledDate: string;
  scheduledTime?: string;
  endTime?: string;
  status: string;
  meetingUrl?: string;
  meetingLink?: string;
  discipline?: {
    id: number;
    name: string;
    icon?: string;
  } | null;
  vision?: {
    id: number;
    name: string;
  } | null;
  mentor?: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  gameChanger?: {
    id: number;
    nombre: string;
    imagen?: string;
    telefono?: string;
  } | null;
  weekNumber?: number;
  assignedByGC?: boolean;
}

interface PersonalTask {
  id: number;
  titulo: string;
  descripcion: string | null;
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED';
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]); // Tareas de HOY
  const [tareasRetrasadas, setTareasRetrasadas] = useState<Task[]>([]); // Tareas de días anteriores
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]); // Tareas personales
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([]);
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
  const [personalTaskModal, setPersonalTaskModal] = useState(false);
  
  // Modal de confirmación de reagendado
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    message: string;
    newDate: string;
    postponeCount: number;
  }>({ isOpen: false, message: '', newDate: '', postponeCount: 0 });

  useEffect(() => {
    fetchTasks();
    fetchUpcomingCalls();
    fetchPersonalTasks();
  }, [selectedDate]);

  const fetchPersonalTasks = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/personal-tasks?date=${dateStr}`);
      
      if (!response.ok) {
        console.error('Error fetching personal tasks:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('📝 Tareas personales:', data.personalTasks);
      setPersonalTasks(data.personalTasks || []);
    } catch (error) {
      console.error('Error fetching personal tasks:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Usar zona-ejecucion endpoint que incluye tareas wizard + extraordinarias
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('📅 Fetching tasks for date:', dateStr);
      const response = await fetch(`/api/tareas/zona-ejecucion?date=${dateStr}`);
      
      if (!response.ok) {
        console.error('❌ Error en respuesta:', response.status, response.statusText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('📦 Respuesta completa del servidor:', data);
      console.log('📦 Tareas de hoy recibidas:', data.tareasHoy?.length || 0);
      console.log('📦 Tareas retrasadas:', data.tareasRetrasadas?.length || 0);
      console.log('📦 Breakdown:', data.breakdown);
      
      if (data.tareasHoy) {
        console.log('📋 Detalle de tareasHoy:', data.tareasHoy);
        
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
        
        console.log('✅ Tareas después del filtro:', allTasks.length);
        console.log('📋 Tareas filtradas:', allTasks);
        
        // Separar tareas de HOY y tareas RETRASADAS (de días anteriores)
        setTasks(allTasks);
        setTareasRetrasadas(data.tareasRetrasadas || []); // Tareas con dueDate anterior a hoy
        
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

  const fetchUpcomingCalls = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/calls/upcoming?date=${dateStr}`);
      
      if (!response.ok) {
        console.error('Error fetching calls:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('📞 Llamadas próximas:', data.calls);
      
      // Filtrar solo las del día seleccionado o próximas (24h)
      const relevantCalls = data.calls.filter((call: UpcomingCall) => {
        const callDate = new Date(call.scheduledDate);
        const now = new Date();
        const diffHours = (callDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Mostrar si es del día seleccionado o si faltan menos de 24 horas
        const isSelectedDate = format(callDate, 'yyyy-MM-dd') === dateStr;
        const isWithin24Hours = diffHours > 0 && diffHours <= 24;
        
        return isSelectedDate || isWithin24Hours;
      });
      
      setUpcomingCalls(relevantCalls);
    } catch (error) {
      console.error('Error fetching upcoming calls:', error);
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
        originalDueDate: (task as any).originalDueDate || task.fechaProgramada,
        status: task.status as 'PENDING' | 'COMPLETED' | 'SKIPPED',
        postponeCount: task.postponeCount || 0,
        completedAt: task.completedAt,
        evidenceUrl: task.evidenciaUrl,
        evidenceStatus: task.evidenceStatus as any,
        feedbackMentor: task.feedbackMentor,
        tipo: 'CARTA',
        // Agregar estos campos para que handleUploadEvidence pueda encontrar la tarea
        taskId: task.taskId,
        submissionId: task.submissionId
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
        pointsReward: task.pointsReward,
        // Agregar estos campos para que handleUploadEvidence pueda encontrar la tarea
        taskId: task.taskId,
        submissionId: task.submissionId
      };
    }
  };

  const handleTaskUpdate = async (taskId: number, action: 'POSTPONE', days?: number) => {
    console.log('🔄 handleTaskUpdate llamado:', { taskId, action, days });
    
    try {
      if (action === 'POSTPONE' && days) {
        console.log('📤 Enviando request a /api/tasks/postpone...');
        
        const response = await fetch('/api/tasks/postpone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, daysToAdd: days })
        });

        const data = await response.json();
        console.log('📥 Respuesta de postpone:', data);

        if (data.success) {
          // Mostrar modal de confirmación estilizado
          const newDate = data.task?.dueDate 
            ? format(new Date(data.task.dueDate), "EEEE d 'de' MMMM", { locale: es })
            : `en ${days} día${days > 1 ? 's' : ''}`;
          
          setRescheduleModal({
            isOpen: true,
            message: data.postponeCount > 2 
              ? '⚠️ Tu mentor ha sido notificado para apoyarte.' 
              : data.postponeCount === 2 
                ? '⚠️ Si la pospones una vez más, tu mentor será notificado.'
                : '💪 Recuerda que la constancia es clave para tus objetivos.',
            newDate: newDate,
            postponeCount: data.postponeCount || 1
          });

          // Remover de la lista actual (usando taskId, no task.id que es el id compuesto)
          setTasks(prev => prev.filter(task => task.taskId !== taskId));
          setTareasRetrasadas(prev => prev.filter(task => task.taskId !== taskId));
          setStats(prev => ({
            ...prev,
            total: prev.total - 1,
            pending: prev.pending - 1
          }));
        } else {
          // Error en la respuesta - mostrar modal de error
          console.error('❌ Error en respuesta:', data);
          setRescheduleModal({
            isOpen: true,
            message: data.error || 'Error al reagendar la tarea',
            newDate: '',
            postponeCount: -1 // -1 indica error
          });
        }
      }
    } catch (error) {
      console.error('❌ Error updating task:', error);
      setRescheduleModal({
        isOpen: true,
        message: 'Hubo un error de conexión. Intenta de nuevo.',
        newDate: '',
        postponeCount: -1
      });
    }
  };

  const handleUploadEvidence = (taskId: number, accionId: number, metaId: number) => {
    console.log('🔍 handleUploadEvidence llamado con:', { taskId, accionId, metaId });
    
    // Buscar la tarea original usando taskId o submissionId
    const task = tasks.find(t => {
      // Para tareas de carta, comparar con taskId
      if (t.taskId && t.taskId === taskId) {
        return true;
      }
      // Para tareas extraordinarias/eventos, comparar con submissionId
      if (t.submissionId && t.submissionId === taskId) {
        return true;
      }
      return false;
    });
    
    console.log('🔍 Tarea encontrada:', task);
    
    if (!task) {
      console.error('❌ No se encontró la tarea');
      console.error('❌ taskId buscado:', taskId);
      console.error('❌ Tasks disponibles:', tasks.map(t => ({
        id: t.id,
        taskId: t.taskId,
        submissionId: t.submissionId,
        tipo: t.tipo,
        texto: t.texto
      })));
      alert('No se pudo encontrar la tarea. Por favor recarga la página.');
      return;
    }
    
    // Adaptar la tarea al formato que espera el modal
    const modalTask = {
      id: task.taskId || task.submissionId || 0,
      taskId: task.taskId,
      submissionId: task.submissionId,
      accionId: task.accionId || accionId || 0,
      metaId: task.metaId || metaId || 0,
      title: task.texto,
      areaType: task.area,
      tipo: task.tipo, // Importante: incluir el tipo para saber qué endpoint usar
      evidenceUrl: task.evidenciaUrl || null,
      evidenceStatus: task.evidenceStatus as 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' || 'NONE'
    };
    
    console.log('✅ Abriendo modal con:', modalTask);
    
    setEvidenceModal({
      isOpen: true,
      task: modalTask as any
    });
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

  // Completar tarea de personaje (sin evidencia)
  const handleCompleteArchetypeTask = async (submissionId: number) => {
    try {
      const response = await fetch('/api/tareas/complete-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId })
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar la tarea en el estado
        setTasks(prev => prev.map(t => 
          t.submissionId === submissionId
            ? { ...t, status: 'COMPLETED' as const }
            : t
        ));

        // Actualizar stats
        setStats(prev => ({
          ...prev,
          completed: prev.completed + 1,
          pending: prev.pending - 1,
          completionRate: Math.round(((prev.completed + 1) / prev.total) * 100)
        }));

        console.log(`✅ Tarea de personaje completada. +${data.pointsEarned} puntos`);
      } else {
        throw new Error(data.error || 'Error al completar tarea');
      }
    } catch (error) {
      console.error('Error completing archetype task:', error);
      alert('Hubo un error al completar la tarea');
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
          <div className="flex items-center justify-between mb-4">
            <DashboardCalendarHeader
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              stats={stats}
            />
            <button
              onClick={() => setPersonalTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              Nueva Tarea Personal
            </button>
          </div>
        </div>
      </div>

      {/* USER LEVEL BADGE - Sistema de Recompensas */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
        <UserLevelBadge mode="full" />
      </div>

      {/* PARTICIPANT SURVEY BANNER - Encuesta del último día */}
      <div className="max-w-4xl mx-auto px-6 pb-2">
        <ParticipantSurveyBanner />
      </div>

      {/* UPCOMING CALLS - Llamadas Agendadas con Countdown */}
      {upcomingCalls.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">
            <Phone size={14} />
            Llamadas Agendadas
          </div>
          <div className="space-y-3">
            {upcomingCalls.map(call => (
              <UpcomingCallCard 
                key={call.id} 
                call={call}
                onJoinCall={(url) => window.open(url, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

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
        ) : tasks.length === 0 && personalTasks.length === 0 ? (
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
            {/* Tareas Personales - Siempre mostrar primero, pendientes arriba, completadas abajo */}
            {personalTasks.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-purple-400 font-bold mb-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Tareas Personales
                </div>
                <div className="space-y-3">
                  {[...personalTasks]
                    .sort((a, b) => {
                      // Pendientes primero, completadas al final
                      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
                      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
                      return 0;
                    })
                    .map(task => (
                    <PersonalTaskCard 
                      key={task.id} 
                      task={task}
                      onTaskUpdated={fetchPersonalTasks}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Personaje Asignado */}
            {tasks.some(t => t.tipo === 'PERSONAJE') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-400 font-bold mt-6 mb-3">
                  <User size={14} />
                  Personaje Asignado
                </div>
                {tasks
                  .filter(t => t.tipo === 'PERSONAJE')
                  .map(task => (
                    <ArchetypeTaskCard 
                      key={task.id}
                      task={{
                        id: String(task.id),
                        submissionId: task.submissionId!,
                        title: task.texto,
                        description: task.metaContext,
                        pointsReward: task.pointsReward,
                        status: task.status
                      }}
                      onComplete={handleCompleteArchetypeTask}
                    />
                  ))}
              </>
            )}

            {/* Salto Cuántico (Metamorfosis) */}
            {tasks.some(t => t.tipo === 'SALTO_CUANTICO') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400 font-bold mt-6 mb-3">
                  <Zap size={14} />
                  Salto Cuántico
                </div>
                {tasks
                  .filter(t => t.tipo === 'SALTO_CUANTICO')
                  .map(task => (
                    <MetamorfosisTaskCard 
                      key={task.id}
                      task={{
                        id: String(task.id),
                        submissionId: task.submissionId!,
                        title: task.texto,
                        description: task.metaContext,
                        pointsReward: task.pointsReward,
                        status: task.status
                      }}
                      onComplete={handleCompleteArchetypeTask}
                    />
                  ))}
              </>
            )}

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

            {/* Misiones del Entrenador */}
            {tasks.some(t => t.tipo === 'TRAINER_MISSION') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 font-bold mt-6 mb-3">
                  <Target size={14} />
                  Misiones del Entrenador
                </div>
                {tasks
                  .filter(t => t.tipo === 'TRAINER_MISSION')
                  .map(task => (
                    <TrainerMissionCard 
                      key={task.id} 
                      task={task}
                      onOpenMission={(t) => {
                        // Abrir página de detalle de la misión
                        window.location.href = `/dashboard/mision/${t.submissionId}`;
                      }}
                    />
                  ))}
              </>
            )}

            {/* Separar tareas retrasadas - SOLO MOSTRAR LAS DE DÍAS ANTERIORES */}
            {tareasRetrasadas.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-red-400 font-bold mt-6 mb-3">
                  <TrendingUp size={14} className="rotate-180" />
                  Tareas Retrasadas (Días Anteriores)
                </div>
                {tareasRetrasadas
                  .filter(t => t.status === 'PENDING')
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

            {/* Tareas pendientes normales - SOLO SIN EVIDENCIA */}
            {tasks.some(t => t.tipo === 'CARTA' && t.status === 'PENDING' && t.evidenceStatus !== 'PENDING') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 font-bold mt-6 mb-3">
                  Pendientes de Hoy
                </div>
                {tasks
                  .filter(t => t.tipo === 'CARTA' && t.status === 'PENDING' && t.evidenceStatus !== 'PENDING')
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

            {/* Tareas en revisión (con evidencia pendiente) */}
            {tasks.some(t => t.tipo === 'CARTA' && t.evidenceStatus === 'PENDING') && (
              <>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-blue-400 font-bold mt-6 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  En Revisión por Mentor
                </div>
                {tasks
                  .filter(t => t.tipo === 'CARTA' && t.evidenceStatus === 'PENDING')
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

      {/* Modal de Tarea Personal */}
      <PersonalTaskModal
        isOpen={personalTaskModal}
        onClose={() => setPersonalTaskModal(false)}
        onTaskCreated={fetchPersonalTasks}
        initialDate={format(selectedDate, 'yyyy-MM-dd')}
      />

      {/* Modal de Confirmación de Reagendado */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gradient-to-br from-[#1a1d2e] to-[#0f111a] rounded-2xl border border-gray-700/50 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header con icono */}
            <div className={`p-6 ${rescheduleModal.postponeCount === -1 ? 'bg-red-500/10' : 'bg-purple-500/10'}`}>
              <div className="flex items-center justify-center mb-4">
                <div className={`p-4 rounded-full ${rescheduleModal.postponeCount === -1 ? 'bg-red-500/20' : 'bg-purple-500/20'}`}>
                  {rescheduleModal.postponeCount === -1 ? (
                    <X size={32} className="text-red-400" />
                  ) : (
                    <CalendarDays size={32} className="text-purple-400" />
                  )}
                </div>
              </div>
              
              {/* Título */}
              <h3 className="text-xl font-bold text-white text-center">
                {rescheduleModal.postponeCount === -1 ? 'Error' : '✅ Tarea Reagendada'}
              </h3>
            </div>
            
            {/* Body */}
            <div className="p-6 text-center">
              {rescheduleModal.newDate && (
                <p className="text-lg text-white mb-3">
                  Nueva fecha: <span className="font-bold text-purple-400 capitalize">{rescheduleModal.newDate}</span>
                </p>
              )}
              
              <p className={`text-sm ${
                rescheduleModal.postponeCount === -1 
                  ? 'text-red-400' 
                  : rescheduleModal.postponeCount > 2 
                    ? 'text-orange-400' 
                    : 'text-gray-400'
              }`}>
                {rescheduleModal.message}
              </p>
              
              {rescheduleModal.postponeCount > 0 && rescheduleModal.postponeCount <= 3 && (
                <div className="mt-4 flex justify-center gap-1">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`w-2 h-2 rounded-full transition-all ${
                        n <= rescheduleModal.postponeCount 
                          ? 'bg-orange-400' 
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-black/20">
              <button
                onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  rescheduleModal.postponeCount === -1
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
