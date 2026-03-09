'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Rocket, Calendar, Clock, Flame, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface ZonaEjecucionData {
  totalHoy: number;
  totalRetrasadas: number;
  isDropped?: boolean;
  streak?: number;
}

export default function ZonaEjecucionMiniWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ZonaEjecucionData | null>(null);

  useEffect(() => {
    loadTareas();
  }, []);

  const loadTareas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tareas/zona-ejecucion');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-900/30 via-slate-900 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 transition-all h-full"
        onClick={() => router.push('/dashboard/hoy')}
      >
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </motion.div>
    );
  }

  // Si el usuario está marcado como DROP
  if (data?.isDropped) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-red-900/20 via-slate-900 to-slate-900 border border-red-500/20 rounded-2xl p-6 h-full"
      >
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Acceso Suspendido</p>
        </div>
      </motion.div>
    );
  }

  const totalHoy = data?.totalHoy || 0;
  const totalRetrasadas = data?.totalRetrasadas || 0;
  const streak = data?.streak || 0;
  const todoListo = totalHoy === 0 && totalRetrasadas === 0;
  const hasUrgentTasks = totalRetrasadas > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push('/dashboard/hoy')}
      className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all h-full flex flex-col group
        ${hasUrgentTasks 
          ? 'bg-gradient-to-br from-orange-900/40 via-red-900/30 to-slate-900 border-2 border-orange-500/50 hover:border-orange-400 shadow-lg shadow-orange-500/20' 
          : 'bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/50'
        }`}
    >
      {/* Efecto de brillo animado para tareas urgentes */}
      {hasUrgentTasks && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div 
            className={`p-3 rounded-xl border ${hasUrgentTasks 
              ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50' 
              : 'bg-indigo-500/10 border-indigo-500/30'
            }`}
            animate={hasUrgentTasks ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {hasUrgentTasks ? (
              <Flame className="w-5 h-5 text-orange-400" />
            ) : (
              <Rocket className="w-5 h-5 text-indigo-400" />
            )}
          </motion.div>
          <div>
            <h3 className="font-bold text-white">Zona de Ejecución</h3>
            <p className={`text-xs ${hasUrgentTasks ? 'text-orange-300' : 'text-slate-400'}`}>
              {hasUrgentTasks ? '¡Tienes tareas pendientes!' : 'Hoy es día de ganar'}
            </p>
          </div>
        </div>
        {/* Racha de días */}
        <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-full">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 font-bold text-sm">{streak}</span>
          <span className="text-orange-400/70 text-xs">días</span>
        </div>
      </div>

      {/* Content - flex-1 para ocupar todo el espacio */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        {todoListo ? (
          <motion.div 
            className="text-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-3" />
            </motion.div>
            <p className="text-white font-bold text-xl">🎉 ¡Campeón!</p>
            <p className="text-green-400 text-sm mt-1">Todas las tareas completadas</p>
          </motion.div>
        ) : (
          <div className="flex items-center justify-around w-full py-2">
            {/* Tareas Hoy */}
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-300 text-sm font-semibold">HOY</span>
              </div>
              <motion.div 
                className={`text-5xl font-black ${totalHoy > 0 ? 'text-indigo-400' : 'text-green-400'}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {totalHoy}
              </motion.div>
              <p className="text-slate-500 text-xs mt-1">tareas</p>
            </motion.div>

            {/* Divider con efecto */}
            <div className={`h-20 w-px ${hasUrgentTasks ? 'bg-gradient-to-b from-transparent via-orange-500/50 to-transparent' : 'bg-slate-700'}`}></div>

            {/* Tareas Retrasadas */}
            <motion.div 
              className="text-center relative"
              whileHover={{ scale: 1.05 }}
            >
              {totalRetrasadas > 0 && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⚠️
                </motion.div>
              )}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className={`w-5 h-5 ${totalRetrasadas > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${totalRetrasadas > 0 ? 'text-red-300' : 'text-slate-300'}`}>
                  RETRASADAS
                </span>
              </div>
              <motion.div 
                className={`text-5xl font-black ${totalRetrasadas > 0 ? 'text-red-400' : 'text-green-400'}`}
                animate={totalRetrasadas > 0 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {totalRetrasadas}
              </motion.div>
              <p className={`text-xs mt-1 ${totalRetrasadas > 0 ? 'text-red-400/70' : 'text-slate-500'}`}>
                {totalRetrasadas > 0 ? '¡Ponte al día!' : 'tareas'}
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Call to Action - siempre al fondo */}
      <motion.div 
        className="mt-auto pt-4 relative z-10"
        whileHover={{ scale: 1.02 }}
      >
        <div className={`text-center py-2 px-4 rounded-xl transition-all ${
          hasUrgentTasks 
            ? 'bg-gradient-to-r from-orange-600/30 to-red-600/30 border border-orange-500/50' 
            : 'bg-slate-800/50 border border-slate-700/50 group-hover:border-indigo-500/50'
        }`}>
          <span className={`text-sm font-semibold ${hasUrgentTasks ? 'text-orange-300' : 'text-slate-400 group-hover:text-indigo-400'}`}>
            {hasUrgentTasks ? '🔥 ¡Completa tus tareas ahora!' : '→ Ver todas las tareas'}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
