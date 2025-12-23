"use client";
import React, { useEffect, useState } from 'react';
import { Calendar, AlertTriangle, Phone, TrendingUp, Clock, CheckCircle, XCircle, Flame } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Subscription {
  id: number;
  day1: number;
  time1: string;
  day2: number;
  time2: string;
  startDate: string;
  endDate: string;
  status: string;
  missedCallsCount: number;
  mentor: {
    id: number;
    nombre: string;
  };
}

interface NextCall {
  date: string;
  dayOfWeek: number;
  time: string;
  isToday: boolean;
}

interface DashboardData {
  hasSubscription: boolean;
  subscription?: Subscription;
  nextCall?: NextCall;
}

interface CallLogStats {
  total: number;
  attended: number;
  missed: number;
  cancelled: number;
}

export default function StudentDisciplineDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<CallLogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadCallLogs();
  }, []);

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/student/discipline-subscription');
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error cargando dashboard de disciplina:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCallLogs = async () => {
    try {
      const res = await fetch('/api/call-logs');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-slate-800 rounded-2xl mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data?.hasSubscription) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-2xl text-center">
        <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">¡Es hora de comenzar tu transformación!</h3>
        <p className="text-slate-300 mb-6">
          Aún no tienes una rutina de disciplina configurada. Compromét</p>
        <button 
          onClick={() => window.location.href = '/dashboard/student/discipline-setup'}
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
        >
          Configurar Mi Rutina de Acero
        </button>
      </div>
    );
  }

  const sub = data.subscription!;
  const livesLeft = 3 - sub.missedCallsCount;
  const hearts = Array.from({ length: 3 }, (_, i) => i < livesLeft);

  return (
    <div className="space-y-6">
      {/* TARJETA PRINCIPAL: PRÓXIMA LLAMADA */}
      <div className="bg-gradient-to-br from-orange-900/50 to-slate-900 border border-orange-500/30 p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Flame className="w-32 h-32 text-white" />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-orange-300 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Tu Rutina de Acero
          </h3>
          
          {data.nextCall ? (
            <div>
              <div className="text-6xl font-bold text-white mb-2">
                {data.nextCall.time}
              </div>
              <div className="text-2xl text-slate-300 mb-1 capitalize">
                {data.nextCall.isToday ? '¡Hoy!' : format(parseISO(data.nextCall.date), "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="text-lg text-orange-400 mb-6">
                Con {sub.mentor.nombre}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-500/20 px-4 py-3 rounded-lg border border-orange-500/30">
                  <div className="text-xs text-orange-300 mb-1">Tu Compromiso</div>
                  <div className="text-sm font-bold text-white">
                    {getDayName(sub.day1)} {sub.time1} & {getDayName(sub.day2)} {sub.time2}
                  </div>
                </div>
                
                <div className="bg-slate-700/50 px-4 py-3 rounded-lg border border-slate-600">
                  <div className="text-xs text-slate-400 mb-1">Duración</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    15 minutos
                  </div>
                </div>
              </div>

              {/* Vidas Restantes */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Tus Vidas</p>
                    <div className="flex gap-2 text-2xl">
                      {hearts.map((alive, i) => (
                        <span key={i}>{alive ? '❤️' : '💔'}</span>
                      ))}
                    </div>
                  </div>
                  {livesLeft === 1 && (
                    <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-lg">
                      <p className="text-red-300 text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        ¡Última oportunidad!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {data.nextCall.isToday && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-bold">¡La llamada es HOY!</span> 
                    No faltes, cada día cuenta para tu transformación 💪
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400">Cargando próxima llamada...</p>
          )}
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Asistidas */}
          <div className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-500/30 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-green-300 text-sm font-medium">Asistidas</div>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-4xl font-bold text-white">{stats.attended}</div>
            <div className="text-xs text-green-400 mt-2">
              {stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}% de asistencia
            </div>
          </div>

          {/* Perdidas */}
          <div className="bg-gradient-to-br from-red-900/30 to-slate-900 border border-red-500/30 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-red-300 text-sm font-medium">Perdidas</div>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-4xl font-bold text-white">{stats.missed}</div>
            <div className="text-xs text-red-400 mt-2">
              {stats.missed >= 3 ? '⚠️ Límite alcanzado' : `${3 - stats.missed} chances restantes`}
            </div>
          </div>

          {/* Total */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-sm">Total Realizadas</div>
              <Calendar className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-2">
              Días hasta graduación: {Math.ceil((parseISO(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
            </div>
          </div>
        </div>
      )}

      {/* INFORMACIÓN DEL COMPROMISO */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          Detalles de tu Compromiso
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-1">Inicio</p>
            <p className="text-white font-medium">
              {format(parseISO(sub.startDate), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Graduación</p>
            <p className="text-white font-medium">
              {format(parseISO(sub.endDate), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Mentor</p>
            <p className="text-white font-medium">{sub.mentor.nombre}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Estado</p>
            <p className={`font-medium ${
              sub.status === 'ACTIVE' ? 'text-green-400' : 
              sub.status === 'GRADUATED' ? 'text-blue-400' : 
              'text-red-400'
            }`}>
              {sub.status === 'ACTIVE' ? '✅ Activo' : 
               sub.status === 'GRADUATED' ? '🎓 Graduado' : 
               '❌ Suspendido'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
