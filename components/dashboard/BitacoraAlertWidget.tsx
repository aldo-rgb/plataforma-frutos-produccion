// Widget de alerta para completar la Bitácora de Inicio (Avanzado)
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FileText, ChevronRight, Clock, X, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface BitacoraStatus {
  hasAdvancedEnrollment: boolean;
  hasCompletedBitacora: boolean;
  status: string | null; // NOT_STARTED, IN_PROGRESS, COMPLETED
  currentDimension: number;
  advancedStartDate: string | null;
  daysUntilDeadline: number | null;
}

export default function BitacoraAlertWidget() {
  const { data: session } = useSession();
  const [data, setData] = useState<BitacoraStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      checkBitacoraStatus();
    }
  }, [session]);

  const checkBitacoraStatus = async () => {
    try {
      const response = await fetch('/api/bitacora/status');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error checking bitacora status:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si está cargando, si no hay datos, o si ya completó la bitácora
  if (loading || !data || !data.hasAdvancedEnrollment || data.hasCompletedBitacora || dismissed) {
    return null;
  }

  const isUrgent = data.daysUntilDeadline !== null && data.daysUntilDeadline <= 3;
  const progressPercent = data.status === 'IN_PROGRESS' ? (data.currentDimension / 5) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          relative overflow-hidden rounded-2xl p-4 mb-6 border
          ${isUrgent 
            ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30' 
            : 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30'
          }
        `}
      >
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
            ${isUrgent 
              ? 'bg-red-500/20' 
              : 'bg-purple-500/20'
            }
          `}>
            {isUrgent ? (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-purple-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold mb-1 ${isUrgent ? 'text-red-400' : 'text-purple-400'}`}>
              {data.status === 'IN_PROGRESS' 
                ? 'Continúa tu Cuestionario Avanzado' 
                : 'Cuestionario Avanzado Pendiente'
              }
            </h3>
            
            <p className="text-sm text-gray-300 mb-3">
              {data.status === 'IN_PROGRESS' 
                ? `Llevas ${data.currentDimension} de 5 dimensiones. ¡Continúa tu proceso de introspección!`
                : 'Completa tu Cuestionario Avanzado para poder acceder al Entrenamiento Avanzado.'
              }
            </p>

            {/* Progress bar if in progress */}
            {data.status === 'IN_PROGRESS' && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progreso</span>
                  <span>{data.currentDimension}/5 dimensiones</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Deadline warning */}
            {data.daysUntilDeadline !== null && (
              <div className={`
                flex items-center gap-2 text-xs mb-3
                ${isUrgent ? 'text-red-400' : 'text-amber-400'}
              `}>
                <Clock className="w-3 h-3" />
                {data.daysUntilDeadline <= 0 
                  ? '¡El entrenamiento comienza pronto!' 
                  : `${data.daysUntilDeadline} día${data.daysUntilDeadline === 1 ? '' : 's'} antes del inicio`
                }
              </div>
            )}

            {/* CTA Button */}
            <Link
              href="/bitacora"
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isUrgent 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
                }
              `}
            >
              {data.status === 'IN_PROGRESS' ? 'Continuar' : 'Comenzar Ahora'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className={`
          absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20
          ${isUrgent ? 'bg-red-500' : 'bg-purple-500'}
        `} />
      </motion.div>
    </AnimatePresence>
  );
}
