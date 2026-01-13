'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Wallet, Receipt, DollarSign, Clock, CheckCircle, 
  AlertTriangle, ArrowRight, Banknote, Calendar,
  TrendingUp, Package, Filter, Search, Eye, X,
  Send, FileText, Download, Camera, Upload, Image,
  Plus, Trash2, Ban
} from 'lucide-react';
import Link from 'next/link';

interface PaymentCode {
  id: string;
  code: string;
  amount: number;
  reference: string | null;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  redeemedAt: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  vision?: {
    id: number;
    nombre: string;
  } | null;
}

interface CashBatch {
  id: string;
  amount: number;
  codesCount: number;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  confirmedAt: string | null;
  notes: string | null;
}

interface Expense {
  id: string;
  concept: string;
  amount: number;
  category: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  vision?: {
    id: number;
    nombre: string;
  } | null;
}

interface CoordinatorTreasury {
  totalGenerated: number;
  totalRedeemed: number;
  totalPending: number;
  totalCancelled: number;
  cajaChica: number;
  pendingDebt: number;
  totalExpensesPending: number;
  totalExpensesApproved: number;
  codes: PaymentCode[];
  batches: CashBatch[];
  expenses: Expense[];
}

const EXPENSE_CATEGORIES = [
  { value: 'SUPPLIES', label: 'Materiales', icon: '📦' },
  { value: 'TRANSPORT', label: 'Transporte', icon: '🚗' },
  { value: 'FOOD', label: 'Alimentos', icon: '🍽️' },
  { value: 'VENUE', label: 'Renta', icon: '🏛️' },
  { value: 'EQUIPMENT', label: 'Equipo', icon: '🖥️' },
  { value: 'MARKETING', label: 'Marketing', icon: '📢' },
  { value: 'OTHER', label: 'Otro', icon: '📋' },
];

export default function CoordinatorTreasuryPage() {
  const [loading, setLoading] = useState(true);
  const [treasury, setTreasury] = useState<CoordinatorTreasury | null>(null);
  const [activeTab, setActiveTab] = useState<'codes' | 'expenses' | 'batches'>('codes');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({ 
    show: false, type: 'success', message: '' 
  });
  
  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    concept: '',
    amount: '',
    category: 'OTHER',
    notes: ''
  });
  const [expenseEvidence, setExpenseEvidence] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para cancelar código
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [codeToCancel, setCodeToCancel] = useState<PaymentCode | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Estados para subir evidencia a gasto existente
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);
  const [expenseToUpload, setExpenseToUpload] = useState<Expense | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState<File | null>(null);
  const [newEvidencePreview, setNewEvidencePreview] = useState<string | null>(null);
  const evidenceUploadRef = useRef<HTMLInputElement>(null);
  
  // Estado para ver evidencia en modal
  const [showViewEvidenceModal, setShowViewEvidenceModal] = useState(false);
  const [evidenceToView, setEvidenceToView] = useState<string | null>(null);

  useEffect(() => {
    fetchTreasury();
  }, []);

  const fetchTreasury = async () => {
    try {
      const res = await fetch('/api/treasury/coordinator');
      if (res.ok) {
        const data = await res.json();
        setTreasury(data);
      }
    } catch (error) {
      console.error('Error fetching treasury:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'ACTIVE': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendiente' },
      'REDEEMED': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Canjeado' },
      'CANCELLED': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado' },
      'EXPIRED': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Expirado' },
      'PENDING': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendiente' },
      'SUBMITTED': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Enviado' },
      'CONFIRMED': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Confirmado' },
      'REJECTED': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazado' },
    };
    const badge = badges[status] || badges['ACTIVE'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const filteredCodes = treasury?.codes.filter(code => {
    const matchesStatus = statusFilter === 'ALL' || code.status === statusFilter;
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Códigos disponibles para corte: ACTIVE y REDEEMED (no cancelados ni expirados)
  const availableForBatch = treasury?.codes.filter(c => 
    c.status === 'ACTIVE' || c.status === 'REDEEMED'
  ) || [];
  
  // Códigos que aún no han sido entregados en ningún batch
  const unsubmittedCodes = availableForBatch.filter(c => {
    // Excluir códigos que ya están en un batch confirmado o enviado
    return !treasury?.batches.some(b => 
      b.status === 'CONFIRMED' || b.status === 'SUBMITTED'
    );
  });

  // Verificar si hay gastos pendientes sin evidencia
  const expensesWithoutEvidence = treasury?.expenses.filter(
    e => e.status === 'PENDING' && !e.receiptUrl
  ) || [];
  const canMakeBatch = unsubmittedCodes.length > 0 && expensesWithoutEvidence.length === 0;

  const toggleCodeSelection = (codeId: string) => {
    setSelectedCodes(prev => 
      prev.includes(codeId) 
        ? prev.filter(id => id !== codeId)
        : [...prev, codeId]
    );
  };

  const selectAllCodes = () => {
    const allIds = unsubmittedCodes.map(c => c.id);
    setSelectedCodes(allIds);
  };

  // Verificar si un código puede ser cancelado (dentro de 24 horas y no usado)
  const canCancelCode = (code: PaymentCode): { canCancel: boolean; reason?: string } => {
    if (code.status !== 'ACTIVE') {
      return { canCancel: false, reason: 'Este código ya fue utilizado o cancelado' };
    }
    
    const createdAt = new Date(code.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return { canCancel: false, reason: 'Solo se puede cancelar dentro de las primeras 24 horas' };
    }
    
    return { canCancel: true };
  };

  // Cancelar un código de pago
  const handleCancelCode = async () => {
    if (!codeToCancel) return;
    
    const { canCancel, reason } = canCancelCode(codeToCancel);
    if (!canCancel) {
      showNotification('error', reason || 'No se puede cancelar este código');
      return;
    }
    
    setCancelling(true);
    try {
      const res = await fetch(`/api/treasury/payment-codes/${codeToCancel.code}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason })
      });
      
      const data = await res.json();
      
      if (data.success) {
        showNotification('success', 'Código cancelado correctamente');
        setShowCancelModal(false);
        setCodeToCancel(null);
        setCancellationReason('');
        fetchTreasury();
      } else {
        showNotification('error', data.error || 'Error al cancelar código');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (selectedCodes.length === 0) {
      showNotification('error', 'Selecciona al menos un código');
      return;
    }

    setSubmitting(true);
    try {
      // Enviar todos los códigos disponibles (no solo los seleccionados)
      const allCodeIds = unsubmittedCodes.map(c => c.id);
      
      const res = await fetch('/api/treasury/coordinator/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeIds: allCodeIds,
          notes: batchNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Corte de caja enviado: ${formatMoney(data.batch.amount)}`);
        setShowBatchModal(false);
        setSelectedCodes([]);
        setBatchNotes('');
        fetchTreasury();
      } else {
        showNotification('error', data.error || 'Error al enviar corte');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'La imagen no debe superar 5MB');
        return;
      }
      setExpenseEvidence(file);
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = () => {
    setExpenseEvidence(null);
    setEvidencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitExpense = async () => {
    if (!expenseForm.concept || !expenseForm.amount) {
      showNotification('error', 'Completa los campos requeridos');
      return;
    }

    setSubmitting(true);
    try {
      // Primero subir la imagen si existe
      let receiptUrl = null;
      if (expenseEvidence) {
        const formData = new FormData();
        formData.append('file', expenseEvidence);
        formData.append('folder', 'expenses');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.url;
        }
      }

      // Crear el gasto
      const res = await fetch('/api/treasury/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: expenseForm.concept,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          notes: expenseForm.notes || null,
          receiptUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Gasto registrado correctamente');
        setShowExpenseModal(false);
        setExpenseForm({ concept: '', amount: '', category: 'OTHER', notes: '' });
        setExpenseEvidence(null);
        setEvidencePreview(null);
        fetchTreasury();
      } else {
        showNotification('error', data.error || 'Error al registrar gasto');
      }
    } catch (error) {
      showNotification('error', 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[6];
  };

  // Función para manejar selección de nueva evidencia
  const handleNewEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewEvidence(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir evidencia a un gasto existente
  const handleUploadEvidence = async () => {
    if (!expenseToUpload || !newEvidence) return;
    
    setUploadingEvidence(true);
    try {
      // Subir la imagen
      const formData = new FormData();
      formData.append('file', newEvidence);
      formData.append('folder', 'expenses');
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error('Error al subir imagen');
      }
      
      const uploadData = await uploadRes.json();
      const receiptUrl = uploadData.url;

      // Actualizar el gasto con la URL de la evidencia
      const res = await fetch(`/api/treasury/expenses/${expenseToUpload.id}/evidence`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptUrl })
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Evidencia subida correctamente');
        setShowUploadEvidenceModal(false);
        setExpenseToUpload(null);
        setNewEvidence(null);
        setNewEvidencePreview(null);
        fetchTreasury();
      } else {
        showNotification('error', data.error || 'Error al guardar evidencia');
      }
    } catch (error) {
      showNotification('error', 'Error al subir evidencia');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-medium`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">💰 Mi Tesorería</h1>
            <p className="text-slate-400">Administra tus cobros y entregas de efectivo</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Link
              href="/dashboard/coordinador"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              ← Volver
            </Link>
            <button
              onClick={() => {
                setSelectedCodes(unsubmittedCodes.map(c => c.id));
                setShowBatchModal(true);
              }}
              disabled={!canMakeBatch}
              title={expensesWithoutEvidence.length > 0 ? `Tienes ${expensesWithoutEvidence.length} gasto(s) sin evidencia` : ''}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              Hacer Corte de Caja
            </button>
            {expensesWithoutEvidence.length > 0 && (
              <p className="text-red-400 text-xs mt-1 md:hidden">
                ⚠️ {expensesWithoutEvidence.length} gasto(s) sin evidencia
              </p>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Receipt className="text-blue-400" size={20} />
              </div>
              <span className="text-slate-400 text-sm">Generados</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatMoney(treasury?.totalGenerated || 0)}</p>
            <p className="text-xs text-slate-500">{treasury?.codes.length || 0} códigos</p>
          </div>

          <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <DollarSign className="text-orange-400" size={20} />
              </div>
              <span className="text-slate-400 text-sm">Gastos</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">{formatMoney(treasury?.totalExpensesPending || 0)}</p>
            <p className="text-xs text-slate-500">Por aprobar</p>
          </div>

          <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Wallet className="text-cyan-400" size={20} />
              </div>
              <span className="text-slate-400 text-sm">Caja Chica</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{formatMoney(treasury?.cajaChica || 0)}</p>
            <p className="text-xs text-slate-500">Por entregar</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'codes'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="inline mr-2" size={18} />
            Mis Códigos
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="inline mr-2" size={18} />
            Mis Gastos
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'batches'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="inline mr-2" size={18} />
            Cortes de Caja
          </button>
        </div>

        {/* Content */}
        {activeTab === 'codes' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por código o referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Pendientes</option>
                <option value="REDEEMED">Canjeados</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Visión</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No hay códigos que coincidan con los filtros
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((code) => {
                      const { canCancel } = canCancelCode(code);
                      return (
                        <tr key={code.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <code className="text-green-400 font-mono font-bold">{code.code}</code>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white font-bold">{formatMoney(code.amount)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-slate-300 text-sm">{code.reference || '-'}</span>
                              {code.status === 'CANCELLED' && code.cancellationReason && (
                                <p className="text-red-400 text-xs mt-1 italic">
                                  ❌ {code.cancellationReason}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-400 text-sm">{code.vision?.nombre || 'General'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(code.status)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-400 text-sm">{formatDate(code.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canCancel ? (
                              <button
                                onClick={() => {
                                  setCodeToCancel(code);
                                  setShowCancelModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Cancelar código"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Add Expense Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Registrar Gasto
              </button>
            </div>

            {treasury?.expenses.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <DollarSign className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-slate-400">No has registrado ningún gasto aún</p>
                <p className="text-slate-500 text-sm mt-2">
                  Registra tus gastos con evidencia para solicitar reembolso
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {treasury?.expenses.map((expense) => {
                  const category = getCategoryLabel(expense.category);
                  return (
                    <div key={expense.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-orange-500/20 rounded-xl text-2xl">
                            {category.icon}
                          </div>
                          <div>
                            <p className="text-white font-bold">{expense.concept}</p>
                            <p className="text-slate-400 text-sm">{category.label}</p>
                            {expense.vision && (
                              <p className="text-slate-500 text-xs mt-1">🎯 {expense.vision.nombre}</p>
                            )}
                            {expense.notes && (
                              <p className="text-slate-400 text-xs mt-2 italic">"{expense.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-orange-400">{formatMoney(expense.amount)}</p>
                          {getStatusBadge(expense.status)}
                          <p className="text-slate-500 text-xs mt-1">{formatDate(expense.createdAt)}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        {expense.receiptUrl ? (
                          <button
                            onClick={() => {
                              setEvidenceToView(expense.receiptUrl);
                              setShowViewEvidenceModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm"
                          >
                            <Eye size={16} />
                            Ver evidencia
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setExpenseToUpload(expense);
                              setShowUploadEvidenceModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors text-sm"
                          >
                            <Camera size={16} />
                            Subir evidencia
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="space-y-4">
            {treasury?.batches.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <Package className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-slate-400">No has realizado ningún corte de caja aún</p>
                <p className="text-slate-500 text-sm mt-2">
                  Cuando tengas códigos canjeados, podrás hacer un corte para entregar el dinero
                </p>
              </div>
            ) : (
              treasury?.batches.map((batch) => (
                <div key={batch.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-xl">
                        <FileText className="text-green-400" size={24} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{formatMoney(batch.amount)}</p>
                        <p className="text-slate-400 text-sm">{batch.codesCount} códigos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(batch.status)}
                      <p className="text-slate-500 text-xs mt-1">{formatDate(batch.createdAt)}</p>
                    </div>
                  </div>
                  {batch.notes && (
                    <p className="mt-3 text-slate-400 text-sm border-t border-slate-700 pt-3">
                      📝 {batch.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Corte de Caja */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">📦 Nuevo Corte de Caja</h3>
                <p className="text-slate-400 text-sm">Selecciona los códigos a entregar</p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white p-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-green-400">Total a entregar:</span>
                  <span className="text-2xl font-bold text-white">
                    {formatMoney(
                      unsubmittedCodes.reduce((sum, c) => sum + c.amount, 0)
                    )}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {unsubmittedCodes.length} códigos en caja chica
                </p>
              </div>

              {/* Codes List - Solo vista, sin checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-2 mb-6">
                {unsubmittedCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/20 border border-green-500/50"
                  >
                    <div>
                      <code className="text-green-400 font-mono text-sm">{code.code}</code>
                      <p className="text-slate-400 text-xs">
                        {code.reference || 'Sin referencia'}
                        {code.status === 'ACTIVE' && (
                          <span className="ml-2 text-yellow-400">• Pendiente</span>
                        )}
                        {code.status === 'REDEEMED' && (
                          <span className="ml-2 text-green-400">• Canjeado</span>
                        )}
                      </p>
                    </div>
                    <span className="text-white font-bold">{formatMoney(code.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Notas (opcional)</label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ej: Entrega de efectivo semana 1-7 enero..."
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-green-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitBatch}
                  disabled={unsubmittedCodes.length === 0 || submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Corte
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Gasto */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">💸 Registrar Gasto</h3>
                <p className="text-slate-400 text-sm">Añade un gasto con evidencia</p>
              </div>
              <button
                onClick={() => {
                  setShowExpenseModal(false);
                  setExpenseForm({ concept: '', amount: '', category: 'OTHER', notes: '' });
                  removeEvidence();
                }}
                className="text-slate-400 hover:text-white p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Concepto */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Concepto *</label>
                <input
                  type="text"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, concept: e.target.value }))}
                  placeholder="Ej: Compra de materiales para taller..."
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Monto *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setExpenseForm(prev => ({ ...prev, category: cat.value }))}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        expenseForm.category === cat.value
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                          : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon}</span>
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Evidencia */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Evidencia (Foto/Recibo)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {!evidencePreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-600 rounded-xl hover:border-orange-500 transition-colors flex flex-col items-center gap-2 text-slate-400 hover:text-orange-400"
                  >
                    <Camera size={32} />
                    <span>Toca para subir foto</span>
                    <span className="text-xs">JPG, PNG hasta 5MB</span>
                  </button>
                ) : (
                  <div className="relative">
                    <img 
                      src={evidencePreview} 
                      alt="Preview" 
                      className="w-full max-h-48 object-cover rounded-xl border border-slate-600"
                    />
                    <button
                      onClick={removeEvidence}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Notas (opcional)</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Detalles adicionales del gasto..."
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowExpenseModal(false);
                    setExpenseForm({ concept: '', amount: '', category: 'OTHER', notes: '' });
                    removeEvidence();
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitExpense}
                  disabled={!expenseForm.concept || !expenseForm.amount || submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Receipt size={18} />
                      Registrar Gasto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Código */}
      {showCancelModal && codeToCancel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-900/30 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <Ban className="text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cancelar Código</h3>
                  <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Código:</span>
                  <code className="text-red-400 font-mono font-bold">{codeToCancel.code}</code>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Monto:</span>
                  <span className="text-white font-bold">{formatMoney(codeToCancel.amount)}</span>
                </div>
                {codeToCancel.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Referencia:</span>
                    <span className="text-slate-300 text-sm">{codeToCancel.reference}</span>
                  </div>
                )}
              </div>

              <p className="text-slate-400 text-sm text-center mb-4">
                ¿Estás seguro de que deseas cancelar este código de pago?
              </p>

              {/* Campo de motivo */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Motivo de cancelación <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ej: El cliente decidió no realizar la compra..."
                  className={`w-full px-4 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none resize-none ${
                    cancellationReason.trim() ? 'border-slate-600 focus:border-red-500' : 'border-red-500/50'
                  }`}
                  rows={3}
                  required
                />
                {!cancellationReason.trim() && (
                  <p className="text-red-400 text-xs mt-1">El motivo es obligatorio</p>
                )}
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <p className="text-amber-400 text-xs text-center">
                  ⚠️ Se notificará al administrador sobre esta cancelación
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCodeToCancel(null);
                    setCancellationReason('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  No, mantener
                </button>
                <button
                  onClick={handleCancelCode}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Sí, cancelar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Evidencia */}
      {showUploadEvidenceModal && expenseToUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">📸 Subir Evidencia</h3>
                <p className="text-slate-400 text-sm">Foto del recibo o comprobante</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadEvidenceModal(false);
                  setExpenseToUpload(null);
                  setNewEvidence(null);
                  setNewEvidencePreview(null);
                }}
                className="text-slate-400 hover:text-white p-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Info del gasto */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
                <p className="text-white font-bold">{expenseToUpload.concept}</p>
                <p className="text-orange-400 text-lg font-bold">{formatMoney(expenseToUpload.amount)}</p>
              </div>

              {/* Área de upload */}
              <input
                type="file"
                ref={evidenceUploadRef}
                onChange={handleNewEvidenceSelect}
                accept="image/*"
                className="hidden"
              />

              {newEvidencePreview ? (
                <div className="relative mb-6">
                  <img
                    src={newEvidencePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl border border-slate-600"
                  />
                  <button
                    onClick={() => {
                      setNewEvidence(null);
                      setNewEvidencePreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => evidenceUploadRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-slate-600 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-orange-400 transition-colors mb-6"
                >
                  <Camera size={48} />
                  <span>Toca para seleccionar foto</span>
                </button>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadEvidenceModal(false);
                    setExpenseToUpload(null);
                    setNewEvidence(null);
                    setNewEvidencePreview(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadEvidence}
                  disabled={!newEvidence || uploadingEvidence}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingEvidence ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Upload size={18} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Evidencia */}
      {showViewEvidenceModal && evidenceToView && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowViewEvidenceModal(false);
            setEvidenceToView(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => {
                setShowViewEvidenceModal(false);
                setEvidenceToView(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-orange-400 p-2 transition-colors"
            >
              <X size={32} />
            </button>
            <img
              src={evidenceToView}
              alt="Evidencia del gasto"
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={evidenceToView}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={18} />
              Abrir original
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
