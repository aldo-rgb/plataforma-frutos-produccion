'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Sparkles, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

interface EnrollmentData {
  level: string;
  organizationName: string;
  startDate: string;
  visionName: string;
}

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);

  useEffect(() => {
    // Get enrollment data from sessionStorage
    const storedData = sessionStorage.getItem('advancedEnrollmentSuccess');
    if (storedData) {
      setEnrollmentData(JSON.parse(storedData));
      sessionStorage.removeItem('advancedEnrollmentSuccess');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-[#161b22]/80 backdrop-blur-xl rounded-2xl border border-amber-500/20 p-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              ¡Inscripción Exitosa!
            </h1>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold text-lg">
                NIVEL AVANZADO
              </span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 mb-8"
          >
            Has sido inscrito exitosamente al entrenamiento Avanzado.
            Tu viaje hacia el siguiente nivel comienza ahora.
          </motion.p>

          {/* Enrollment Details */}
          {enrollmentData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0d1117]/50 rounded-xl p-4 mb-8 text-left"
            >
              <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
                Detalles de tu inscripción
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sede</p>
                    <p className="text-white font-medium">{enrollmentData.organizationName}</p>
                  </div>
                </div>

                {enrollmentData.startDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fecha de inicio</p>
                      <p className="text-white font-medium">{enrollmentData.startDate}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* What's Next Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-xl p-4 mb-8 border border-amber-500/20"
          >
            <h3 className="text-white font-semibold mb-2">¿Qué sigue?</h3>
            <ul className="text-sm text-gray-300 text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Recibirás un correo con los detalles del entrenamiento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Tu dashboard se actualizará con contenido avanzado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Prepárate para llevar tu transformación al siguiente nivel</span>
              </li>
            </ul>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-shadow"
              >
                <span>Ir a mi Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Decorative Stars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 flex justify-center gap-1"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
              >
                <Sparkles className="w-4 h-4 text-amber-400/50" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
