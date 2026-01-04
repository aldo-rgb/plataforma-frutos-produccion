'use client';

import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Filter,
  Calendar,
  Users,
  Package,
  Phone,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface CommissionEntry {
  id: string;
  sourceType: 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'PACKAGE_SESSION';
  studentName: string;
  totalAmount: number;
  platformFee: number;
  payableAmount: number;
  status: 'PENDING' | 'PAID';
  serviceName: string;
  scheduledAt: string;
  completedAt: string;
  paidAt?: string;
  payoutBatchId?: string;
}

interface CommissionSummary {
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  totalSessions: number;
  mentorshipCount: number;
  disciplineCount: number;
  packageCount: number;
}

export default function ComisionesPage() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  useEffect(() => {
    loadCommissions();
  }, [statusFilter]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/mentor/commissions?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading commissions:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'MENTORSHIP_SESSION':
        return <Users className="w-4 h-4" />;
      case 'DISCIPLINE_CALL':
        return <Phone className="w-4 h-4" />;
      case 'PACKAGE_SESSION':
        return <Package className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'MENTORSHIP_SESSION':
        return 'Mentoría';
      case 'DISCIPLINE_CALL':
        return 'Disciplina';
      case 'PACKAGE_SESSION':
        return 'Sesión';
      default:
        return sourceType;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard/mentor"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Mis Comisiones</h1>
          <p className="text-slate-400">Detalle completo de tus ingresos y pagos</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Generado */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-400 text-sm">Total Generado</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatoMXN(summary.totalEarned)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {summary.totalSessions} sesiones completadas
              </div>
            </div>

            {/* Por Cobrar */}
            <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-slate-400 text-sm">Por Cobrar</span>
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {formatoMXN(summary.pendingAmount)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pendiente de pago
              </div>
            </div>

            {/* Ya Pagado */}
            <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">Ya Pagado</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatoMXN(summary.paidAmount)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Depositado
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 font-medium">Filtrar por Estado</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Estado de Pago</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendientes</option>
                <option value="PAID">Pagados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Fecha</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Tipo</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Estudiante</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Tu Pago</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No hay comisiones para mostrar
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatDate(entry.completedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {getSourceIcon(entry.sourceType)}
                          </span>
                          <span className="text-sm text-slate-300">
                            {getSourceLabel(entry.sourceType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {entry.studentName}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-400 text-right">
                        {formatoMXN(entry.payableAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                            <CheckCircle className="w-3 h-3" />
                            Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-500/30">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-blue-400 mt-1">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-blue-300 font-semibold mb-1">Información de Pagos</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Recibes comisión por cada sesión completada con tus estudiantes</li>
                <li>• Los pagos se procesan quincenalmente</li>
                <li>• Solo recibes pago por las sesiones completadas (no por la compra del paquete)</li>
                <li>• La comisión de plataforma se descuenta automáticamente</li>
                <li>• Recibirás una notificación cuando se procese tu pago</li>
                <li>• Para dudas sobre pagos, contacta a soporte@frutos.com</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
