'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface Commission {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  concept: string;
}

interface CommissionsData {
  totalPending: number;
  totalPaid: number;
  commissions: Commission[];
}

export default function MyCommissionsWidget() {
  const [data, setData] = useState<CommissionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    try {
      const res = await fetch('/api/user/my-commissions');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error cargando comisiones:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar widget si no hay comisiones
  if (loading) return null;
  if (!data || (data.totalPending === 0 && data.totalPaid === 0)) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Mis Comisiones</h3>
        </div>
        <a 
          href="/dashboard/comisiones" 
          className="text-xs text-emerald-400 hover:underline"
        >
          Ver todas
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Pendientes */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-300">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            ${data.totalPending.toLocaleString('es-MX')}
          </p>
        </div>

        {/* Pagadas */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-300">Pagadas</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            ${data.totalPaid.toLocaleString('es-MX')}
          </p>
        </div>
      </div>

      {/* Últimas comisiones */}
      {data.commissions && data.commissions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-2">Últimas comisiones</p>
          <div className="space-y-2">
            {data.commissions.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400 truncate max-w-[60%]">{c.concept}</span>
                <span className={`font-medium ${c.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>
                  ${c.amount.toLocaleString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
