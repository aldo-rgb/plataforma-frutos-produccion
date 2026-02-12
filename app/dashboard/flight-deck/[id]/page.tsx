'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, Reorder } from 'framer-motion';
import {
  Plane,
  Music,
  Upload,
  GripVertical,
  Play,
  Check,
  AlertCircle,
  Loader2,
  ChevronLeft,
  User,
  Mic,
  Trash2,
  Volume2,
  Settings,
  Rocket
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Passenger {
  id: number;
  userId: number;
  flightOrder: number;
  flightSongUrl: string | null;
  flightSongName: string | null;
  flightStatus: string;
  capsuleAudios: Array<{
    url: string;
    duration: number;
    senderName: string;
    senderRelation: string;
  }> | null;
  User: {
    id: number;
    nombre: string;
    imagen: string | null;
  };
}

interface FlightEvent {
  id: number;
  visionId: number;
  trackEstiramiento: string | null;
  trackTransformacion: string | null;
  trackReconocimiento: string | null;
  trackDespedida: string | null;
  trackVueloGenerico: string | null;
  crossfadeDuration: number;
  duckingVolume: number;
  isConfigured: boolean;
  eventStatus: string;
  Vision: {
    id: number;
    nombre: string;
    Organization?: {
      name: string;
      logoUrl: string | null;
    };
  };
  Passengers: Passenger[];
}

export default function FlightDeckControlTower() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<FlightEvent | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  // Cargar evento
  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/flight-deck/events/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Error al cargar evento');
          return;
        }

        setEvent(data.event);
        setPassengers(data.event.Passengers || []);
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchEvent();
  }, [id]);

  // Guardar nuevo orden
  const saveOrder = useCallback(async (newOrder: Passenger[]) => {
    setSaving(true);
    try {
      await fetch(`/api/flight-deck/events/${id}/passengers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REORDER',
          newOrder: newOrder.map(p => p.id)
        })
      });
    } catch (err) {
      console.error('Error saving order:', err);
    } finally {
      setSaving(false);
    }
  }, [id]);

  // Subir canción de vuelo
  const uploadFlightSong = async (passengerId: number, file: File) => {
    setUploadingFor(passengerId);
    try {
      // Obtener URL pre-firmada
      const uploadRes = await fetch('/api/flight-deck/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          type: 'song',
          passengerId,
          fileName: file.name,
          contentType: file.type
        })
      });

      const { uploadUrl, fileUrl } = await uploadRes.json();

      // Subir archivo
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      // Actualizar pasajero
      await fetch(`/api/flight-deck/events/${id}/passengers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerId,
          flightSongUrl: fileUrl,
          flightSongName: file.name.replace(/\.[^/.]+$/, '') // Sin extensión
        })
      });

      // Actualizar estado local
      setPassengers(prev => prev.map(p =>
        p.id === passengerId
          ? { ...p, flightSongUrl: fileUrl, flightSongName: file.name.replace(/\.[^/.]+$/, '') }
          : p
      ));
    } catch (err) {
      console.error('Error uploading song:', err);
      alert('Error al subir la canción');
    } finally {
      setUploadingFor(null);
    }
  };

  // Eliminar canción
  const removeSong = async (passengerId: number) => {
    try {
      await fetch(`/api/flight-deck/events/${id}/passengers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerId,
          flightSongUrl: null,
          flightSongName: null
        })
      });

      setPassengers(prev => prev.map(p =>
        p.id === passengerId
          ? { ...p, flightSongUrl: null, flightSongName: null }
          : p
      ));
    } catch (err) {
      console.error('Error removing song:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">{error || 'Evento no encontrado'}</p>
          <Link href="/dashboard/flight-deck" className="mt-4 inline-block text-cyan-400 hover:underline">
            ← Volver
          </Link>
        </div>
      </div>
    );
  }

  const capsuleCount = (p: Passenger) => {
    const audios = p.capsuleAudios || [];
    const totalDuration = audios.reduce((acc, a) => acc + (a.duration || 0), 0);
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;
    return { count: audios.length, duration: `${mins}:${secs.toString().padStart(2, '0')}` };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      {/* Header */}
      <header className="bg-black/50 border-b border-cyan-500/20 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/dashboard/flight-deck"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a Flight Deck
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Plane className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Torre de Control</h1>
                <p className="text-cyan-300">{event.Vision.nombre}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/flight-deck/${id}/config`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurar Tracks
              </Link>

              {event.isConfigured && (
                <Link
                  href={`/dashboard/flight-deck/${id}/cockpit`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-white font-medium transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  Ir a Cabina
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Estado del evento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Pasajeros</p>
            <p className="text-2xl font-bold text-white">{passengers.length}</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Con Canción Asignada</p>
            <p className="text-2xl font-bold text-green-400">
              {passengers.filter(p => p.flightSongUrl).length}
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Tracks Configurados</p>
            <p className={`text-2xl font-bold ${event.isConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
              {event.isConfigured ? '✅ Listo' : '⚠️ Pendiente'}
            </p>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-cyan-300 font-medium mb-2">📋 Logística de Vuelo</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Arrastra</strong> los nombres para definir el orden de vuelo</li>
            <li>• <strong>Sube</strong> la canción de vuelo (MP3) para cada participante</li>
            <li>• Los audios de cápsula se cargan automáticamente del Time Capsule</li>
          </ul>
        </div>

        {/* Lista de pasajeros con drag & drop */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 grid grid-cols-12 gap-4 text-sm font-medium text-gray-400">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Pasajero</div>
            <div className="col-span-4">Canción de Vuelo</div>
            <div className="col-span-3">Audios Cápsula</div>
          </div>

          <Reorder.Group
            axis="y"
            values={passengers}
            onReorder={(newOrder) => {
              setPassengers(newOrder);
              saveOrder(newOrder);
            }}
            className="divide-y divide-gray-800"
          >
            {passengers.map((passenger, index) => (
              <Reorder.Item
                key={passenger.id}
                value={passenger}
                className="grid grid-cols-12 gap-4 items-center px-4 py-4 bg-gray-900/20 hover:bg-gray-900/40 cursor-grab active:cursor-grabbing"
              >
                {/* Orden */}
                <div className="col-span-1 flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-500 font-mono">{index + 1}</span>
                </div>

                {/* Pasajero */}
                <div className="col-span-4 flex items-center gap-3">
                  {passenger.User.imagen ? (
                    <Image
                      src={passenger.User.imagen}
                      alt={passenger.User.nombre}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-cyan-600/30 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-cyan-300" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{passenger.User.nombre}</p>
                    <p className={`text-xs ${
                      passenger.flightStatus === 'COMPLETED' ? 'text-green-400' :
                      passenger.flightStatus === 'IN_PROGRESS' ? 'text-yellow-400' :
                      'text-gray-500'
                    }`}>
                      {passenger.flightStatus === 'COMPLETED' ? '✅ Completado' :
                       passenger.flightStatus === 'IN_PROGRESS' ? '🚀 En vuelo' :
                       '⏳ En espera'}
                    </p>
                  </div>
                </div>

                {/* Canción de vuelo */}
                <div className="col-span-4">
                  {uploadingFor === passenger.id ? (
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Subiendo...</span>
                    </div>
                  ) : passenger.flightSongUrl ? (
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 text-sm truncate max-w-[150px]">
                        {passenger.flightSongName || 'Canción asignada'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSong(passenger.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">Subir MP3</span>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/mp4,audio/m4a"
                        className="hidden"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadFlightSong(passenger.id, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Audios de cápsula */}
                <div className="col-span-3">
                  {(() => {
                    const { count, duration } = capsuleCount(passenger);
                    if (count === 0) {
                      return <span className="text-gray-500 text-sm">Sin audios</span>;
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 text-sm">
                          {count} audio{count > 1 ? 's' : ''} ({duration})
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {saving && (
          <div className="fixed bottom-4 right-4 bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Guardando orden...
          </div>
        )}
      </main>
    </div>
  );
}
