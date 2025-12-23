'use client';

import { useState, useEffect } from 'react';
import { Clock, Upload, Check, AlertTriangle, Image as ImageIcon, Zap } from 'lucide-react';
import { parseISO, formatDistanceToNow, isPast, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface SpecialMissionTaskProps {
  task: {
    id: number;
    title: string;
    areaType: string;
    identity: string;
    dueDate: string;
    status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
    completedAt?: string | null;
    evidenceUrl?: string | null;
    evidenceStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    deadline?: string;
    horaLimite?: string;
    pointsReward?: number;
    feedbackMentor?: string | null;
  };
  onUploadEvidence: (taskId: number, accionId: number, metaId: number) => void;
}

export default function SpecialMissionTask({ task, onUploadEvidence }: SpecialMissionTaskProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Debug: Ver datos de la tarea
  useEffect(() => {
    console.log('🔍 SpecialMissionTask recibida:', {
      id: task.id,
      title: task.title,
      evidenceStatus: task.evidenceStatus,
      feedbackMentor: task.feedbackMentor
    });
  }, [task]);

  useEffect(() => {
    // Calcular tiempo restante
    const calculateTimeLeft = () => {
      if (!task.deadline || task.status === 'COMPLETED') return;

      const deadline = parseISO(task.deadline);
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

  const handleCircleClick = () => {
    if (task.status === 'COMPLETED') return;
    if (task.evidenceStatus === 'PENDING') return;
    
    onUploadEvidence(task.id, 0, 0);
  };

  return (
    <div className="relative bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border-2 border-purple-500/30 p-4 mb-3 transition-all hover:border-purple-500/50">
      
      {/* Badge de Misión Especial */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
        <Zap size={10} />
        Misión Especial
      </div>

      <div className="flex items-start gap-4">

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          
          {/* Título */}
          <h4 className={`text-base font-medium ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.title}
          </h4>

          {/* Subtítulo */}
          <div className="flex items-center gap-2 mt-1 mb-2">
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-purple-500/30">
              {task.areaType}
            </span>
            <span className="text-xs text-gray-400 italic truncate max-w-[300px]">
              "{task.identity}"
            </span>
          </div>

          {/* Contador y Alertas */}
          <div className="flex flex-wrap gap-2 items-center mt-2">
            
            {/* Contador de Tiempo */}
            {task.status !== 'COMPLETED' && task.deadline && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                isExpired 
                  ? 'text-red-400 bg-red-400/10 border-red-400/30 animate-pulse'
                  : 'text-purple-300 bg-purple-500/10 border-purple-500/30'
              }`}>
                <Clock size={12} />
                <span>{timeLeft}</span>
                {task.horaLimite && (
                  <span className="text-gray-500 ml-1">({task.horaLimite})</span>
                )}
              </div>
            )}

            {/* Recompensa */}
            {task.pointsReward && task.pointsReward > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-bold border border-yellow-400/20">
                <Zap size={10} />
                <span>+{task.pointsReward} PC</span>
              </div>
            )}

            {/* Pendiente revisión */}
            {task.evidenceStatus === 'PENDING' && (
              <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-bold border border-yellow-400/20 animate-pulse">
                <Clock size={12} />
                <span>Pendiente de Revisión</span>
              </div>
            )}

            {/* Evidencia Rechazada - MÁS VISIBLE */}
            {task.evidenceStatus === 'REJECTED' && (
              <div className="flex items-center gap-1.5 text-red-100 bg-gradient-to-r from-red-600 to-red-500 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-red-400 shadow-lg shadow-red-500/50 animate-pulse">
                <AlertTriangle size={14} className="animate-bounce" />
                <span className="uppercase tracking-wide">⚠️ Evidencia Rechazada</span>
              </div>
            )}
          </div>

          {/* Feedback del Mentor */}
          {task.evidenceStatus === 'REJECTED' && task.feedbackMentor && (
            <div className="mt-3 bg-red-950/40 border-l-4 border-red-500 p-3 rounded-r-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-200 font-semibold text-xs mb-1">Comentario del Mentor:</p>
                  <p className="text-red-100 text-sm leading-relaxed">{task.feedbackMentor}</p>
                </div>
              </div>
            </div>
          )}

          {/* Visor de Evidencia */}
          {task.evidenceUrl && (
             <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={() => onUploadEvidence(task.id, 0, 0)}
                  className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ImageIcon size={12} /> Ver foto subida
                </button>
             </div>
          )}

          {/* BOTÓN DE SUBIR EVIDENCIA */}
          {task.status !== 'COMPLETED' && task.evidenceStatus !== 'PENDING' && (
            <div className="mt-3">
              <button
                onClick={handleCircleClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  task.evidenceStatus === 'REJECTED'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-xl shadow-red-500/50 animate-pulse border-2 border-red-400'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
                }`}
              >
                <Upload size={16} />
                {task.evidenceStatus === 'REJECTED' ? '🔄 Reenviar Evidencia Corregida' : 'Subir Evidencia'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Nota: Sin botón de reagendar */}
      <div className="mt-3 text-[10px] text-gray-600 italic">
        ⚠️ Las misiones especiales no se pueden reagendar
      </div>
    </div>
  );
}
