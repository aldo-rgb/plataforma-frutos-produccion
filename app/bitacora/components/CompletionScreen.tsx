// Pantalla de completado
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CompletionScreen() {
  return (
    <motion.div
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
        >
          Bitácora Sellada
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-gray-300 mb-8"
        >
          Tu proceso de introspección ha sido registrado
        </motion.p>

        {/* Info card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto mb-10 p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4">
            <Lock className="w-5 h-5" />
            <span className="font-medium">Tu bitácora está protegida</span>
          </div>
          <p className="text-sm text-gray-400">
            Solo tu entrenador asignado tendrá acceso a tus respuestas. Esta información será utilizada para acompañarte de manera personalizada durante el entrenamiento.
          </p>
        </motion.div>

        {/* What's next */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-medium text-white">¿Qué sigue?</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl font-medium text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              Ir a mi Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        {/* Motivational quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-gray-600 text-sm italic max-w-md mx-auto"
        >
          "El primer paso hacia el cambio es la consciencia. El segundo paso es la aceptación."
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
