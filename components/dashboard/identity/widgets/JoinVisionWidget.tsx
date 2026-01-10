'use client';

import { motion } from 'framer-motion';
import { Users, ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
import Link from 'next/link';

interface JoinVisionWidgetProps {
  onJoinClick?: () => void;
}

export default function JoinVisionWidget({ onJoinClick }: JoinVisionWidgetProps) {
  const benefits = [
    { icon: '🎯', text: 'Metas grupales' },
    { icon: '👥', text: 'Comunidad de apoyo' },
    { icon: '🚀', text: 'Mentoría intensiva' },
    { icon: '🏆', text: 'Programa estructurado' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-900 to-cyan-900/20 border border-slate-600/30 rounded-2xl p-6"
    >
      {/* Efecto de fondo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500 rounded-full filter blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Únete a una Visión</h3>
              <p className="text-xs text-slate-400">Experimenta el poder del grupo</p>
            </div>
          </div>
          <div className="px-2 py-1 bg-cyan-500/20 rounded-full">
            <span className="text-xs text-cyan-400 font-medium">🐺 Lobo Solitario</span>
          </div>
        </div>

        {/* Message */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-4">
          <p className="text-sm text-slate-300 mb-3">
            Estás avanzando increíble por tu cuenta. ¿Listo para multiplicar tus resultados con un grupo?
          </p>
          
          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 text-xs text-slate-400"
              >
                <span>{benefit.icon}</span>
                <span>{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats Preview */}
        <div className="flex items-center justify-around py-3 px-4 bg-slate-800/30 rounded-xl mb-4">
          <div className="text-center">
            <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">3x más rápido</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <Star className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">90% éxito</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <Sparkles className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400">Comunidad</span>
          </div>
        </div>

        {/* CTA */}
        <Link href="/checkout">
          <motion.button
            onClick={onJoinClick}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Explorar Visiones Activas</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>

        <p className="text-center text-xs text-slate-500 mt-3">
          Tu progreso actual se mantiene al unirte
        </p>
      </div>
    </motion.div>
  );
}
