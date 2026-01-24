'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, AlertTriangle, CheckCircle, Clock, Mail,
  RefreshCw, Filter, Download, TrendingUp, DollarSign,
  Users, XCircle, Send, MoreVertical, Eye, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface AbandonedCheckout {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  visionId: number;
  visionName: string;
  originalPrice: number;
  anticipoAmount: number | null;
  status: string;
  checkoutStartedAt: string;
  abandonedAt: string | null;
  emailSentAt: string | null;
  convertedAt: string | null;
  userId: number | null;
  userName: string | null;
  ticketId: string | null;
  ticketStatus: string | null;
}

interface Stats {
  byStatus: Record<string, number>;
  totalAbandoned: number;
  totalConverted: number;
  conversionRate: string;
  potentialRevenue: number;
  recoveredRevenue: number;
}

interface Vision {
  id: number;
  nombre: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  'IN_CHECKOUT': { label: 'En checkout', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: ShoppingCart },
  'ABANDONED': { label: 'Abandonado', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', icon: AlertTriangle },
  'EMAIL_SENT': { label: 'Email enviado', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30', icon: Mail },
  'CONVERTED_ANTICIPO': { label: 'Pagó anticipo', color: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: CheckCircle },
  'CONVERTED_FULL': { label: 'Pagó completo', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: CheckCircle },
  'EXPIRED': { label: 'Expirado', color: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', icon: XCircle }
};

export default function AbandonedCheckoutsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [orgConfig, setOrgConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVision, setFilterVision] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchData();
    }
  }, [authStatus, session, filterStatus, filterVision, filterStartDate, filterEndDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterVision) params.append('visionId', filterVision);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const res = await fetch(`/api/school-admin/abandoned-checkouts?${params}`);
      const data = await res.json();

      if (res.ok) {
        setCheckouts(data.checkouts);
        setStats(data.stats);
        setVisions(data.visions);
        setOrgConfig(data.orgConfig);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (checkoutId: string, action: string) => {
    setActionLoading(checkoutId);
    try {
      const res = await fetch('/api/school-admin/abandoned-checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId, action })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Nombre', 'Teléfono', 'Visión', 'Precio', 'Estado', 'Fecha inicio', 'Fecha abandono'];
    const rows = checkouts.map(c => [
      c.email,
      c.fullName,
      c.phone || '',
      c.visionName,
      c.originalPrice,
      STATUS_CONFIG[c.status]?.label || c.status,
      c.checkoutStartedAt,
      c.abandonedAt || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkouts-abandonados-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/school-admin"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-7 h-7 text-amber-500" />
                Checkouts Abandonados
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Recupera ventas perdidas con el sistema de anticipos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Config Alert */}
        {orgConfig && !orgConfig.anticiposEnabled && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-400">Sistema de anticipos desactivado</p>
              <p className="text-amber-300/70 text-sm">
                Activa el sistema de anticipos en{' '}
                <Link href="/dashboard/school-admin/precios" className="underline font-medium text-amber-400 hover:text-amber-300">
                  Configuración de Precios
                </Link>
                {' '}para detectar y registrar checkouts abandonados automáticamente.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Abandonados</p>
                  <p className="text-2xl font-bold text-white">{stats.totalAbandoned}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Recuperados</p>
                  <p className="text-2xl font-bold text-white">{stats.totalConverted}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tasa de recuperación</p>
                  <p className="text-2xl font-bold text-white">{stats.conversionRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Ingresos recuperados</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(Number(stats.recoveredRevenue))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Summary */}
        {stats && (
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <h3 className="font-semibold text-white mb-4">Resumen por Estado</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = stats.byStatus[key] || 0;
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      filterStatus === key 
                        ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' 
                        : ''
                    } ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{config.label}</span>
                    <span className="bg-slate-800/50 px-2 py-0.5 rounded-full text-sm">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-white">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Visión</label>
              <select
                value={filterVision}
                onChange={(e) => setFilterVision(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Todas las visiones</option>
                {visions.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Fecha fin</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterVision('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="w-full px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cliente</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Visión</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Precio</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Estado</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Fecha</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {checkouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                      <p className="font-medium text-slate-300">No hay checkouts abandonados</p>
                      <p className="text-sm">Los registros aparecerán aquí cuando alguien abandone el proceso de pago</p>
                    </td>
                  </tr>
                ) : (
                  checkouts.map((checkout) => {
                    const statusConfig = STATUS_CONFIG[checkout.status] || STATUS_CONFIG['ABANDONED'];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={checkout.id} className="hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{checkout.fullName}</p>
                            <p className="text-sm text-slate-400">{checkout.email}</p>
                            {checkout.phone && (
                              <p className="text-sm text-slate-500">{checkout.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{checkout.visionName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">
                            {formatCurrency(checkout.originalPrice)}
                          </p>
                          {checkout.anticipoAmount && (
                            <p className="text-sm text-green-400">
                              Anticipo: {formatCurrency(checkout.anticipoAmount)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig.label}
                          </span>
                          {checkout.emailSentAt && (
                            <p className="text-xs text-slate-500 mt-1">
                              Email: {formatDate(checkout.emailSentAt)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-300">
                            {formatDate(checkout.checkoutStartedAt)}
                          </p>
                          {checkout.abandonedAt && (
                            <p className="text-xs text-slate-500">
                              Abandonó: {formatDate(checkout.abandonedAt)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {(checkout.status === 'ABANDONED' || checkout.status === 'EMAIL_SENT') && (
                              <>
                                <button
                                  onClick={() => handleAction(checkout.id, 'resend_email')}
                                  disabled={actionLoading === checkout.id || !orgConfig?.anticiposEnabled}
                                  className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
                                  title={!orgConfig?.anticiposEnabled ? 'Anticipos desactivados' : 'Reenviar email'}
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAction(checkout.id, 'mark_expired')}
                                  disabled={actionLoading === checkout.id}
                                  className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                  title="Marcar como expirado"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {checkout.ticketId && (
                              <Link
                                href={`/dashboard/school-admin/treasury?ticket=${checkout.ticketId}`}
                                className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                                title="Ver ticket"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
