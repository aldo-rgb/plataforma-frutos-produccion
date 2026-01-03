'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, DollarSign, Download, CheckCircle2, X, 
  Calendar, User, FileText, Filter, TrendingUp, AlertCircle,
  CreditCard, Eye, Check
} from 'lucide-react';
import Link from 'next/link';

interface CommissionEntry {
  id: string;
  mentorId: number;
  mentorName: string;
  mentorImage?: string;
  sourceType: 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'PACKAGE_SESSION';
  sourceId: number;
  studentName: string;
  totalAmount: number;
  platformFee: number;
  platformPercent: number;
  payableAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  serviceName: string;
  scheduledAt: string;
  completedAt: string;
  paidAt?: string;
  payoutBatchId?: string;
}

interface CommissionSummary {
  totalSales: number;
  platformRevenue: number;
  mentorPayable: number;
  entriesCount: number;
}

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  profileImage?: string;
}

export default function AdminPagosPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [mentorFilter, setMentorFilter] = useState<number | null>(null);
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'PACKAGE_SESSION'>('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Resumen
  const [summary, setSummary] = useState<CommissionSummary>({
    totalSales: 0,
    platformRevenue: 0,
    mentorPayable: 0,
    entriesCount: 0
  });

  // Procesar pago
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [statusFilter, mentorFilter, serviceFilter, dateRange]);

  const loadMentors = async () => {
    try {
      const res = await fetch('/api/admin/mentors');
      const data = await res.json();
      console.log('🔍 Mentors API response:', data);
      if (data.success) {
        setAllMentors(data.mentors);
        console.log('✅ Mentors loaded:', data.mentors.length);
      }
    } catch (error) {
      console.error('❌ Error loading mentors:', error);
    }
  };

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (mentorFilter) params.append('mentorId', mentorFilter.toString());
      if (serviceFilter !== 'ALL') params.append('sourceType', serviceFilter);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const res = await fetch(`/api/admin/commissions?${params}`);
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

  const toggleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedEntries);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEntries(newSet);
  };

  const filteredEntries = entries.filter(entry => {
    if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false;
    if (mentorFilter && entry.mentorId !== mentorFilter) return false;
    if (serviceFilter !== 'ALL' && entry.sourceType !== serviceFilter) return false;
    return true;
  });

  const selectedTotal = Array.from(selectedEntries).reduce((sum, id) => {
    const entry = entries.find(e => e.id === id);
    return sum + (entry?.payableAmount || 0);
  }, 0);

  const handleProcessPayout = async () => {
    if (selectedEntries.size === 0) {
      alert('Selecciona al menos una comisión para procesar');
      return;
    }

    if (!confirm(`¿Confirmas el pago de ${formatoMXN(selectedTotal)} a ${selectedEntries.size} transacciones?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/commissions/process-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledgerIds: Array.from(selectedEntries),
          paymentMethod: 'transfer'
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.count} comisiones marcadas como pagadas`);
        setSelectedEntries(new Set());
        loadCommissions();
        setShowPayoutModal(false);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error procesando pago');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      selectedEntries.forEach(id => params.append('ids', id));

      const res = await fetch(`/api/admin/commissions/export?${params}`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Error exportando CSV');
      console.error(error);
    }
  };

  const formatoMXN = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'MENTORSHIP_SESSION': return '💰';
      case 'DISCIPLINE_CALL': return '⚡';
      case 'PACKAGE_SESSION': return '📦';
      default: return '💼';
    }
  };

  const getServiceName = (type: string) => {
    switch (type) {
      case 'MENTORSHIP_SESSION': return 'Mentoría 1:1';
      case 'DISCIPLINE_CALL': return 'Llamada Disciplina';
      case 'PACKAGE_SESSION': return 'Paquete 18 Sesiones';
      default: return 'Servicio';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <Link 
          href="/dashboard/admin" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
              <DollarSign className="text-emerald-500" size={36} />
              Commission Ledger
            </h1>
            <p className="text-slate-400">Panel Maestro de Finanzas y Comisiones</p>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Total Generado</h3>
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{formatoMXN(summary.totalSales)}</p>
          <p className="text-xs text-slate-400 mt-1">{summary.entriesCount} transacciones</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-emerald-300 text-sm font-semibold uppercase tracking-wide">Revenue Quantum</h3>
            <DollarSign className="text-emerald-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{formatoMXN(summary.platformRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Tu ganancia</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-orange-300 text-sm font-semibold uppercase tracking-wide">🔴 Nómina Pendiente</h3>
            <AlertCircle className="text-orange-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{formatoMXN(summary.mentorPayable)}</p>
          <p className="text-xs text-slate-400 mt-1">Por pagar a mentores</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-purple-300 text-sm font-semibold uppercase tracking-wide">Seleccionado</h3>
            <CheckCircle2 className="text-purple-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{formatoMXN(selectedTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{selectedEntries.size} registros marcados</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="text-blue-400" size={20} />
          <h3 className="font-bold text-white">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Estado */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Estado</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="PENDING">Pendientes</option>
              <option value="PAID">Pagado</option>
              <option value="ALL">Todos</option>
            </select>
          </div>

          {/* Tipo de Servicio */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Tipo de Servicio</label>
            <select 
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as any)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="ALL">Todos</option>
              <option value="MENTORSHIP_SESSION">Mentoría 1:1</option>
              <option value="DISCIPLINE_CALL">Llamadas Disciplina</option>
              <option value="PACKAGE_SESSION">Paquetes 18 Sesiones</option>
            </select>
          </div>

          {/* Mentor */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Mentor {allMentors.length > 0 && `(${allMentors.length})`}
            </label>
            <select 
              value={mentorFilter || ''}
              onChange={(e) => setMentorFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="">Todos los mentores</option>
              {allMentors.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Desde</label>
            <input 
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2"
            />
          </div>
        </div>
      </div>

      {/* ACCIONES MASIVAS */}
      {selectedEntries.size > 0 && (
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-purple-400" size={24} />
            <div>
              <p className="text-white font-bold">{selectedEntries.size} comisiones seleccionadas</p>
              <p className="text-slate-400 text-sm">Total a pagar: {formatoMXN(selectedTotal)}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Download size={18} />
              Exportar CSV
            </button>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <CreditCard size={18} />
              Procesar Pago
            </button>
          </div>
        </div>
      )}

      {/* TABLA DE COMISIONES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="text-left p-4">
                  <input 
                    type="checkbox"
                    checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800"
                  />
                </th>
                <th className="text-left p-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Fecha</th>
                <th className="text-left p-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Mentor</th>
                <th className="text-left p-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Concepto</th>
                <th className="text-right p-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Precio Venta</th>
                <th className="text-right p-4 text-emerald-400 text-sm font-semibold uppercase tracking-wider">Comisión Mentor</th>
                <th className="text-center p-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Cargando comisiones...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No hay comisiones con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <input 
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        disabled={entry.status !== 'PENDING'}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 disabled:opacity-30"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Calendar size={14} />
                        {new Date(entry.completedAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.completedAt).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {entry.mentorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{entry.mentorName}</p>
                          <p className="text-xs text-slate-500">ID: {entry.mentorId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getServiceIcon(entry.sourceType)}</span>
                        <div>
                          <p className="text-white font-medium text-sm">{entry.serviceName}</p>
                          <p className="text-xs text-slate-500">{entry.studentName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-bold">{formatoMXN(entry.totalAmount)}</div>
                      <div className="text-xs text-slate-500">
                        Comisión: {entry.platformPercent}%
                      </div>
                    </td>
                    <td className="p-4 text-right bg-emerald-900/10">
                      <div className="text-emerald-400 font-bold text-lg">
                        {formatoMXN(entry.payableAmount)}
                      </div>
                      <div className="text-xs text-emerald-400/60">
                        Mentor: {100 - entry.platformPercent}%
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {entry.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <AlertCircle size={12} />
                          Pendiente
                        </span>
                      )}
                      {entry.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle2 size={12} />
                          Pagado
                        </span>
                      )}
                      {entry.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <X size={12} />
                          Cancelado
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

      {/* MODAL DE CONFIRMACIÓN DE PAGO */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-emerald-400" size={28} />
              <h3 className="text-2xl font-bold text-white">Confirmar Pago</h3>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400">Comisiones seleccionadas:</span>
                <span className="text-white font-bold">{selectedEntries.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total a transferir:</span>
                <span className="text-emerald-400 font-bold text-2xl">{formatoMXN(selectedTotal)}</span>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-300 text-sm flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>
                  Al confirmar, estas comisiones se marcarán como <strong>PAGADAS</strong>. 
                  Asegúrate de haber procesado las transferencias bancarias antes de continuar.
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
