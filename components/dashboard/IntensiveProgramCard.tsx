'use client';

import { Calendar, Phone, PhoneOff, Clock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  
  // Calcular progreso
  const progressPercent = (week / totalWeeks) * 100;
  
  // Formatear fecha de próxima llamada
  const formatNextCall = () => {
    if (nextCall) return nextCall;
    if (nextCallDate) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${days[nextCallDate.getDay()]} ${nextCallDate.getDate()} ${months[nextCallDate.getMonth()]} - ${nextCallDate.getHours().toString().padStart(2, '0')}:${nextCallDate.getMinutes().toString().padStart(2, '0')}`;
    }
    return 'Por confirmar';
  };

  // Últimas 4 asistencias para mostrar
  const recentAttendance = attendance.slice(-4);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 group h-full flex flex-col">
      {/* Header con degradado */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-lg">Programa Intensivo</h3>
          <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-white text-xs font-bold">{week}/{totalWeeks}</span>
          </div>
        </div>
        <p className="text-blue-100 text-sm">
          Semana {week} de {totalWeeks}
        </p>
      </div>

      {/* Barra de progreso del programa */}
      <div className="px-4 pt-4 pb-2">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-4 py-3 flex-1 space-y-4">
        {/* Próxima llamada */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">
              Próxima Llamada
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">{formatNextCall()}</span>
          </div>
        </div>

        {/* Asistencia reciente */}
        {recentAttendance.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                Asistencia Reciente
              </span>
            </div>
            <div className="flex items-center gap-2">
              {recentAttendance.map((record, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg transition-transform hover:scale-110 ${
                    record.attended
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                  title={record.attended ? 'Asististe' : 'Falta'}
                >
                  {record.attended ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <PhoneOff className="w-4 h-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advertencia de faltas si aplica */}
        {missedCalls > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <PhoneOff className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-xs font-medium">
                {missedCalls} {missedCalls === 1 ? 'falta registrada' : 'faltas registradas'}
              </span>
            </div>
            <p className="text-red-300 text-xs mt-1">
              3 faltas = expulsión del programa
            </p>
          </div>
        )}
      </div>

      {/* Footer con botón */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={() => router.push('/dashboard/programa-intensivo')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/50 flex items-center justify-center gap-2"
        >
          Ver Programa
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
