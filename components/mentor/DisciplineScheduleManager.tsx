'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';

interface DisciplineSchedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Solo horas permitidas para disciplina: 5 AM - 8 AM
const HORAS_DISCIPLINA = ['05:00', '06:00', '07:00'];

export default function DisciplineScheduleManager() {
  const [horarios, setHorarios] = useState<{ [key: number]: string[] }>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  });
  
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarHorarios();
  }, []);

  const cargarHorarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mentor/disciplina/schedule');
      const data = await res.json();
      
      if (data.success) {
        const horariosMap: { [key: number]: string[] } = {
          0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
        };
        
        data.schedules.forEach((schedule: DisciplineSchedule) => {
          if (schedule.isActive) {
            const horaInicio = parseInt(schedule.startTime.split(':')[0]);
            const horaFin = parseInt(schedule.endTime.split(':')[0]);
            
            for (let h = horaInicio; h < horaFin; h++) {
              const horaStr = `${String(h).padStart(2, '0')}:00`;
              if (HORAS_DISCIPLINA.includes(horaStr) && !horariosMap[schedule.dayOfWeek].includes(horaStr)) {
                horariosMap[schedule.dayOfWeek].push(horaStr);
              }
            }
          }
        });
        
        setHorarios(horariosMap);
      }
    } catch (error) {
      console.error('Error cargando horarios:', error);
      mostrarMensaje('error', 'Error al cargar horarios de disciplina');
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (dia: number, activo: boolean) => {
    if (activo) {
      // Activar todas las horas de disciplina para ese día
      setHorarios({
        ...horarios,
        [dia]: [...HORAS_DISCIPLINA]
      });
    } else {
      // Desactivar todas las horas
      setHorarios({
        ...horarios,
        [dia]: []
      });
    }
  };

  const toggleHora = (dia: number, hora: string) => {
    const horasDelDia = horarios[dia] || [];
    if (horasDelDia.includes(hora)) {
      setHorarios({
        ...horarios,
        [dia]: horasDelDia.filter(h => h !== hora)
      });
    } else {
      setHorarios({
        ...horarios,
        [dia]: [...horasDelDia, hora].sort()
      });
    }
  };

  const guardarHorarios = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/mentor/disciplina/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios })
      });
      
      const data = await res.json();
      
      if (data.success) {
        mostrarMensaje('success', '✅ Horarios de disciplina guardados. Se han bloqueado automáticamente en tu disponibilidad.');
        await cargarHorarios();
      } else {
        mostrarMensaje('error', data.error || 'Error al guardar horarios');
      }
    } catch (error) {
      console.error('Error guardando horarios:', error);
      mostrarMensaje('error', 'Error al guardar horarios');
    } finally {
      setGuardando(false);
    }
  };

  const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const contarDiasActivos = () => {
    return Object.values(horarios).filter(horas => horas.length > 0).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando horarios de disciplina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* Mensajes */}
      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 animate-in slide-in-from-top ${
          mensaje.tipo === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {mensaje.tipo === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Información del Club de las 5 AM */}
      <div className="bg-gradient-to-r from-orange-900/20 to-orange-800/20 border border-orange-500/30 rounded-xl p-4 lg:p-6 mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-3 lg:gap-4">
          <div className="bg-orange-500/20 p-2.5 lg:p-3 rounded-lg">
            <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">🔥 Club de las 5 AM</h2>
            <p className="text-slate-300 text-sm lg:text-base mb-3">
              Configura tus bloques de 15 min. <strong>RECUERDA:</strong> Solo permitido de <span className="text-orange-400 font-bold">05:00 a 08:00 AM</span>.
            </p>
            <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-2.5 lg:p-3 flex items-start gap-2">
              <Info className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs lg:text-sm text-orange-200">
                <strong>Restricción activa:</strong> Solo horarios entre 05:00 - 08:00. Estas horas se bloquearán automáticamente en tu calendario de disponibilidad general.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 lg:p-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-white mb-1">Selecciona tus días activos</h3>
            <p className="text-xs lg:text-sm text-slate-400">
              {contarDiasActivos()} de 7 días configurados
            </p>
          </div>
          
          <button
            onClick={guardarHorarios}
            disabled={guardando}
            className="bg-white hover:bg-gray-100 text-black px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm lg:text-base w-full sm:w-auto"
          >
            {guardando ? (
              <>
                <Loader2 size={18} className="animate-spin lg:w-5 lg:h-5" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={18} className="lg:w-5 lg:h-5" />
                <span>Guardar Todo</span>
              </>
            )}
          </button>
        </div>

        {/* Grid de días */}
        <div className="space-y-3 lg:space-y-4">
          {DIAS_SEMANA.map((dia, index) => {
            const horasDelDia = horarios[index] || [];
            const diaActivo = horasDelDia.length > 0;
            
            return (
              <div 
                key={index}
                className={`border-2 rounded-xl p-3 lg:p-5 transition-all ${
                  diaActivo 
                    ? 'border-purple-500 bg-purple-900/20' 
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex flex-col gap-3 lg:gap-4">
                  
                  {/* Checkbox y día */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={diaActivo}
                      onChange={(e) => toggleDia(index, e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label className="text-base lg:text-lg font-bold text-white cursor-pointer">
                      {dia}
                    </label>
                  </div>

                  {/* Horas disponibles */}
                  {diaActivo ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 pl-8">
                      <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
                        <span className="text-slate-400">Hora inicio:</span>
                        <div className="bg-black/30 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded text-white font-mono text-xs lg:text-sm">
                          {horasDelDia[0] || '05:00'} a.m.
                        </div>
                      
                        <span className="text-slate-500">-</span>
                      
                        <span className="text-slate-400">Hora fin:</span>
                        <div className="bg-black/30 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded text-white font-mono text-xs lg:text-sm">
                          {horasDelDia.length > 0 
                            ? `${String(parseInt(horasDelDia[horasDelDia.length - 1].split(':')[0]) + 1).padStart(2, '0')}:00` 
                            : '08:00'} a.m.
                        </div>
                      </div>

                      {/* Selector de horas individuales */}
                      <div className="flex gap-1.5 lg:gap-2">
                        {HORAS_DISCIPLINA.map(hora => (
                          <button
                            key={hora}
                            onClick={() => toggleHora(index, hora)}
                            className={`px-2.5 lg:px-3 py-1.5 rounded text-xs font-bold transition-all ${
                              horasDelDia.includes(hora)
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {hora}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pl-8 text-xs lg:text-sm text-slate-500">
                      Día inactivo
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {/* Info adicional */}
        <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs lg:text-sm text-slate-400">
            💡 <strong>Tip:</strong> Estos horarios se sincronizarán automáticamente con tu calendario de disponibilidad general y aparecerán bloqueados (en rojo) para que no puedas agendar mentorías pagadas en estas horas.
          </p>
        </div>

      </div>
    </div>
  );
}
