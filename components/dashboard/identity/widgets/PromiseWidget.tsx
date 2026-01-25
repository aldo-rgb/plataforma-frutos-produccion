'use client';

import { motion } from 'framer-motion';
import { Target, Star, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PromiseData {
  finanzas?: string;
  relaciones?: string;
  salud?: string;
}

interface PromiseWidgetProps {
  promises?: PromiseData | null;
  hasCompletedCarta?: boolean;
}

export default function PromiseWidget({ promises, hasCompletedCarta }: PromiseWidgetProps) {
  if (!hasCompletedCarta) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cyan-900/20 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Los Saltos Cuánticos</h3>
            <p className="text-xs text-slate-400">Tus metas principales</p>
          </div>
        </div>
        
        <div className="text-center py-6 px-4">
          <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-3">
            <FileText className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Completa tu Carta 
          </p>
          <Link
            href="/dashboard/carta"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-colors"
          >
            Completar Carta
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  const promiseItems = [
    { label: 'Finanzas', value: promises?.finanzas, icon: '💰', color: 'text-green-400' },
    { label: 'Relaciones', value: promises?.relaciones, icon: '❤️', color: 'text-pink-400' },
    { label: 'Salud', value: promises?.salud, icon: '💪', color: 'text-blue-400' },
  ].filter(item => item.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-cyan-900/20 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Los Saltos Cuánticos</h3>
            <p className="text-xs text-slate-400">Tu compromiso contigo mismo</p>
          </div>
        </div>
        <Link
          href="/dashboard/carta/resumen"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          Ver Objetivos
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Promises List */}
      <div className="space-y-3">
        {promiseItems.length > 0 ? (
          promiseItems.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-800/50 rounded-xl p-3 border border-slate-700"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <h4 className={`text-xs font-medium ${item.color} mb-1`}>{item.label}</h4>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    "{item.value}"
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-4">
            <Star className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              Agrega tus declaraciones en la Carta F.R.U.T.O.S.
            </p>
          </div>
        )}
      </div>

      {/* Motivational Quote */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 italic text-center">
          "Tu palabra es tu compromiso. Honra lo que declaraste."
        </p>
      </div>
    </motion.div>
  );
}
