'use client';

import React, { useState, useEffect } from 'react';

// Días de la semana para mapear (0=Domingo según JS, pero ajustamos a tu gusto)
const DAYS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

export default function ScheduleConfig({ mentorId }: { mentorId: number }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estado inicial: Todos los días desactivados
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({
      dayOfWeek: d.id,
      label: d.label,
      isActive: false,
      startTime: '05:00', // Regla de Oro: Inicio temprano
      endTime: '08:00'    // Regla de Oro: Fin límite
    }))
  );

  // Cargar horario existente (si lo hay)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mentor/schedule?mentorId=${mentorId}`, {
          cache: 'no-store', // <--- Importante: Prohibido usar caché
          headers: {
            'Pragma': 'no-cache'
          }
        });
        const response = await res.json();
        
        // El API devuelve { success: true, data: { availability: [...] } }
        const savedData = response.data?.availability || [];
        
        if (Array.isArray(savedData) && savedData.length > 0) {
          setSchedule(prev => prev.map(day => {
            const found = savedData.find((s: any) => s.dayOfWeek === day.dayOfWeek);
            if (found) {
              return { ...day, isActive: true, startTime: found.startTime, endTime: found.endTime };
            }
            return day;
          }));
          console.log(`✅ Cargados ${savedData.length} horarios desde BD`);
        } else {
          console.log('📅 No hay horarios guardados, usando valores por defecto');
        }
      } catch (error) {
        console.error('❌ Error cargando horarios:', error);
      }
    }
    load();
  }, [mentorId]);

  // Manejadores de cambios
  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isActive = !newSchedule[index].isActive;
    setSchedule(newSchedule);
  };

  const changeTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    // Validar que el horario esté dentro del rango permitido
    if (value < "05:00" || value > "08:00") {
      alert("⚠️ Regla del Programa: Solo horarios entre 5:00 AM y 8:00 AM están permitidos.");
      return; // No actualizar el estado si está fuera de rango
    }
    
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  // Guardar en BD
  const handleSave = async () => {
    // Validar antes de enviar al servidor
    const activeDays = schedule.filter(s => s.isActive);
    const hasInvalidTimes = activeDays.some(
      day => day.startTime < "05:00" || day.endTime > "08:00"
    );
    
    if (hasInvalidTimes) {
      alert("⛔ Error: Detectamos horarios fuera del rango permitido (05:00 - 08:00). Por favor corrige los horarios antes de guardar.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/mentor/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId, schedule })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowSuccess(true);
        // Opcional: Ocultarlo automágicamente después de 3 segundos
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(`❌ Error al guardar: ${data.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">📅 Tu Disponibilidad</h2>
          <p className="text-slate-400 text-sm">Define los bloques generales. Los alumnos reservarán turnos de 15 min dentro de estos bloques.</p>
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-3 rounded-lg mt-2 text-sm flex items-center gap-2">
            <span>🌅</span>
            <strong>Filosofía 5 AM Club:</strong> Las llamadas de disciplina solo están permitidas entre las 05:00 AM y las 08:00 AM.
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Guardando...' : '💾 Guardar Horario'}
        </button>
      </div>

      <div className="space-y-4">
        {schedule.map((day, index) => (
          <div 
            key={day.dayOfWeek} 
            className={`p-4 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              day.isActive ? 'bg-slate-700/50 border-purple-500/50' : 'bg-slate-900 border-slate-800 opacity-75'
            }`}
          >
            {/* Toggle Día */}
            <div className="flex items-center gap-4 w-40">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={day.isActive} 
                  onChange={() => toggleDay(index)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
              <span className={`font-bold ${day.isActive ? 'text-white' : 'text-slate-500'}`}>
                {day.label}
              </span>
            </div>

            {/* Selectores de Hora (Solo visibles si activo) */}
            {day.isActive && (
              <div className="flex items-center gap-4 animate-fadeIn">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-1">Desde</span>
                  <input 
                    type="time"
                    min="05:00"
                    max="08:00"
                    value={day.startTime}
                    onChange={(e) => changeTime(index, 'startTime', e.target.value)}
                    onBlur={(e) => changeTime(index, 'startTime', e.target.value)}
                    className="bg-slate-950 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none invalid:border-red-500"
                  />
                </div>
                <span className="text-slate-500 pt-5">➜</span>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-1">Hasta</span>
                  <input 
                    type="time"
                    min="05:00"
                    max="08:00"
                    value={day.endTime}
                    onChange={(e) => changeTime(index, 'endTime', e.target.value)}
                    onBlur={(e) => changeTime(index, 'endTime', e.target.value)}
                    className="bg-slate-950 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none invalid:border-red-500"
                  />
                </div>
              </div>
            )}
            
            {/* Feedback Visual */}
            {!day.isActive && (
              <span className="text-xs text-slate-600 italic flex-1 text-center md:text-right">
                No disponible para llamadas
              </span>
            )}
          </div>
        ))}
      </div>

      {/* --- MODAL DE ÉXITO (Premium Dark) --- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 max-w-sm w-full text-center relative transform transition-all scale-100">
            
            {/* Icono Animado (Círculo Verde) */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
              <svg className="h-10 w-10 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Textos */}
            <h3 className="text-xl font-bold text-white mb-2">¡Horario Guardado!</h3>
            <p className="text-slate-400 mb-8">
              Tu disponibilidad se ha actualizado correctamente. Los alumnos ya pueden ver tus nuevos horarios.
            </p>

            {/* Botón de Acción */}
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02]"
            >
              Entendido, gracias
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
