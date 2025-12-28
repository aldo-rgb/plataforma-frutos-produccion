'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Phone, 
  Video, Clock, User, MapPin, CheckCircle, XCircle, AlertCircle,
  Filter, Download, Loader2
} from 'lucide-react';

type CallType = 'MENTORIA' | 'DISCIPLINA';
type CallStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface CalendarCall {
  id: number;
  title: string;
  studentName: string;
  studentId: number;
  type: CallType;
  status: CallStatus;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes?: string;
  meetingLink?: string;
  location?: string;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MentorCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calls, setCalls] = useState<CalendarCall[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CalendarCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filterType, setFilterType] = useState<'ALL' | CallType | CallStatus>('ALL');

  useEffect(() => {
    loadCalls();
  }, [currentDate]);

  useEffect(() => {
    applyFilters();
  }, [calls, filterType]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const res = await fetch(`/api/mentor/calendario?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Error al cargar llamadas');
      
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (error) {
      console.error('Error loading calls:', error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (filterType === 'ALL') {
      setFilteredCalls(calls);
    } else {
      setFilteredCalls(calls.filter(call => 
        call.type === filterType || call.status === filterType
      ));
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getCallsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return filteredCalls.filter(call => call.scheduledDate.startsWith(dateStr));
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getCallStatusColor = (status: CallStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'SCHEDULED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'NO_SHOW': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getCallTypeIcon = (type: CallType) => {
    return type === 'MENTORIA' ? <Video size={16} /> : <Phone size={16} />;
  };

  const days = getDaysInMonth(currentDate);
  const selectedDayCalls = selectedDate ? getCallsForDate(selectedDate) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <CalendarIcon className="text-purple-400" size={32} />
            Calendario de Llamadas
          </h1>
          <p className="text-slate-400 mt-1">Gestiona tus llamadas de mentoría y disciplina</p>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
        >
          Hoy
        </button>
      </div>

      {/* Controls */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousMonth}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            >
              <ChevronLeft className="text-white" size={20} />
            </button>
            <h2 className="text-xl font-bold text-white min-w-[200px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            >
              <ChevronRight className="text-white" size={20} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={18} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Todas</option>
              <option value="MENTORIA">Mentoría</option>
              <option value="DISCIPLINA">Disciplina</option>
              <option value="SCHEDULED">Agendadas</option>
              <option value="COMPLETED">Completadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center text-slate-500 text-sm font-bold py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dayCalls = getCallsForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate?.toDateString() === day.toDateString();

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square rounded-lg p-2 transition-all relative
                        ${isToday ? 'ring-2 ring-purple-500' : ''}
                        ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                      `}
                    >
                      <div className="text-sm font-semibold">{day.getDate()}</div>
                      
                      {/* Call indicators */}
                      {dayCalls.length > 0 && (
                        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                          {dayCalls.slice(0, 3).map((call, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                call.type === 'MENTORIA' ? 'bg-blue-400' : 'bg-green-400'
                              }`}
                            />
                          ))}
                          {dayCalls.length > 3 && (
                            <div className="text-[8px] text-slate-400">+{dayCalls.length - 3}</div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Day Details */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="text-purple-400" size={20} />
            {selectedDate ? (
              <>
                {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </>
            ) : (
              'Selecciona un día'
            )}
          </h3>

          {selectedDate && selectedDayCalls.length === 0 && (
            <div className="text-center py-10">
              <CalendarIcon className="text-slate-600 mx-auto mb-3" size={40} />
              <p className="text-slate-500 text-sm">No hay llamadas agendadas</p>
            </div>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {selectedDayCalls.map(call => (
              <div
                key={call.id}
                className={`border rounded-lg p-3 ${getCallStatusColor(call.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCallTypeIcon(call.type)}
                    <span className="font-bold text-sm">{call.type}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-black/20">
                    {call.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} />
                    <span className="font-semibold">{call.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} />
                    <span>{call.startTime} - {call.endTime}</span>
                  </div>
                  {call.meetingLink && (
                    <a
                      href={call.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <Video size={14} />
                      <span>Unirse a la llamada</span>
                    </a>
                  )}
                  {call.notes && (
                    <p className="text-xs mt-2 opacity-80">{call.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm font-semibold mb-1">Agendadas</p>
          <p className="text-2xl font-black text-white">
            {filteredCalls.filter(c => c.status === 'SCHEDULED').length}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-400 text-sm font-semibold mb-1">Completadas</p>
          <p className="text-2xl font-black text-white">
            {filteredCalls.filter(c => c.status === 'COMPLETED').length}
          </p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-purple-400 text-sm font-semibold mb-1">Mentoría</p>
          <p className="text-2xl font-black text-white">
            {filteredCalls.filter(c => c.type === 'MENTORIA').length}
          </p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-semibold mb-1">Disciplina</p>
          <p className="text-2xl font-black text-white">
            {filteredCalls.filter(c => c.type === 'DISCIPLINA').length}
          </p>
        </div>
      </div>

    </div>
  );
}
