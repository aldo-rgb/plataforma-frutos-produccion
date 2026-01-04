'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Lock, AlertCircle, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinancialStats {
  kpis: {
    grossRevenue: number;
    netRevenue: number;
    escrowAmount: number;
    commissionsToPay: number;
  };
  chartData: Array<{
    date: string;
    revenue: number;
    payouts: number;
  }>;
  stats: {
    totalMentors: number;
    activeMentors: number;
    totalOrganizations: number;
    activeVisions: number;
  };
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats/financial');
      
      if (!response.ok) {
        throw new Error('Error al cargar datos financieros');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500" size={24} />
              <p className="text-white">{error || 'Error al cargar datos'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Configuración del gráfico
  const chartConfig = {
    labels: data.chartData.map(d => formatDate(d.date)),
    datasets: [
      {
        label: 'Ingresos',
        data: data.chartData.map(d => d.revenue),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Pagos a Mentores',
        data: data.chartData.map(d => d.payouts),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#94a3b8',
          callback: function(value: any) {
            return `$${(value / 1000).toFixed(0)}K`;
          }
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.2)'
        }
      },
      x: {
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📈 Resumen Financiero</h1>
            <p className="text-slate-400">Dashboard de Alto Nivel - Salud Económica de la Plataforma</p>
          </div>
          <button
            onClick={fetchFinancialData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Activity size={18} />
            Actualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ventas Brutas */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div className="text-white/80 text-sm">Total</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {formatCurrency(data.kpis.grossRevenue)}
            </h3>
            <p className="text-cyan-100 text-sm">Ventas Brutas Totales</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
              <ArrowUp size={14} />
              <span>Ingresos totales recibidos</span>
            </div>
          </div>

          {/* Revenue Neto */}
          <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div className="text-white/80 text-sm">Neto</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {formatCurrency(data.kpis.netRevenue)}
            </h3>
            <p className="text-emerald-100 text-sm">Revenue Neto Quantum</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
              <Activity size={14} />
              <span>Después de comisiones</span>
            </div>
          </div>

          {/* En Custodia (Escrow) */}
          <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Lock className="text-white" size={24} />
              </div>
              <div className="text-white/80 text-sm">⚠️ Custodia</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {formatCurrency(data.kpis.escrowAmount)}
            </h3>
            <p className="text-amber-100 text-sm">En Custodia (Escrow)</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
              <AlertCircle size={14} />
              <span>Pertenece a mentores</span>
            </div>
          </div>

          {/* Comisiones por Pagar */}
          <div className="bg-gradient-to-br from-red-600 to-rose-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div className="text-white/80 text-sm">Pasivo</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {formatCurrency(data.kpis.commissionsToPay)}
            </h3>
            <p className="text-red-100 text-sm">Comisiones por Pagar</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
              <ArrowDown size={14} />
              <span>Pago semanal pendiente</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Flujo */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Flujo de Dinero - Últimos 30 Días</h2>
          <div className="h-96">
            <Line data={chartConfig} options={chartOptions} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {data.stats.totalMentors}
            </div>
            <p className="text-slate-400 text-sm">Mentores Totales</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {data.stats.activeMentors}
            </div>
            <p className="text-slate-400 text-sm">Mentores Activos</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {data.stats.totalOrganizations}
            </div>
            <p className="text-slate-400 text-sm">Organizaciones</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-cyan-400 mb-2">
              {data.stats.activeVisions}
            </div>
            <p className="text-slate-400 text-sm">Visiones Activas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
