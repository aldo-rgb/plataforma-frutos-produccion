'use client';

import { motion } from 'framer-motion';
import { Atom, Rocket, Crown, Eye, Sparkles, Zap } from 'lucide-react';

export type UserLevel = 'BASIC' | 'ADVANCED' | 'PL' | 'LOBO_SOLITARIO';

interface IdentityBadgeProps {
  level: UserLevel;
  userName?: string;
  showAnimation?: boolean;
}

const levelConfig = {
  BASIC: {
    title: 'NIVEL: BÁSICO',
    subtitle: 'Las reglas del juego',
    icon: Sparkles,
    color: '#00F0FF', // Cyan Neon
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
    borderColor: 'border-cyan-500/50',
    glowColor: 'shadow-cyan-500/30',
    textColor: 'text-cyan-400',
  },
  ADVANCED: {
    title: 'NIVEL 2: El Entrenamiento',
    subtitle: 'Irrazonable',
    icon: Rocket,
    color: '#9D4EDD', // Magenta/Púrpura
    bgGradient: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/50',
    glowColor: 'shadow-purple-500/30',
    textColor: 'text-purple-400',
  },
  PL: {
    title: 'NIVEL 3: El Jueago de Tu VIDA',
    subtitle: 'El lider de Tu vida',
    icon: Crown,
    color: '#FFD700', // Dorado Legendario
    bgGradient: 'from-yellow-500/20 to-amber-600/10',
    borderColor: 'border-yellow-500/50',
    glowColor: 'shadow-yellow-500/30',
    textColor: 'text-yellow-400',
  },
  LOBO_SOLITARIO: {
    title: 'AGENTE LIBRE',
    subtitle: 'Lone Wolf',
    icon: Eye,
    color: '#E0E0E0', // Blanco/Gris Hielo
    bgGradient: 'from-slate-500/20 to-slate-600/10',
    borderColor: 'border-slate-500/50',
    glowColor: 'shadow-slate-500/20',
    textColor: 'text-slate-300',
  },
};

export default function IdentityBadge({ level, userName, showAnimation = true }: IdentityBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, y: -20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} p-4 ${config.glowColor} shadow-lg`}
    >
      {/* Efecto de brillo pulsante para ADVANCED y PL */}
      {(level === 'ADVANCED' || level === 'PL') && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Efecto de partículas doradas para PL */}
      {level === 'PL' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-center gap-4">
        {/* Icono */}
        <motion.div
          className={`p-3 rounded-xl bg-black/30 ${config.borderColor} border`}
          whileHover={{ scale: 1.05 }}
          animate={level === 'ADVANCED' ? {
            boxShadow: [
              '0 0 0 rgba(157, 78, 221, 0)',
              '0 0 20px rgba(157, 78, 221, 0.5)',
              '0 0 0 rgba(157, 78, 221, 0)',
            ],
          } : level === 'PL' ? {
            boxShadow: [
              '0 0 0 rgba(255, 215, 0, 0)',
              '0 0 20px rgba(255, 215, 0, 0.5)',
              '0 0 0 rgba(255, 215, 0, 0)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={`w-6 h-6 ${config.textColor}`} style={{ color: config.color }} />
        </motion.div>

        {/* Texto */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 
              className={`font-bold text-sm tracking-wider ${config.textColor}`}
              style={{ color: config.color }}
            >
              {config.title}
            </h3>
            {level === 'PL' && (
              <motion.span
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="w-4 h-4 text-yellow-400" />
              </motion.span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{config.subtitle}</p>
          {userName && (
            <p className="text-sm text-slate-300 mt-1 font-medium">{userName}</p>
          )}
        </div>

        {/* Indicador de nivel */}
        <div className={`px-3 py-1 rounded-full bg-black/40 ${config.borderColor} border`}>
          <span className={`text-xs font-bold ${config.textColor}`} style={{ color: config.color }}>
            {level === 'LOBO_SOLITARIO' ? '🐺' : level === 'PL' ? '👑' : level === 'ADVANCED' ? '🚀' : '🌱'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
