'use client';

import { useState, useEffect } from 'react';
import { Users, Ticket, ChevronRight, GraduationCap, Target } from 'lucide-react';
import Link from 'next/link';

interface DirectorTrainingStats {
  preRegistros: {
    total: number;
    pending: number;
    paid: number;
    expired: number;
    cancelled: number;
  };
  inscritos: {
    total: number;
    byLevel: {
      BASIC: number;
      ADVANCED: number;
      PL: number;
    };
  };
}

export default function DirectorTrainingWidgets() {
  const [stats, setStats] = useState<DirectorTrainingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/director/training-stats');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching director training stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-slate-800/50 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-12 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Widget de Declarados (Pre-registros pendientes) */}
      <Link href="/dashboard/school-admin/pre-registros" className="block">
        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-2 border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                DECLARADOS
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-black text-white">
                  {stats.preRegistros.pending}
                </p>
                <span className="text-lg text-slate-500">pendientes</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Participantes pendientes de pago
                </p>
                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Ver todos</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Widget de Inscritos (Pagados) */}
      <Link href="/dashboard/school-admin/pre-registros?filter=PAID" className="block">
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border-2 border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                INSCRITOS
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-black text-white">
                  {stats.preRegistros.paid}
                </p>
                <span className="text-lg text-emerald-400">✓ pagados</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Participantes pagados
                </p>
                <div className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Ver lista</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
