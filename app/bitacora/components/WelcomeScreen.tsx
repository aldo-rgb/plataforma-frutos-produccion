// Pantalla de bienvenida - El Filtro de Entrada
'use client';

import { motion } from 'framer-motion';
import { Sparkles, Moon, Lock } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
          La Transformación<br />Comienza Aquí
        </h1>

        {/* Description */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-lg mx-auto space-y-6 mb-12"
        >
          <p className="text-lg text-gray-300 leading-relaxed">
            Estás a punto de iniciar tu <span className="text-purple-400 font-semibold">Bitácora de Vuelo</span> para el Entrenamiento Avanzado.
          </p>
          
          <p className="text-gray-400">
            Lo que escribas aquí es la <span className="text-white font-medium">materia prima</span> con la que trabajaremos tu vida.
          </p>

          {/* Instructions card */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 text-left space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-400" />
              Instrucciones
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">1</span>
                <span>Requiere <strong className="text-white">45 minutos</strong> de honestidad radical.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">2</span>
                <span>Necesitas estar en un <strong className="text-white">lugar privado y en silencio</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">3</span>
                <span>No lo hagas con prisa. Si estás manejando o distraído, por favor <strong className="text-white">regresa más tarde</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Lock className="w-3 h-3" />
            <span>Tus respuestas son confidenciales y solo tu entrenador las verá</span>
          </div>
        </motion.div>

        {/* Start button */}
        <motion.button
          onClick={onStart}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl font-semibold text-lg shadow-xl shadow-purple-500/30 transition-all duration-200"
        >
          Estoy listo y en silencio. Comenzar.
        </motion.button>

        {/* Save reminder */}
        <p className="mt-6 text-xs text-gray-600">
          Tu progreso se guarda automáticamente. Puedes cerrar y volver cuando quieras.
        </p>
      </motion.div>
    </motion.div>
  );
}
