'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Banknote, Plus, Check, X, AlertTriangle, CheckCircle, Clock,
  FileText, Eye, Building2, User, ArrowRight, Wallet,
  CreditCard, Upload, Send, Download, History
} from 'lucide-react';

interface CashBatch {
  id: number;
  batchNumber: string;
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  status: 'PENDING_DELIVERY' | 'DELIVERED' | 'CONFIRMED';
  deliveryMethod: 'CASH' | 'BANK_TRANSFER' | 'PENDING';
  depositProofUrl: string | null;
  bankReference: string | null;
  createdAt: string;
  closedAt: string | null;
  confirmedAt: string | null;
  coordinator: { id: number; nombre: string };
  receivedBy: { id: number; nombre: string } | null;
  vision: { id: number; nombre: string } | null;
  codesCount: number;
  expensesCount: number;
}

interface BatchPreview {
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  codesCount: number;
  expensesCount: number;
  paymentCodes: any[];
  expenses: any[];
}

export default function CorteCajaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<CashBatch[]>([]);
  const [summary, setSummary] = useState({ pendingDelivery: 0, confirmedTotal: 0, totalBatches: 0 });
  const [filter, setFilter] = useState<'ALL' | 'PENDING_DELIVERY' | 'DELIVERED' | 'CONFIRMED'>('ALL');
  
  // Modal nuevo corte
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [depositProofUrl, setDepositProofUrl] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal detalle
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CashBatch | null>(null);
  const [batchDetail, setBatchDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Notificación
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
      fetchBatches();
    }
  }, [status, session]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.append('status', filter);
      
      const res = await fetch(`/api/treasury/cash-batch?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setBatches(data.cashBatches || []);
        setSummary(data.summary || { pendingDelivery: 0, confirmedTotal: 0, totalBatches: 0 });
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchBatches();
    }
  }, [filter]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/treasury/cash-batch/preview');
      const data = await res.json();
      
      if (data.success) {
        setPreview(data.preview);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchBatchDetail = async (batchId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/treasury/cash-batch/${batchId}`);
      const data = await res.json();
      
      if (data.success) {
        setBatchDetail(data.cashBatch);
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenNewBatch = () => {
    setShowNewBatchModal(true);
    fetchPreview();
  };

  const handleCreateBatch = async () => {
    if (!preview || preview.netAmount === 0) {
      setNotification({ type: 'error', message: 'No hay movimientos para crear el corte' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/treasury/cash-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMethod,
          depositProofUrl: deliveryMethod === 'BANK_TRANSFER' ? depositProofUrl : null,
          bankReference: deliveryMethod === 'BANK_TRANSFER' ? bankReference : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: `Corte ${data.cashBatch.batchNumber} creado exitosamente` });
        setShowNewBatchModal(false);
        setPreview(null);
        fetchBatches();
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al crear corte' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmBatch = async (batchId: number) => {
    if (!confirm('¿Confirmar la recepción de este corte de caja?')) return;

    try {
      const res = await fetch(`/api/treasury/cash-batch/${batchId}/confirm`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: 'Corte confirmado exitosamente' });
        fetchBatches();
        if (showDetailModal) {
          setShowDetailModal(false);
          setSelectedBatch(null);
        }
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al confirmar' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    }
  };

  const handleViewDetail = (batch: CashBatch) => {
    setSelectedBatch(batch);
    setShowDetailModal(true);
    fetchBatchDetail(batch.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_DELIVERY':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1">
            <Send className="w-3 h-3" /> Entregado
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Confirmado
          </span>
        );
      default:
        return null;
    }
  };

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'BANK_TRANSFER':
        return 'Transferencia';
      case 'PENDING':
        return 'Por definir';
      default:
        return method;
    }
  };

  if (loading && batches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Banknote className="w-8 h-8 text-blue-400" />
              </div>
              Corte de Caja
            </h1>
            <p className="text-slate-400 mt-2">
              Cierra tus períodos de recaudación y entrega el efectivo
            </p>
          </div>

          {!isAdmin && (
            <button
              onClick={handleOpenNewBatch}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              Nuevo Corte
            </button>
          )}
        </div>

        {/* Notificación */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {notification.message}
            <button onClick={() => setNotification(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pendiente de Entrega</p>
                <p className="text-2xl font-bold text-white">${summary.pendingDelivery.toLocaleString()}</p>
                <p className="text-yellow-400 text-xs">Deuda con la escuela</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Confirmado</p>
                <p className="text-2xl font-bold text-white">${summary.confirmedTotal.toLocaleString()}</p>
                <p className="text-green-400 text-xs">Entregado y verificado</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <History className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Cortes</p>
                <p className="text-2xl font-bold text-white">{summary.totalBatches}</p>
                <p className="text-purple-400 text-xs">Historial</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex gap-2">
            {['ALL', 'PENDING_DELIVERY', 'DELIVERED', 'CONFIRMED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {s === 'ALL' ? 'Todos' : s === 'PENDING_DELIVERY' ? 'Pendientes' : s === 'DELIVERED' ? 'Entregados' : 'Confirmados'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Cortes */}
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <Banknote className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay cortes de caja</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">{batch.batchNumber}</h3>
                        {getStatusBadge(batch.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {batch.coordinator.nombre}
                        </span>
                        <span>{new Date(batch.createdAt).toLocaleDateString('es-MX')}</span>
                        {batch.vision && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {batch.vision.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Neto a entregar</p>
                      <p className={`text-2xl font-bold ${batch.netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${batch.netAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {batch.codesCount} cobros | {batch.expensesCount} gastos
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(batch)}
                        className="p-2 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      {isAdmin && batch.status === 'DELIVERED' && (
                        <button
                          onClick={() => handleConfirmBatch(batch.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalles extra */}
                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Recaudado</p>
                    <p className="text-white font-medium">${batch.totalCollected.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gastos</p>
                    <p className="text-white font-medium">${batch.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Método de entrega</p>
                    <p className="text-white font-medium">{getDeliveryMethodLabel(batch.deliveryMethod)}</p>
                  </div>
                  {batch.confirmedAt && (
                    <div>
                      <p className="text-slate-500">Confirmado</p>
                      <p className="text-white font-medium">
                        {new Date(batch.confirmedAt).toLocaleDateString('es-MX')}
                        {batch.receivedBy && ` por ${batch.receivedBy.nombre}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nuevo Corte */}
      {showNewBatchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nuevo Corte de Caja</h2>
              <button
                onClick={() => {
                  setShowNewBatchModal(false);
                  setPreview(null);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {loadingPreview ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Cargando movimientos...</p>
              </div>
            ) : preview ? (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <p className="text-emerald-400 text-sm">Recaudado</p>
                    <p className="text-2xl font-bold text-white">${preview.totalCollected.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{preview.codesCount} códigos</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-red-400 text-sm">Gastos</p>
                    <p className="text-2xl font-bold text-white">${preview.totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{preview.expensesCount} gastos</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <p className="text-blue-400 text-sm">Neto</p>
                    <p className={`text-2xl font-bold ${preview.netAmount >= 0 ? 'text-white' : 'text-red-400'}`}>
                      ${preview.netAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">A entregar</p>
                  </div>
                </div>

                {preview.netAmount === 0 && preview.codesCount === 0 && preview.expensesCount === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center mb-6">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                    <p className="text-yellow-400 font-medium">No hay movimientos pendientes</p>
                    <p className="text-slate-400 text-sm">Genera códigos de pago o registra gastos primero</p>
                  </div>
                ) : (
                  <>
                    {/* Método de entrega */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        ¿Cómo entregarás el dinero?
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setDeliveryMethod('CASH')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            deliveryMethod === 'CASH'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <Wallet className={`w-8 h-8 mx-auto mb-2 ${deliveryMethod === 'CASH' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <p className={deliveryMethod === 'CASH' ? 'text-white font-medium' : 'text-slate-300'}>Efectivo</p>
                          <p className="text-slate-500 text-xs">Entregaré el dinero en persona</p>
                        </button>
                        <button
                          onClick={() => setDeliveryMethod('BANK_TRANSFER')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            deliveryMethod === 'BANK_TRANSFER'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <CreditCard className={`w-8 h-8 mx-auto mb-2 ${deliveryMethod === 'BANK_TRANSFER' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <p className={deliveryMethod === 'BANK_TRANSFER' ? 'text-white font-medium' : 'text-slate-300'}>Transferencia</p>
                          <p className="text-slate-500 text-xs">Haré un depósito bancario</p>
                        </button>
                      </div>
                    </div>

                    {deliveryMethod === 'BANK_TRANSFER' && (
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            URL del comprobante de depósito
                          </label>
                          <input
                            type="url"
                            value={depositProofUrl}
                            onChange={(e) => setDepositProofUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Referencia bancaria
                          </label>
                          <input
                            type="text"
                            value={bankReference}
                            onChange={(e) => setBankReference(e.target.value)}
                            placeholder="Número de transferencia..."
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-yellow-400 font-medium">Importante</p>
                          <p className="text-slate-400">
                            Al crear este corte, todos los códigos canjeados y gastos aprobados se asociarán a él.
                            El administrador deberá confirmar la recepción.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowNewBatchModal(false);
                          setPreview(null);
                        }}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateBatch}
                        disabled={creating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                      >
                        {creating ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Banknote className="w-5 h-5" />
                            Crear Corte
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">Error al cargar datos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedBatch.batchNumber}</h2>
                <p className="text-slate-400 text-sm">Detalle del corte de caja</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBatch(null);
                  setBatchDetail(null);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              </div>
            ) : batchDetail ? (
              <>
                {/* Info general */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs">Estado</p>
                    {getStatusBadge(batchDetail.status)}
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs">Coordinador</p>
                    <p className="text-white font-medium">{batchDetail.coordinator?.nombre}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs">Neto</p>
                    <p className="text-emerald-400 font-bold text-lg">${batchDetail.netAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs">Método</p>
                    <p className="text-white font-medium">{getDeliveryMethodLabel(batchDetail.deliveryMethod)}</p>
                  </div>
                </div>

                {/* Códigos */}
                {batchDetail.paymentCodes?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">Códigos de Pago ({batchDetail.paymentCodes.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchDetail.paymentCodes.map((code: any) => (
                        <div key={code.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                          <div>
                            <code className="text-emerald-400 font-mono">{code.code}</code>
                            {code.redeemedBy && (
                              <span className="text-slate-400 text-sm ml-2">• {code.redeemedBy.nombre}</span>
                            )}
                          </div>
                          <span className="text-white font-medium">${code.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gastos */}
                {batchDetail.expenses?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">Gastos ({batchDetail.expenses.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchDetail.expenses.map((exp: any) => (
                        <div key={exp.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                          <div>
                            <span className="text-white">{exp.concept}</span>
                            <span className="text-slate-400 text-sm ml-2">• {exp.category}</span>
                          </div>
                          <span className="text-red-400 font-medium">-${exp.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                {isAdmin && selectedBatch.status === 'DELIVERED' && (
                  <button
                    onClick={() => handleConfirmBatch(selectedBatch.id)}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Confirmar Recepción
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">Error al cargar detalle</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
