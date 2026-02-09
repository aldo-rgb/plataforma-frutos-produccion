'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Sparkles, X, ChevronRight } from 'lucide-react';
import ParticipantSurveyModal from './ParticipantSurveyModal';

interface SurveyData {
  productId: number;
  productName: string;
  levelType: string;
  questions: any[];
}

interface Props {
  compact?: boolean; // Modo compacto: solo notificación con link a /dashboard/hoy
}

export default function ParticipantSurveyBanner({ compact = false }: Props) {
  const router = useRouter();
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [pointsReward, setPointsReward] = useState(200);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForSurvey();
  }, []);

  const checkForSurvey = async () => {
    try {
      const res = await fetch('/api/participant/survey');
      const data = await res.json();
      
      if (data.hasSurvey && data.survey) {
        setSurveyData(data.survey);
        setPointsReward(data.pointsReward || 200);
      }
    } catch (error) {
      console.error('Error checking for survey:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyComplete = () => {
    setIsModalOpen(false);
    setSurveyData(null); // Ocultar banner después de completar
  };

  // No mostrar nada si está cargando, no hay encuesta, o se cerró
  if (loading || !surveyData || dismissed) {
    return null;
  }

  const getLevelGradient = (level: string) => {
    switch (level) {
      case 'BASIC':
        return 'from-emerald-600 via-green-500 to-teal-500';
      case 'ADVANCED':
        return 'from-amber-500 via-orange-500 to-red-500';
      case 'PL3':
        return 'from-violet-600 via-purple-500 to-fuchsia-500';
      default:
        return 'from-purple-600 via-indigo-500 to-blue-500';
    }
  };

  const getLevelName = (level: string) => {
    switch (level) {
      case 'BASIC':
        return 'Básico';
      case 'ADVANCED':
        return 'Avanzado';
      case 'PL3':
        return 'PL3';
      default:
        return level;
    }
  };

  // MODO COMPACTO: Solo notificación con link a /dashboard/hoy
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => router.push('/dashboard/hoy')}
        className={`cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r ${getLevelGradient(surveyData.levelType)} p-0.5`}
      >
        <div className="relative bg-[#0f111a]/95 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getLevelGradient(surveyData.levelType)}`}>
              <Gift className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                📋 Encuesta pendiente: {surveyData.productName}
              </p>
              <p className="text-xs text-gray-400">
                Complétala y gana <span className="text-yellow-400 font-bold">+{pointsReward} puntos</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="text-xs">Ir a completar</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    );
  }

  // MODO COMPLETO: Banner con modal
  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getLevelGradient(surveyData.levelType)} p-1 mb-4`}
        >
          {/* Efecto de brillo */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />

          <div className="relative bg-[#0f111a]/95 backdrop-blur-sm rounded-xl p-4">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-4">
              {/* Icono animado */}
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${getLevelGradient(surveyData.levelType)}`}
              >
                <Gift className="w-6 h-6 text-white" />
              </motion.div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">
                    ¡Déjame Conocerte!
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getLevelGradient(surveyData.levelType)} text-white`}>
                    {getLevelName(surveyData.levelType)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1">
                  Completa una encuesta divertida sobre ti y gana puntos 🎁
                </p>
              </div>

              {/* Puntos y botón */}
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                  <span className="text-sm font-bold text-yellow-400">+{pointsReward}</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className={`px-4 py-2 rounded-lg font-medium text-white text-sm bg-gradient-to-r ${getLevelGradient(surveyData.levelType)} hover:shadow-lg hover:shadow-purple-500/25 transition-shadow flex items-center gap-2`}
                >
                  <Sparkles size={14} />
                  Responder
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de encuesta */}
      <ParticipantSurveyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={surveyData.productId}
        productName={surveyData.productName}
        levelType={surveyData.levelType}
        questions={surveyData.questions}
        pointsReward={pointsReward}
        onComplete={handleSurveyComplete}
      />
    </>
  );
}
