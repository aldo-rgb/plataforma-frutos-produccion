'use client';

import { useEffect, useState } from 'react';
import { Target, Calendar, CheckCircle2, Clock, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProgramData {
  hasProgram: boolean;
  currentWeek?: number;
  totalWeeks?: number;
  completedSessions?: number;
  totalSessions?: number;
  nextSession?: {
    date: string;
    time: string;
  } | null;
}

export default function EnrollProgramWidget() {
  const [data, setData] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadProgram();
  }, []);

  const loadProgram = async () => {
    try {
      const res = await fetch('/api/program/status');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error cargando programa:', error);
      setData({ hasProgram: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl animate-pulse">
        <div className="h-32 bg-slate-700/50 rounded-xl"></div>
      </div>
    );
  }

  // Si NO tiene programa - mostrar invitación compacta
  if (!data?.hasProgram) {
    return (
      <div 
        onClick={() => router.push('/dashboard/program/enroll')}
        className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 p-6 rounded-2xl cursor-pointer hover:border-purple-500/60 transition-all group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Target className="w-6 h-6 text-purple-400" />
          </div>
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded-full border border-purple-500/30">
            PROGRAMA
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          Inscríbete <span className="group-hover:translate-x-1 transition-transform">→</span>
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Agenda tus sesiones semanales y comienza tu programa de mentoría.
        </p>
        
        <button
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all"
        >
          Agendar Sesiones
        </button>
      </div>
    );
  }

  // Si SÍ tiene programa - mostrar resumen compacto
  const progress = data.totalSessions 
    ? Math.round(((data.completedSessions || 0) / data.totalSessions) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-green-500/30 p-6 rounded-2xl">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-green-500/20 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
        <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
          ACTIVO
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-1">
        Mi Programa
      </h3>
      <p className="text-slate-400 text-sm mb-3">
        Semana {data.currentWeek || 1} de {data.totalWeeks || 9}
      </p>
      
      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Progreso</span>
          <span>{progress}%</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Próxima sesión */}
      {data.nextSession && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300">
            Próxima: {data.nextSession.date} a las {data.nextSession.time}
          </span>
        </div>
      )}
    </div>
  );
}
