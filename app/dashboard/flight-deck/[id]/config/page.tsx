'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Music,
  Upload,
  Play,
  Pause,
  Check,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Settings,
  Volume2,
  Sliders
} from 'lucide-react';
import Link from 'next/link';

interface TrackConfig {
  key: string;
  label: string;
  emoji: string;
  description: string;
  url: string | null;
  required: boolean;
}

export default function FlightDeckConfigPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingTrack, setUploadingTrack] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Configuración de tracks
  const [tracks, setTracks] = useState<TrackConfig[]>([
    {
      key: 'trackEstiramiento',
      label: 'Track 1: Estiramiento',
      emoji: '🔥',
      description: 'Alta energía para preparar al participante',
      url: null,
      required: true
    },
    {
      key: 'trackTransformacion',
      label: 'Track 2: Transformación',
      emoji: '⚡',
      description: 'Tensión y clímax emocional',
      url: null,
      required: true
    },
    {
      key: 'trackVueloGenerico',
      label: 'Track 3: Vuelo Genérico',
      emoji: '🎵',
      description: 'Canción de respaldo si el participante no tiene una asignada',
      url: null,
      required: false
    },
    {
      key: 'trackReconocimiento',
      label: 'Track 4: Reconocimiento',
      emoji: '🏆',
      description: 'Celebración y emotividad para el aterrizaje',
      url: null,
      required: true
    },
    {
      key: 'trackDespedida',
      label: 'Track 5: Despedida',
      emoji: '👋',
      description: 'Música para la salida del salón',
      url: null,
      required: true
    }
  ]);

  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [duckingVolume, setDuckingVolume] = useState(20);

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

        // Cargar valores actuales
        setTracks(prev => prev.map(t => ({
          ...t,
          url: data.event[t.key] || null
        })));

        setCrossfadeDuration(data.event.crossfadeDuration || 3);
        setDuckingVolume(data.event.duckingVolume || 20);
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchEvent();
  }, [id]);

  // Subir track
  const uploadTrack = async (trackKey: string, file: File) => {
    setUploadingTrack(trackKey);
    try {
      // Obtener URL pre-firmada
      const uploadRes = await fetch('/api/flight-deck/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          type: 'track',
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

      // Actualizar evento
      await fetch(`/api/flight-deck/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [trackKey]: fileUrl })
      });

      // Actualizar estado local
      setTracks(prev => prev.map(t =>
        t.key === trackKey ? { ...t, url: fileUrl } : t
      ));
    } catch (err) {
      console.error('Error uploading track:', err);
      alert('Error al subir el track');
    } finally {
      setUploadingTrack(null);
    }
  };

  // Guardar configuración de audio
  const saveAudioConfig = async () => {
    setSaving(true);
    try {
      await fetch(`/api/flight-deck/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crossfadeDuration,
          duckingVolume
        })
      });

      alert('Configuración guardada');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Reproducir/pausar preview
  const togglePlay = (trackKey: string, url: string) => {
    const audio = audioRefs.current[trackKey];

    if (playingTrack === trackKey) {
      audio?.pause();
      setPlayingTrack(null);
    } else {
      // Pausar cualquier otro que esté sonando
      Object.values(audioRefs.current).forEach(a => a?.pause());

      if (!audio) {
        const newAudio = new Audio(url);
        newAudio.volume = 0.5;
        audioRefs.current[trackKey] = newAudio;
        newAudio.play();
        newAudio.onended = () => setPlayingTrack(null);
      } else {
        audio.currentTime = 0;
        audio.play();
      }
      setPlayingTrack(trackKey);
    }
  };

  // Verificar si todos los requeridos están completos
  const allRequiredComplete = tracks
    .filter(t => t.required)
    .every(t => t.url && t.url.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
      {/* Header */}
      <header className="bg-black/50 border-b border-purple-500/20 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href={`/dashboard/flight-deck/${id}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a Torre de Control
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Settings className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Configuración de Atmósfera</h1>
              <p className="text-purple-300">Define los tracks globales para el vuelo</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        {/* Estado */}
        <div className={`rounded-xl p-4 border ${
          allRequiredComplete
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {allRequiredComplete ? (
              <>
                <Check className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-green-300 font-medium">✅ Configuración completa</p>
                  <p className="text-green-200/70 text-sm">Todos los tracks requeridos están listos</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-yellow-300 font-medium">⚠️ Configuración incompleta</p>
                  <p className="text-yellow-200/70 text-sm">Sube los tracks marcados con *</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lista de tracks */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            Tracks Globales
          </h2>

          {tracks.map((track) => (
            <div
              key={track.key}
              className={`bg-gray-900/50 border rounded-xl p-4 ${
                track.url
                  ? 'border-green-500/30'
                  : track.required
                  ? 'border-red-500/30'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{track.emoji}</span>
                    <h3 className="text-white font-medium">
                      {track.label}
                      {track.required && <span className="text-red-400 ml-1">*</span>}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm">{track.description}</p>

                  {track.url && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => togglePlay(track.key, track.url!)}
                        className={`p-2 rounded-lg transition-colors ${
                          playingTrack === track.key
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {playingTrack === track.key ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Track cargado
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  {uploadingTrack === track.key ? (
                    <div className="flex items-center gap-2 text-purple-400 px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Subiendo...</span>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-purple-300" />
                      <span className="text-purple-300 text-sm">
                        {track.url ? 'Cambiar' : 'Subir MP3'}
                      </span>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/mp4,audio/m4a"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadTrack(track.key, file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuración de audio */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            Configuración de Audio
          </h2>

          {/* Crossfade */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Crossfade entre tracks</span>
              <span className="text-purple-400 font-mono">{crossfadeDuration}s</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-gray-500 text-sm mt-1">
              Transición suave entre cambios de track (0 = corte directo)
            </p>
          </div>

          {/* Ducking */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Volumen durante cápsulas (Ducking)</span>
              <span className="text-purple-400 font-mono">{duckingVolume}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={duckingVolume}
              onChange={(e) => setDuckingVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-gray-500 text-sm mt-1">
              La música de fondo bajará a este % cuando suenen los audios de la cápsula
            </p>
          </div>

          <button
            onClick={saveAudioConfig}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Guardar Configuración
              </>
            )}
          </button>
        </div>

        {/* Botón ir a cabina */}
        {allRequiredComplete && (
          <div className="text-center">
            <Link
              href={`/dashboard/flight-deck/${id}/cockpit`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-green-500/20"
            >
              🚀 Ir a la Cabina de Pilotaje
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
