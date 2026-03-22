'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserX, Users, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

interface BacklogsDropsStats {
  totalBacklogs: number;
  totalDrops: number;
  pendingTickets: number;
}

export default function BacklogsDropsWidget() {
  const [stats, setStats] = useState<BacklogsDropsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/coordinador/backlogs-drops-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching backlogs/drops stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = (stats?.totalBacklogs || 0) + (stats?.totalDrops || 0);

  return (
    <Link href="/dashboard/coordinador/backlogs-drops">
      <div className="bg-gradient-to-br from-orange-900/40 via-red-900/30 to-slate-900 border-2 border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all cursor-pointer group hover:scale-[1.01] h-full flex flex-col">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <UserX className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Backlogs y Drops
              </h3>
              <p className="text-sm text-slate-400">
                Gestión de reposiciones
              </p>
            </div>
          </div>
          
          {loading ? (
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          ) : (
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{total}</span>
                <span className="text-sm text-slate-500">total</span>
              </div>
            </div>
          )}
        </div>

        {!loading && stats && (
          <div className="mt-4 pt-4 border-t border-orange-500/20">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{stats.totalBacklogs}</div>
                <div className="text-xs text-slate-400">Backlogs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{stats.totalDrops}</div>
                <div className="text-xs text-slate-400">Drops</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.pendingTickets}</div>
                <div className="text-xs text-slate-400">Con Ticket</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-end gap-2 text-orange-400 group-hover:text-orange-300 transition-colors">
          <span className="text-sm font-medium">Ver todos</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
