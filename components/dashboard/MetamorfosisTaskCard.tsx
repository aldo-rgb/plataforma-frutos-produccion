'use client';

import { useState } from 'react';
import { Zap, CheckCircle, Sparkles, Loader2, Eye, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MetamorfosisTaskCardProps {
  task: {
    id: string;
    submissionId: number;
    title: string;
    description: string;
    pointsReward?: number;
    status: string;
  };
  onComplete: (submissionId: number) => Promise<void>;
}

export default function MetamorfosisTaskCard({ task, onComplete }: MetamorfosisTaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const isCompleted = task.status === 'COMPLETED' || task.status === 'APPROVED';

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await onComplete(task.submissionId);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleViewMetamorfosis = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleAccept = () => {
    setHasAccepted(true);
    setTimeout(() => {
      setShowModal(false);
    }, 500);
  };

  return (
    <div 
      className="relative bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border-2 border-amber-500/40 p-4 mb-3 transition-all hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/20"
    >
      
      {/* Badge de Salto Cuántico */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
        <Zap size={10} />
        Salto Cuántico
      </div>

      {/* Points Badge */}
      {task.pointsReward && task.pointsReward > 0 && (
        <div className="absolute -top-2 left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg">
          <Sparkles size={10} />
          +{task.pointsReward} PC
        </div>
      )}

      <div className="flex items-start gap-4 mt-2">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCompleted 
            ? 'bg-green-500/20 border-2 border-green-500' 
            : 'bg-amber-500/20 border-2 border-amber-500/50'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <Zap className="w-6 h-6 text-amber-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.title}
          </h4>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Ver Salto Button */}
          <button
            onClick={handleViewMetamorfosis}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            Ver Salto
          </button>

          {/* Complete Button */}
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium px-3 py-2">
              <CheckCircle className="w-4 h-4" />
              Completado
            </div>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  ¡Completar!
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal Ver Salto */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 max-w-lg w-full shadow-2xl shadow-amber-500/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 p-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Tu Salto Cuántico</h3>
                    <p className="text-amber-100/80 text-sm">Tu transformación personal</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    {task.title}
                  </h4>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>

                {task.pointsReward && task.pointsReward > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-6 text-green-400">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">+{task.pointsReward} Puntos de Conexión al completar</span>
                  </div>
                )}

                {/* Accept Button */}
                <button
                  onClick={handleAccept}
                  disabled={hasAccepted}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    hasAccepted
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30'
                  }`}
                >
                  {hasAccepted ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      ¡Aceptado!
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Acepto mi Salto Cuántico
                    </>
                  )}
                </button>

                <p className="text-center text-slate-500 text-xs mt-4">
                  Al aceptar, te comprometes a realizar este salto cuántico
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
