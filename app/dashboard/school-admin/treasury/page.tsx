'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Receipt,
  Calendar, Users, Building2, ArrowUpRight, ArrowDownRight,
  Wallet, PiggyBank, AlertTriangle, CheckCircle, Clock, Filter,
  ChevronDown, ChevronUp, History, CreditCard, Eye, FileText
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  period: string;
  summary: {
    totalCollected: number;
    pendingCollection: number;
    totalExpenses: number;
    pendingExpenses: number;
    cashExpenses: number;
    netProfit: number;
    profitMargin: string | number;
  };
  cashFlow: {
    pendingDebt: number;
    confirmedCash: number;
    totalBatches: number;
    pendingBatches: number;
  };
  expensesByCategory: Record<string, number>;
  timeSeries: { date: string; income: number; expenses: number }[];
  topCoordinators: { coordinator: { id: number; nombre: string }; totalCollected: number; codesCount: number }[];
  totals: {
    codesGenerated: number;
    codesRedeemed: number;
    expensesApproved: number;
    expensesPending: number;
  };
}

interface CoordinatorDebt {
  coordinator: {
    id: number;
    nombre: string;
    email: string;
    profileImage: string | null;
  };
  debt: {
    pendingCodesAmount: number;
    pendingCodesCount: number;
    activeCodesAmount: number;
    activeCodesCount: number;
    pendingBatchesAmount: number;
    pendingBatchesCount: number;
    totalDebt: number;
  };
  stats: {
    confirmedBatchesCount: number;
  };
  pendingBatches: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

interface BatchHistory {
  id: string;
  batchNumber: string;
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  status: string;
  confirmationCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  coordinator: { id: number; nombre: string };
  confirmedBy: { id: number; nombre: string } | null;
  codesCount: number;
  expensesCount: number;
}

interface PaymentCode {
  id: string;
  code: string;
  amount: number;
  reference: string | null;
  status: string;
  createdAt: string;
  redeemedAt: string | null;
  createdBy: { id: number; nombre: string };
  redeemedBy: { id: number; nombre: string; email: string } | null;
  vision: { id: number; nombre: string } | null;
}

const EXPENSE_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  SUPPLIES: { label: 'Materiales', icon: '📦', color: 'bg-blue-500' },
  TRANSPORT: { label: 'Transporte', icon: '🚗', color: 'bg-green-500' },
  FOOD: { label: 'Alimentos', icon: '🍽️', color: 'bg-yellow-500' },
  VENUE: { label: 'Renta', icon: '🏛️', color: 'bg-purple-500' },
  EQUIPMENT: { label: 'Equipo', icon: '🖥️', color: 'bg-cyan-500' },
  MARKETING: { label: 'Marketing', icon: '📢', color: 'bg-pink-500' },
  OTHER: { label: 'Otro', icon: '📋', color: 'bg-slate-500' },
};

export default function TreasuryDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Nuevos estados para las secciones adicionales
  const [coordinatorDebts, setCoordinatorDebts] = useState<CoordinatorDebt[]>([]);
  const [batchesHistory, setBatchesHistory] = useState<BatchHistory[]>([]);
  const [myCodes, setMyCodes] = useState<PaymentCode[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [expandedCoordinator, setExpandedCoordinator] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'debts' | 'history' | 'codes'>('overview');

  const isAdmin = session?.user?.rol === 'SCHOOL_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    const allowedRoles = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    if (session?.user?.rol && !allowedRoles.includes(session.user.rol)) {
      router.push('/dashboard');
      return;
    }

    if (session?.user) {
      fetchDashboard();
    }
  }, [status, session, period]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/treasury/dashboard?period=${period}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.dashboard);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch coordinator debts
  const fetchCoordinatorDebts = async () => {
    if (!isAdmin) return;
    try {
      setLoadingDebts(true);
      const res = await fetch('/api/treasury/director/coordinator-debts');
      const result = await res.json();
      if (result.success) {
        setCoordinatorDebts(result.coordinators);
      }
    } catch (error) {
      console.error('Error fetching coordinator debts:', error);
    } finally {
      setLoadingDebts(false);
    }
  };

  // Fetch batches history
  const fetchBatchesHistory = async () => {
    if (!isAdmin) return;
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/treasury/director/batches-history?limit=20');
      const result = await res.json();
      if (result.success) {
        setBatchesHistory(result.batches);
      }
    } catch (error) {
      console.error('Error fetching batches history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch my codes (for director)
  const fetchMyCodes = async () => {
    try {
      setLoadingCodes(true);
      const res = await fetch('/api/treasury/payment-codes');
      const result = await res.json();
      if (result.success) {
        setMyCodes(result.paymentCodes);
      }
    } catch (error) {
      console.error('Error fetching my codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  // Load additional data when tab changes
  useEffect(() => {
    if (activeTab === 'debts' && coordinatorDebts.length === 0) {
      fetchCoordinatorDebts();
    } else if (activeTab === 'history' && batchesHistory.length === 0) {
      fetchBatchesHistory();
    } else if (activeTab === 'codes' && myCodes.length === 0) {
      fetchMyCodes();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-slate-400">Error al cargar el dashboard</p>
        </div>
      </div>
    );
  }

  // Calcular máximo para la gráfica
  const maxValue = Math.max(
    ...data.timeSeries.map((d) => Math.max(d.income, d.expenses)),
    1
  );

  // Calcular total de gastos por categoría
  const totalExpensesByCategory = Object.values(data.expensesByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <BarChart3 className="w-8 h-8 text-indigo-400" />
              </div>
              Dashboard Financiero
            </h1>
            <p className="text-slate-400 mt-2">
              Análisis de ingresos, gastos y rentabilidad
            </p>
          </div>

          {/* Selector de período */}
          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs de navegación (solo para admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'debts'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Deuda por Coordinador
              {data.cashFlow.pendingDebt > 0 && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                  ${(data.cashFlow.pendingDebt / 1000).toFixed(0)}k
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              Historial de Cortes
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Mis Códigos
            </button>
          </div>
        )}

        {/* Contenido según tab activo */}
        {activeTab === 'overview' && (
          <>
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/dashboard/school-admin/treasury/cobro"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-all group"
          >
            <DollarSign className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-medium">Terminal de Cobro</p>
            <p className="text-slate-500 text-xs">Generar códigos</p>
          </Link>
          <Link
            href="/dashboard/school-admin/treasury/gastos"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-orange-500/50 transition-all group"
          >
            <Receipt className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-medium">Gestor de Gastos</p>
            <p className="text-slate-500 text-xs">Registrar gastos</p>
          </Link>
          <Link
            href="/dashboard/school-admin/treasury/corte"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition-all group"
          >
            <Wallet className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-medium">Corte de Caja</p>
            <p className="text-slate-500 text-xs">Cerrar período</p>
          </Link>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <PiggyBank className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-white font-medium">Balance</p>
            <p className="text-purple-400 text-lg font-bold">${data.summary.netProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-400 text-sm font-medium">Ingresos</span>
              <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">${data.summary.totalCollected.toLocaleString()}</p>
            <p className="text-emerald-400/70 text-sm mt-1">
              +${data.summary.pendingCollection.toLocaleString()} pendiente
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm font-medium">Egresos</span>
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">${data.summary.totalExpenses.toLocaleString()}</p>
            <p className="text-red-400/70 text-sm mt-1">
              ${data.summary.pendingExpenses.toLocaleString()} por aprobar
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-400 text-sm font-medium">Utilidad Neta</span>
              {data.summary.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <p className={`text-3xl font-bold ${data.summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              ${data.summary.netProfit.toLocaleString()}
            </p>
            <p className="text-indigo-400/70 text-sm mt-1">
              Margen: {data.summary.profitMargin}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 text-sm font-medium">Deuda Coordinadores</span>
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">${data.cashFlow.pendingDebt.toLocaleString()}</p>
            <p className="text-yellow-400/70 text-sm mt-1">
              {data.cashFlow.pendingBatches} cortes pendientes
            </p>
          </div>
        </div>

        {/* Gráfica y Categorías */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfica de tendencia */}
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Tendencia de Ingresos vs Egresos</h3>
            
            <div className="h-64 flex items-end gap-1">
              {data.timeSeries.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  {/* Barra de ingresos */}
                  <div
                    className="w-full bg-emerald-500/80 rounded-t"
                    style={{ height: `${(item.income / maxValue) * 100}%`, minHeight: item.income > 0 ? '4px' : '0' }}
                    title={`Ingresos: $${item.income.toLocaleString()}`}
                  />
                  {/* Barra de egresos */}
                  <div
                    className="w-full bg-red-500/80 rounded-t"
                    style={{ height: `${(item.expenses / maxValue) * 100}%`, minHeight: item.expenses > 0 ? '4px' : '0' }}
                    title={`Egresos: $${item.expenses.toLocaleString()}`}
                  />
                  <span className="text-xs text-slate-500 mt-2 truncate w-full text-center">{item.date}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-slate-400 text-sm">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-slate-400 text-sm">Egresos</span>
              </div>
            </div>
          </div>

          {/* Gastos por categoría */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Gastos por Categoría</h3>
            
            {Object.keys(data.expensesByCategory).length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500">Sin gastos en este período</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const catInfo = EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES.OTHER;
                    const percentage = totalExpensesByCategory > 0 ? (amount / totalExpensesByCategory) * 100 : 0;
                    
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-300 text-sm flex items-center gap-2">
                            <span>{catInfo.icon}</span>
                            {catInfo.label}
                          </span>
                          <span className="text-white font-medium">${amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${catInfo.color} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-slate-500 text-xs text-right mt-1">{percentage.toFixed(1)}%</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Stats de actividad y Top Coordinadores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estadísticas de actividad */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Actividad del Período</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-500 text-sm">Códigos Generados</p>
                <p className="text-2xl font-bold text-white">{data.totals.codesGenerated}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-500 text-sm">Códigos Canjeados</p>
                <p className="text-2xl font-bold text-emerald-400">{data.totals.codesRedeemed}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-500 text-sm">Gastos Aprobados</p>
                <p className="text-2xl font-bold text-white">{data.totals.expensesApproved}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-500 text-sm">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">{data.totals.expensesPending}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-indigo-400 font-medium">Cash Confirmado</p>
                  <p className="text-white text-xl font-bold">${data.cashFlow.confirmedCash.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Coordinadores (solo admin) */}
          {isAdmin && data.topCoordinators.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Top Coordinadores
              </h3>
              
              <div className="space-y-4">
                {data.topCoordinators.map((coord, index) => (
                  <div
                    key={coord.coordinator?.id || index}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-slate-300 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-700 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{coord.coordinator?.nombre || 'Sin nombre'}</p>
                        <p className="text-slate-500 text-sm">{coord.codesCount} códigos</p>
                      </div>
                    </div>
                    <p className="text-emerald-400 font-bold">${coord.totalCollected.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Si no es admin, mostrar resumen personal */}
          {!isAdmin && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-6">Tu Resumen</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    <span className="text-slate-300">Total Recaudado</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-xl">${data.summary.totalCollected.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-yellow-400" />
                    <span className="text-slate-300">Deuda Pendiente</span>
                  </div>
                  <span className="text-yellow-400 font-bold text-xl">${data.cashFlow.pendingDebt.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                    <span className="text-slate-300">Entregado</span>
                  </div>
                  <span className="text-blue-400 font-bold text-xl">${data.cashFlow.confirmedCash.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}

        {/* Tab: Deuda por Coordinador */}
        {activeTab === 'debts' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-400" />
                  Deuda Pendiente por Coordinador
                </h3>
                <button
                  onClick={fetchCoordinatorDebts}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Actualizar
                </button>
              </div>

              {loadingDebts ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                </div>
              ) : coordinatorDebts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">No hay deudas pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coordinatorDebts.map((coord) => (
                    <div
                      key={coord.coordinator.id}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        coord.debt.totalDebt > 0 
                          ? 'border-yellow-500/30 bg-yellow-500/5' 
                          : 'border-slate-700 bg-slate-900/50'
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedCoordinator(
                          expandedCoordinator === coord.coordinator.id ? null : coord.coordinator.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                              {coord.coordinator.profileImage ? (
                                <img
                                  src={coord.coordinator.profileImage}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <Users className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{coord.coordinator.nombre}</p>
                              <p className="text-slate-500 text-sm">{coord.coordinator.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-xl font-bold ${
                                coord.debt.totalDebt > 0 ? 'text-yellow-400' : 'text-emerald-400'
                              }`}>
                                ${coord.debt.totalDebt.toLocaleString()}
                              </p>
                              <p className="text-slate-500 text-xs">Deuda total</p>
                            </div>
                            {expandedCoordinator === coord.coordinator.id ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detalles expandidos */}
                      {expandedCoordinator === coord.coordinator.id && (
                        <div className="border-t border-slate-700 p-4 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 rounded-lg p-3">
                              <p className="text-slate-500 text-xs">Códigos Canjeados</p>
                              <p className="text-white font-bold">{coord.debt.pendingCodesCount}</p>
                              <p className="text-yellow-400 text-sm">${coord.debt.pendingCodesAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                              <p className="text-slate-500 text-xs">Códigos Activos</p>
                              <p className="text-white font-bold">{coord.debt.activeCodesCount}</p>
                              <p className="text-blue-400 text-sm">${coord.debt.activeCodesAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                              <p className="text-slate-500 text-xs">Cortes Pendientes</p>
                              <p className="text-white font-bold">{coord.debt.pendingBatchesCount}</p>
                              <p className="text-orange-400 text-sm">${coord.debt.pendingBatchesAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                              <p className="text-slate-500 text-xs">Cortes Confirmados</p>
                              <p className="text-emerald-400 font-bold">{coord.stats.confirmedBatchesCount}</p>
                            </div>
                          </div>

                          {coord.pendingBatches.length > 0 && (
                            <div>
                              <p className="text-slate-400 text-sm mb-2">Cortes pendientes de confirmar:</p>
                              <div className="space-y-2">
                                {coord.pendingBatches.map((batch) => (
                                  <div
                                    key={batch.id}
                                    className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                                  >
                                    <div>
                                      <p className="text-white text-sm">Corte #{batch.id.slice(-6)}</p>
                                      <p className="text-slate-500 text-xs">
                                        {new Date(batch.createdAt).toLocaleDateString('es-MX')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        batch.status === 'PENDING_DELIVERY'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {batch.status === 'PENDING_DELIVERY' ? 'Por entregar' : batch.status}
                                      </span>
                                      <span className="text-white font-medium">
                                        ${batch.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Historial de Cortes */}
        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Historial de Cortes de Caja
                </h3>
                <button
                  onClick={fetchBatchesHistory}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Actualizar
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : batchesHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay historial de cortes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                        <th className="pb-3 font-medium">Fecha</th>
                        <th className="pb-3 font-medium">Coordinador</th>
                        <th className="pb-3 font-medium">Recaudado</th>
                        <th className="pb-3 font-medium">Gastos</th>
                        <th className="pb-3 font-medium">Neto</th>
                        <th className="pb-3 font-medium">Códigos</th>
                        <th className="pb-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {batchesHistory.map((batch) => (
                        <tr key={batch.id} className="text-sm">
                          <td className="py-3">
                            <p className="text-white">
                              {new Date(batch.createdAt).toLocaleDateString('es-MX')}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {new Date(batch.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="py-3 text-white">{batch.coordinator?.nombre || 'N/A'}</td>
                          <td className="py-3 text-emerald-400">${batch.totalCollected.toLocaleString()}</td>
                          <td className="py-3 text-red-400">${batch.totalExpenses.toLocaleString()}</td>
                          <td className="py-3 text-white font-medium">${batch.netAmount.toLocaleString()}</td>
                          <td className="py-3 text-slate-300">{batch.codesCount}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              batch.status === 'CONFIRMED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : batch.status === 'PENDING_DELIVERY'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {batch.status === 'CONFIRMED' 
                                ? '✓ Confirmado' 
                                : batch.status === 'PENDING_DELIVERY'
                                ? 'Por entregar'
                                : batch.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Mis Códigos Generados */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Mis Códigos Generados
                </h3>
                <button
                  onClick={fetchMyCodes}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Actualizar
                </button>
              </div>

              {loadingCodes ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
              ) : myCodes.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No has generado códigos aún</p>
                  <Link
                    href="/dashboard/school-admin/treasury/cobro"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Generar Código
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                        <th className="pb-3 font-medium">Código</th>
                        <th className="pb-3 font-medium">Monto</th>
                        <th className="pb-3 font-medium">Referencia</th>
                        <th className="pb-3 font-medium">Estado</th>
                        <th className="pb-3 font-medium">Canjeado por</th>
                        <th className="pb-3 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {myCodes.map((code) => (
                        <tr key={code.id} className="text-sm">
                          <td className="py-3">
                            <span className="font-mono text-white bg-slate-900 px-2 py-1 rounded">
                              {code.code}
                            </span>
                          </td>
                          <td className="py-3 text-emerald-400 font-medium">
                            ${code.amount.toLocaleString()}
                          </td>
                          <td className="py-3 text-slate-300">
                            {code.reference || '-'}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              code.status === 'REDEEMED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : code.status === 'ACTIVE'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {code.status === 'REDEEMED' 
                                ? '✓ Canjeado' 
                                : code.status === 'ACTIVE'
                                ? 'Activo'
                                : 'Cancelado'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">
                            {code.redeemedBy ? (
                              <div>
                                <p className="text-white">{code.redeemedBy.nombre}</p>
                                <p className="text-slate-500 text-xs">{code.redeemedBy.email}</p>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 text-slate-400">
                            {new Date(code.createdAt).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
