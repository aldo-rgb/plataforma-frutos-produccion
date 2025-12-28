'use client';

import { useState, useEffect } from 'react';
import { Calendar, Phone, PhoneOff, Clock, AlertTriangle, CheckCircle2, XCircle, Timer } from 'lucide-react';

interface IntensiveProgramCardProps {
  week: number;
  totalWeeks?: number;
  nextCall?: string;
  nextCallDate?: Date;
  attendance?: Array<{ attended: boolean; date: Date }>;
  missedCalls?: number;
}

export default function IntensiveProgramCard({
  week,
  totalWeeks = 17,
  nextCall,
  nextCallDate,
  attendance = [],
  missedCalls = 0
}: IntensiveProgramCardProps) {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    if (!nextCallDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const callDate = new Date(nextCallDate);
      const diffMs = callDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

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
  }, [nextCallDate]);

  const progressPercent = (week / totalWeeks) * 100;
  
  const formatNextCall = () => {
    if (nextCall) return nextCall;
    if (nextCallDate) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const date = new Date(nextCallDate);
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} - ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return 'Por confirmar';
  };

  const recentAttendance = attendance.slice(-4);
  const maxMissedAllowed = 3;
  const callsAttended = attendance.filter(a => a.attended).length;
  const totalCalls = totalWeeks * 2;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 h-full flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-lg">Programa Intensivo</h3>
          <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-white text-xs font-bold">{week}/{totalWeeks}</span>
          </div>
        </div>
        <p className="text-blue-100 text-sm">Semana {week} de {totalWeeks}</p>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="px-4 py-3 flex-1 space-y-3">
        {/* Countdown urgente (solo si faltan menos de 24h) */}
        {showCountdown && countdown && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-xs uppercase tracking-wider font-bold">¡Llamada Próxima!</span>
            </div>
            <div className="text-2xl font-mono font-bold text-orange-100">{countdown}</div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Próxima Llamada</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">{formatNextCall()}</span>
          </div>
        </div>

        {recentAttendance.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Asistencia Reciente</span>
            </div>
            <div className="flex items-center gap-2">
              {recentAttendance.map((record, idx) => (
                <div key={idx} className={`flex-1 h-8 rounded-lg transition-all flex items-center justify-center ${record.attended ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                  {record.attended ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Asistidas</span>
            </div>
            <div className="text-white font-bold text-lg">{callsAttended}/{totalCalls}</div>
          </div>

          <div className={`rounded-lg p-3 ${missedCalls >= maxMissedAllowed ? 'bg-red-900/30 border border-red-500/50' : 'bg-slate-800/50'}`}>
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className={`w-3 h-3 ${missedCalls >= maxMissedAllowed ? 'text-red-400' : 'text-orange-400'}`} />
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Faltas</span>
            </div>
            <div className={`font-bold text-lg ${missedCalls >= maxMissedAllowed ? 'text-red-400' : 'text-white'}`}>{missedCalls}/{maxMissedAllowed}</div>
            {missedCalls >= maxMissedAllowed && <p className="text-red-300 text-[10px] mt-1">Límite alcanzado</p>}
          </div>
        </div>

        {missedCalls > 0 && missedCalls < maxMissedAllowed && (
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-2">
            <div className="flex items-start gap-2">
              <PhoneOff className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-300 text-xs font-semibold">{missedCalls} {missedCalls === 1 ? 'falta registrada' : 'faltas registradas'}</p>
                <p className="text-orange-400/80 text-[10px]">{maxMissedAllowed - missedCalls} {maxMissedAllowed - missedCalls === 1 ? 'falta' : 'faltas'} más = expulsión</p>
              </div>
            </div>
          </div>
        )}

        {missedCalls >= maxMissedAllowed && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-xs font-bold">Límite de faltas alcanzado</p>
                <p className="text-red-400/80 text-[10px]">Contacta a tu coordinador</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
