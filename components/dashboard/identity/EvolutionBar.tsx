'use client';

import { motion } from 'framer-motion';
import { Lock, Rocket, Crown, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { UserLevel } from './IdentityBadge';

interface NextMilestone {
  name: string;
  deadline?: Date | string | null;
  isLocked: boolean;
  progressPercent: number;
  lockReason?: string;
}

interface EvolutionBarProps {
  currentLevel: UserLevel;
  nextMilestone?: NextMilestone;
  onUpgradeClick?: () => void;
  isDropped?: boolean; // Si el usuario está marcado como DROP, ocultar botón de upgrade
}

const levelOrder: UserLevel[] = ['BASIC', 'ADVANCED', 'PL'];

const nextLevelConfig = {
  BASIC: {
    nextLevel: 'ADVANCED',
    nextLevelName: 'Breakthrough',
    icon: Rocket,
    color: '#9D4EDD',
    description: 'Tu entrenamiento continúa en...',
    cta: 'Desbloquear Avanzado',
  },
  ADVANCED: {
    nextLevel: 'PL',
    nextLevelName: 'Tu Vida',
    icon: Crown,
    color: '#FFD700',
    description: 'Preparación para el Salto',
    cta: 'Elegir Tu Vida',
  },
  PL: {
    nextLevel: null,
    nextLevelName: 'Graduación',
    icon: Crown,
    color: '#FFD700',
    description: 'Viniendo de la Graduación',
    cta: null,
  },
  LOBO_SOLITARIO: {
    nextLevel: 'BASIC',
    nextLevelName: 'Únete a una Visión',
    icon: Sparkles,
    color: '#00F0FF',
    description: 'Nivel de Maestría Personal',
    cta: 'Únete a una Visión',
  },
};

export default function EvolutionBar({ currentLevel, nextMilestone, onUpgradeClick, isDropped }: EvolutionBarProps) {
  const config = nextLevelConfig[currentLevel];
  const Icon = config.icon;

  // Si es PL, mostrar progreso de semanas hacia graduación
  if (currentLevel === 'PL' && nextMilestone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-900/20 via-amber-900/10 to-yellow-900/20 border border-yellow-500/30 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">{config.description}</span>
          </div>
          <span className="text-xs text-slate-400">
            {nextMilestone.deadline && (
              <>Graduación: {new Date(nextMilestone.deadline).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</>
            )}
          </span>
        </div>

        {/* Barra segmentada en 4 bloques (fines de semana) */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4].map((weekend) => {
            const weekendProgress = (weekend / 4) * 100;
            const isCompleted = nextMilestone.progressPercent >= weekendProgress;
            const isCurrent = nextMilestone.progressPercent >= (weekend - 1) / 4 * 100 && nextMilestone.progressPercent < weekendProgress;
            
            return (
              <motion.div
                key={weekend}
                className={`flex-1 h-3 rounded-full ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
                    : isCurrent 
                      ? 'bg-gradient-to-r from-yellow-500/50 to-amber-500/30' 
                      : 'bg-slate-800'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: weekend * 0.1 }}
              >
                {isCurrent && (
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full"
                    style={{ width: `${((nextMilestone.progressPercent - ((weekend - 1) / 4 * 100)) / 25) * 100}%` }}
                    layoutId="progress"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>Avanzado</span>
          <span className="text-center">FS 1</span>
          <span className="text-center">FS 2</span>
          <span>FS 3</span>
        </div>
      </motion.div>
    );
  }

  // Si es Lobo Solitario, mostrar barra de maestría personal
  if (currentLevel === 'LOBO_SOLITARIO') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-800/50 via-slate-900/50 to-slate-800/50 border border-slate-600/30 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">{config.description}</span>
          </div>
          <span className="text-xs text-slate-500">Basado en hábitos diarios</span>
        </div>

        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-500 to-slate-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${nextMilestone?.progressPercent || 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Maestría: {nextMilestone?.progressPercent || 0}%
          </span>
          {config.cta && (
            <button
              onClick={onUpgradeClick}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-xs font-medium text-cyan-400 transition-colors"
            >
              {config.cta}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Para BASIC y ADVANCED
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${
        currentLevel === 'BASIC' 
          ? 'from-purple-900/20 via-purple-900/10 to-purple-900/20 border-purple-500/30' 
          : 'from-yellow-900/20 via-amber-900/10 to-yellow-900/20 border-yellow-500/30'
      } border rounded-2xl p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color: config.color }} />
          <span className="text-sm font-medium" style={{ color: config.color }}>
            {config.description}
          </span>
        </div>
        {/* Solo mostrar fecha si NO está bloqueado (ya pagó) */}
        {nextMilestone?.deadline && !nextMilestone?.isLocked && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(nextMilestone.deadline).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
        {nextMilestone?.isLocked ? (
          // Barra bloqueada
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>{nextMilestone.lockReason || 'Bloqueado'}</span>
            </div>
          </div>
        ) : (
          // Barra de progreso normal
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${
              currentLevel === 'BASIC'
                ? 'bg-gradient-to-r from-purple-600 to-purple-400'
                : 'bg-gradient-to-r from-yellow-600 to-amber-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${nextMilestone?.progressPercent || 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Próximo: <span style={{ color: config.color }}>{config.nextLevelName}</span>
          </span>
          {!nextMilestone?.isLocked && (
            <span className="text-xs text-slate-500">
              ({nextMilestone?.progressPercent || 0}% completado)
            </span>
          )}
        </div>
        
        {/* No mostrar botón de upgrade si el usuario está en DROP */}
        {!isDropped && nextMilestone?.isLocked && config.cta && (
          <motion.button
            onClick={onUpgradeClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentLevel === 'BASIC'
                ? 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Lock className="w-3 h-3" />
            {config.cta}
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
