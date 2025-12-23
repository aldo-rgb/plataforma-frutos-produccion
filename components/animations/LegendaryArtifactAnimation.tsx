'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Crown, Star, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LegendaryArtifactAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  artifactData: {
    imageUrl: string;
    descripcion: string;
    rareza: string;
    xpGanado: number;
    pcGanado: number;
    nivelNuevo?: number;
    subioDeNivel?: boolean;
  };
}

export default function LegendaryArtifactAnimation({
  isOpen,
  onClose,
  artifactData
}: LegendaryArtifactAnimationProps) {
  const [phase, setPhase] = useState<'entrance' | 'reveal' | 'stats'>('entrance');

  useEffect(() => {
    if (!isOpen) return;

    // Fase 1: Entrance (2s)
    setPhase('entrance');
    
    // Confetti inicial
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#9333EA', '#EC4899']
      });
    }, 500);

    // Fase 2: Reveal (3s)
    setTimeout(() => {
      setPhase('reveal');
      
      // Confetti masivo
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#9333EA']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#9333EA']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }, 2000);

    // Fase 3: Stats (5s+)
    setTimeout(() => {
      setPhase('stats');
    }, 5000);

    // Auto-close después de 10s
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLegendary = artifactData.rareza === 'LEGENDARY';
  const isEpic = artifactData.rareza === 'EPIC';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Partículas de fondo */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-500 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  opacity: 0
                }}
                animate={{
                  y: window.innerHeight + 20,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          {/* Contenido principal */}
          <div className="relative z-10 max-w-2xl w-full px-4" onClick={(e) => e.stopPropagation()}>
            
            {/* FASE 1: ENTRANCE */}
            {phase === 'entrance' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 1.5, type: 'spring' }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                  className="inline-block"
                >
                  {isLegendary ? (
                    <Crown className="w-32 h-32 text-yellow-500 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
                  ) : (
                    <Star className="w-32 h-32 text-purple-500 drop-shadow-[0_0_30px_rgba(147,51,234,0.8)]" />
                  )}
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`text-5xl font-black mt-8 ${
                    isLegendary 
                      ? 'text-yellow-500 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]' 
                      : 'text-purple-500 drop-shadow-[0_0_20px_rgba(147,51,234,0.8)]'
                  }`}
                >
                  {isLegendary ? '✨ ARTEFACTO LEGENDARIO ✨' : '🌟 ARTEFACTO ÉPICO 🌟'}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-xl text-gray-300 mt-4 font-light tracking-wide"
                >
                  ¡Un momento de GRANDEZA capturado para la eternidad!
                </motion.p>
              </motion.div>
            )}

            {/* FASE 2: REVEAL */}
            {phase === 'reveal' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                {/* Imagen del artefacto */}
                <motion.div
                  className="relative mx-auto mb-8"
                  style={{ maxWidth: '500px' }}
                >
                  {/* Marco dorado animado */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 30px rgba(255,215,0,0.6)',
                        '0 0 60px rgba(255,215,0,1)',
                        '0 0 30px rgba(255,215,0,0.6)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`relative rounded-2xl overflow-hidden border-4 ${
                      isLegendary ? 'border-yellow-500' : 'border-purple-500'
                    }`}
                  >
                    <img
                      src={artifactData.imageUrl}
                      alt="Artefacto Legendario"
                      className="w-full h-auto"
                    />

                    {/* Overlay de brillo */}
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        background: isLegendary
                          ? ['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.3)', 'rgba(255,215,0,0.1)']
                          : ['rgba(147,51,234,0.1)', 'rgba(147,51,234,0.3)', 'rgba(147,51,234,0.1)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 pointer-events-none"
                    />

                    {/* Badge de rareza */}
                    <div className={`absolute top-4 right-4 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${
                      isLegendary
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}>
                      {isLegendary ? <Crown className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      {artifactData.rareza}
                    </div>
                  </motion.div>

                  {/* Rayos de luz */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute top-1/2 left-1/2 w-1 h-32 ${
                        isLegendary ? 'bg-gradient-to-t from-yellow-500/0 to-yellow-500' : 'bg-gradient-to-t from-purple-500/0 to-purple-500'
                      }`}
                      style={{
                        transformOrigin: 'bottom center',
                        transform: `rotate(${i * 45}deg)`
                      }}
                      animate={{
                        opacity: [0, 0.8, 0],
                        height: ['100px', '200px', '100px']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl text-white font-semibold mb-2"
                >
                  "{artifactData.descripcion}"
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-gray-400 italic"
                >
                  Este momento quedará inmortalizado en The Quantum Archive
                </motion.p>
              </motion.div>
            )}

            {/* FASE 3: STATS */}
            {phase === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h2 className="text-4xl font-bold text-white mb-8">
                  ¡Recompensas Extraordinarias!
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* XP Card */}
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-2xl"
                  >
                    <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <div className="text-5xl font-black text-white mb-2">
                      +{artifactData.xpGanado}
                    </div>
                    <div className="text-blue-200 font-semibold">Experiencia</div>
                  </motion.div>

                  {/* PC Card */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 shadow-2xl"
                  >
                    <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <div className="text-5xl font-black text-white mb-2">
                      +{artifactData.pcGanado}
                    </div>
                    <div className="text-purple-200 font-semibold">Puntos Cuánticos</div>
                  </motion.div>
                </div>

                {/* Level Up Badge */}
                {artifactData.subioDeNivel && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 rounded-2xl p-6 mb-6"
                  >
                    <Crown className="w-16 h-16 text-white mx-auto mb-3" />
                    <div className="text-3xl font-black text-white">
                      ¡SUBISTE AL NIVEL {artifactData.nivelNuevo}!
                    </div>
                    <div className="text-white/80 mt-2">
                      Tu rango en The Quantum Archive ha ascendido
                    </div>
                  </motion.div>
                )}

                {/* Botón de cierre */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  onClick={onClose}
                  className="px-8 py-4 bg-white text-black font-bold rounded-full text-lg hover:bg-gray-200 transition-colors shadow-2xl"
                >
                  Continuar la Aventura
                </motion.button>

                <p className="text-gray-500 text-sm mt-4">
                  (o cierra automáticamente en 10s)
                </p>
              </motion.div>
            )}

            {/* Botón de cerrar manual */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-3xl font-bold"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
