/**
 * 🧬 QUANTUM PATTERNS - Tarjeta de Insight
 * Widget que muestra revelaciones basadas en análisis de comportamiento
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, Clock, AlertTriangle, Zap } from 'lucide-react';

interface QuantumInsight {
  id: number;
  title: string;
  message: string;
  iconEmoji: string;
  actionButton: string;
  actionUrl: string;
  patternType: string;
  confidence: number;
  chartData: any;
}

export default function QuantumInsightCard() {
  const [insights, setInsights] = useState<QuantumInsight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/quantum/insights');
      const data = await response.json();
      if (data.success && data.insights.length > 0) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Error al cargar insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (insightId: number) => {
    try {
      await fetch(`/api/quantum/insights/${insightId}/viewed`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error al marcar como visto:', error);
    }
  };

  const handleDismiss = async (insightId: number) => {
    try {
      await fetch(`/api/quantum/insights/${insightId}/dismiss`, {
        method: 'POST',
      });
      
      // Remover del estado local
      setInsights(insights.filter((i) => i.id !== insightId));
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error al descartar:', error);
    }
  };

  const handleAction = (insight: QuantumInsight) => {
    markAsViewed(insight.id);
    window.location.href = insight.actionUrl;
  };

  const handleNext = () => {
    if (currentIndex < insights.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading || insights.length === 0) {
    return null;
  }

  const currentInsight = insights[currentIndex];

  // Iconos según el tipo de patrón
  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'GOLDEN_HOUR':
        return <Clock className="w-6 h-6" />;
      case 'KEYSTONE_HABIT':
        return <TrendingUp className="w-6 h-6" />;
      case 'CURSED_DAY':
        return <AlertTriangle className="w-6 h-6" />;
      case 'STREAK_BOOSTER':
        return <Zap className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentInsight.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-blue-900/40 rounded-2xl p-6 border border-purple-500/30 shadow-2xl backdrop-blur-sm overflow-hidden"
      >
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

        {/* Botón cerrar */}
        <button
          onClick={() => handleDismiss(currentInsight.id)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono del patrón (pulsante) */}
        <div className="flex items-start gap-4 mb-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
          >
            <span className="text-3xl">{currentInsight.iconEmoji}</span>
          </motion.div>

          <div className="flex-1">
            {/* Título */}
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              {currentInsight.title}
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                {getPatternIcon(currentInsight.patternType)}
              </motion.div>
            </h3>

            {/* Badge de confianza */}
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
              <Sparkles className="w-3 h-3" />
              {currentInsight.confidence}% de certeza
            </div>
          </div>
        </div>

        {/* Mensaje (El Dato) */}
        <div className="mb-6">
          <p className="text-lg text-gray-200 leading-relaxed">
            {currentInsight.message}
          </p>
        </div>

        {/* Gráfico mini (visualización simplificada) */}
        {currentInsight.chartData && (
          <div className="mb-6 p-4 bg-black/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Impacto detectado:</span>
              <span className="text-2xl font-bold text-green-400">
                +{currentInsight.chartData.value}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentInsight.chartData.value}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Botón de acción */}
        <button
          onClick={() => handleAction(currentInsight)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          {currentInsight.actionButton} →
        </button>

        {/* Navegación (si hay múltiples insights) */}
        {insights.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <div className="flex gap-1">
              {insights.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={currentIndex === insights.length - 1}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Subtítulo inferior */}
        <p className="text-center text-xs text-gray-500 mt-4">
          🧬 Análisis generado por <span className="text-purple-400 font-semibold">Quantum Patterns</span>
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
