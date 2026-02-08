'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Star,
  Zap,
  Crown,
  Users,
  TrendingUp,
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';

interface Participant {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  enrolledCount: number;
  declaredCount: number;
  totalCount: number;
  rank: number;
  tier: 'QUANTUM' | 'RUNNER' | 'WALKER';
}

interface HallOfFameData {
  product: {
    id: number;
    name: string;
    levelType: string;
    vision: { id: number; nombre: string };
    organization: { id: number; name: string };
  };
  participants: Participant[];
  stats: {
    totalParticipants: number;
    totalEnrolled: number;
    totalDeclared: number;
    participantsWithEnrollments: number;
    topPerformer: Participant | null;
  };
  nextLevel: string | null;
}

export default function QuantumHallOfFamePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [spotlightParticipant, setSpotlightParticipant] = useState<Participant | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/trainer/hall-of-fame/${params.productId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al cargar');
      }
      const newData = await res.json();
      setData(newData);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.productId]);

  useEffect(() => {
    fetchData();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSpotlight = (participant: Participant) => {
    setSpotlightParticipant(participant);
    if (soundEnabled) {
      // Play spotlight sound
      const audio = new Audio('/sounds/spotlight.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="relative">
          {/* Nebula background animation */}
          <div className="absolute inset-0 w-96 h-96 bg-gradient-to-br from-purple-900/50 via-indigo-900/50 to-blue-900/50 rounded-full blur-3xl animate-pulse" />
          <div className="relative text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-20 h-20 text-purple-500 mx-auto" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-2xl text-purple-300 font-light tracking-widest"
            >
              CARGANDO RESULTADOS
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error Cuántico</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const quantumParticipants = data.participants.filter(p => p.tier === 'QUANTUM');
  const runnerParticipants = data.participants.filter(p => p.tier === 'RUNNER');
  const walkerParticipants = data.participants.filter(p => p.tier === 'WALKER');

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Nebula Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-900/10 rounded-full blur-[80px]"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Floating Particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Header Controls */}
      <div className="relative z-20 p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-xl rounded-xl text-gray-400 hover:text-white transition-colors border border-slate-700/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-900/80 backdrop-blur-xl rounded-xl text-gray-400 hover:text-white transition-colors border border-slate-700/50"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-slate-900/80 backdrop-blur-xl rounded-xl text-gray-400 hover:text-white transition-colors border border-slate-700/50"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900/80 backdrop-blur-xl rounded-xl text-gray-400 hover:text-white transition-colors border border-slate-700/50"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pb-8">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-block mb-4"
            animate={{ 
              boxShadow: ['0 0 20px rgba(168, 85, 247, 0.3)', '0 0 60px rgba(168, 85, 247, 0.5)', '0 0 20px rgba(168, 85, 247, 0.3)']
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="px-4 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
              {data.product.organization.name}
            </span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 mb-2">
            QUANTUM HALL
          </h1>
          <p className="text-xl text-gray-400 font-light tracking-widest mb-2">
            {data.product.name}
          </p>
          <p className="text-sm text-gray-500">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Participantes"
              value={data.stats.totalParticipants}
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Enrolados"
              value={data.stats.totalEnrolled}
              color="green"
            />
            <StatCard
              icon={Star}
              label="Declarados"
              value={data.stats.totalDeclared}
              color="amber"
            />
            <StatCard
              icon={Crown}
              label="Con Resultados"
              value={data.stats.participantsWithEnrollments}
              color="cyan"
            />
          </div>
        </motion.div>

        {/* Quantum Level (Top Performers) */}
        {quantumParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Crown className="w-8 h-8 text-amber-400" />
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                NIVEL CUÁNTICO
              </h2>
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              <LayoutGroup>
                {quantumParticipants.map((participant, index) => (
                  <HeroCard
                    key={participant.id}
                    participant={participant}
                    tier="QUANTUM"
                    delay={0.5 + index * 0.1}
                    onClick={() => handleSpotlight(participant)}
                  />
                ))}
              </LayoutGroup>
            </div>
          </motion.div>
        )}

        {/* Runner Level */}
        {runnerParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                CORREDORES
              </h2>
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <LayoutGroup>
                {runnerParticipants.map((participant, index) => (
                  <HeroCard
                    key={participant.id}
                    participant={participant}
                    tier="RUNNER"
                    delay={0.7 + index * 0.05}
                    onClick={() => handleSpotlight(participant)}
                  />
                ))}
              </LayoutGroup>
            </div>
          </motion.div>
        )}

        {/* Walker Level */}
        {walkerParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Star className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-500">
                CAMINANTES
              </h2>
              <Star className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
              <LayoutGroup>
                {walkerParticipants.map((participant, index) => (
                  <HeroCard
                    key={participant.id}
                    participant={participant}
                    tier="WALKER"
                    delay={0.9 + index * 0.02}
                    onClick={() => handleSpotlight(participant)}
                    compact
                  />
                ))}
              </LayoutGroup>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data.participants.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-500">No hay participantes aún</p>
          </motion.div>
        )}
      </div>

      {/* Spotlight Modal */}
      <AnimatePresence>
        {spotlightParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setSpotlightParticipant(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-3xl blur-3xl opacity-30 animate-pulse" />
              
              <div className="relative bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-12 border border-purple-500/30 max-w-lg text-center">
                {/* Avatar */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                  {spotlightParticipant.imagen ? (
                    <img
                      src={spotlightParticipant.imagen}
                      alt={spotlightParticipant.nombre}
                      className="w-full h-full rounded-2xl object-cover ring-4 ring-purple-500/50"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-6xl font-bold ring-4 ring-purple-500/50">
                      {spotlightParticipant.nombre.charAt(0)}
                    </div>
                  )}
                  
                  {/* Rank badge */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-2xl font-black text-black shadow-lg shadow-amber-500/30">
                    #{spotlightParticipant.rank}
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-4xl font-bold text-white mb-4">
                  {spotlightParticipant.nombre}
                </h2>

                {/* Score */}
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                      {spotlightParticipant.enrolledCount}
                    </p>
                    <p className="text-sm text-gray-400">Enrolados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                      {spotlightParticipant.declaredCount}
                    </p>
                    <p className="text-sm text-gray-400">Declarados</p>
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30">
                  <p className="text-sm text-purple-300 mb-1">Total</p>
                  <p className="text-5xl font-black text-white">
                    {spotlightParticipant.totalCount}
                  </p>
                </div>

                <button
                  onClick={() => setSpotlightParticipant(null)}
                  className="mt-8 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-900/20 border-purple-500/30 text-purple-400',
    green: 'from-green-500/20 to-green-900/20 border-green-500/30 text-green-400',
    amber: 'from-amber-500/20 to-amber-900/20 border-amber-500/30 text-amber-400',
    cyan: 'from-cyan-500/20 to-cyan-900/20 border-cyan-500/30 text-cyan-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`bg-gradient-to-br ${colors[color]} backdrop-blur-xl rounded-2xl p-4 border text-center`}
    >
      <Icon className="w-6 h-6 mx-auto mb-2" />
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </motion.div>
  );
}

// Hero Card Component
function HeroCard({ 
  participant, 
  tier, 
  delay, 
  onClick,
  compact = false 
}: { 
  participant: Participant; 
  tier: 'QUANTUM' | 'RUNNER' | 'WALKER'; 
  delay: number;
  onClick: () => void;
  compact?: boolean;
}) {
  const tierStyles = {
    QUANTUM: {
      size: compact ? 'w-32' : 'w-48',
      imageSize: compact ? 'h-24' : 'h-36',
      border: 'border-amber-400/50',
      glow: 'shadow-amber-500/30',
      gradient: 'from-amber-500/20 to-orange-900/20',
      ring: 'ring-amber-400/30',
      particles: true,
    },
    RUNNER: {
      size: compact ? 'w-28' : 'w-40',
      imageSize: compact ? 'h-20' : 'h-28',
      border: 'border-cyan-400/50',
      glow: 'shadow-cyan-500/20',
      gradient: 'from-cyan-500/20 to-blue-900/20',
      ring: 'ring-cyan-400/20',
      particles: false,
    },
    WALKER: {
      size: 'w-24',
      imageSize: 'h-16',
      border: 'border-gray-600/50',
      glow: '',
      gradient: 'from-gray-800/50 to-gray-900/50',
      ring: 'ring-gray-600/20',
      particles: false,
    },
  };

  const style = tierStyles[tier];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', bounce: 0.4 }}
      whileHover={{ scale: 1.1, zIndex: 10 }}
      onClick={onClick}
      className={`relative ${style.size} cursor-pointer group`}
    >
      {/* Glow effect for Quantum */}
      {tier === 'QUANTUM' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-xl opacity-30"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Card */}
      <div className={`relative bg-gradient-to-br ${style.gradient} backdrop-blur-xl rounded-2xl border ${style.border} shadow-lg ${style.glow} overflow-hidden`}>
        {/* Golden particles for Quantum */}
        {style.particles && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-amber-400 rounded-full"
                style={{ left: `${20 + i * 15}%` }}
                animate={{
                  y: [0, -100],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        )}

        {/* Image */}
        <div className={`relative ${style.imageSize} overflow-hidden`}>
          {participant.imagen ? (
            <img
              src={participant.imagen}
              alt={participant.nombre}
              className="w-full h-full object-cover"
              style={{ filter: tier === 'WALKER' ? 'grayscale(50%)' : 'none' }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {participant.nombre.charAt(0)}
            </div>
          )}
          
          {/* Progress ring overlay */}
          {tier !== 'QUANTUM' && participant.totalCount > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-16 h-16" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={tier === 'RUNNER' ? '#22d3ee' : '#9ca3af'}
                  strokeWidth="2"
                  strokeDasharray={`${(participant.totalCount / 4) * 100}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 text-center">
          {/* Score */}
          <motion.p
            className={`text-3xl font-black ${
              tier === 'QUANTUM' ? 'text-amber-400' : 
              tier === 'RUNNER' ? 'text-cyan-400' : 'text-gray-400'
            }`}
            animate={tier === 'QUANTUM' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {participant.totalCount}
          </motion.p>
          
          {/* Name */}
          <p className={`text-white font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {participant.nombre.split(' ')[0]}
          </p>
          
          {/* Breakdown */}
          {!compact && (
            <p className="text-xs text-gray-500 mt-1">
              {participant.enrolledCount}E / {participant.declaredCount}D
            </p>
          )}
        </div>
      </div>

      {/* Rank badge for top 3 */}
      {participant.rank <= 3 && tier === 'QUANTUM' && (
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
          style={{
            background: participant.rank === 1 ? 'linear-gradient(135deg, #ffd700, #ffaa00)' :
                       participant.rank === 2 ? 'linear-gradient(135deg, #c0c0c0, #a0a0a0)' :
                       'linear-gradient(135deg, #cd7f32, #b5651d)',
          }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {participant.rank}
        </motion.div>
      )}
    </motion.div>
  );
}
