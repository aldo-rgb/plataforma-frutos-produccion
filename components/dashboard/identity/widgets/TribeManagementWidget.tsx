'use client';

import { motion } from 'framer-motion';
import { Users, UserPlus, Award, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TribeStats {
  invitedCount: number;
  enrolledCount: number;
  graduatedCount?: number;
}

interface TribeManagementWidgetProps {
  stats?: TribeStats | null;
  onInviteClick?: () => void;
}

export default function TribeManagementWidget({ stats, onInviteClick }: TribeManagementWidgetProps) {
  const invitedCount = stats?.invitedCount || 0;
  const enrolledCount = stats?.enrolledCount || 0;
  const graduatedCount = stats?.graduatedCount || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-yellow-900/20 via-slate-900 to-amber-900/10 border border-yellow-500/30 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Mi Tribu</h3>
            <p className="text-xs text-slate-400">Tu legado transformacional</p>
          </div>
        </div>
        <Link 
          href="/dashboard/carta"
          className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          Carta F.R.U.T.O.S.
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div
          className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <UserPlus className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-2xl font-bold text-white">{invitedCount}</span>
          <p className="text-xs text-slate-400">Invitados</p>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-2xl font-bold text-white">{enrolledCount}</span>
          <p className="text-xs text-slate-400">Enrollados</p>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-bold text-white">{graduatedCount}</span>
          <p className="text-xs text-slate-400">Graduados</p>
        </motion.div>
      </div>

      {/* Progress indicator */}
      <div className="bg-slate-800/30 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Meta de Transformación</span>
          <span className="text-xs font-medium text-yellow-400">{enrolledCount}/3</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (enrolledCount / 3) * 100)}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {enrolledCount >= 3 
            ? '🎉 ¡Meta alcanzada!' 
            : `${3 - enrolledCount} más para completar tu área transformacional`
          }
        </p>
      </div>

      {/* CTA */}
      <motion.button
        onClick={onInviteClick}
        className="w-full py-3 px-4 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <UserPlus className="w-4 h-4" />
        <span>Invitar a alguien</span>
      </motion.button>
    </motion.div>
  );
}
