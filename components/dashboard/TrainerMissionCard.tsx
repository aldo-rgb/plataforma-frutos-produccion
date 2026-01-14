'use client';

import { useState, useEffect } from 'react';
import { Clock, Upload, Check, AlertTriangle, Image as ImageIcon, Target, User, ChevronRight, MessageSquare } from 'lucide-react';
import { parseISO, formatDistanceToNow, isPast, differenceInHours, differenceInMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrainerMissionCardProps {
  task: {
    id: string | number;
    submissionId?: number;
    missionId?: number;
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
  };
  onOpenMission: (task: any) => void;
}

export default function TrainerMissionCard({ task, onOpenMission }: TrainerMissionCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Calcular tiempo restante
    const calculateTimeLeft = () => {
      if (!task.deadline || task.status === 'COMPLETED' || task.status === 'SUBMITTED') return;

      const deadline = new Date(task.deadline);
      const now = new Date();

      if (isPast(deadline)) {
        setIsExpired(true);
        const hoursLate = differenceInHours(now, deadline);
        setTimeLeft(`Venció hace ${hoursLate}h`);
        return;
      }

      const hoursLeft = differenceInHours(deadline, now);
      const minutesLeft = differenceInMinutes(deadline, now) % 60;

      if (hoursLeft < 24) {
        setTimeLeft(`${hoursLeft}h ${minutesLeft}m restantes`);
      } else {
        setTimeLeft(formatDistanceToNow(deadline, { locale: es, addSuffix: true }));
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [task.deadline, task.status]);

  const getStatusBadge = () => {
    // Las misiones del trainer se completan directamente (sin revisión)
    if (task.status === 'SUBMITTED' || task.status === 'APPROVED' || task.status === 'COMPLETED' || task.evidenceStatus === 'APPROVED') {
      return (
        <span className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-xs font-bold border border-green-400/20">
          <Check size={10} />
          Completada
        </span>
      );
    }
    if (task.evidenceStatus === 'REJECTED') {
      return (
        <span className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-0.5 rounded text-xs font-bold border border-red-400/20 animate-pulse">
          <AlertTriangle size={10} />
          Rechazada
        </span>
      );
    }
    return null;
  };

  return (
    <div 
      onClick={() => onOpenMission(task)}
      className="relative bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-xl border-2 border-emerald-500/30 p-4 mb-3 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer group"
    >
      
      {/* Badge de Misión del Entrenador */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
        <Target size={10} />
        Del Entrenador
      </div>

      <div className="flex items-start gap-4">

        {/* Avatar del Trainer */}
        <div className="flex-shrink-0">
          {task.trainer?.imagen ? (
            <img 
              src={task.trainer.imagen} 
              alt={task.trainer.nombre}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
              <User size={20} className="text-emerald-400" />
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          
          {/* Título */}
          <h4 className={`text-base font-medium ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.texto}
          </h4>

          {/* Subtítulo con nombre del trainer y visión */}
          <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
            <span className="text-xs text-emerald-400 font-medium">
              {task.trainer?.nombre || 'Entrenador'}
            </span>
            {task.metaContext && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400 italic truncate max-w-[200px]">
                  {task.metaContext}
                </span>
              </>
            )}
            {getStatusBadge()}
          </div>

          {/* Tags de la plantilla */}
          {task.template?.tags && task.template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.template.tags.map((tag: string, i: number) => (
                <span 
                  key={i}
                  className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mensaje del Trainer */}
          {task.trainerMessage && (
            <div className="flex items-start gap-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 mb-2">
              <MessageSquare size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 italic">"{task.trainerMessage}"</p>
            </div>
          )}

          {/* Info adicional */}
          <div className="flex flex-wrap gap-2 items-center">
            
            {/* Contador de Tiempo */}
            {task.status === 'PENDING' && task.deadline && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border ${
                isExpired 
                  ? 'text-red-400 bg-red-400/10 border-red-400/30 animate-pulse'
                  : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <Clock size={12} />
                <span>{timeLeft}</span>
              </div>
            )}

            {/* Recompensa */}
            {task.pointsReward > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-bold border border-yellow-400/20">
                <Target size={10} />
                <span>+{task.pointsReward} PC</span>
              </div>
            )}

            {/* Indicador de preguntas */}
            {task.template?.hasQuestions && (
              <div className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-xs font-medium border border-blue-400/20">
                <MessageSquare size={10} />
                <span>{task.template.questionsCount} pregunta{task.template.questionsCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Feedback si fue rechazada */}
          {task.evidenceStatus === 'REJECTED' && task.feedbackMentor && (
            <div className="mt-3 bg-red-950/40 border-l-4 border-red-500 p-3 rounded-r-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-200 font-semibold text-xs mb-1">Comentario:</p>
                  <p className="text-red-100 text-sm">{task.feedbackMentor}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 self-center">
          <ChevronRight 
            size={20} 
            className="text-gray-600 group-hover:text-emerald-400 transition-colors" 
          />
        </div>
      </div>
    </div>
  );
}
