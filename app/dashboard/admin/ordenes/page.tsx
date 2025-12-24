'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Building,
  User,
  Calendar,
  Filter,
  Download,
  Eye,
  Check,
  AlertCircle,
  Package,
  Loader2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

interface LicenseOrder {
  id: string;
  organizationId: number;
  quantity: number;
  tier: string;
  amount: number;
  paymentMethod: string;
  status: OrderStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentData?: any;
  Organization: {
    name: string;
  };
  RequestedByUser: {
    nombre: string;
    email: string;
  };
}

export default function AdminOrdenesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<LicenseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<LicenseOrder | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'ADMINISTRADOR') {
      router.push('/dashboard');
    } else {
      fetchOrders();
    }
  }, [status, session]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/license-orders');
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    setProcessingOrderId(orderId);
    
    try {
      const res = await fetch(`/api/admin/license-orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.success) {
        // Recargar las órdenes
        await fetchOrders();
        setShowConfirmModal(false);
        setSelectedOrder(null);
        
        // Mostrar toast de éxito
        setToastMessage('✅ Orden marcada como PAGADA. Los créditos han sido generados.');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      } else {
        // Mostrar toast de error
        setToastMessage(data.error || 'Error al procesar el pago');
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      setToastMessage('Error al procesar la solicitud');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    
    try {
      const res = await fetch(`/api/admin/license-orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await res.json();

      if (data.success) {
        // Recargar las órdenes
        await fetchOrders();
        setShowRejectModal(false);
        setSelectedOrder(null);
        setRejectReason('');
        
        // Mostrar toast de éxito
        setToastMessage('Orden rechazada exitosamente');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      } else {
        // Mostrar toast de error
        setToastMessage(data.error || 'Error al rechazar la orden');
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      setToastMessage('Error al procesar la solicitud');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const badges: Record<OrderStatus, { bg: string; text: string; icon: any; label: string }> = {
      PENDING: { bg: 'bg-yellow-900/20 border-yellow-600', text: 'text-yellow-400', icon: Clock, label: 'Pendiente' },
      PROCESSING: { bg: 'bg-blue-900/20 border-blue-600', text: 'text-blue-400', icon: RefreshCw, label: 'Procesando' },
      COMPLETED: { bg: 'bg-green-900/20 border-green-600', text: 'text-green-400', icon: CheckCircle, label: 'Completada' },
      FAILED: { bg: 'bg-red-900/20 border-red-600', text: 'text-red-400', icon: XCircle, label: 'Fallida' },
      CANCELLED: { bg: 'bg-gray-900/20 border-gray-600', text: 'text-gray-400', icon: XCircle, label: 'Cancelada' },
      REFUNDED: { bg: 'bg-purple-900/20 border-purple-600', text: 'text-purple-400', icon: AlertCircle, label: 'Reembolsada' }
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const methods: Record<string, { color: string; label: string }> = {
      transfer: { color: 'bg-cyan-900/20 text-cyan-400 border-cyan-600', label: 'Transferencia' },
      stripe: { color: 'bg-indigo-900/20 text-indigo-400 border-indigo-600', label: 'Stripe' },
      paypal: { color: 'bg-blue-900/20 text-blue-400 border-blue-600', label: 'PayPal' },
      mercadopago: { color: 'bg-cyan-900/20 text-cyan-400 border-cyan-600', label: 'Mercado Pago' },
      cash: { color: 'bg-green-900/20 text-green-400 border-green-600', label: 'Efectivo' }
    };

    const methodData = methods[method.toLowerCase()] || { color: 'bg-gray-900/20 text-gray-400 border-gray-600', label: method };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${methodData.color}`}>
        {methodData.label}
      </span>
    );
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch =
        order.Organization.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.RequestedByUser.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.RequestedByUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    totalRevenue: orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.amount, 0),
    pendingRevenue: orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').reduce((sum, o) => sum + o.amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <CreditCard className="text-purple-400" size={32} />
                Gestión de Órdenes de Licencias
              </h1>
              <p className="text-slate-400">
                Administra las compras de licencias escolares y confirma pagos manuales
              </p>
            </div>

            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="text-purple-400" size={20} />
              <span className="text-2xl font-bold text-white">{stats.total}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Órdenes</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-yellow-400" size={20} />
              <span className="text-2xl font-bold text-yellow-400">{stats.pending}</span>
            </div>
            <p className="text-slate-400 text-sm">Pendientes</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-green-400" size={20} />
              <span className="text-2xl font-bold text-green-400">{stats.completed}</span>
            </div>
            <p className="text-slate-400 text-sm">Completadas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="text-emerald-400" size={20} />
              <span className="text-xl font-bold text-emerald-400">
                ${stats.totalRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Ingresos Confirmados</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="text-cyan-400" size={20} />
              <span className="text-xl font-bold text-cyan-400">
                ${stats.pendingRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-slate-400 text-sm">En Proceso</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por escuela, director, email o ID de orden..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="PROCESSING">Procesando</option>
                <option value="COMPLETED">Completadas</option>
                <option value="FAILED">Fallidas</option>
                <option value="CANCELLED">Canceladas</option>
                <option value="REFUNDED">Reembolsadas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Orden / Escuela
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Director
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Licencias
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No se encontraron órdenes</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="text-purple-400" size={16} />
                            <p className="font-semibold text-white">{order.Organization.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 font-mono">#{order.id.slice(0, 12)}...</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-white">{order.RequestedByUser.nombre}</p>
                          <p className="text-xs text-slate-500">{order.RequestedByUser.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-lg font-bold text-purple-400">{order.quantity}</span>
                          <span className="text-xs text-slate-500">{order.tier}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-lg font-bold text-emerald-400">
                          ${order.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">MXN</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getPaymentMethodBadge(order.paymentMethod)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar size={14} className="text-slate-500" />
                            {new Date(order.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          {order.paidAt && (
                            <div className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle size={12} />
                              Pagado: {new Date(order.paidAt).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowConfirmModal(true);
                              }}
                              disabled={processingOrderId === order.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              {processingOrderId === order.id ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <Check size={16} />
                                  Pagada
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setRejectReason('');
                                setShowRejectModal(true);
                              }}
                              disabled={processingOrderId === order.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              <XCircle size={16} />
                              Rechazar
                            </button>
                          </div>
                        )}
                        {order.status === 'COMPLETED' && (
                          <span className="text-green-400 text-sm font-medium">
                            ✓ Completada
                          </span>
                        )}
                        {order.status === 'CANCELLED' && (
                          <span className="text-red-400 text-sm font-medium">
                            ✗ Rechazada
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

        {/* Results Count */}
        <div className="mt-4 text-center text-slate-400 text-sm">
          Mostrando {filteredOrders.length} de {orders.length} órdenes
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-2 border-green-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-green-500/10">
            {/* Header con gradiente */}
            <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <CheckCircle className="text-white" size={32} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Confirmar Pago Recibido</h3>
                  <p className="text-slate-400 text-sm">Genera créditos de licencia automáticamente</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Información de la orden en cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                  <p className="text-slate-400 text-xs font-medium mb-1">Organización</p>
                  <p className="text-white font-bold text-lg">{selectedOrder.Organization.name}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                  <p className="text-slate-400 text-xs font-medium mb-1">Licencias</p>
                  <p className="text-white font-bold text-lg">{selectedOrder.quantity} <span className="text-purple-400 text-sm">({selectedOrder.tier})</span></p>
                </div>
              </div>

              {/* Monto destacado */}
              <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/20 border-2 border-emerald-500/30 rounded-xl p-6 text-center">
                <p className="text-emerald-300 text-sm font-medium mb-2">Monto Total</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                  ${selectedOrder.amount.toLocaleString()}
                </p>
                <p className="text-emerald-400/60 text-sm mt-1">MXN</p>
              </div>

              {/* Método de pago */}
              <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                <span className="text-slate-400 text-sm font-medium">Método de Pago</span>
                {getPaymentMethodBadge(selectedOrder.paymentMethod)}
              </div>

              {/* Comprobante miniatura */}
              {selectedOrder.paymentMethod === 'transfer' && selectedOrder.paymentData?.proofUrl && (
                <div className="bg-slate-800/30 border-2 border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-colors">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Eye size={18} className="text-blue-400" />
                    Comprobante de Pago Adjunto
                  </h4>
                  <div className="relative bg-slate-950/50 rounded-lg overflow-hidden border border-slate-700/50 group">
                    <img
                      src={selectedOrder.paymentData.proofUrl}
                      alt="Comprobante de pago"
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-2">
                      <a
                        href={selectedOrder.paymentData.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <Eye size={14} />
                        Ver completo
                      </a>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                    <Calendar size={12} />
                    Subido: {new Date(selectedOrder.paymentData.uploadedAt).toLocaleString('es-MX')}
                  </p>
                </div>
              )}

              {/* Advertencia importante con mejor diseño */}
              <div className="relative bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20 border-l-4 border-yellow-500 rounded-xl p-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16"></div>
                <div className="relative flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <AlertCircle className="text-yellow-400" size={20} />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-yellow-200 font-bold mb-1">Importante: Esta acción es irreversible</h5>
                    <p className="text-yellow-100/90 text-sm leading-relaxed">
                      Al confirmar se generarán automáticamente <strong className="text-yellow-200">{selectedOrder.quantity} créditos</strong> de licencia {selectedOrder.tier} para <strong className="text-yellow-200">{selectedOrder.Organization.name}</strong>. El estado cambiará a <span className="text-green-400 font-semibold">COMPLETADA</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de acción con mejor diseño */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleMarkAsPaid(selectedOrder.id)}
                  disabled={processingOrderId === selectedOrder.id}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-600 text-white font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20 hover:shadow-green-500/40 flex items-center justify-center gap-2 disabled:shadow-none"
                >
                  {processingOrderId === selectedOrder.id ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Confirmar Pago
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualización de Comprobante */}
      {showProofModal && selectedOrder && selectedOrder.paymentData?.proofUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProofModal(false)}>
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <Eye className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Comprobante de Pago</h3>
                  <p className="text-sm text-slate-400">{selectedOrder.Organization.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XCircle className="text-slate-400 hover:text-white" size={24} />
              </button>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-sm">Orden:</span>
                  <p className="text-white font-mono text-sm">#{selectedOrder.id.slice(0, 12)}...</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Monto:</span>
                  <p className="text-emerald-400 font-bold text-lg">${selectedOrder.amount.toLocaleString()} MXN</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Licencias:</span>
                  <p className="text-white font-semibold">{selectedOrder.quantity} ({selectedOrder.tier})</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Subido:</span>
                  <p className="text-white text-sm">{new Date(selectedOrder.paymentData.uploadedAt).toLocaleString('es-MX')}</p>
                </div>
              </div>
            </div>

            <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700 mb-4">
              <img
                src={selectedOrder.paymentData.proofUrl}
                alt="Comprobante de pago"
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="flex gap-3">
              <a
                href={selectedOrder.paymentData.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Descargar Comprobante
              </a>
              {selectedOrder.status === 'PROCESSING' && (
                <button
                  onClick={() => {
                    setShowProofModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Marcar como Pagada
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {showRejectModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => {
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedOrder(null);
          }}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-2 border-red-500/20 rounded-2xl max-w-2xl w-full shadow-2xl shadow-red-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-red-900/20 to-rose-900/20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                    <XCircle className="text-white" size={32} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Rechazar Orden de Compra</h3>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Información de la orden */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs font-medium mb-1">Organización</p>
                  <p className="text-white font-bold text-lg">{selectedOrder.Organization.name}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs font-medium mb-1">Licencias</p>
                  <p className="text-white font-bold text-lg">{selectedOrder.quantity} <span className="text-purple-400 text-sm">({selectedOrder.tier})</span></p>
                </div>
              </div>

              {/* Monto */}
              <div className="bg-gradient-to-br from-red-900/30 to-rose-900/20 border-2 border-red-500/30 rounded-xl p-6 text-center">
                <p className="text-red-300 text-sm font-medium mb-2">Monto a rechazar</p>
                <p className="text-4xl font-bold text-red-400">
                  ${selectedOrder.amount.toLocaleString()} <span className="text-lg">MXN</span>
                </p>
              </div>

              {/* Razón del rechazo */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Razón del rechazo (opcional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Comprobante ilegible, monto incorrecto, datos bancarios no coinciden..."
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none"
                  rows={4}
                />
              </div>

              {/* Advertencia */}
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-200">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• La orden será marcada como CANCELADA</li>
                      <li>• No se generarán créditos de licencia</li>
                      <li>• El director de la escuela será notificado</li>
                      <li>• Esta acción no se puede revertir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="bg-slate-900 p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedOrder(null);
                }}
                disabled={processingOrderId === selectedOrder.id}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRejectOrder(selectedOrder.id)}
                disabled={processingOrderId === selectedOrder.id}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {processingOrderId === selectedOrder.id ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle size={20} />
                    Confirmar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right duration-300">
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500/50 rounded-xl shadow-2xl shadow-green-500/20 p-4 min-w-[320px] max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-400" size={24} />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm mb-1">¡Éxito!</h4>
                <p className="text-green-200 text-sm">{toastMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="flex-shrink-0 text-green-300 hover:text-white transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right duration-300">
          <div className="bg-gradient-to-r from-red-900 to-rose-900 border-2 border-red-500/50 rounded-xl shadow-2xl shadow-red-500/20 p-4 min-w-[320px] max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="text-red-400" size={24} />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm mb-1">Error</h4>
                <p className="text-red-200 text-sm">{toastMessage}</p>
              </div>
              <button
                onClick={() => setShowErrorToast(false)}
                className="flex-shrink-0 text-red-300 hover:text-white transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
