'use client';

import { motion } from 'framer-motion';
import { Users, UserPlus, Award, TrendingUp } from 'lucide-react';

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
      </div>

      {/* Stats Grid - Solo Enrollados y Graduados */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-3xl font-bold text-white">{enrolledCount}</span>
          <p className="text-sm text-slate-400">Enrollados</p>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1 mb-2">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-3xl font-bold text-white">{graduatedCount}</span>
          <p className="text-sm text-slate-400">Graduados</p>
        </motion.div>
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
