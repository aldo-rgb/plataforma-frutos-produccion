'use client';

import { useEffect, useState } from 'react';
import { Calendar, Filter, Search, Phone, Video, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Booking {
  id: string;
  date: string;
  type: 'DISCIPLINE' | 'MENTORSHIP';
  mentor: {
    id: number;
    name: string;
    avatar: string | null;
  };
  student: {
    id: number;
    name: string;
    organization: string;
  };
  vision: {
    id: number;
    name: string;
  } | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  value: number;
  notes: string | null;
}

interface BookingsData {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalValue: number;
    totalBookings: number;
  };
}

export default function BookingsControl() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BookingsData | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    mentorId: '',
    status: '',
    type: '',
    search: ''
  });

  useEffect(() => {
    fetchBookings();
  }, [page, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      if (filters.mentorId) params.append('mentorId', filters.mentorId);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/admin/reports/bookings?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar reservas');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: {
        bg: 'bg-yellow-900/30 border-yellow-500',
        text: 'text-yellow-400',
        icon: Clock
      },
      CONFIRMED: {
        bg: 'bg-blue-900/30 border-blue-500',
        text: 'text-blue-400',
        icon: CheckCircle
      },
      COMPLETED: {
        bg: 'bg-green-900/30 border-green-500',
        text: 'text-green-400',
        icon: CheckCircle
      },
      MISSED: {
        bg: 'bg-red-900/30 border-red-500',
        text: 'text-red-400',
        icon: XCircle
      },
      CANCELLED: {
        bg: 'bg-slate-900/30 border-slate-500',
        text: 'text-slate-400',
        icon: XCircle
      }
    };

    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text}`}>
        <Icon size={14} />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    return type === 'DISCIPLINE' ? (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 border border-purple-500 text-purple-400">
        <Phone size={14} />
        Disciplina
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-900/30 border border-cyan-500 text-cyan-400">
        <Video size={14} />
        Mentoría 1:1
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📅 Control de Reservas</h1>
          <p className="text-slate-400">Torre de Control Operativa - Actividad en Tiempo Real</p>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 shadow-lg">
              <div className="text-white/80 text-sm mb-2">Total de Reservas</div>
              <div className="text-3xl font-bold text-white">{data.summary.totalBookings}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl p-6 shadow-lg">
              <div className="text-white/80 text-sm mb-2">Valor Total</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(data.summary.totalValue)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendientes</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="COMPLETED">Completadas</option>
                <option value="MISSED">Perdidas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="DISCIPLINE">Disciplina</option>
                <option value="MENTORSHIP">Mentoría 1:1</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Buscar por mentor, alumno..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Fecha/Hora</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Alumno</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data?.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar size={16} className="text-slate-500" />
                        {formatDate(booking.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(booking.type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {booking.mentor.avatar ? (
                          <img
                            src={booking.mentor.avatar}
                            alt={booking.mentor.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {booking.mentor.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-white">{booking.mentor.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{booking.student.name}</div>
                        <div className="text-xs text-slate-400">{booking.student.organization}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${booking.value > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                        {booking.value > 0 ? formatCurrency(booking.value) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                Mostrando {((page - 1) * 50) + 1} - {Math.min(page * 50, data.pagination.total)} de {data.pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-white">
                  Página {page} de {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
