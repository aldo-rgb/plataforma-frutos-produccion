'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';

type VisionLevel = 'BASIC' | 'ADVANCED' | 'PL';

interface VisionWizardProps {
  onComplete: (data: VisionWizardData) => void;
  onCancel: () => void;
  locale?: 'es' | 'en';
}

export interface VisionWizardData {
  enabledLevels: VisionLevel[];
  visionName: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  maxParticipants?: number;
  tickets: TicketData[];
  coordinators: CoordinatorAssignment[];
}

interface TicketData {
  level: VisionLevel;
  nombre: string;
  nombreEn?: string;
  descripcion?: string;
  descripcionEn?: string;
  precio: number;
  precioUSD?: number;
  cupo: number;
}

interface CoordinatorAssignment {
  userId: number;
  role: 'COORDINATOR_BASIC' | 'COORDINATOR_ADVANCED' | 'TRAINER';
}

export default function VisionWizard({ onComplete, onCancel, locale = 'es' }: VisionWizardProps) {
  const t = useMultiLevelTranslations(locale);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLevels, setSelectedLevels] = useState<VisionLevel[]>(['PL']);
  const [visionData, setVisionData] = useState<Partial<VisionWizardData>>({
    enabledLevels: ['PL'],
    tickets: [],
    coordinators: [],
  });

  const levels: Array<{
    id: VisionLevel;
    name: string;
    icon: string;
    description: string;
    color: string;
  }> = [
    {
      id: 'BASIC',
      name: t.levels.BASIC,
      icon: t.levelIcons.BASIC,
      description: t.levelDescriptions.BASIC,
      color: 'from-blue-500 to-blue-700',
    },
    {
      id: 'ADVANCED',
      name: t.levels.ADVANCED,
      icon: t.levelIcons.ADVANCED,
      description: t.levelDescriptions.ADVANCED,
      color: 'from-purple-500 to-purple-700',
    },
    {
      id: 'PL',
      name: t.levels.PL,
      icon: t.levelIcons.PL,
      description: t.levelDescriptions.PL,
      color: 'from-yellow-500 to-yellow-700',
    },
  ];

  const toggleLevel = (levelId: VisionLevel) => {
    setSelectedLevels((prev) => {
      const newLevels = prev.includes(levelId)
        ? prev.filter((l) => l !== levelId)
        : [...prev, levelId];
      
      setVisionData((d) => ({ ...d, enabledLevels: newLevels }));
      return newLevels;
    });
  };

  const steps = [
    {
      title: t.wizard.steps.selectArchitecture,
      component: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">
            {t.wizard.title}
          </h2>
          <p className="text-gray-400 text-center">
            {t.wizard.selectLevels}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {levels.map((level) => (
              <motion.div
                key={level.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleLevel(level.id)}
                className={`
                  relative cursor-pointer rounded-2xl p-6 border-2 transition-all
                  ${
                    selectedLevels.includes(level.id)
                      ? 'border-cyan-400 bg-gradient-to-br ' + level.color + ' bg-opacity-20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }
                `}
              >
                {selectedLevels.includes(level.id) && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-4">
                  <div className="text-6xl">{level.icon}</div>
                  <h3 className="text-xl font-bold text-white">{level.name}</h3>
                  <p className="text-sm text-gray-400">{level.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t.wizard.steps.configureFinances,
      component: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            {t.finances.title}
          </h2>
          <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <p className="text-gray-400">
              Configura tu cuenta de Stripe Connect para recibir pagos directamente.
            </p>
            <button
              type="button"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {t.finances.connectStripe}
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <label className="block text-sm font-bold text-slate-400 mb-2">
              {t.finances.platformFee} (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              defaultValue="1.0"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white"
              onChange={(e) =>
                setVisionData((d) => ({
                  ...d,
                  platformFeePercent: parseFloat(e.target.value),
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Porcentaje que cobra la plataforma por cada transacción
            </p>
          </div>
        </div>
      ),
    },
    {
      title: t.wizard.steps.review,
      component: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            Revisar Configuración
          </h2>

          <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Niveles Habilitados
              </h3>
              <div className="flex gap-2">
                {selectedLevels.map((levelId) => {
                  const level = levels.find((l) => l.id === levelId);
                  return (
                    <span
                      key={levelId}
                      className="px-4 py-2 bg-slate-700 rounded-lg text-white"
                    >
                      {level?.icon} {level?.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Configuración Financiera
              </h3>
              <p className="text-gray-400">
                Comisión de plataforma:{' '}
                {visionData.platformFeePercent || 1}%
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(visionData as VisionWizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
      >
        {/* Progress bar */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold
                    ${
                      index <= currentStep
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-gray-400'
                    }
                  `}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      w-20 h-1 mx-2
                      ${index < currentStep ? 'bg-cyan-500' : 'bg-slate-700'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {steps[currentStep].title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].component}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6 flex justify-between">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            {currentStep === 0 ? 'Cancelar' : t.wizard.back}
          </button>
          <button
            onClick={handleNext}
            disabled={selectedLevels.length === 0}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {currentStep === steps.length - 1
              ? t.wizard.finish
              : t.wizard.continue}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
