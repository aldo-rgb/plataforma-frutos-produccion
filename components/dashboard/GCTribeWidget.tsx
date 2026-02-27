'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Award, TrendingUp, Target } from 'lucide-react';
import PersonalQRWidget from './PersonalQRWidget';

interface GCTribeWidgetProps {
  userName: string;
  userId: number;
  userEmail: string;
  referralCode?: string;
  organizationId?: number | null;
}

interface TribeStats {
  visionId: number;
  visionName: string;
  tribeMission?: string | null;
  enrolledCount: number;
  graduatedCount: number;
}

export default function GCTribeWidget({ 
  userName, 
  userId, 
  userEmail, 
  referralCode,
  organizationId 
}: GCTribeWidgetProps) {
  const [stats, setStats] = useState<TribeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/gamechanger/tribe-stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching tribe stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-900/20 via-slate-900 to-amber-900/10 border border-yellow-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-12 bg-slate-700/50 rounded-xl mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-24 bg-slate-700/50 rounded-xl"></div>
          <div className="h-24 bg-slate-700/50 rounded-xl"></div>
        </div>
        <div className="h-12 bg-yellow-600/30 rounded-xl"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-yellow-900/20 via-slate-900 to-amber-900/10 border border-yellow-500/30 rounded-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{stats.visionName}</h3>
              <p className="text-xs text-slate-400">Tu legado transformacional</p>
            </div>
          </div>
        </div>

        {/* Misión de la Tribu */}
        {stats.tribeMission && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/30 to-yellow-900/20 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-yellow-400/80 font-medium mb-1">Nuestra Misión</p>
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  "{stats.tribeMission}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center gap-1 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-3xl font-bold text-white">{stats.enrolledCount}</span>
            <p className="text-sm text-slate-400">Enrollados</p>
          </motion.div>

          <motion.div
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center gap-1 mb-2">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-3xl font-bold text-white">{stats.graduatedCount}</span>
            <p className="text-sm text-slate-400">Graduados</p>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={() => setShowQRModal(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <UserPlus className="w-4 h-4" />
          <span>Invitar a alguien</span>
        </motion.button>
      </motion.div>

      {/* Modal de QR */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PersonalQRWidget
              userName={userName}
              userId={userId}
              userEmail={userEmail}
              referralCode={referralCode}
              organizationId={organizationId}
            />
          </div>
        </div>
      )}
    </>
  );
}
