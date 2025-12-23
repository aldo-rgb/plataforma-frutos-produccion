'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Info, Check } from 'lucide-react';

interface ConfiguradorAccionProps {
  initialData?: {
    frequency?: string;
    assignedDays?: number[];
    monthDay?: number;
  };
  onSave: (config: { frequency: string; assignedDays: number[]; monthDay?: number }) => void;
  onChange?: (config: { frequency: string; assignedDays: number[]; monthDay?: number }) => void;
}

export default function ConfiguradorAccion({ initialData, onSave, onChange }: ConfiguradorAccionProps) {
  const [frecuencia, setFrecuencia] = useState(initialData?.frequency || '');
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>(initialData?.assignedDays || []);
  const [diaDelMes, setDiaDelMes] = useState(initialData?.monthDay || 1);
  const [showWarning, setShowWarning] = useState(false);

  const diasSemana = [
    { id: 1, label: 'L', name: 'Lunes' },
    { id: 2, label: 'M', name: 'Martes' },
    { id: 3, label: 'X', name: 'Miércoles' },
    { id: 4, label: 'J', name: 'Jueves' },
    { id: 5, label: 'V', name: 'Viernes' },
    { id: 6, label: 'S', name: 'Sábado' },
    { id: 0, label: 'D', name: 'Domingo' }
  ];

  const frecuencias = [
    { value: 'DAILY', label: 'DIARIA', description: '7 días/semana', icon: '🔥', tasks: '~100 tareas' },
    { value: 'WEEKLY', label: 'SEMANAL', description: 'Elige días específicos', icon: '📅', tasks: 'Variable' },
    { value: 'BIWEEKLY', label: 'QUINCENAL', description: 'Cada 2 semanas', icon: '🗓️', tasks: '~7 tareas' },
    { value: 'MONTHLY', label: 'MENSUAL', description: 'Una vez al mes', icon: '📆', tasks: '~3 tareas' }
  ];

  // Notificar cambios al padre
  useEffect(() => {
    if (onChange) {
      onChange({
        frequency: frecuencia,
        assignedDays: diasSeleccionados,
        monthDay: diaDelMes
      });
    }
  }, [frecuencia, diasSeleccionados, diaDelMes]);

  const toggleDia = (id: number) => {
    if (diasSeleccionados.includes(id)) {
      setDiasSeleccionados(diasSeleccionados.filter(d => d !== id));
    } else {
      setDiasSeleccionados([...diasSeleccionados, id].sort());
    }
  };

  const handleFrecuenciaChange = (tipo: string) => {
    setFrecuencia(tipo);
    
    if (tipo === 'DAILY') {
      setDiasSeleccionados([0, 1, 2, 3, 4, 5, 6]);
      setShowWarning(true);
    } else if (tipo === 'BIWEEKLY' || tipo === 'MONTHLY') {
      setDiasSeleccionados([]);
      setShowWarning(false);
    } else {
      setShowWarning(false);
    }
  };

  const calcularTareasTotales = () => {
    if (frecuencia === 'DAILY') return 100;
    if (frecuencia === 'WEEKLY') {
      // ~14 semanas en 100 días
      return diasSeleccionados.length * 14;
    }
    if (frecuencia === 'BIWEEKLY') return 7;
    if (frecuencia === 'MONTHLY') return 3;
    return 0;
  };

  return (
    <div className="bg-[#1a1b1f] p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="text-purple-400" size={20} />
        <h3 className="text-white font-bold">Plan de Acción</h3>
      </div>
      
      {/* 1. SELECCIÓN DE FRECUENCIA "FOR DUMMIES" */}
      <label className="text-gray-400 text-sm block mb-3 flex items-center gap-2">
        <Info size={16} className="text-purple-400" />
        ¿Cada cuánto harás esta acción?
      </label>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        {frecuencias.map(tipo => (
          <button
            key={tipo.value}
            type="button"
            onClick={() => handleFrecuenciaChange(tipo.value)}
            className={`p-4 rounded-xl border text-left transition-all hover:scale-105 ${
              frecuencia === tipo.value
                ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30' 
                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-2xl">{tipo.icon}</span>
              {frecuencia === tipo.value && (
                <Check size={18} className="text-green-500" />
              )}
            </div>
            <div className={`font-bold text-sm mb-1 ${frecuencia === tipo.value ? 'text-white' : 'text-gray-300'}`}>
              {tipo.label}
            </div>
            <div className="text-xs text-gray-500 mb-1">{tipo.description}</div>
            <div className={`text-xs font-mono ${frecuencia === tipo.value ? 'text-purple-300' : 'text-gray-600'}`}>
              {tipo.tasks}
            </div>
          </button>
        ))}
      </div>

      {/* 2. ADVERTENCIA DE "DIARIA" */}
      {showWarning && frecuencia === 'DAILY' && (
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 p-4 rounded-lg flex gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-orange-400 font-bold text-sm mb-1">¡Alto ahí, Tigre! 🐯</p>
            <p className="text-gray-300 text-xs leading-relaxed">
              Seleccionaste <strong className="text-white">Diaria</strong>. Esto significa que tendrás que subir{' '}
              <strong className="text-orange-400">100 evidencias (fotos)</strong> sin falta durante los próximos 100 días.
            </p>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              💡 <strong>Recomendación:</strong> Si no estás 100% comprometido, empieza con algo más ligero como{' '}
              <strong className="text-purple-300">3 veces por semana</strong> (42 tareas totales).
            </p>
          </div>
        </div>
      )}

      {/* 3. SELECTOR DE DÍAS ESPECÍFICOS (SEMANAL) */}
      {frecuencia === 'WEEKLY' && (
        <div className="mb-6 animate-in slide-in-from-top-2 bg-[#252836] p-5 rounded-xl border border-gray-700">
          <label className="text-gray-300 text-sm font-medium block mb-3 flex items-center gap-2">
            <Check size={16} className="text-green-500" />
            Selecciona EXACTAMENTE qué días lo harás:
          </label>
          <div className="flex gap-2 justify-center mb-4">
            {diasSemana.map(dia => (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`group relative w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all ${
                  diasSeleccionados.includes(dia.id)
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-900/50 scale-110'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:scale-105'
                }`}
                title={dia.name}
              >
                {dia.label}
                {diasSeleccionados.includes(dia.id) && (
                  <Check size={12} className="absolute -top-1 -right-1 bg-green-400 rounded-full p-0.5" />
                )}
              </button>
            ))}
          </div>
          
          {diasSeleccionados.length > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-lg">
              <p className="text-xs text-center text-purple-300 font-medium mb-1">
                📊 Tareas totales estimadas: <strong className="text-white">{calcularTareasTotales()}</strong>
              </p>
              <p className="text-xs text-center text-gray-400">
                El sistema agendará tareas solo en estos {diasSeleccionados.length} día(s) por los próximos 100 días.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. QUINCENAL (Selector de días específicos) */}
      {frecuencia === 'BIWEEKLY' && (
        <div className="mb-6 animate-in slide-in-from-top-2 bg-[#252836] p-5 rounded-xl border border-gray-700">
          <label className="text-gray-300 text-sm font-medium block mb-3">
            ¿Qué días de la semana? (Cada 2 semanas)
          </label>
          <div className="flex gap-2 justify-center mb-3">
            {diasSemana.map(dia => (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all ${
                  diasSeleccionados.includes(dia.id)
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}
                title={dia.name}
              >
                {dia.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-gray-500">
            Aproximadamente <strong className="text-purple-300">{calcularTareasTotales()} tareas</strong> en total
          </p>
        </div>
      )}

      {/* 5. MENSUAL (Selector de día del mes) */}
      {frecuencia === 'MONTHLY' && (
        <div className="mb-6 animate-in slide-in-from-top-2 bg-[#252836] p-5 rounded-xl border border-gray-700">
          <label className="text-gray-300 text-sm font-medium block mb-3">
            ¿Qué día del mes?
          </label>
          <select
            value={diaDelMes}
            onChange={(e) => setDiaDelMes(parseInt(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value={1}>El día 1 de cada mes</option>
            <option value={5}>El día 5 de cada mes</option>
            <option value={10}>El día 10 de cada mes</option>
            <option value={15}>El día 15 de cada mes</option>
            <option value={20}>El día 20 de cada mes</option>
            <option value={25}>El día 25 de cada mes</option>
            <option value={-1}>El último día del mes</option>
          </select>
          <p className="text-xs text-center text-gray-500 mt-3">
            Aproximadamente <strong className="text-purple-300">3 tareas</strong> durante los 100 días
          </p>
        </div>
      )}

      {/* 6. VALIDACIÓN Y RESUMEN */}
      {frecuencia && (
        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📋</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">Resumen de tu compromiso:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Frecuencia: <span className="text-purple-300">{frecuencias.find(f => f.value === frecuencia)?.label}</span></li>
                {frecuencia === 'WEEKLY' && diasSeleccionados.length > 0 && (
                  <li>• Días: <span className="text-purple-300">
                    {diasSeleccionados.map(d => diasSemana.find(ds => ds.id === d)?.label).join(', ')}
                  </span></li>
                )}
                <li>• Total de tareas: <span className="text-purple-300">~{calcularTareasTotales()}</span></li>
                <li>• Evidencias requeridas: <span className="text-purple-300">Foto en cada tarea</span></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
