'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Snowflake, Sun, Flame, ThumbsUp, ThumbsDown, 
  Star, Send, Loader2, CheckCircle2, X
} from 'lucide-react';

interface GCSurveyProps {
  productId: number;
  productName: string;
  onComplete: () => void;
  onClose: () => void;
}

type AireOption = 'CONGELADO' | 'PERFECTO' | 'CALOR';
type BreakOption = 'A_TIEMPO' | 'TARDE_FALTANTE';

export default function GCSurveyModal({
  productId,
  productName,
  onComplete,
  onClose
}: GCSurveyProps) {
  // Sección A: Instalaciones
  const [aireAcondicionado, setAireAcondicionado] = useState<AireOption | null>(null);
  const [limpiezaBanos, setLimpiezaBanos] = useState(50);
  const [coffeBreak, setCoffeBreak] = useState<BreakOption | null>(null);
  
  // Sección B: Evaluación Humana
  const [entrenadorEstrellas, setEntrenadorEstrellas] = useState(0);
  const [entrenadorInspiro, setEntrenadorInspiro] = useState<boolean | null>(null);
  const [coordinadorRespaldo, setCoordinadorRespaldo] = useState(50);
  
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const aireOptions: { value: AireOption; icon: React.ReactNode; label: string; color: string }[] = [
    { value: 'CONGELADO', icon: <Snowflake className="w-8 h-8" />, label: 'Congelado', color: 'from-blue-500 to-cyan-500' },
    { value: 'PERFECTO', icon: <CheckCircle2 className="w-8 h-8" />, label: 'Perfecto', color: 'from-green-500 to-emerald-500' },
    { value: 'CALOR', icon: <Flame className="w-8 h-8" />, label: 'Calor', color: 'from-orange-500 to-red-500' }
  ];

  const isValid = () => {
    return (
      aireAcondicionado !== null &&
      coffeBreak !== null &&
      entrenadorEstrellas > 0 &&
      entrenadorInspiro !== null
    );
  };

  const handleSubmit = async () => {
    if (!isValid()) {
      alert('Por favor, completa todas las evaluaciones');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/gc/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          aireAcondicionado,
          limpiezaBanos,
          coffeBreak,
          entrenadorEstrellas,
          entrenadorInspiro,
          coordinadorRespaldo
        })
      });

      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        onComplete();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar la encuesta');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error al enviar la encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto"
    >
      <div className="min-h-full p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Evaluación de Cierre</h2>
            <p className="text-slate-400 text-sm">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full space-y-6">
          {/* Sección A: Instalaciones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">A</span>
              Instalaciones
            </h3>

            {/* Aire Acondicionado */}
            <div className="mb-5">
              <p className="text-slate-400 text-sm mb-3">Aire Acondicionado</p>
              <div className="grid grid-cols-3 gap-3">
                {aireOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setAireAcondicionado(option.value);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      aireAcondicionado === option.value
                        ? `bg-gradient-to-br ${option.color} border-transparent text-white`
                        : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {option.icon}
                    <span className="text-xs font-medium">{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Limpieza Baños - Slider */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-slate-400 text-sm">Limpieza de Baños</p>
                <span className={`text-sm font-bold ${
                  limpiezaBanos < 40 ? 'text-red-400' : limpiezaBanos < 70 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {limpiezaBanos}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={limpiezaBanos}
                  onChange={(e) => setLimpiezaBanos(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer bg-slate-700"
                  style={{
                    background: `linear-gradient(to right, 
                      ${limpiezaBanos < 40 ? '#ef4444' : limpiezaBanos < 70 ? '#f59e0b' : '#22c55e'} 0%, 
                      ${limpiezaBanos < 40 ? '#ef4444' : limpiezaBanos < 70 ? '#f59e0b' : '#22c55e'} ${limpiezaBanos}%, 
                      #334155 ${limpiezaBanos}%, 
                      #334155 100%)`
                  }}
                />
              </div>
            </div>

            {/* Coffee Break */}
            <div>
              <p className="text-slate-400 text-sm mb-3">Coffee Break</p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCoffeBreak('A_TIEMPO');
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                    coffeBreak === 'A_TIEMPO'
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <ThumbsUp className="w-6 h-6" />
                  <span className="font-medium">A tiempo</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCoffeBreak('TARDE_FALTANTE');
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                    coffeBreak === 'TARDE_FALTANTE'
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <ThumbsDown className="w-6 h-6" />
                  <span className="font-medium">Tarde/Faltante</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Sección B: Evaluación Humana */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-bold">B</span>
              Evaluación Humana
            </h3>

            {/* Entrenador - Estrellas */}
            <div className="mb-5">
              <p className="text-slate-400 text-sm mb-3">Entrenador</p>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => {
                      setEntrenadorEstrellas(star);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                  >
                    <Star
                      className={`w-12 h-12 transition-all ${
                        star <= (hoveredStar || entrenadorEstrellas)
                          ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ¿Inspiró a tu visión? - Toggle */}
            <div className="mb-5">
              <p className="text-slate-400 text-sm mb-3">¿Inspiró a tu visión?</p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEntrenadorInspiro(true);
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all font-bold text-lg ${
                    entrenadorInspiro === true
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  SÍ
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEntrenadorInspiro(false);
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all font-bold text-lg ${
                    entrenadorInspiro === false
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  NO
                </motion.button>
              </div>
            </div>

            {/* Coordinador - Slider de respaldo */}
            <div>
              <p className="text-slate-400 text-sm mb-2">¿Te sentiste respaldado por el Coordinador?</p>
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Abandonado</span>
                <span>Totalmente apoyado</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={coordinadorRespaldo}
                  onChange={(e) => setCoordinadorRespaldo(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      #ef4444 0%, 
                      #f59e0b 50%,
                      #22c55e 100%)`
                  }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none"
                  style={{ left: `calc(${coordinadorRespaldo}% - 10px)` }}
                />
              </div>
              <div className="text-center mt-2">
                <span className={`text-lg font-bold ${
                  coordinadorRespaldo < 40 ? 'text-red-400' : coordinadorRespaldo < 70 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {coordinadorRespaldo}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Botón de enviar */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={submitting || !isValid()}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Evaluación
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
