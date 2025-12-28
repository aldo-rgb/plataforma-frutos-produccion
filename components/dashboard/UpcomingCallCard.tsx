'use client';

import { useState, useEffect } from 'react';
import { Calendar, Video, Timer, Clock, User } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';

interface UpcomingCall {
  id: number;
  type: 'DISCIPLINE' | 'VISION';
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  meetingUrl?: string;
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
  weekNumber?: number;
}

interface UpcomingCallCardProps {
  call: UpcomingCall;
  onJoinCall?: (url: string) => void;
}

export default function UpcomingCallCard({ call, onJoinCall }: UpcomingCallCardProps) {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const callDateTime = new Date(call.scheduledDate);
      
      // Si tiene hora específica, agregarla
      if (call.scheduledTime) {
        const [hours, minutes] = call.scheduledTime.split(':');
        callDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const diffMs = callDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Verificar si ya pasó
      if (diffMs < 0) {
        setIsPast(true);
        setShowCountdown(false);
        return;
      }

      setIsPast(false);

      // Mostrar countdown solo si faltan menos de 24 horas
      if (diffHours > 0 && diffHours <= 24) {
        setShowCountdown(true);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setShowCountdown(false);
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [call.scheduledDate, call.scheduledTime]);

  const callDate = new Date(call.scheduledDate);
  const formattedDate = format(callDate, "d 'de' MMMM", { locale: es });
  const timeDisplay = call.scheduledTime || 'Hora por confirmar';

  const handleJoinCall = () => {
    if (call.meetingUrl && onJoinCall) {
      onJoinCall(call.meetingUrl);
    }
  };

  return (
    <div className="bg-[#1a1d2d] border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icono de disciplina o tipo */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            call.type === 'DISCIPLINE' ? 'bg-blue-500/10' : 'bg-purple-500/10'
          }`}>
            {call.discipline?.icon ? (
              <span className="text-2xl">{call.discipline.icon}</span>
            ) : (
              <Video className={`w-6 h-6 ${
                call.type === 'DISCIPLINE' ? 'text-blue-400' : 'text-purple-400'
              }`} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-lg">
                {call.type === 'DISCIPLINE' ? call.discipline?.name : 'Sesión de Visión'}
              </h3>
              {call.weekNumber && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                  Semana {call.weekNumber}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{timeDisplay}</span>
              </div>
            </div>

            {call.mentor && (
              <div className="flex items-center gap-2 mt-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">
                  Con {call.mentor.nombre}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Countdown si falta menos de 24 horas */}
      {showCountdown && countdown && (
        <div className="mb-4 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="text-sm font-medium text-gray-300">
                Comienza en:
              </span>
            </div>
            <span className="text-xl font-mono font-bold text-orange-400">
              {countdown}
            </span>
          </div>
        </div>
      )}

      {/* Botón para unirse (si tiene URL y está próxima) */}
      {call.meetingUrl && showCountdown && (
        <button
          onClick={handleJoinCall}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
        >
          <Video className="w-5 h-5" />
          <span>Unirse a la llamada</span>
        </button>
      )}

      {/* Información sin countdown para llamadas más lejanas */}
      {!showCountdown && !isPast && (
        <div className="text-sm text-gray-500 italic">
          {formatDistanceToNow(callDate, { addSuffix: true, locale: es })}
        </div>
      )}
    </div>
  );
}
