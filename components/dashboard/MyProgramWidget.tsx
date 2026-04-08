'use client';

import { useEffect, useState } from 'react';
import { Target, Phone, X, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

interface CallSession {
  id: number;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  weekNumber: number;
}

interface ProgramData {
  hasProgram: boolean;
  currentWeek: number;
  totalWeeks: number;
  missedCalls: number;
  maxMissedAllowed: number;
  livesRemaining: number;
  nextSession: {
    date: string;
    time: string;
    scheduledAt: string;
  } | null;
  mentor: {
    id: number;
    nombre: string;
    telefono: string | null;
  } | null;
  allSessions: CallSession[];
}

const MEXICO_TZ = 'America/Mexico_City';

export default function MyProgramWidget() {
  const [data, setData] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProgram();
  }, []);

  const loadProgram = async () => {
    try {
      const res = await fetch('/api/program/status');
      const result = await res.json();
      
      if (result.hasProgram) {
        setData(result);
      }
    } catch (error) {
      console.error('Error cargando programa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallMentor = () => {
    if (data?.mentor?.telefono) {
      window.open(`tel:${data.mentor.telefono}`, '_self');
    }
  };

  // Helper para formatear hora en zona horaria de México
  const formatTimeInMexico = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), MEXICO_TZ, 'HH:mm');
  };

  // Helper para formatear fecha completa en zona horaria de México
  const formatDateInMexico = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), MEXICO_TZ, "EEEE d 'de' MMMM", { locale: es });
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl animate-pulse">
        <div className="h-32 bg-slate-700/50 rounded-xl"></div>
      </div>
    );
  }

  if (!data?.hasProgram) {
    // Mostrar invitación a inscribirse al programa
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 p-6 rounded-2xl hover:border-purple-400 transition-all group relative overflow-hidden">
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30">
              EXCLUSIVO
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            🚀 Programa de Seguimiento
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Acelera tu transformación con llamadas semanales de mentoría y seguimiento personalizado.
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>18 llamadas de seguimiento (9 semanas)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Acompañamiento directo de tu mentor</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Comunidad de alto rendimiento</span>
            </div>
          </div>
          
          <button
            onClick={() => window.location.href = '/dashboard/program/enroll'}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
          >
            Inscribirme al Programa →
          </button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'MISSED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'PENDING':
      case 'CONFIRMED':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'MISSED':
        return 'Perdida';
      case 'PENDING':
        return 'Pendiente';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <>
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group relative overflow-hidden">
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
            <Target className="w-6 h-6 text-purple-500" />
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Mi Programa</span>
            <button 
              onClick={() => setShowModal(true)}
              className="text-xs text-purple-400 cursor-pointer hover:underline"
            >
              Ver Detalles
            </button>
          </div>
        </div>
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Strikes</span>
            <span className={`text-lg font-bold ${data.missedCalls >= 2 ? 'text-red-400' : data.missedCalls === 1 ? 'text-yellow-400' : 'text-green-400'}`}>
              {data.missedCalls}/3
            </span>
          </div>
          
          {data.nextSession ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Próxima Sesión</span>
              <span className="text-sm font-medium text-slate-100">
                {formatInTimeZone(new Date(data.nextSession.scheduledAt), MEXICO_TZ, "d MMM", { locale: es })}, {formatTimeInMexico(data.nextSession.scheduledAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Estado</span>
              <span className="text-sm font-medium text-yellow-400">Sin sesiones</span>
            </div>
          )}
          
          <div className="pt-2">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
                style={{ width: `${(data.currentWeek / data.totalWeeks) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Semana {data.currentWeek} de {data.totalWeeks}</p>
          </div>

          {/* Botón Llamar al Mentor */}
          {data.mentor?.telefono && (
            <button
              onClick={handleCallMentor}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
            >
              <Phone className="w-4 h-4" />
              Llamar a {data.mentor.nombre.split(' ')[0]}
            </button>
          )}
        </div>
      </div>

      {/* Modal de Llamadas Agendadas */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Mis Llamadas Agendadas</h3>
                  <p className="text-xs text-slate-400">Semana {data.currentWeek} de {data.totalWeeks}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Info del Mentor */}
              {data.mentor && (
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tu Mentor</p>
                  <p className="text-white font-medium">{data.mentor.nombre}</p>
                  {data.mentor.telefono && (
                    <button
                      onClick={handleCallMentor}
                      className="mt-2 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      {data.mentor.telefono}
                    </button>
                  )}
                </div>
              )}

              {/* Resumen de Status */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {data.allSessions?.filter(s => s.status === 'COMPLETED').length || 0}
                  </p>
                  <p className="text-xs text-green-300">Completadas</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {data.allSessions?.filter(s => ['PENDING', 'CONFIRMED'].includes(s.status)).length || 0}
                  </p>
                  <p className="text-xs text-blue-300">Pendientes</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {data.missedCalls}
                  </p>
                  <p className="text-xs text-red-300">Strikes</p>
                </div>
              </div>

              {/* Lista de Llamadas */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Todas las Sesiones</p>
                {data.allSessions && data.allSessions.length > 0 ? (
                  data.allSessions.map((session, index) => {
                    const sessionDate = new Date(session.scheduledAt);
                    const now = new Date();
                    const isPast = sessionDate < now;
                    
                    return (
                      <div 
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          session.status === 'COMPLETED' ? 'bg-green-500/5 border-green-500/20' :
                          session.status === 'MISSED' ? 'bg-red-500/5 border-red-500/20' :
                          !isPast ? 'bg-blue-500/5 border-blue-500/20' :
                          'bg-slate-800/50 border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(session.status)}
                          <div>
                            <p className="text-sm font-medium text-white">
                              Sesión #{session.weekNumber || index + 1}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDateInMexico(session.scheduledAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-200">
                            {formatTimeInMexico(session.scheduledAt)}
                          </p>
                          <p className={`text-xs ${
                            session.status === 'COMPLETED' ? 'text-green-400' :
                            session.status === 'MISSED' ? 'text-red-400' :
                            'text-blue-400'
                          }`}>
                            {getStatusLabel(session.status)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay sesiones agendadas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
