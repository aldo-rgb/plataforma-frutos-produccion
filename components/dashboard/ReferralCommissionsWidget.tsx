'use client';

import { useState, useEffect } from 'react';
import { Gift, Users, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CommissionStats {
  available: number;
  totalEarned: number;
  totalReferrals: number;
}

export default function ReferralCommissionsWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionStats | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const res = await fetch('/api/ambassador/wallet');
      const result = await res.json();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
          <Gift className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            MIS COMISIONES
          </span>
          <Link 
            href="/dashboard/mi-negocio" 
            className="text-xs text-purple-400 hover:underline cursor-pointer"
          >
            Ver detalles
          </Link>
        </div>
      </div>

      {/* Balance principal */}
      <div className="relative z-10">
        <div className="flex items-center gap-1 text-slate-100 font-bold text-2xl mb-1">
          {formatMXN(stats?.available || 0)}
        </div>
        <p className="text-sm text-slate-400 mb-3">Disponible</p>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">
              <span className="text-green-400 font-semibold">{stats?.totalReferrals || 0}</span> referidos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-400">
              {formatMXN(stats?.totalEarned || 0)} total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
