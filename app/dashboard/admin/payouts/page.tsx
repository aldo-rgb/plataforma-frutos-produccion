'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Eye,
  ChevronDown,
  Search,
  RefreshCw,
} from 'lucide-react';

interface Payout {
  id: number;
  mentorId: number;
  visionId: number;
  weekNumber: number;
  callsCompleted: number;
  ratePerCall: number;
  totalAmount: number;
  status: 'PENDING' | 'GENERATED' | 'PAID' | 'FAILED' | 'DISPUTED';
  generatedAt: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionRef?: string;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
  };
  VisionEscrow: {
    Vision: {
      id: number;
      nombre: string;
    };
  };
  _count: {
    PayableCall: number;
  };
}

interface Stats {
  payouts: {
    total: number;
    pending: number;
    paid: number;
  };
  amounts: {
    totalPaid: number;
    totalPending: number;
  };
  escrows: {
    active: number;
    closed: number;
  };
  refunds: {
    count: number;
    totalAmount: number;
  };
}

interface TopMentor {
  mentorId: number;
  mentorNombre: string;
  totalEarned: number;
  payoutsCount: number;
}

export default function AdminPayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topMentors, setTopMentors] = useState<TopMentor[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payouts
      const payoutsParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        payoutsParams.append('status', statusFilter);
      }
      
      const [payoutsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/payouts/generate-weekly?${payoutsParams}`),
        fetch('/api/admin/payouts/stats'),
      ]);

      if (payoutsRes.ok && statsRes.ok) {
        const payoutsData = await payoutsRes.json();
        const statsData = await statsRes.json();
        
        setPayouts(payoutsData.payouts || []);
        setStats(statsData.stats);
        setTopMentors(statsData.topMentors || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayout) return;
    
    setProcessingPayout(true);
    try {
      const res = await fetch(`/api/admin/payouts/${selectedPayout.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          transactionRef,
        }),
      });

      if (res.ok) {
        // Refresh data
        await fetchData();
        setShowMarkPaidModal(false);
        setSelectedPayout(null);
        setTransactionRef('');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al marcar como pagado');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al procesar el pago');
    } finally {
      setProcessingPayout(false);
    }
  };

  const exportToCSV = () => {
    const filteredPayouts = getFilteredPayouts();
    
    const headers = ['ID', 'Mentor', 'Email', 'Visión', 'Semana', 'Llamadas', 'Tarifa', 'Total', 'Estado', 'Generado', 'Pagado'];
    const rows = filteredPayouts.map(p => [
      p.id,
      p.Usuario.nombre,
      p.Usuario.email,
      p.VisionEscrow.Vision.nombre,
      p.weekNumber,
      p.callsCompleted,
      p.ratePerCall,
      p.totalAmount,
      p.status,
      new Date(p.generatedAt).toLocaleDateString(),
      p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getFilteredPayouts = () => {
    return payouts.filter(p => {
      const matchesSearch = 
        p.Usuario.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Usuario.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.VisionEscrow.Vision.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/30';
      case 'GENERATED':
        return 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/30';
      case 'PENDING':
        return 'text-[#00F0FF] bg-[#00F0FF]/10 border-[#00F0FF]/30';
      case 'FAILED':
        return 'text-[#FF2A6D] bg-[#FF2A6D]/10 border-[#FF2A6D]/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />;
      case 'GENERATED':
        return <Clock className="w-4 h-4" />;
      case 'PENDING':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-4 border-[#00F0FF]/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#00F0FF] animate-spin"></div>
          <Sparkles className="w-12 h-12 text-[#00F0FF] animate-pulse" />
        </div>
      </div>
    );
  }

  const filteredPayouts = getFilteredPayouts();

  return (
    <div className="min-h-screen bg-[#050B14] p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#7B2CBF]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-[#00F0FF]/20 to-[#7B2CBF]/20 rounded-xl border border-[#00F0FF]/30 backdrop-blur-xl">
              <DollarSign className="w-6 h-6 text-[#00F0FF]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-[#FFD700]">
                Panel de Pagos Quantum
              </h1>
              <p className="text-gray-400 text-sm">Sistema de gestión de pagos a mentores</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Paid */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/10 via-[#00F0FF]/10 to-transparent blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#00FF94]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle className="w-8 h-8 text-[#00FF94]" />
                  <span className="text-xs text-[#00FF94] bg-[#00FF94]/10 px-2 py-1 rounded-full">Pagado</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${stats.amounts.totalPaid.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">{stats.payouts.paid} pagos completados</p>
              </div>
            </div>

            {/* Total Pending */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/10 via-[#00F0FF]/10 to-transparent blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#FFD700]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8 text-[#FFD700]" />
                  <span className="text-xs text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded-full">Pendiente</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${stats.amounts.totalPending.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">{stats.payouts.pending} pagos por procesar</p>
              </div>
            </div>

            {/* Active Escrows */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#7B2CBF]/10 via-[#00F0FF]/10 to-transparent blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#7B2CBF]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-[#7B2CBF]" />
                  <span className="text-xs text-[#7B2CBF] bg-[#7B2CBF]/10 px-2 py-1 rounded-full">Activos</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {stats.escrows.active}
                </p>
                <p className="text-sm text-gray-400">Ciclos en curso</p>
              </div>
            </div>

            {/* Refunds */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/10 via-[#7B2CBF]/10 to-transparent blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#00F0FF]/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <RefreshCw className="w-8 h-8 text-[#00F0FF]" />
                  <span className="text-xs text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-1 rounded-full">Reembolsos</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${stats.refunds.totalAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">{stats.refunds.count} reembolsos procesados</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Mentors */}
        {topMentors.length > 0 && (
          <div className="mb-6">
            <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#FFD700]/30 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-[#FFD700] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Top 5 Mentores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {topMentors.map((mentor, idx) => (
                  <div key={mentor.mentorId} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/10 to-transparent blur group-hover:blur-lg transition-all"></div>
                    <div className="relative bg-[#0A1018]/50 border border-[#FFD700]/20 rounded-xl p-4 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-[#FFD700] to-[#FF8C00] rounded-full flex items-center justify-center text-[#050B14] font-bold text-lg">
                        #{idx + 1}
                      </div>
                      <p className="text-sm font-semibold text-white mb-1 truncate">{mentor.mentorNombre}</p>
                      <p className="text-lg font-bold text-[#FFD700]">
                        ${mentor.totalEarned.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{mentor.payoutsCount} pagos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6">
          <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#00F0FF]/30 rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00F0FF]" />
                <input
                  type="text"
                  placeholder="Buscar por mentor, email o visión..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A1018]/50 border border-[#00F0FF]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF] transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                {['all', 'GENERATED', 'PAID', 'PENDING'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-[#00F0FF] text-[#050B14]'
                        : 'bg-[#0A1018]/50 text-gray-400 border border-[#00F0FF]/20 hover:border-[#00F0FF]/50'
                    }`}
                  >
                    {status === 'all' ? 'Todos' : status}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-3 bg-[#7B2CBF]/20 border border-[#7B2CBF]/30 rounded-xl text-[#7B2CBF] hover:bg-[#7B2CBF]/30 transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={fetchData}
                  className="px-4 py-3 bg-[#00F0FF]/20 border border-[#00F0FF]/30 rounded-xl text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="relative bg-[#151B26]/50 backdrop-blur-xl border border-[#00F0FF]/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#00F0FF]/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Mentor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Visión</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Semana</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Llamadas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#00F0FF]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-12 h-12 text-gray-600" />
                        <p className="text-gray-400">No hay pagos que mostrar</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-[#00F0FF]/10 hover:bg-[#00F0FF]/5 transition-colors">
                      <td className="px-6 py-4 text-white font-mono text-sm">{payout.id}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{payout.Usuario.nombre}</p>
                          <p className="text-gray-400 text-xs">{payout.Usuario.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm max-w-xs truncate">
                        {payout.VisionEscrow.Vision.nombre}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#7B2CBF]/20 border border-[#7B2CBF]/30 rounded-full text-[#7B2CBF] text-sm font-medium">
                          Semana {payout.weekNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">{payout.callsCompleted}</td>
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8C00]">
                          ${payout.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">${payout.ratePerCall} / llamada</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(payout.status)}`}>
                          {getStatusIcon(payout.status)}
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payout.status === 'GENERATED' && (
                          <button
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowMarkPaidModal(true);
                            }}
                            className="px-4 py-2 bg-[#00FF94]/20 border border-[#00FF94]/30 rounded-lg text-[#00FF94] hover:bg-[#00FF94]/30 transition-all text-sm font-medium"
                          >
                            Marcar Pagado
                          </button>
                        )}
                        {payout.status === 'PAID' && payout.paidAt && (
                          <div className="text-xs text-gray-400">
                            <p>Pagado: {new Date(payout.paidAt).toLocaleDateString()}</p>
                            {payout.transactionRef && (
                              <p className="font-mono">{payout.transactionRef}</p>
                            )}
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
      </div>

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedPayout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[#151B26] border border-[#00F0FF]/30 rounded-2xl p-6 max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 to-[#7B2CBF]/5 rounded-2xl"></div>
            
            <div className="relative">
              <h3 className="text-2xl font-bold text-[#00F0FF] mb-4">Confirmar Pago</h3>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-[#0A1018]/50 border border-[#00F0FF]/20 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Mentor</p>
                  <p className="text-white font-medium">{selectedPayout.Usuario.nombre}</p>
                </div>

                <div className="p-4 bg-[#0A1018]/50 border border-[#00F0FF]/20 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Monto</p>
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8C00]">
                    ${selectedPayout.totalAmount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A1018]/50 border border-[#00F0FF]/30 rounded-xl text-white focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="BANK_TRANSFER">Transferencia Bancaria</option>
                    <option value="STRIPE">Stripe</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Referencia de Transacción</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="TXN-2025-001234"
                    className="w-full px-4 py-3 bg-[#0A1018]/50 border border-[#00F0FF]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setSelectedPayout(null);
                    setTransactionRef('');
                  }}
                  disabled={processingPayout}
                  className="flex-1 px-6 py-3 bg-[#0A1018]/50 border border-gray-600 rounded-xl text-gray-400 hover:bg-[#0A1018] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={processingPayout}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00FF94] to-[#00F0FF] rounded-xl text-[#050B14] font-bold hover:shadow-lg hover:shadow-[#00FF94]/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingPayout ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmar Pago
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
