'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  Send,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  ArrowRight,
  RefreshCw,
  LayoutGrid,
  List,
  Calendar,
  ChevronDown,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  PenLine
} from 'lucide-react';
import Link from 'next/link';

// Tipos
interface QuoteStats {
  totalQuotes: number;
  draftCount: number;
  sentCount: number;
  viewedCount: number;
  approvedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalApprovedValue: number;
  avgQuoteValue: number;
  conversionRate: number;
  monthlyQuotes: number;
  monthlyApproved: number;
  monthlyValue: number;
}

interface Quote {
  id: string;
  shortCode: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    company?: string;
  };
  items: any[];
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired';
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  sentAt?: string;
}

// Configuración de estados
const STATUS_CONFIG = {
  draft: { 
    label: 'Borrador', 
    emoji: '🌑', 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    bgKanban: 'bg-slate-800/50'
  },
  sent: { 
    label: 'Enviada', 
    emoji: '🟡', 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bgKanban: 'bg-yellow-900/20'
  },
  viewed: { 
    label: 'Vista', 
    emoji: '👁️', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    bgKanban: 'bg-blue-900/20'
  },
  approved: { 
    label: 'Aprobada', 
    emoji: '🟢', 
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    bgKanban: 'bg-green-900/20'
  },
  rejected: { 
    label: 'Rechazada', 
    emoji: '🔴', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    bgKanban: 'bg-red-900/20'
  },
  expired: { 
    label: 'Expirada', 
    emoji: '⚫', 
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    bgKanban: 'bg-gray-900/20'
  }
};

export default function MisCotizacionesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, [filterStatus]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes?status=${filterStatus}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setQuotes(data.quotes);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyQuoteLink = (shortCode: string) => {
    const url = `${window.location.origin}/propuesta/${shortCode}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast
    alert('Enlace copiado');
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    
    try {
      await fetch(`/api/quotes?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        q.client.name.toLowerCase().includes(search) ||
        q.client.email?.toLowerCase().includes(search) ||
        q.client.company?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatCurrency = (amount: number, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Agrupar por status para Kanban
  const kanbanColumns = ['draft', 'sent', 'viewed', 'approved', 'rejected'].map(status => ({
    status: status as keyof typeof STATUS_CONFIG,
    config: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG],
    quotes: filteredQuotes.filter(q => q.status === status)
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-400" />
              Mis Cotizaciones
            </h1>
            <p className="text-slate-400 mt-1">
              Gestiona tus propuestas y cierra más ventas
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/dashboard/cotizaciones/catalogo"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 transition"
            >
              <Package className="w-4 h-4" />
              Catálogo
            </Link>
            <Link
              href="/dashboard/cotizaciones/nueva"
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition"
            >
              <Plus className="w-5 h-5" />
              Nueva Cotización
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-slate-400 text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalQuotes}</p>
              <p className="text-xs text-slate-500">{stats.monthlyQuotes} este mes</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-slate-400 text-sm">Aprobadas</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.approvedCount}</p>
              <p className="text-xs text-green-400">{stats.conversionRate.toFixed(0)}% conversión</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-slate-400 text-sm">En Revisión</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.viewedCount}</p>
              <p className="text-xs text-blue-400">¡Momento de llamar!</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-slate-400 text-sm">Valor Aprobado</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalApprovedValue)}</p>
              <p className="text-xs text-amber-400">{formatCurrency(stats.monthlyValue)} este mes</p>
            </motion.div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:border-purple-500"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">🌑 Borradores</option>
              <option value="sent">🟡 Enviadas</option>
              <option value="viewed">👁️ Vistas</option>
              <option value="approved">🟢 Aprobadas</option>
              <option value="rejected">🔴 Rechazadas</option>
            </select>

            {/* View Toggle */}
            <div className="flex rounded-xl bg-slate-800/50 border border-slate-700/50 p-1">
              <button
                onClick={() => setView('kanban')}
                className={`p-2 rounded-lg transition ${view === 'kanban' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition ${view === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={loadQuotes}
              className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hay cotizaciones</h3>
            <p className="text-slate-400 mb-6">Crea tu primera propuesta profesional</p>
            <Link
              href="/dashboard/cotizaciones/nueva"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition"
            >
              <Plus className="w-5 h-5" />
              Nueva Cotización
            </Link>
          </motion.div>
        ) : view === 'kanban' ? (
          /* Kanban View */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(column => (
              <div 
                key={column.status}
                className={`rounded-2xl ${column.config.bgKanban} border border-slate-700/30 p-4 min-w-[280px]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{column.config.emoji}</span>
                    <span className="font-semibold text-white">{column.config.label}</span>
                  </div>
                  <span className="text-sm text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                    {column.quotes.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <AnimatePresence>
                    {column.quotes.map(quote => (
                      <motion.div
                        key={quote.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/50 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{quote.client.name}</h4>
                            {quote.client.company && (
                              <p className="text-xs text-slate-400">{quote.client.company}</p>
                            )}
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setShowDropdown(showDropdown === quote.id ? null : quote.id)}
                              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {showDropdown === quote.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 py-2 rounded-xl bg-slate-700 border border-slate-600 shadow-xl z-10">
                                <Link
                                  href={`/dashboard/cotizaciones/${quote.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600"
                                >
                                  <Eye className="w-4 h-4" /> Ver detalles
                                </Link>
                                <button
                                  onClick={() => copyQuoteLink(quote.shortCode)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600"
                                >
                                  <LinkIcon className="w-4 h-4" /> Copiar enlace
                                </button>
                                {quote.status === 'draft' && (
                                  <Link
                                    href={`/dashboard/cotizaciones/${quote.id}/editar`}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-slate-600"
                                  >
                                    <Edit3 className="w-4 h-4" /> Editar
                                  </Link>
                                )}
                                <button
                                  onClick={() => {
                                    setShowDropdown(null);
                                    deleteQuote(quote.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-600"
                                >
                                  <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-lg font-bold text-purple-400 mb-2">
                          {formatCurrency(quote.total, quote.currency)}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{quote.items.length} items</span>
                          <span>{formatDate(quote.createdAt)}</span>
                        </div>
                        
                        {quote.status === 'viewed' && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                            <Eye className="w-3 h-3" />
                            Visto {quote.viewCount} {quote.viewCount === 1 ? 'vez' : 'veces'}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Cliente</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Total</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Estado</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Fecha</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Vence</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white">{quote.client.name}</p>
                        {quote.client.company && (
                          <p className="text-sm text-slate-400">{quote.client.company}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-purple-400">{formatCurrency(quote.total, quote.currency)}</p>
                      <p className="text-xs text-slate-500">{quote.items.length} items</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${STATUS_CONFIG[quote.status].color}`}>
                        {STATUS_CONFIG[quote.status].emoji} {STATUS_CONFIG[quote.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(quote.expiresAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyQuoteLink(quote.shortCode)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Copiar enlace"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/propuesta/${quote.shortCode}`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Ver propuesta"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/cotizaciones/${quote.id}`}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
