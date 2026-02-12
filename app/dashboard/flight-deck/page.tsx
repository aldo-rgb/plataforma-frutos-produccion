'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plane,
  Plus,
  Settings,
  Play,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  Music,
  ChevronRight,
  Pause
} from 'lucide-react';

interface FlightEvent {
  id: number;
  visionId: number;
  eventStatus: string;
  trackEstiramiento: string | null;
  trackTransformacion: string | null;
  trackReconocimiento: string | null;
  trackDespedida: string | null;
  trackVueloGenerico: string | null;
  createdAt: string;
  updatedAt: string;
  Vision: {
    id: number;
    nombre: string;
    organizationId: number | null;
  };
  Creator?: {
    id: number;
    nombre: string;
  };
  _count: {
    Passengers: number;
  };
  completedCount?: number;
}

interface VisionOption {
  id: number;
  nombre: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  SETUP: {
    label: 'Configuración',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: <Settings className="w-4 h-4" />
  },
  READY: {
    label: 'Listo',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    icon: <CheckCircle className="w-4 h-4" />
  },
  IN_PROGRESS: {
    label: 'En Vuelo',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <Play className="w-4 h-4" />
  },
  PAUSED: {
    label: 'Pausado',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    icon: <Pause className="w-4 h-4" />
  },
  COMPLETED: {
    label: 'Completado',
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    icon: <CheckCircle className="w-4 h-4" />
  }
};

export default function FlightDeckPage() {
  const [events, setEvents] = useState<FlightEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visiones, setVisiones] = useState<VisionOption[]>([]);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/flight-deck/events');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Error al cargar eventos');
          return;
        }

        setEvents(data.events || []);
        // Guardar el rol del usuario si viene en la respuesta
        if (data.userRole) {
          setUserRole(data.userRole);
        }
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  // Cargar visiones disponibles para crear eventos (solo COORDINADOR)
  const loadVisiones = async () => {
    try {
      const res = await fetch('/api/coordinador/visiones');
      const data = await res.json();
      if (res.ok && data.visiones) {
        // Filtrar visiones que ya tienen evento
        const visionesConEvento = events.map(e => e.visionId);
        const visionesDisponibles = data.visiones.filter(
          (v: VisionOption) => !visionesConEvento.includes(v.id)
        );
        setVisiones(visionesDisponibles);
      }
    } catch (err) {
      console.error('Error loading visiones:', err);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedVision) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/flight-deck/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionId: selectedVision })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Recargar eventos
        window.location.reload();
      } else {
        setError(data.error || 'Error al crear evento');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const hasRequiredTracks = (event: FlightEvent) => {
    return (
      event.trackEstiramiento &&
      event.trackTransformacion &&
      event.trackReconocimiento &&
      event.trackDespedida
    );
  };

  const canCreateEvents = userRole === 'COORDINADOR' || userRole === 'SCHOOL_ADMIN' || userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-cyan-300">Cargando Flight Deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-600/20 rounded-2xl">
                <Plane className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Quantum Flight Deck</h1>
                <p className="text-gray-400">Control de audio para ceremonias de vuelo</p>
              </div>
            </div>
            
            {/* Botón crear evento - Solo COORDINADOR/SCHOOL_ADMIN/ADMIN */}
            {canCreateEvents && (
              <button
                onClick={() => {
                  loadVisiones();
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Evento
              </button>
            )}
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Grid de eventos */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <Plane className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-400 mb-2">
              No hay eventos de vuelo
            </h2>
            <p className="text-gray-500 mb-6">
              Los eventos se crean automáticamente cuando tienes visiones de liderato asignadas
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const statusConfig = STATUS_CONFIG[event.eventStatus] || STATUS_CONFIG.SETUP;
              const tracksReady = hasRequiredTracks(event);

              return (
                <div
                  key={event.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group"
                >
                  {/* Header con estado */}
                  <div className={`p-4 ${statusConfig.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-2 text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        ID: {event.id}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {event.Vision.nombre}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Creado: {new Date(event.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event._count.Passengers} pasajeros
                      </div>

                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        {tracksReady ? (
                          <span className="text-green-400">Tracks configurados</span>
                        ) : (
                          <span className="text-yellow-400">Tracks pendientes</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/flight-deck/${event.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Torre
                      </Link>

                      <Link
                        href={`/dashboard/flight-deck/${event.id}/config`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Music className="w-4 h-4" />
                        Config
                      </Link>

                      {tracksReady && (
                        <Link
                          href={`/dashboard/flight-deck/${event.id}/cockpit`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Volar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-12 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Guía de estados</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className={`flex items-center gap-2 ${config.color}`}>
                {config.icon}
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Crear Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header Modal */}
            <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl">
                  <Plane className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Crear Evento de Vuelo</h2>
                  <p className="text-sm text-gray-400">Selecciona una visión para la ceremonia</p>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {visiones.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No hay visiones disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">Todas las visiones ya tienen eventos creados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">
                    Visión para el evento:
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {visiones.map((vision) => (
                      <button
                        key={vision.id}
                        onClick={() => setSelectedVision(vision.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          selectedVision === vision.id
                            ? 'border-cyan-500 bg-cyan-500/10 text-white'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <span className="font-medium">{vision.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedVision(null);
                }}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!selectedVision || creating}
                className="flex-1 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Evento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
