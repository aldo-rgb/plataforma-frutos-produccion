// Dimensión 2: El Cuerpo y la Sombra (Salud)
'use client';

import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Lock, Shield } from 'lucide-react';

interface Dimension2Props {
  data: any;
  onChange: (data: any) => void;
}

export default function Dimension2({ data, onChange }: Dimension2Props) {
  // Block paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto pb-32"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">El Cuerpo y la Sombra</h2>
        <p className="text-gray-400">Tu estado físico y los temas que pocos conocen</p>
      </div>

      {/* Privacy notice */}
      <div className="mb-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-400">
          Esta sección es <span className="text-white font-medium">estrictamente confidencial</span> entre tú y tu entrenador.
        </p>
      </div>

      <div className="space-y-8">
        {/* Estado de salud */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Describe tu estado de salud actual
            <span className="block text-xs text-gray-500 mt-1">
              Incluye problemas que hayas tenido o tengas (enfermedades, condiciones, etc.)
            </span>
          </label>
          <textarea
            value={data.healthStatus || ''}
            onChange={(e) => onChange({ healthStatus: e.target.value })}
            onPaste={handlePaste}
            placeholder="Describe cómo te sientes físicamente, cualquier condición médica, dolencias crónicas, etc."
            className="w-full h-40 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Medicamentos */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Escribe los medicamentos que estés tomando actualmente
          </label>
          <textarea
            value={data.currentMedications || ''}
            onChange={(e) => onChange({ currentMedications: e.target.value })}
            onPaste={handlePaste}
            placeholder="Lista los medicamentos, dosis y para qué los tomas. Si no tomas ninguno, escribe 'Ninguno'."
            className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none resize-none"
          />
        </div>

        {/* Embarazo - TODO: mostrar solo si es mujer, por ahora mostramos siempre */}
        <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            ¿Estás embarazada?
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ isPregnant: true })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${data.isPregnant === true
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => onChange({ isPregnant: false })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${data.isPregnant === false
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => onChange({ isPregnant: null })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${data.isPregnant === null || data.isPregnant === undefined
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              No aplica
            </button>
          </div>
        </div>

        {/* ALERTA CRÍTICA - Suicidio */}
        <div className="p-6 bg-red-500/5 border border-red-500/30 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Pregunta Importante</h3>
              <p className="text-xs text-gray-400">
                Esta información es confidencial y nos ayuda a brindarte el mejor apoyo durante el entrenamiento.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              ¿En alguna ocasión has intentado quitarte la vida?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ hasSuicideAttempt: true })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${data.hasSuicideAttempt === true
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => onChange({ hasSuicideAttempt: false, suicideAttemptReason: '' })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${data.hasSuicideAttempt === false
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                No
              </button>
            </div>
          </div>

          {data.hasSuicideAttempt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Esta información estará visible solo para tu entrenador</span>
              </div>
              <textarea
                value={data.suicideAttemptReason || ''}
                onChange={(e) => onChange({ suicideAttemptReason: e.target.value })}
                onPaste={handlePaste}
                placeholder="¿Por qué? Cuéntanos lo que te sientas cómodo/a compartiendo..."
                className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-red-500/30 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none resize-none"
              />
            </motion.div>
          )}
        </div>

        {/* Mensaje de apoyo */}
        <div className="text-center py-4 text-sm text-gray-500">
          <p>
            Recuerda: lo que compartes aquí nos ayuda a{' '}
            <span className="text-gray-300">acompañarte mejor</span> en tu proceso de transformación.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
