'use client';

import { useState, useEffect } from 'react';
import { Calendar, Video, Timer, Clock, User, Phone, Users } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';

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
    const url = call.meetingUrl || call.meetingLink;
    if (url && onJoinCall) {
      onJoinCall(url);
    }
  };

  // Determinar si es llamada de GC
  const isGCCall = call.type === 'GC_CALL' || call.callType === 'GAME_CHANGER';

  // Colores según el tipo de llamada
  const getColors = () => {
    if (isGCCall) {
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        gradient: 'from-emerald-600 to-teal-600',
        gradientHover: 'from-emerald-500 to-teal-500'
      };
    }
    if (call.type === 'DISCIPLINE') {
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        gradient: 'from-blue-600 to-purple-600',
        gradientHover: 'from-blue-500 to-purple-500'
      };
    }
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      gradient: 'from-purple-600 to-blue-600',
      gradientHover: 'from-purple-500 to-blue-500'
    };
  };

  const colors = getColors();

  // Título de la llamada
  const getCallTitle = () => {
    if (isGCCall) {
      return 'Llamada con Game Changer';
    }
    if (call.type === 'DISCIPLINE') {
      return call.discipline?.name || 'Sesión de Disciplina';
    }
    return 'Sesión de Visión';
  };

  return (
    <div className={`bg-[#1a1d2d] border border-gray-700 rounded-xl p-5 hover:${colors.border} transition-all group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icono según tipo de llamada */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
            {isGCCall ? (
              <Users className={`w-6 h-6 ${colors.text}`} />
            ) : call.discipline?.icon ? (
              <span className="text-2xl">{call.discipline.icon}</span>
            ) : (
              <Video className={`w-6 h-6 ${colors.text}`} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-white font-bold text-lg">
                {getCallTitle()}
              </h3>
              {isGCCall && (
                <span className={`text-xs px-2 py-0.5 ${colors.bg} ${colors.text} rounded-full`}>
                  Entrenamiento
                </span>
              )}
              {call.weekNumber && !isGCCall && (
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
                <span>{timeDisplay}{call.endTime ? ` - ${call.endTime}` : ''}</span>
              </div>
            </div>

            {/* Mentor para llamadas normales */}
            {call.mentor && !isGCCall && (
              <div className="flex items-center gap-2 mt-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">
                  Con {call.mentor.nombre}
                </span>
              </div>
            )}

            {/* Game Changer para llamadas GC */}
            {isGCCall && call.gameChanger && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2">
                  {call.gameChanger.imagen ? (
                    <img 
                      src={call.gameChanger.imagen} 
                      alt={call.gameChanger.nombre}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-emerald-400" />
                    </div>
                  )}
                  <span className="text-sm text-emerald-400 font-medium">
                    {call.gameChanger.nombre}
                  </span>
                </div>
                {call.gameChanger.telefono && (
                  <a 
                    href={`tel:${call.gameChanger.telefono}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    {call.gameChanger.telefono}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Countdown si falta menos de 24 horas */}
      {showCountdown && countdown && (
        <div className={`mb-4 p-3 bg-gradient-to-r ${isGCCall ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30' : 'from-orange-500/10 to-red-500/10 border-orange-500/30'} border rounded-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${isGCCall ? 'text-emerald-400' : 'text-orange-400'} animate-pulse`} />
              <span className="text-sm font-medium text-gray-300">
                Comienza en:
              </span>
            </div>
            <span className={`text-xl font-mono font-bold ${isGCCall ? 'text-emerald-400' : 'text-orange-400'}`}>
              {countdown}
            </span>
          </div>
        </div>
      )}

      {/* Botón para unirse (si tiene URL y está próxima) - solo para llamadas con meetingUrl */}
      {(call.meetingUrl || call.meetingLink) && showCountdown && (
        <button
          onClick={handleJoinCall}
          className={`w-full bg-gradient-to-r ${colors.gradient} hover:${colors.gradientHover} text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]`}
        >
          <Video className="w-5 h-5" />
          <span>Unirse a la llamada</span>
        </button>
      )}

      {/* Para llamadas GC sin URL, mostrar indicación de llamar */}
      {isGCCall && call.gameChanger?.telefono && showCountdown && !call.meetingUrl && !call.meetingLink && (
        <a
          href={`tel:${call.gameChanger.telefono}`}
          className={`w-full bg-gradient-to-r ${colors.gradient} hover:${colors.gradientHover} text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]`}
        >
          <Phone className="w-5 h-5" />
          <span>Llamar a {call.gameChanger.nombre}</span>
        </a>
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
