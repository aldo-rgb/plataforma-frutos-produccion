'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Eye,
  Globe,
  FileText,
  User,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Filter
} from 'lucide-react';

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  status: string;
  requestedAt: string;
  receiptUrls: string[];
  invoiceUrls: string[];
  adminNotes: string | null;
  publishedToLanding: boolean;
  landingDescription: string | null;
  member: {
    usuario: {
      id: number;
      nombre: string;
      email: string;
      imagen: string | null;
    };
    campaign: {
      id: number;
      nombre: string;
      slug: string;
      project: {
        id: number;
        nombre: string;
        organization: {
          id: number;
          name: string;
        };
      };
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  REQUESTED: { label: 'Solicitado', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
  UNDER_REVIEW: { label: 'En Revisión', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Eye },
  APPROVED: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  REJECTED: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  PAID_OUT: { label: 'Pagado', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: DollarSign },
  PUBLISHED: { label: 'Publicado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Globe },
};

const categoryLabels: Record<string, string> = {
  FOOD: 'Alimentación',
  TRANSPORT: 'Transporte',
  ACCOMMODATION: 'Hospedaje',
  EQUIPMENT: 'Equipo',
  SERVICES: 'Servicios',
  OTHER: 'Otro',
};

export default function LegacyAuditPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [landingDescriptions, setLandingDescriptions] = useState<Record<number, string>>({});

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      const res = await fetch(`/api/legacy-builder/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterStatus]);

  const handleAction = async (expenseId: number, action: string) => {
    setActionLoading(expenseId);
    try {
      const body: Record<string, unknown> = { action };
      
      if (action === 'reject' && adminNotes[expenseId]) {
        body.adminNotes = adminNotes[expenseId];
      }
      
      if (action === 'publish') {
        body.landingDescription = landingDescriptions[expenseId] || '';
      }

      const res = await fetch(`/api/legacy-builder/admin/audit?id=${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchExpenses();
        setExpandedId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al procesar la acción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la acción');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNextActions = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return [
          { action: 'review', label: 'Iniciar Revisión', variant: 'blue' },
          { action: 'reject', label: 'Rechazar', variant: 'red' },
        ];
      case 'UNDER_REVIEW':
        return [
          { action: 'approve', label: 'Aprobar', variant: 'green' },
          { action: 'reject', label: 'Rechazar', variant: 'red' },
        ];
      case 'APPROVED':
        return [
          { action: 'disburse', label: 'Marcar como Pagado', variant: 'purple' },
        ];
      case 'PAID_OUT':
        return [
          { action: 'publish', label: 'Publicar en Landing', variant: 'emerald' },
        ];
      default:
        return [];
    }
  };

  const pendingCount = expenses.filter(e => e.status === 'REQUESTED').length;
  const reviewCount = expenses.filter(e => e.status === 'UNDER_REVIEW').length;
  const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Auditoría de Gastos - Legacy Builder
          </h1>
          <p className="text-gray-400">
            Revisa y aprueba las solicitudes de gasto de las campañas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-gray-400">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{reviewCount}</p>
                <p className="text-sm text-gray-400">En Revisión</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvedCount}</p>
                <p className="text-sm text-gray-400">Por Pagar</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(expenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + e.amount, 0))}
                </p>
                <p className="text-sm text-gray-400">Monto Aprobado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="REQUESTED">Solicitados</option>
              <option value="UNDER_REVIEW">En Revisión</option>
              <option value="APPROVED">Aprobados</option>
              <option value="PAID_OUT">Pagados</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>

          <button
            onClick={fetchExpenses}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Expense List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay solicitudes de gasto</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => {
              const config = statusConfig[expense.status] || statusConfig.REQUESTED;
              const StatusIcon = config.icon;
              const isExpanded = expandedId === expense.id;
              const actions = getNextActions(expense.status);

              return (
                <div
                  key={expense.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* User Avatar */}
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {expense.member.usuario.imagen ? (
                            <Image
                              src={expense.member.usuario.imagen}
                              alt={expense.member.usuario.nombre}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {expense.member.usuario.nombre}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {config.label}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {expense.member.campaign.nombre} • {expense.member.campaign.project.nombre}
                          </p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {expense.member.campaign.project.organization.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {categoryLabels[expense.category] || expense.category}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Details */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider">
                              Descripción del Gasto
                            </label>
                            <p className="text-white mt-1">{expense.description}</p>
                          </div>

                          <div className="flex gap-4">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider">
                                Fecha de Solicitud
                              </label>
                              <p className="text-white mt-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {formatDate(expense.requestedAt)}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider">
                                Email
                              </label>
                              <p className="text-white mt-1">
                                {expense.member.usuario.email}
                              </p>
                            </div>
                          </div>

                          {/* Documents */}
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                              Documentos
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {expense.receiptUrls?.map((url, i) => (
                                <a
                                  key={`receipt-${i}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Ticket {i + 1}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                              {expense.invoiceUrls?.map((url, i) => (
                                <a
                                  key={`invoice-${i}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg text-sm text-blue-300 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Factura {i + 1}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                              {(!expense.receiptUrls?.length && !expense.invoiceUrls?.length) && (
                                <span className="text-gray-500 text-sm">Sin documentos adjuntos</span>
                              )}
                            </div>
                          </div>

                          {expense.adminNotes && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <label className="text-xs text-red-400 uppercase tracking-wider">
                                Notas del Admin
                              </label>
                              <p className="text-red-300 mt-1">{expense.adminNotes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Actions */}
                        <div className="space-y-4">
                          {expense.status === 'REQUESTED' || expense.status === 'UNDER_REVIEW' ? (
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                                Notas (opcional, requerido si rechaza)
                              </label>
                              <textarea
                                value={adminNotes[expense.id] || ''}
                                onChange={(e) => setAdminNotes({ ...adminNotes, [expense.id]: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Razón del rechazo o notas adicionales..."
                              />
                            </div>
                          ) : null}

                          {expense.status === 'PAID_OUT' && (
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                                Descripción para el Landing (público)
                              </label>
                              <textarea
                                value={landingDescriptions[expense.id] || expense.description}
                                onChange={(e) => setLandingDescriptions({ ...landingDescriptions, [expense.id]: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Descripción que verán los donantes..."
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {actions.map((action) => (
                              <button
                                key={action.action}
                                onClick={() => handleAction(expense.id, action.action)}
                                disabled={actionLoading === expense.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  action.variant === 'green'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : action.variant === 'red'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : action.variant === 'blue'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : action.variant === 'purple'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : action.variant === 'emerald'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                                }`}
                              >
                                {actionLoading === expense.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  action.label
                                )}
                              </button>
                            ))}
                          </div>

                          {/* Campaign Link */}
                          <a
                            href={`/legado/${expense.member.campaign.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                            Ver Landing Público
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
