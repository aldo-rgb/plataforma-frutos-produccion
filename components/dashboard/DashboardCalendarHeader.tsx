'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, addDays, subDays
} from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskSummary {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
}

interface CalendarHeaderProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
}

export default function DashboardCalendarHeader({ selectedDate, onDateSelect, stats }: CalendarHeaderProps) {
  const [isMonthViewOpen, setIsMonthViewOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [taskSummary, setTaskSummary] = useState<Record<string, TaskSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Cargar datos del calendario
  useEffect(() => {
    const monthStr = format(selectedDate, 'yyyy-MM');
    
    console.log('🔄 Cargando datos del calendario para:', monthStr);
    setIsLoading(true);
    fetch(`/api/tasks/calendar-summary?month=${monthStr}`)
      .then(res => res.json())
      .then(data => {
        console.log('✅ Datos recibidos:', data);
        console.log('📊 Número de días con tareas:', Object.keys(data).length);
        setTaskSummary(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('❌ Error loading calendar summary:', err);
        setIsLoading(false);
      });
  }, [selectedDate]);

  // Cargar mes actual cuando se abre el dropdown
  useEffect(() => {
    if (!isMonthViewOpen) return;
    
    const monthStr = format(currentMonth, 'yyyy-MM');
    
    fetch(`/api/tasks/calendar-summary?month=${monthStr}`)
      .then(res => res.json())
      .then(data => {
        setTaskSummary(prev => ({ ...prev, ...data }));
      })
      .catch(err => {
        console.error('Error loading calendar summary:', err);
      });
  }, [currentMonth, isMonthViewOpen]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsMonthViewOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generar días para la vista mensual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStartDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
  const calendarEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });

  // Generar días para la tira horizontal (Semana actual de la fecha seleccionada)
  const stripStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const stripEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const stripDays = eachDayOfInterval({ start: stripStart, end: stripEnd });

  // Calcular porcentaje de progreso del día
  const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Navegación de día en día
  const navigateDay = (direction: 'prev' | 'next') => {
    onDateSelect(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
  };

  return (
    <div className="relative mb-6" ref={calendarRef}>
      
      <style jsx>{`
        .task-dot {
          animation: none !important;
          transition: none !important;
          visibility: visible !important;
          display: block !important;
        }
      `}</style>
      
      {/* 1. HEADER INTERACTIVO (Título + Navegación) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMonthViewOpen(!isMonthViewOpen)}
            className="group flex items-center gap-3 text-2xl font-bold text-white hover:text-purple-400 transition-colors"
          >
            <span>
              {isToday(selectedDate) ? 'Hoy, ' : ''}{format(selectedDate, "d 'de' MMMM", { locale: es })}
            </span>
            <ChevronDown 
              size={20} 
              className={`text-gray-500 group-hover:text-purple-400 transition-transform duration-300 ${isMonthViewOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Botones de navegación día a día */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateDay('prev')}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => navigateDay('next')}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Porcentaje de progreso circular (Estilo Things) */}
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-gray-800"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressPercentage / 100)}`}
              className={`transition-all duration-500 ${
                progressPercentage === 100 ? 'text-green-500' : 
                progressPercentage > 50 ? 'text-purple-500' : 
                'text-yellow-500'
              }`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-300">
            {progressPercentage}%
          </div>
        </div>
      </div>

      {/* 2. TIRA HORIZONTAL (Siempre visible) */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {stripDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const summary = taskSummary[dateKey];
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                isSelected 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105' 
                  : 'bg-transparent hover:bg-[#1a1d2d] text-gray-500'
              }`}
            >
              <span className="text-xs font-medium uppercase mb-1">
                {format(day, 'EEE', { locale: es }).replace('.', '')}
              </span>
              <span className={`text-xl font-bold ${isDayToday && !isSelected ? 'text-purple-400' : ''}`}>
                {format(day, 'd')}
              </span>
              
              {/* Puntos de estado en la tira - Siempre visibles */}
              {summary && summary.total > 0 && (
                <div className="mt-1.5 flex justify-center gap-1">
                  <div 
                    className={`task-dot w-2 h-2 rounded-full ${
                      summary.overdue > 0 ? 'bg-red-500 shadow-lg shadow-red-500/50' :
                      summary.pending === 0 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 
                      isDayToday ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' :
                      'bg-gray-400 shadow-lg shadow-gray-400/50'
                    }`}
                    style={{ opacity: '1 !important', visibility: 'visible !important' }}
                  ></div>
                </div>
              )}
              {/* Debug: mostrar si hay summary */}
              {summary && console.log(`Día ${format(day, 'd')}: total=${summary.total}, overdue=${summary.overdue}, pending=${summary.pending}`)}
            </button>
          );
        })}
      </div>

      {/* 3. CALENDARIO MENSUAL DESPLEGABLE (Popover) */}
      {isMonthViewOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 p-5 bg-[#151725] border border-gray-700 rounded-2xl shadow-2xl w-[320px] sm:w-[380px] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Navegación del Mes */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Grid de Días del Mes */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-xs text-gray-500 font-bold py-2">{d}</div>
            ))}
            
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const summary = taskSummary[dateKey];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isDayToday = isToday(day);

              return (
                <button
                  key={day.toString()}
                  onClick={() => {
                    onDateSelect(day);
                    setIsMonthViewOpen(false);
                  }}
                  disabled={!isCurrentMonth}
                  className={`
                    relative h-10 w-10 mx-auto rounded-full flex flex-col items-center justify-center text-sm font-medium transition-all
                    ${!isCurrentMonth ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer'}
                    ${isSelected ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                    ${isDayToday && !isSelected ? 'text-purple-400 font-bold ring-2 ring-purple-400/30' : ''}
                  `}
                >
                  {format(day, 'd')}

                  {/* INDICADORES DE TAREAS (Los Puntos) - Permanentes */}
                  {isCurrentMonth && summary && summary.total > 0 && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      <div 
                        className={`task-dot w-1.5 h-1.5 rounded-full ${
                          summary.overdue > 0 ? 'bg-red-500 shadow-md shadow-red-500/60' :
                          summary.pending === 0 ? 'bg-green-500 shadow-md shadow-green-500/60' : 
                          isDayToday ? 'bg-yellow-500 shadow-md shadow-yellow-500/60' :
                          day < new Date() ? 'bg-red-500 shadow-md shadow-red-500/60' :
                          'bg-gray-400 shadow-md shadow-gray-400/60'
                        }`}
                        style={{ opacity: '1 !important', minWidth: '6px', minHeight: '6px', visibility: 'visible !important' }}
                      ></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Leyenda de puntos */}
          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-400">Atrasadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Completadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="text-gray-400">Futuras</span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <button 
              onClick={() => {
                onDateSelect(new Date());
                setCurrentMonth(new Date());
                setIsMonthViewOpen(false);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wide transition-colors"
            >
              Volver a Hoy
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
