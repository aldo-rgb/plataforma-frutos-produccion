'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  ShareIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  category: 'EVENTO' | 'CONTRIBUCION' | 'TAREA' | 'MISION';
  color: string;
  icon: string;
  completed?: boolean;
  visionId?: number;
}

type ViewMode = 'month' | 'week' | 'agenda';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [subscriptionToken, setSubscriptionToken] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    events: true,
    contributions: true,
    tasks: true,
    missions: true
  });
  
  // Categorías de sincronización
  const [syncCategories, setSyncCategories] = useState({
    events: true,
    contributions: true,
    tasks: false,
    missions: false
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    fetchEvents();
  }, [filters]);
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        params.set(key, value.toString());
      });
      
      const res = await fetch(`/api/calendar/events?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setEvents(data.events);
        setSubscriptionToken(data.subscriptionToken);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Navegación del calendario
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };
  
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Generar días del mes
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };
  
  // Obtener eventos de un día específico
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };
  
  // Obtener eventos de la semana actual
  const getWeekEvents = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= startOfWeek && eventDate < endOfWeek;
    });
  };
  
  // Generar URL de suscripción
  const generateSubscriptionUrl = () => {
    const categories = Object.entries(syncCategories)
      .filter(([_, enabled]) => enabled)
      .map(([cat]) => cat)
      .join(',');
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `webcal://${baseUrl.replace('https://', '').replace('http://', '')}/api/calendar/feed/${subscriptionToken}?categories=${categories}`;
  };
  
  const addToGoogleCalendar = () => {
    const url = generateSubscriptionUrl().replace('webcal://', 'https://');
    window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`, '_blank');
  };
  
  const addToAppleCalendar = () => {
    const url = generateSubscriptionUrl();
    window.location.href = url;
  };
  
  const copySubscriptionLink = () => {
    const url = generateSubscriptionUrl().replace('webcal://', 'https://');
    navigator.clipboard.writeText(url);
    alert('¡Enlace copiado al portapapeles!');
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };
  
  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff < 0) return 'Pasado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `En ${days} días`;
    if (hours > 0) return `En ${hours} horas`;
    return 'Muy pronto';
  };
  
  const openInMaps = (location: string) => {
    const encoded = encodeURIComponent(location);
    // Intentar Waze primero, luego Google Maps
    window.open(`https://waze.com/ul?q=${encoded}`, '_blank');
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Quantum Chronos</h1>
                <p className="text-xs text-gray-400">Tu agenda inteligente</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
            >
              <ShareIcon className="w-4 h-4" />
              Sincronizar
            </button>
          </div>
          
          {/* Filtros */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => toggleFilter('missions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filters.missions 
                  ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' 
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              🔴 Misiones
            </button>
            <button
              onClick={() => toggleFilter('contributions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filters.contributions 
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' 
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              🔵 Contribuciones
            </button>
            <button
              onClick={() => toggleFilter('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filters.tasks 
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' 
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              🟢 Tareas
            </button>
            <button
              onClick={() => toggleFilter('events')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filters.events 
                  ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50' 
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              🟣 Eventos
            </button>
          </div>
        </div>
      </div>
      
      {/* Navegación del calendario */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold ml-2">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          
          {/* Selector de vista */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {(['month', 'week', 'agenda'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewMode === mode 
                    ? 'bg-purple-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Agenda'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Vista de Mes */}
        {viewMode === 'month' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Encabezado días de la semana */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {dayNames.map((day) => (
                <div key={day} className="py-3 text-center text-xs font-medium text-gray-400">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Días del mes */}
            <div className="grid grid-cols-7">
              {getDaysInMonth().map((date, index) => {
                const isToday = date?.toDateString() === new Date().toDateString();
                const dayEvents = date ? getEventsForDay(date) : [];
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border-b border-r border-white/5 ${
                      !date ? 'bg-white/[0.02]' : 'hover:bg-white/5'
                    } ${isToday ? 'bg-purple-500/10' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-purple-400' : 'text-gray-300'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="w-full text-left px-1.5 py-0.5 text-[10px] rounded truncate transition-all hover:opacity-80"
                              style={{ backgroundColor: event.color + '30', color: event.color }}
                            >
                              {event.icon} {event.title.replace(event.icon, '').trim().slice(0, 15)}
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-400 pl-1">
                              +{dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Vista de Semana */}
        {viewMode === 'week' && (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const day = new Date(currentDate);
              day.setDate(currentDate.getDate() - currentDate.getDay() + i);
              const dayEvents = getEventsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={i}
                  className={`bg-white/5 rounded-xl p-4 border border-white/10 ${
                    isToday ? 'ring-2 ring-purple-500/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-2xl font-bold ${isToday ? 'text-purple-400' : 'text-white'}`}>
                      {day.getDate()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{dayNames[day.getDay()]}</div>
                      <div className="text-xs text-gray-400">
                        {monthNames[day.getMonth()]}
                      </div>
                    </div>
                  </div>
                  
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-gray-500">Sin eventos</div>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left p-3 rounded-lg transition-all hover:opacity-80"
                          style={{ backgroundColor: event.color + '20' }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{event.icon}</span>
                            <span className="font-medium text-sm" style={{ color: event.color }}>
                              {event.title.replace(event.icon, '').trim()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Vista de Agenda */}
        {viewMode === 'agenda' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay eventos programados</p>
              </div>
            ) : (
              events.slice(0, 20).map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: event.color + '20' }}
                    >
                      {event.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold" style={{ color: event.color }}>
                          {event.title.replace(event.icon, '').trim()}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                          {getTimeUntil(event.start)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(event.start)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Modal de detalle de evento */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="relative bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl border border-white/10 overflow-hidden">
            {/* Header con color */}
            <div 
              className="p-6 text-white"
              style={{ backgroundColor: selectedEvent.color }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedEvent.icon}</span>
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedEvent.title.replace(selectedEvent.icon, '').trim()}
                  </h2>
                  <p className="text-sm opacity-80">{selectedEvent.category}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-300">{selectedEvent.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{formatDate(selectedEvent.start)}</div>
                    <div className="text-gray-400">
                      {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                    </div>
                  </div>
                </div>
                
                {selectedEvent.location && (
                  <button
                    onClick={() => openInMaps(selectedEvent.location!)}
                    className="flex items-center gap-3 text-sm w-full p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <MapPinIcon className="w-5 h-5 text-blue-400" />
                    <div className="text-left flex-1">
                      <div className="font-medium text-blue-400">Abrir en Waze/Maps</div>
                      <div className="text-gray-400 text-xs">{selectedEvent.location}</div>
                    </div>
                  </button>
                )}
                
                {/* Countdown */}
                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    ⏰ {getTimeUntil(selectedEvent.start)}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Sincronización */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSyncModal(false)}
          />
          <div className="relative bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <ShareIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configura tu Enlace Cuántico</h2>
                  <p className="text-sm text-gray-400">
                    Sincroniza con tu calendario favorito
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                Elige qué eventos quieres ver en tu Google Calendar/Outlook. 
                Si el coordinador cambia una fecha, ¡se actualizará automáticamente!
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={syncCategories.events}
                    onChange={(e) => setSyncCategories(prev => ({ ...prev, events: e.target.checked }))}
                    className="w-5 h-5 rounded accent-purple-500"
                  />
                  <span className="text-xl">🟣</span>
                  <div>
                    <div className="font-medium">Eventos Oficiales</div>
                    <div className="text-xs text-gray-400">Entrenamientos y graduaciones</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={syncCategories.contributions}
                    onChange={(e) => setSyncCategories(prev => ({ ...prev, contributions: e.target.checked }))}
                    className="w-5 h-5 rounded accent-blue-500"
                  />
                  <span className="text-xl">🔵</span>
                  <div>
                    <div className="font-medium">Contribuciones</div>
                    <div className="text-xs text-gray-400">Cuando eres Staff</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={syncCategories.tasks}
                    onChange={(e) => setSyncCategories(prev => ({ ...prev, tasks: e.target.checked }))}
                    className="w-5 h-5 rounded accent-green-500"
                  />
                  <span className="text-xl">🟢</span>
                  <div>
                    <div className="font-medium">Tareas y Entregables</div>
                    <div className="text-xs text-gray-400">Opcional - puede saturar</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={syncCategories.missions}
                    onChange={(e) => setSyncCategories(prev => ({ ...prev, missions: e.target.checked }))}
                    className="w-5 h-5 rounded accent-red-500"
                  />
                  <span className="text-xl">🔴</span>
                  <div>
                    <div className="font-medium">Misiones</div>
                    <div className="text-xs text-gray-400">Retos especiales</div>
                  </div>
                </label>
              </div>
              
              <div className="pt-4 space-y-3">
                <button
                  onClick={addToGoogleCalendar}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Añadir a Google Calendar
                </button>
                
                <button
                  onClick={addToAppleCalendar}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/>
                  </svg>
                  Añadir a iPhone/Apple
                </button>
                
                <button
                  onClick={copySubscriptionLink}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                >
                  📋 Copiar enlace
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                El calendario se actualizará automáticamente cada 6-12 horas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
