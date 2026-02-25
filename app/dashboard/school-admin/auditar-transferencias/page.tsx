'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Search,
  Filter,
  Download,
  ChevronDown,
  MessageCircle,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  ImageIcon,
  X,
} from 'lucide-react';

interface TransferOrder {
  id: string;
  orderReference: string;
  status: string;
  amount: number;
  ticketSelection: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  receiptImageUrl: string | null;
  receiptReceivedAt: string | null;
  rejectionReason: string | null;
  rejectionCount: number;
  createdAt: string;
  expiresAt: string;
  organization: string;
  vision: string | null;
}

interface Stats {
  PENDING_PAYMENT?: number;
  RECEIPT_RECEIVED?: number;
  CONFIRMED?: number;
  REJECTED?: number;
  EXPIRED?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING_PAYMENT: {
    label: 'Esperando Pago',
    color: 'text-yellow-600',
    icon: Clock,
    bg: 'bg-yellow-50',
  },
  RECEIPT_RECEIVED: {
    label: 'Comprobante Recibido',
    color: 'text-blue-600',
    icon: ImageIcon,
    bg: 'bg-blue-50',
  },
  CONFIRMED: {
    label: 'Aprobado',
    color: 'text-green-600',
    icon: CheckCircle,
    bg: 'bg-green-50',
  },
  REJECTED: {
    label: 'Rechazado',
    color: 'text-red-600',
    icon: XCircle,
    bg: 'bg-red-50',
  },
  EXPIRED: {
    label: 'Expirado',
    color: 'text-gray-500',
    icon: AlertTriangle,
    bg: 'bg-gray-50',
  },
};

export default function AuditarTransferenciasPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('RECEIPT_RECEIVED');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<TransferOrder | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/transfer-orders?status=${selectedStatus}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchOrders();
    }
  }, [sessionStatus, fetchOrders]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleApprove = async (order: TransferOrder) => {
    if (!confirm(`¿Aprobar el pago de ${order.userName} por $${order.amount.toLocaleString()}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/transfer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Pago aprobado!\n\nUsuario creado: ${data.email}\nContraseña temporal: ${data.tempPassword}`);
        fetchOrders();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Error al aprobar el pago');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      alert('Por favor ingresa un motivo de rechazo');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/transfer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: 'reject',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Comprobante rechazado. El usuario puede enviar otro.');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Error al rechazar el comprobante');
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar órdenes por búsqueda
  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    return (
      order.orderReference.toLowerCase().includes(search) ||
      order.userName.toLowerCase().includes(search) ||
      order.userEmail.toLowerCase().includes(search) ||
      (order.userPhone?.includes(search) ?? false)
    );
  });

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Quantum Pay-Bot
          </h1>
          <p className="text-gray-600 mt-1">
            Auditoría de transferencias bancarias y comprobantes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats[key as keyof Stats] || 0;
            const isActive = selectedStatus === key;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-transparent bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{count}</span>
                </div>
                <p className="text-xs text-gray-600">{config.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por referencia, nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando órdenes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay órdenes en este estado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredOrders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING_PAYMENT;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Receipt Image Preview */}
                      <div 
                        className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => {
                          if (order.receiptImageUrl) {
                            setSelectedOrder(order);
                            setShowReceiptModal(true);
                          }
                        }}
                      >
                        {order.receiptImageUrl ? (
                          <img
                            src={order.receiptImageUrl}
                            alt="Comprobante"
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-blue-600">
                            {order.orderReference}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                          {order.rejectionCount > 0 && (
                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              {order.rejectionCount}x rechazado
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {order.userName}
                          </span>
                          <span>{order.userEmail}</span>
                          {order.userPhone && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              {order.userPhone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${order.amount.toLocaleString()} MXN
                          </span>
                          <span>
                            {order.ticketSelection === 'FULL_VISION' ? '🌟 Full Vision' : '🎫 Básico'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {order.vision && (
                            <span className="text-purple-600">🔮 {order.vision}</span>
                          )}
                        </div>

                        {order.rejectionReason && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <strong>Último rechazo:</strong> {order.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {order.status === 'RECEIPT_RECEIVED' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(order)}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRejectModal(true);
                            }}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </button>
                        </div>
                      )}

                      {order.status === 'REJECTED' && (
                        <div className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                          Esperando nuevo comprobante
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Receipt Image Modal */}
        {showReceiptModal && selectedOrder?.receiptImageUrl && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceiptModal(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedOrder.receiptImageUrl}
                alt="Comprobante"
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                <p className="font-bold">{selectedOrder.orderReference}</p>
                <p className="text-sm">{selectedOrder.userName} - ${selectedOrder.amount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Rechazar Comprobante
              </h3>
              
              <p className="text-gray-600 mb-4">
                Orden <strong>{selectedOrder.orderReference}</strong> de <strong>{selectedOrder.userName}</strong>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: El monto no coincide, la imagen está borrosa, no se ve la fecha..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? 'Procesando...' : 'Rechazar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
