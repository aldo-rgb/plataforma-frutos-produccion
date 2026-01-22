'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, X, ChevronRight, Star, Lock, Calendar, AlertCircle, Gift, Sparkles } from 'lucide-react';
import { GCSurveyModal } from '@/components/training-closure';

interface PendingSurvey {
  productId: number;
  productName: string;
  levelType: string;
  visionName: string;
  endDate: string | null;
  canSubmit: boolean;
  totalParticipants: number;
  scheduledParticipants: number;
  pendingSchedule: number;
}

export default function GCPendingSurveyBanner() {
  const [pendingSurveys, setPendingSurveys] = useState<PendingSurvey[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchPendingSurveys();
  }, []);

  const fetchPendingSurveys = async () => {
    try {
      const res = await fetch('/api/gc/pending-surveys');
      const data = await res.json();
      
      if (data.pendingSurveys && data.pendingSurveys.length > 0) {
        setPendingSurveys(data.pendingSurveys);
      }
    } catch (error) {
      console.error('Error fetching pending surveys:', error);
    }
  };

  const handleOpenSurvey = (survey: PendingSurvey) => {
    if (!survey.canSubmit) {
      // No abrir modal si no puede evaluar
      return;
    }
    setSelectedProduct({ id: survey.productId, name: survey.productName });
    setShowSurveyModal(true);
  };

  const handleSurveyComplete = () => {
    setShowSurveyModal(false);
    setSelectedProduct(null);
    // Remover la encuesta completada de la lista
    if (selectedProduct) {
      setPendingSurveys(prev => prev.filter(s => s.productId !== selectedProduct.id));
    }
  };

  // No mostrar si no hay encuestas pendientes o fue descartado
  if (pendingSurveys.length === 0 || dismissed) {
    return null;
  }

  const currentSurvey = pendingSurveys[0];
  const isBlocked = !currentSurvey.canSubmit;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-10"
        >
          <div className={`relative overflow-hidden rounded-2xl border-2 ${
            isBlocked 
              ? 'bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 border-slate-500/50' 
              : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50'
          }`}>
            {/* Efecto de brillo animado (solo si no está bloqueado) */}
            {!isBlocked && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-shimmer" />
            )}
            
            <div className="relative p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Icono y contenido */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isBlocked 
                        ? 'bg-gradient-to-br from-slate-500 to-slate-600' 
                        : 'bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse'
                    }`}>
                      {isBlocked ? (
                        <Lock className="w-6 h-6 text-white" />
                      ) : (
                        <ClipboardList className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-sm sm:text-base">
                        {isBlocked ? '🔒 Encuesta Bloqueada' : '🎁 ¡Ganaste 1,000 PC por tu servicio!'}
                      </h3>
                      {pendingSurveys.length > 1 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isBlocked ? 'bg-slate-500/30 text-slate-300' : 'bg-amber-500/30 text-amber-300'
                        }`}>
                          +{pendingSurveys.length - 1} más
                        </span>
                      )}
                    </div>
                    
                    {isBlocked ? (
                      <>
                        <div className="flex items-center gap-2 text-orange-300 text-xs sm:text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Agenda las llamadas de seguimiento con todos tus participantes
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {currentSurvey.scheduledParticipants}/{currentSurvey.totalParticipants} participantes con llamada agendada
                          </span>
                          {currentSurvey.pendingSchedule > 0 && (
                            <span className="text-orange-400 font-medium">
                              ({currentSurvey.pendingSchedule} pendientes)
                            </span>
                          )}
                        </p>
                        <p className="text-cyan-400 text-xs mt-1 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          <span className="font-medium">Por tu contribucion ganas 1,000 PC · Completa la encuesta</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-amber-200/80 text-xs sm:text-sm truncate">
                          Completa la encuesta de <span className="font-semibold text-amber-300">{currentSurvey.productName}</span> para redimirlos
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-amber-200/60 text-xs">
                            {currentSurvey.visionName}
                          </p>
                          <span className="flex items-center gap-1 text-cyan-400 text-xs font-semibold animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            ¡Reclama tus PC!
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isBlocked ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-600/50 rounded-xl text-slate-400 font-semibold text-sm cursor-not-allowed">
                      <Lock className="w-4 h-4" />
                      <span className="hidden sm:inline">Bloqueado</span>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenSurvey(currentSurvey)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-white font-semibold text-sm shadow-lg shadow-amber-500/30 transition-all"
                    >
                      <Star className="w-4 h-4" />
                      <span className="hidden sm:inline">Evaluar Ahora</span>
                      <span className="sm:hidden">Evaluar</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  )}
                  
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Descartar (podrás hacerla desde el historial)"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Barra de progreso si hay múltiples */}
              {pendingSurveys.length > 1 && (
                <div className="mt-3 flex gap-1">
                  {pendingSurveys.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${
                        index === 0 
                          ? (isBlocked ? 'bg-slate-400' : 'bg-amber-400') 
                          : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de Encuesta */}
      <AnimatePresence>
        {showSurveyModal && selectedProduct && (
          <GCSurveyModal
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            onComplete={handleSurveyComplete}
            onClose={() => {
              setShowSurveyModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
