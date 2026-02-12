'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Mic,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  Rocket,
  Award,
  Heart,
  LogOut,
  Flame,
  Zap,
  Music
} from 'lucide-react';
import Image from 'next/image';

type FlightPhase = 'IDLE' | 'ESTIRAMIENTO' | 'TRANSFORMACION' | 'VUELO' | 'RECONOCIMIENTO' | 'CAPSULA' | 'DESPEDIDA';

interface CapsuleAudio {
  url: string;
  duration: number;
  senderName: string;
  senderRelation: string;
}

interface Passenger {
  id: number;
  userId: number;
  flightOrder: number;
  flightSongUrl: string | null;
  flightSongName: string | null;
  flightStatus: string;
  capsuleAudios: CapsuleAudio[] | null;
  User: {
    id: number;
    nombre: string;
    imagen: string | null;
  };
}

interface FlightEvent {
  id: number;
  trackEstiramiento: string;
  trackTransformacion: string;
  trackReconocimiento: string;
  trackDespedida: string;
  trackVueloGenerico: string | null;
  crossfadeDuration: number;
  duckingVolume: number;
  Vision: { nombre: string };
  Passengers: Passenger[];
}

interface LiveSession {
  currentPassengerId: number | null;
  currentPhase: FlightPhase;
  capsuleCurrentIndex: number;
  capsulePaused: boolean;
  CurrentPassenger: Passenger | null;
}

const PHASES: { key: FlightPhase; label: string; emoji: string; color: string }[] = [
  { key: 'ESTIRAMIENTO', label: 'ESTIRAR', emoji: '🔥', color: 'from-orange-600 to-red-600' },
  { key: 'TRANSFORMACION', label: 'TRANSFORMAR', emoji: '⚡', color: 'from-yellow-600 to-orange-600' },
  { key: 'VUELO', label: 'VUELO', emoji: '🚀', color: 'from-cyan-600 to-blue-600' },
  { key: 'RECONOCIMIENTO', label: 'RECONOCER', emoji: '🏆', color: 'from-green-600 to-emerald-600' },
  { key: 'CAPSULA', label: 'CÁPSULA', emoji: '🎙️', color: 'from-purple-600 to-pink-600' },
  { key: 'DESPEDIDA', label: 'DESPEDIDA', emoji: '👋', color: 'from-indigo-600 to-purple-600' },
];

export default function FlightDeckCockpit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<FlightEvent | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState<FlightPhase>('IDLE');
  const [currentPassenger, setCurrentPassenger] = useState<Passenger | null>(null);
  const [nextPassenger, setNextPassenger] = useState<Passenger | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [capsuleIndex, setCapsuleIndex] = useState(0);
  const [capsulePaused, setCapsulePaused] = useState(false);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const capsuleAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedAudios = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Cargar evento y sesión
  useEffect(() => {
    async function init() {
      try {
        // Cargar evento
        const eventRes = await fetch(`/api/flight-deck/events/${id}`);
        const eventData = await eventRes.json();

        if (!eventRes.ok) {
          setError(eventData.error);
          return;
        }

        setEvent(eventData.event);

        // Iniciar o unirse a sesión
        const sessionRes = await fetch(`/api/flight-deck/events/${id}/live`, {
          method: 'POST'
        });
        const sessionData = await sessionRes.json();

        if (sessionRes.ok) {
          // Cargar estado actual
          const liveRes = await fetch(`/api/flight-deck/events/${id}/live`);
          const liveData = await liveRes.json();

          if (liveData.exists) {
            setSession(liveData.session);
            setCurrentPhase(liveData.session.currentPhase);
            setCurrentPassenger(liveData.session.CurrentPassenger);
            setNextPassenger(liveData.session.nextPassenger);
            setCapsuleIndex(liveData.session.capsuleCurrentIndex);
          } else {
            // Primera vez, establecer primer pasajero
            const firstPassenger = eventData.event.Passengers.find(
              (p: Passenger) => p.flightStatus === 'WAITING'
            );
            setCurrentPassenger(firstPassenger || null);
          }
        }

        // Pre-cargar audios
        preloadAudios(eventData.event);
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    if (id) init();
  }, [id]);

  // Pre-cargar audios de los próximos 3 participantes
  const preloadAudios = useCallback((eventData: FlightEvent) => {
    const passengers = eventData.Passengers.slice(0, 5);
    
    passengers.forEach((p: Passenger) => {
      // Canción de vuelo
      if (p.flightSongUrl && !preloadedAudios.current.has(p.flightSongUrl)) {
        const audio = new Audio(p.flightSongUrl);
        audio.preload = 'auto';
        preloadedAudios.current.set(p.flightSongUrl, audio);
      }

      // Audios de cápsula
      p.capsuleAudios?.forEach((c: CapsuleAudio) => {
        if (!preloadedAudios.current.has(c.url)) {
          const audio = new Audio(c.url);
          audio.preload = 'auto';
          preloadedAudios.current.set(c.url, audio);
        }
      });
    });

    // Pre-cargar tracks globales
    [
      eventData.trackEstiramiento,
      eventData.trackTransformacion,
      eventData.trackReconocimiento,
      eventData.trackDespedida,
      eventData.trackVueloGenerico
    ].filter(Boolean).forEach((url: string) => {
      if (!preloadedAudios.current.has(url)) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        preloadedAudios.current.set(url, audio);
      }
    });
  }, []);

  // Obtener URL del track según la fase
  const getTrackUrl = useCallback((phase: FlightPhase): string | null => {
    if (!event) return null;

    switch (phase) {
      case 'ESTIRAMIENTO':
        return event.trackEstiramiento;
      case 'TRANSFORMACION':
        return event.trackTransformacion;
      case 'VUELO':
        return currentPassenger?.flightSongUrl || event.trackVueloGenerico;
      case 'RECONOCIMIENTO':
      case 'CAPSULA':
        return event.trackReconocimiento;
      case 'DESPEDIDA':
        return event.trackDespedida;
      default:
        return null;
    }
  }, [event, currentPassenger]);

  // Cambiar fase
  const changePhase = async (newPhase: FlightPhase) => {
    if (!event) return;

    // Actualizar en servidor
    await fetch(`/api/flight-deck/events/${id}/live`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SET_PHASE', phase: newPhase })
    });

    setCurrentPhase(newPhase);

    // Cambiar música con crossfade
    const newTrackUrl = getTrackUrl(newPhase);
    if (newTrackUrl && bgMusicRef.current) {
      // Crossfade
      const oldAudio = bgMusicRef.current;
      const newAudio = preloadedAudios.current.get(newTrackUrl) || new Audio(newTrackUrl);
      
      newAudio.loop = true;
      newAudio.volume = 0;
      
      // Fade out old, fade in new
      const fadeSteps = event.crossfadeDuration * 10;
      const stepDuration = 100;
      let step = 0;

      const fadeInterval = setInterval(() => {
        step++;
        const progress = step / fadeSteps;
        
        if (oldAudio) oldAudio.volume = Math.max(0, (1 - progress) * (volume / 100));
        newAudio.volume = Math.min(1, progress * (volume / 100));

        if (step >= fadeSteps) {
          clearInterval(fadeInterval);
          oldAudio?.pause();
          bgMusicRef.current = newAudio;
        }
      }, stepDuration);

      newAudio.play();
      setIsPlaying(true);
    }

    // Si entramos a CAPSULA, iniciar reproducción de audios
    if (newPhase === 'CAPSULA') {
      setCapsuleIndex(0);
      playNextCapsuleAudio(0);
    }
  };

  // Reproducir audio de cápsula
  const playNextCapsuleAudio = useCallback((index: number) => {
    const audios = currentPassenger?.capsuleAudios || [];
    if (index >= audios.length) {
      // Terminamos todos los audios, subir volumen de fondo
      if (bgMusicRef.current) {
        bgMusicRef.current.volume = volume / 100;
      }
      return;
    }

    const capsuleAudio = audios[index];
    const audio = preloadedAudios.current.get(capsuleAudio.url) || new Audio(capsuleAudio.url);
    
    // Bajar volumen de fondo (ducking)
    if (bgMusicRef.current && event) {
      bgMusicRef.current.volume = (event.duckingVolume / 100) * (volume / 100);
    }

    audio.onended = () => {
      const nextIndex = index + 1;
      setCapsuleIndex(nextIndex);
      playNextCapsuleAudio(nextIndex);
    };

    capsuleAudioRef.current = audio;
    audio.play();
  }, [currentPassenger, volume, event]);

  // Pausar/reanudar cápsula
  const toggleCapsulePause = () => {
    if (capsuleAudioRef.current) {
      if (capsulePaused) {
        capsuleAudioRef.current.play();
      } else {
        capsuleAudioRef.current.pause();
      }
      setCapsulePaused(!capsulePaused);
    }
  };

  // Saltar audio de cápsula
  const skipCapsuleAudio = () => {
    if (capsuleAudioRef.current) {
      capsuleAudioRef.current.pause();
      const nextIndex = capsuleIndex + 1;
      setCapsuleIndex(nextIndex);
      playNextCapsuleAudio(nextIndex);
    }
  };

  // Siguiente pasajero
  const nextPassengerHandler = async () => {
    // Pausar todo
    bgMusicRef.current?.pause();
    capsuleAudioRef.current?.pause();
    setIsPlaying(false);

    // Actualizar en servidor
    const res = await fetch(`/api/flight-deck/events/${id}/live`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'NEXT_PASSENGER' })
    });

    const data = await res.json();

    if (data.completed) {
      // Evento terminado
      alert('🎉 ¡Todos los pasajeros han completado su vuelo!');
      return;
    }

    // Cargar siguiente pasajero
    const liveRes = await fetch(`/api/flight-deck/events/${id}/live`);
    const liveData = await liveRes.json();

    if (liveData.exists) {
      setSession(liveData.session);
      setCurrentPassenger(liveData.session.CurrentPassenger);
      setNextPassenger(liveData.session.nextPassenger);
      setCurrentPhase('IDLE');
      setCapsuleIndex(0);
    }
  };

  // Controles de volumen
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = newVolume / 100;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-cyan-300 text-xl">Iniciando Cabina de Pilotaje...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">{error || 'Error al cargar'}</p>
        </div>
      </div>
    );
  }

  const capsuleAudios = currentPassenger?.capsuleAudios || [];
  const currentPhaseIndex = PHASES.findIndex(p => p.key === currentPhase);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header minimalista */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6 text-cyan-400" />
          <span className="text-cyan-300 font-medium">{event.Vision.nombre}</span>
        </div>

        {/* Controles de volumen */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted(!muted)}
            className="p-2 bg-gray-800/50 rounded-lg"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </header>

      {/* Radar - Barra lateral izquierda */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900/90 border-r border-cyan-500/20 pt-20 pb-4 overflow-y-auto z-20">
        <h2 className="px-4 text-sm font-bold text-gray-400 uppercase mb-4">
          Lista de Vuelo
        </h2>
        <div className="space-y-1 px-2">
          {event.Passengers.map((passenger, idx) => (
            <div
              key={passenger.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                currentPassenger?.id === passenger.id
                  ? 'bg-cyan-600/30 border border-cyan-500/50'
                  : passenger.flightStatus === 'COMPLETED'
                  ? 'bg-green-600/10 opacity-50'
                  : passenger.flightStatus === 'SKIPPED'
                  ? 'bg-gray-800/50 opacity-30'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono rounded ${
                currentPassenger?.id === passenger.id
                  ? 'bg-cyan-500 text-black'
                  : passenger.flightStatus === 'COMPLETED'
                  ? 'bg-green-500/30 text-green-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {idx + 1}
              </span>
              
              {passenger.User.imagen ? (
                <Image
                  src={passenger.User.imagen}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}

              <span className={`text-sm truncate ${
                currentPassenger?.id === passenger.id ? 'text-white font-medium' : 'text-gray-300'
              }`}>
                {passenger.User.nombre.split(' ')[0]}
              </span>

              {passenger.flightStatus === 'COMPLETED' && (
                <span className="ml-auto text-green-400 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Centro de Mando - Player Principal */}
      <main className="ml-64 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Foto del participante actual */}
        <AnimatePresence mode="wait">
          {currentPassenger && (
            <motion.div
              key={currentPassenger.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center mb-8"
            >
              <div className="relative inline-block">
                {currentPassenger.User.imagen ? (
                  <Image
                    src={currentPassenger.User.imagen}
                    alt={currentPassenger.User.nombre}
                    width={200}
                    height={200}
                    className="rounded-full border-4 border-cyan-500 shadow-2xl shadow-cyan-500/30"
                  />
                ) : (
                  <div className="w-48 h-48 bg-cyan-600/30 rounded-full flex items-center justify-center border-4 border-cyan-500">
                    <User className="w-24 h-24 text-cyan-300" />
                  </div>
                )}

                {/* Indicador de fase */}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${
                  PHASES.find(p => p.key === currentPhase)?.color || 'from-gray-600 to-gray-700'
                }`}>
                  {currentPhase === 'IDLE' ? 'LISTO' : currentPhase}
                </div>
              </div>

              <h1 className="text-4xl font-black text-white mt-6">
                {currentPassenger.User.nombre}
              </h1>

              {currentPhase === 'VUELO' && (
                <p className="text-cyan-300 mt-2 flex items-center justify-center gap-2">
                  <Music className="w-4 h-4" />
                  {currentPassenger.flightSongName || 'Canción genérica'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botonera de Secuencia */}
        <div className="w-full max-w-4xl">
          {/* Fases principales */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {PHASES.map((phase, idx) => (
              <button
                key={phase.key}
                onClick={() => changePhase(phase.key)}
                disabled={currentPhase === 'IDLE' && idx > 0}
                className={`relative p-4 rounded-xl font-bold text-sm transition-all ${
                  currentPhase === phase.key
                    ? `bg-gradient-to-r ${phase.color} text-white scale-105 shadow-lg`
                    : currentPhaseIndex > idx
                    ? 'bg-gray-800/50 text-gray-500'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <span className="text-2xl block mb-1">{phase.emoji}</span>
                <span className="text-xs">{phase.label}</span>
                
                {currentPhase === phase.key && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
                )}
              </button>
            ))}
          </div>

          {/* Controles de Cápsula */}
          {currentPhase === 'CAPSULA' && capsuleAudios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-300 font-medium">
                    🎙️ Mensaje {capsuleIndex + 1} de {capsuleAudios.length}
                  </p>
                  {capsuleAudios[capsuleIndex] && (
                    <p className="text-gray-400 text-sm">
                      De: {capsuleAudios[capsuleIndex].senderName} 
                      ({capsuleAudios[capsuleIndex].senderRelation})
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (capsuleIndex > 0) {
                        capsuleAudioRef.current?.pause();
                        const prevIndex = capsuleIndex - 1;
                        setCapsuleIndex(prevIndex);
                        playNextCapsuleAudio(prevIndex);
                      }
                    }}
                    disabled={capsuleIndex === 0}
                    className="p-2 bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-30 rounded-lg"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={toggleCapsulePause}
                    className="p-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
                  >
                    {capsulePaused ? (
                      <Play className="w-6 h-6" />
                    ) : (
                      <Pause className="w-6 h-6" />
                    )}
                  </button>

                  <button
                    onClick={skipCapsuleAudio}
                    disabled={capsuleIndex >= capsuleAudios.length - 1}
                    className="p-2 bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-30 rounded-lg"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="flex gap-1">
                {capsuleAudios.map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-1 rounded-full ${
                      idx < capsuleIndex
                        ? 'bg-purple-500'
                        : idx === capsuleIndex
                        ? 'bg-purple-400 animate-pulse'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Botón de inicio o siguiente */}
          <div className="text-center">
            {currentPhase === 'IDLE' ? (
              <button
                onClick={() => changePhase('ESTIRAMIENTO')}
                className="px-12 py-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-2xl font-black rounded-2xl transition-all shadow-2xl shadow-cyan-500/30 hover:scale-105"
              >
                ▶ INICIAR PROCESO
              </button>
            ) : currentPhase === 'DESPEDIDA' ? (
              <button
                onClick={nextPassengerHandler}
                className="px-12 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xl font-black rounded-2xl transition-all shadow-2xl shadow-green-500/30 hover:scale-105 flex items-center gap-3 mx-auto"
              >
                FINALIZAR Y PASAR A {nextPassenger?.User.nombre.split(' ')[0].toUpperCase() || 'SIGUIENTE'}
                <ChevronRight className="w-6 h-6" />
              </button>
            ) : null}
          </div>
        </div>
      </main>

      {/* Visual feedback de fase */}
      <AnimatePresence>
        {currentPhase === 'ESTIRAMIENTO' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 to-red-900/20" />
            {/* Partículas de fuego */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-orange-500 rounded-full"
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100 
                }}
                animate={{ 
                  y: -100,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </motion.div>
        )}

        {currentPhase === 'VUELO' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 to-blue-900/30" />
            {/* Estrellas */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random()
                }}
              />
            ))}
          </motion.div>
        )}

        {currentPhase === 'CAPSULA' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-pink-900/40" />
            {/* Corazones flotantes */}
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100 
                }}
                animate={{ 
                  y: -100,
                  x: `+=${(Math.random() - 0.5) * 200}`,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3
                }}
              >
                <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
