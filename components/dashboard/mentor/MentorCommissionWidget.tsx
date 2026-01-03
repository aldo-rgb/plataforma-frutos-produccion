'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, ArrowRight, Clock } from 'lucide-react';

interface CommissionSummary {
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  totalSessions: number;
}

export default function MentorCommissionWidget() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/mentor/commissions');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading commission summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatoMXN = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cantidad);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <span className="p-3 bg-emerald-900/30 text-emerald-400 rounded-lg">
          <DollarSign className="w-6 h-6" />
        </span>
        <div>
          <h4 className="text-white font-bold text-lg">Mis Comisiones</h4>
          <p className="text-xs text-emerald-400">{summary.totalSessions} servicios completados</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {/* Total Generado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">Total Generado</span>
          </div>
          <span className="text-white font-bold text-lg">{formatoMXN(summary.totalEarned)}</span>
        </div>

        {/* Por Cobrar */}
        <div className="flex items-center justify-between bg-orange-900/20 rounded-lg p-3 border border-orange-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-orange-300 text-sm font-semibold">Por Cobrar</span>
          </div>
          <span className="text-orange-400 font-bold text-lg">{formatoMXN(summary.pendingAmount)}</span>
        </div>

        {/* Pagado */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">✅ Ya Depositado</span>
          <span className="text-emerald-400 font-medium">{formatoMXN(summary.paidAmount)}</span>
        </div>
      </div>

      <Link 
        href="/dashboard/mentor/comisiones"
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        Ver Detalle Completo
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
