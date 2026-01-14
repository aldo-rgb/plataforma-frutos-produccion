'use client';

import { useState, useEffect } from 'react';
import { Building2, Ticket, Phone, ChevronRight, Loader2, Users } from 'lucide-react';
import Link from 'next/link';

interface TrainingStats {
  community: {
    total: number;
    products: number;
  };
  preRegistros: {
    total: number;
    pending: number;
    paid: number;
    expired: number;
    cancelled: number;
  };
  calls: {
    pending: number;
    total: number;
  };
  activeProducts: {
    id: number;
    name: string;
    levelType: string;
  }[];
}

export default function TrainingStatsWidgets() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/coordinador/training-stats');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching training stats:', error);
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
      {/* Widget de Comunidad */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              COMUNIDAD
            </p>
            <p className="text-4xl font-black text-white mb-2">
              {stats.community.total}
            </p>
            <p className="text-sm text-slate-400">
              Todos los usuarios que pertenecen a la comunidad
            </p>
          </div>
        </div>
      </div>

      {/* Widget de Llamadas Pendientes */}
      <Link href="/dashboard/coordinador/llamadas" className="block">
        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-2 border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Ticket className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                LLAMADAS PENDIENTES
              </p>
              <p className="text-4xl font-black text-white mb-2">
                {stats.calls.pending}<span className="text-2xl text-slate-500">/{stats.calls.total}</span>
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Gestión de llamadas del día
                </p>
                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Ir a llamadas</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Widget de Declarados */}
      <Link href="/dashboard/coordinador/pre-registros" className="block">
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border-2 border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
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
                  De un total de {stats.preRegistros.total} declarados
                </p>
                <div className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Ver todos</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Widget de Inscritos (Pagados) */}
      <Link href="/dashboard/coordinador/pre-registros?filter=PAID" className="block">
        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/80 border-2 border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Ticket className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                INSCRITOS (PAGADOS)
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-black text-white">
                  {stats.preRegistros.paid}
                </p>
                <span className="text-lg text-emerald-400">✓ pagados</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {stats.preRegistros.total > 0 
                    ? `${Math.round((stats.preRegistros.paid / stats.preRegistros.total) * 100)}% de conversión`
                    : 'Sin declarados aún'
                  }
                </p>
                <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition-transform">
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
