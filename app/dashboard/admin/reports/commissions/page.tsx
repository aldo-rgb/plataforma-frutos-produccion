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
  Download,
  Search
} from 'lucide-react';

interface CommissionEntry {
  id: string;
  mentorId: string;
  mentorName: string;
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

interface MentorSummary {
  mentorId: string;
  mentorName: string;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  totalSessions: number;
}

export default function AdminCommissionsPage() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [mentorSummaries, setMentorSummaries] = useState<MentorSummary[]>([]);
  const [mentors, setMentors] = useState<{id: number, nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'PACKAGE_SESSION'>('ALL');
  const [mentorFilter, setMentorFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [statusFilter, typeFilter, mentorFilter]);

  const loadMentors = async () => {
    try {
      const res = await fetch('/api/admin/mentors');
      const data = await res.json();
      if (data.success) {
        setMentors(data.mentors);
      }
    } catch (error) {
      console.error('Error loading mentors:', error);
    }
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (mentorFilter !== 'ALL') params.append('mentorId', mentorFilter);

      const res = await fetch(`/api/admin/reports/commissions?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries);
        setMentorSummaries(data.mentorSummaries);
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
        return 'Paquete';
      default:
        return sourceType;
    }
  };

  const totalGeneral = mentorSummaries.reduce((sum, m) => sum + m.totalEarned, 0);
  const totalPendiente = mentorSummaries.reduce((sum, m) => sum + m.pendingAmount, 0);
  const totalPagado = mentorSummaries.reduce((sum, m) => sum + m.paidAmount, 0);

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return entry.mentorName.toLowerCase().includes(search) ||
           entry.studentName.toLowerCase().includes(search) ||
           entry.serviceName?.toLowerCase().includes(search);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Comisiones de Mentores</h1>
          <p className="text-slate-400">Control completo de pagos y comisiones</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total General */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-400 text-sm">Total Generado</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatoMXN(totalGeneral)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {entries.length} sesiones
            </div>
          </div>

          {/* Por Pagar */}
          <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <span className="text-slate-400 text-sm">Por Pagar</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {formatoMXN(totalPendiente)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Pendiente
            </div>
          </div>

          {/* Ya Pagado */}
          <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-slate-400 text-sm">Ya Pagado</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatoMXN(totalPagado)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Depositado
            </div>
          </div>

          {/* Mentores Activos */}
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-slate-400 text-sm">Mentores</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {mentorSummaries.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Activos
            </div>
          </div>
        </div>

        {/* Mentor Summaries */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Resumen por Mentor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mentorSummaries.map((mentor) => (
              <div key={mentor.mentorId} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h4 className="text-white font-semibold">{mentor.mentorName}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="text-white font-medium">{formatoMXN(mentor.totalEarned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pendiente:</span>
                    <span className="text-orange-400 font-medium">{formatoMXN(mentor.pendingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pagado:</span>
                    <span className="text-green-400 font-medium">{formatoMXN(mentor.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Sesiones:</span>
                    <span className="text-slate-300 font-medium">{mentor.totalSessions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 font-medium">Filtros y Búsqueda</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Mentor, estudiante..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Estado de Pago</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendientes</option>
                <option value="PAID">Pagados</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Tipo de Servicio</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos</option>
                <option value="MENTORSHIP_SESSION">Mentorías</option>
                <option value="DISCIPLINE_CALL">Disciplina</option>
                <option value="PACKAGE_SESSION">Paquetes</option>
              </select>
            </div>

            {/* Mentor Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Mentor</label>
              <select
                value={mentorFilter}
                onChange={(e) => setMentorFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos los mentores</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.nombre}
                  </option>
                ))}
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Mentor</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Tipo</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Estudiante</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Servicio</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Total</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Comisión</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase">A Pagar</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No hay comisiones para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatDate(entry.completedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {entry.mentorName}
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
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {entry.studentName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {entry.serviceName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 text-right">
                        {formatoMXN(entry.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 text-right">
                        -{formatoMXN(entry.platformFee)}
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
      </div>
    </div>
  );
}
