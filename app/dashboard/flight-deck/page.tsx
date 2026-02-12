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
  };
  _count: {
    Passengers: number;
  };
  completedCount?: number;
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

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/flight-deck/events');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Error al cargar eventos');
          return;
        }

        setEvents(data.events);
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const hasRequiredTracks = (event: FlightEvent) => {
    return (
      event.trackEstiramiento &&
      event.trackTransformacion &&
      event.trackReconocimiento &&
      event.trackDespedida
    );
  };

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
                        {new Date(event.Vision.fechaInicio).toLocaleDateString('es-MX', {
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
    </div>
  );
}
