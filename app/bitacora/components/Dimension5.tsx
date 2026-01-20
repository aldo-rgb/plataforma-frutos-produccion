// Dimensión 5: El Propósito (Cierre)
'use client';

import { motion } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';

interface Dimension5Props {
  data: any;
  onChange: (data: any) => void;
}

export default function Dimension5({ data, onChange }: Dimension5Props) {
  // Block paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto pb-32 min-h-[60vh] flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 text-center">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Compass className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Tu Norte</h2>
          <p className="text-gray-400 text-lg">La pregunta más importante de todas</p>
        </motion.div>

        {/* Main question */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-xl mx-auto"
        >
          <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl space-y-6">
            <div className="flex justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
              ¿Cuál es tu propósito en el mundo?
              <br />
              <span className="text-emerald-400">¿Cómo tienes que SER para causarlo?</span>
            </h3>

            <textarea
              value={data.lifePurpose || ''}
              onChange={(e) => onChange({ lifePurpose: e.target.value })}
              onPaste={handlePaste}
              placeholder="Tómate tu tiempo para responder esto. No hay respuesta correcta, solo la tuya..."
              className="w-full h-48 px-5 py-4 bg-gray-900/50 border border-emerald-500/30 rounded-2xl text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none transition-all text-lg"
            />

            <p className="text-xs text-gray-500">
              Esta respuesta marcará el inicio de tu transformación
            </p>
          </div>
        </motion.div>

        {/* Closing message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-gray-500 text-sm"
        >
          Al sellar tu bitácora, declaras tu compromiso con tu propia evolución.
        </motion.p>
      </div>
    </motion.div>
  );
}
