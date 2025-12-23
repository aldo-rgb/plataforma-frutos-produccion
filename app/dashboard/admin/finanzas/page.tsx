"use client";
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';

interface Transaction {
  id: number;
  bookingId: number;
  amountTotal: number;
  platformFee: number;
  mentorEarnings: number;
  status: string;
  releasedAt: string | null;
  createdAt: string;
  booking: {
    id: number;
    type: string;
    scheduledAt: string;
    mentor: {
      id: number;
      full_name: string;
      email: string;
    };
    student: {
      id: number;
      full_name: string;
      email: string;
    };
  };
}

interface FinanceStats {
  totalSales: number;
  platformProfit: number;
  mentorPayouts: number;
  held: number;
  released: number;
  refunded: number;
}

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalSales: 0,
    platformProfit: 0,
    mentorPayouts: 0,
    held: 0,
    released: 0,
    refunded: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFinances() {
      try {
        const res = await fetch('/api/admin/finances', { cache: 'no-store' });
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.transactions) {
          setTransactions(data.transactions);
          setStats(data.stats);
        }
      } catch (error: any) {
        console.error('Error cargando finanzas:', error);
        setError(error.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    loadFinances();
  }, []);

  // Formateador de dinero
  const money = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3">
        <DollarSign className="text-green-400" /> Finanzas y Revenue Share
      </h1>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-300">
          ⚠️ Error: {error}
        </div>
      )}

      {/* --- TARJETAS DE MÉTRICAS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Ventas */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Volumen Total</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                ) : (
                  money(stats.totalSales)
                )}
              </h3>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-xl text-blue-400 border border-blue-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Monto bruto procesado en la plataforma</p>
        </div>

        {/* Ganancia Plataforma (Tu dinero) */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-green-400 text-sm font-bold uppercase tracking-wider">Tu Revenue (Neto)</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                ) : (
                  money(stats.platformProfit)
                )}
              </h3>
            </div>
            <div className="p-3 bg-green-900/20 rounded-xl text-green-400 border border-green-500/30">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500 relative z-10">Comisiones cobradas a mentores</p>
        </div>

        {/* Pagos a Mentores */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-purple-400 text-sm font-bold uppercase tracking-wider">A Dispersar (Mentores)</p>
              <h3 className="text-3xl font-black text-white mt-1">
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                ) : (
                  money(stats.mentorPayouts)
                )}
              </h3>
            </div>
            <div className="p-3 bg-purple-900/20 rounded-xl text-purple-400 border border-purple-500/30">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Dinero que pertenece a los expertos</p>
          <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs">
            <span className="text-amber-400">Retenido: {money(stats.held)}</span>
            <span className="text-green-400">Liberado: {money(stats.released)}</span>
          </div>
        </div>
      </div>

      {/* --- TABLA DE TRANSACCIONES --- */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h3 className="font-bold text-white">Historial de Transacciones</h3>
          <p className="text-xs text-slate-400 mt-1">
            {transactions.length} movimientos registrados
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Mentoría</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-right text-green-400">Tu Comisión</th>
                <th className="p-4 text-right text-purple-400">Pago Mentor</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando libros contables...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No hay movimientos financieros aún.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString('es-MX')}
                      <br />
                      <span className="text-xs opacity-50">
                        {new Date(tx.createdAt).toLocaleTimeString('es-MX')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{tx.booking.mentor.full_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3" /> 
                        Pagado por: {tx.booking.student.full_name}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      {money(tx.amountTotal)}
                    </td>
                    <td className="p-4 text-right font-mono text-green-400 bg-green-900/10">
                      + {money(tx.platformFee)}
                    </td>
                    <td className="p-4 text-right font-mono text-purple-300">
                      {money(tx.mentorEarnings)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        tx.status === 'RELEASED' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : tx.status === 'HELD'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {tx.status === 'RELEASED' 
                          ? 'LIBERADO' 
                          : tx.status === 'HELD'
                          ? 'RETENIDO'
                          : 'REEMBOLSADO'
                        }
                      </span>
                      {tx.releasedAt && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(tx.releasedAt).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DESGLOSE DE ESTADOS --- */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-900/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-xs font-bold uppercase">Retenido (HELD)</span>
            </div>
            <p className="text-2xl font-bold text-white">{money(stats.held)}</p>
            <p className="text-xs text-slate-500 mt-1">Esperando completar sesión</p>
          </div>

          <div className="bg-green-900/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs font-bold uppercase">Liberado (RELEASED)</span>
            </div>
            <p className="text-2xl font-bold text-white">{money(stats.released)}</p>
            <p className="text-xs text-slate-500 mt-1">Disponible para dispersión</p>
          </div>

          <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-xs font-bold uppercase">Reembolsado</span>
            </div>
            <p className="text-2xl font-bold text-white">{money(stats.refunded)}</p>
            <p className="text-xs text-slate-500 mt-1">Cancelaciones y devoluciones</p>
          </div>
        </div>
      )}
    </div>
  );
}
