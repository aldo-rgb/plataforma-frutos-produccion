'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, PhoneOff, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProgramStatus {
  hasProgram: boolean;
  status: string;
  currentWeek: number;
  totalWeeks: number;
  missedCalls: number;
  maxMissedAllowed: number;
  livesRemaining: number;
  progress: number;
  completedSessions: number;
  totalSessions: number;
  mentor: {
    nombre: string;
    imagen: string | null;
  };
  nextSession: {
    date: string;
    time: string;
    weekNumber: number;
    scheduledAt: string;
    timeUntil: {
      hours: number;
      minutes: number;
      seconds: number;
      totalHours: number;
      isUrgent: boolean;
    };
  } | null;
  isSuspended: boolean;
}

export default function ProgramStatusWidget() {
  const [status, setStatus] = useState<ProgramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    loadStatus();
  }, []);

  // Actualizar countdown cada segundo si hay próxima sesión urgente
  useEffect(() => {
    if (!status?.nextSession?.timeUntil?.isUrgent) return;

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(status.nextSession!.scheduledAt);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(interval);
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.nextSession]);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/program/status');
      const data = await res.json();
      
      console.log('📊 Estado del programa cargado:', data);
      
      if (data.hasProgram) {
        setStatus(data);
      } else {
        // Guardar que no tiene programa para mostrar invitación
        setStatus({ hasProgram: false } as any);
      }
    } catch (error) {
      console.error('Error cargando estado del programa:', error);
      setStatus({ hasProgram: false } as any);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 animate-pulse">
        <div className="h-32 bg-slate-700/50 rounded-xl"></div>
      </div>
    );
  }

  if (!status?.hasProgram) {
    // Mostrar invitación a inscribirse
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/30 p-8">
        <div className="text-center">
          <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Programa Intensivo 17 Semanas</h3>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">
            Únete al programa de disciplina con llamadas semanales programadas. 
            Sistema de oportunidades y seguimiento completo.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard/program/enroll'}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            Agendar llamadas de mentoria
          </button>
        </div>
      </div>
    );
  }

  // Renderizar oportunidades (llamadas que pueden perderse)
  const renderLives = () => {
    const lives = [];
    for (let i = 0; i < status.maxMissedAllowed; i++) {
      if (i < status.livesRemaining) {
        lives.push(
          <PhoneOff 
            key={i} 
            className="w-6 h-6 text-green-500" 
          />
        );
      } else {
        lives.push(
          <PhoneOff 
            key={i} 
            className="w-6 h-6 text-red-500 opacity-50" 
          />
        );
      }
    }
    return lives;
  };

  // Estado de las oportunidades
  const getLivesStatus = () => {
    if (status.livesRemaining === status.maxMissedAllowed) {
      return { text: '¡Perfecto!', color: 'text-green-400', bg: 'bg-green-500/10' };
    }
    if (status.livesRemaining === 2) {
      return { text: 'Una oportunidad usada', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    }
    if (status.livesRemaining === 1) {
      return { text: '⚠️ En Riesgo', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    }
    return { text: '🚫 SUSPENDIDO', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const livesStatus = getLivesStatus();

  // Color del countdown según urgencia
  const getCountdownColor = () => {
    if (!status.nextSession?.timeUntil) return 'text-slate-400';
    const hours = status.nextSession.timeUntil.totalHours;
    if (hours < 6) return 'text-red-400';
    if (hours < 12) return 'text-orange-400';
    return 'text-green-400';
  };

  // Modal de suspensión
  if (status.isSuspended) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-gradient-to-br from-red-900 to-slate-900 rounded-2xl border-2 border-red-500 max-w-md w-full p-8 text-center animate-in zoom-in duration-300">
          <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-12 h-12 text-red-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Has sido suspendido del programa
          </h2>
          
          <p className="text-red-300 mb-4">
            Razón: {status.missedCalls} inasistencias
          </p>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
            <p className="text-slate-300 text-sm">
              Has superado el límite de faltas permitidas. 
              Contacta a tu mentor para solicitar una reactivación.
            </p>
          </div>
          
          <button
            onClick={() => window.location.href = '/dashboard/contacto'}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            Solicitar Reactivación al Mentor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/50 via-slate-800 to-slate-900 rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Programa Intensivo
              </h3>
              <p className="text-purple-100 text-sm">
                Semana {status.currentWeek} de {status.totalWeeks}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              {status.progress}%
            </p>
            <p className="text-purple-100 text-xs">Completado</p>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${status.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Oportunidades */}
        <div className={`${livesStatus.bg} border border-slate-700 rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">
              Estado de Asistencia
            </span>
            <span className={`text-sm font-bold ${livesStatus.color}`}>
              {livesStatus.text}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            {renderLives()}
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-2">
            {status.livesRemaining} {status.livesRemaining === 1 ? 'oportunidad restante' : 'oportunidades restantes'}
          </p>
        </div>

        {/* Próxima llamada */}
        {status.nextSession ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-slate-300">
                Próxima Llamada
              </span>
            </div>
            
            {status.nextSession.timeUntil.isUrgent ? (
              <div className="text-center">
                <p className="text-2xl font-bold font-mono mb-1" style={{ color: getCountdownColor() }}>
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </p>
                <p className="text-xs text-slate-400">
                  {(() => {
                    const [year, month, day] = status.nextSession.date.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return format(localDate, "EEEE d 'de' MMMM", { locale: es });
                  })()} a las {status.nextSession.time}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-white mb-1">
                  {(() => {
                    const [year, month, day] = status.nextSession.date.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return format(localDate, "EEEE d 'de' MMMM", { locale: es });
                  })()}
                </p>
                <p className="text-2xl font-bold text-purple-400">
                  {status.nextSession.time}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Sesión #{status.nextSession.weekNumber}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-400">
              ¡Programa Completado!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
