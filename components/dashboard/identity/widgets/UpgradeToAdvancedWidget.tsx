'use client';

import { motion } from 'framer-motion';
import { Rocket, ArrowRight, Star, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface UpgradeToAdvancedWidgetProps {
  advancedStartDate?: Date | string | null;
  price?: number;
  onUpgradeClick?: () => void;
}

export default function UpgradeToAdvancedWidget({ 
  advancedStartDate, 
  price = 9000,
  onUpgradeClick 
}: UpgradeToAdvancedWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calcular días restantes
  let daysRemaining = 0;
  if (advancedStartDate) {
    const start = new Date(advancedStartDate);
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-slate-900 to-purple-900/20 border border-purple-500/30 rounded-2xl p-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Efecto de brillo */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
        animate={{
          x: isHovered ? ['0%', '100%'] : '0%',
        }}
        transition={{ duration: 0.8 }}
      />

      {/* Partículas decorativas */}
      <div className="absolute top-4 right-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-6 h-6 text-purple-400/30" />
        </motion.div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
            <Rocket className="w-6 h-6 text-purple-400" />
          </div>
          {daysRemaining > 0 && (
            <div className="text-right">
              <span className="text-2xl font-bold text-purple-400">{daysRemaining}</span>
              <p className="text-xs text-slate-400">días para ADVANCED</p>
            </div>
          )}
        </div>

        {/* Título */}
        <h3 className="text-lg font-bold text-white mb-2">
          🚀 Rompe tus Barreras
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          El fin de semana Avanzado te espera. Es momento de ir más profundo.
        </p>

        {/* Beneficios */}
        <div className="space-y-2 mb-4">
          {[
            'Introspección profunda',
            'Trabajo en relaciones',
            'Libera tu potencial'
          ].map((benefit, idx) => (
            <motion.div
              key={benefit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-2"
            >
              <Star className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-slate-300">{benefit}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={onUpgradeClick}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Desbloquear Avanzado</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {price && (
          <p className="text-center text-xs text-slate-500 mt-2">
            Inversión: ${price.toLocaleString()} MXN
          </p>
        )}
      </div>
    </motion.div>
  );
}
