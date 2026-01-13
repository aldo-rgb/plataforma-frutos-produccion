'use client';

import { useState, useEffect } from 'react';
import { 
  Package, DollarSign, Receipt, User, Calendar, 
  Eye, CheckCircle, X, Image, ChevronDown, ChevronUp,
  Copy, Loader2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface PaymentCode {
  id: string;
  code: string;
  amount: number;
  status: string;
  reference: string | null;
  createdAt: string;
}

interface Expense {
  id: string;
  concept: string;
  amount: number;
  category: string;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface CashBatch {
  id: string;
  batchNumber: string;
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  status: string;
  confirmationCode: string | null;
  codeGeneratedAt: string | null;
  createdAt: string;
  coordinator: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    profileImage: string | null;
  };
  codeGeneratedBy: {
    id: number;
    nombre: string;
    apellido: string;
  } | null;
  paymentCodes: PaymentCode[];
  expenses: Expense[];
}

const EXPENSE_CATEGORIES: Record<string, { label: string; icon: string }> = {
  'SUPPLIES': { label: 'Materiales', icon: '📦' },
  'TRANSPORT': { label: 'Transporte', icon: '🚗' },
  'FOOD': { label: 'Alimentos', icon: '🍽️' },
  'VENUE': { label: 'Renta', icon: '🏛️' },
  'EQUIPMENT': { label: 'Equipo', icon: '🖥️' },
  'MARKETING': { label: 'Marketing', icon: '📢' },
  'OTHER': { label: 'Otro', icon: '📋' },
};

export default function DirectorBatchesPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<CashBatch[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false, type: 'success', message: ''
  });
  const [viewedEvidences, setViewedEvidences] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/treasury/director/batches');
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 4000);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markEvidenceViewed = (batchId: string, expenseId: string) => {
    setViewedEvidences(prev => {
      const batchViewed = prev[batchId] || new Set();
      batchViewed.add(expenseId);
      return { ...prev, [batchId]: batchViewed };
    });
  };

  const canGenerateCode = (batch: CashBatch) => {
    if (batch.confirmationCode) return false;
    if (batch.expenses.length === 0) return true;
    
    // Verificar que todos los gastos tengan evidencia
    const allHaveEvidence = batch.expenses.every(e => e.receiptUrl);
    if (!allHaveEvidence) return false;
    
    // Verificar que se hayan visto todas las evidencias
    const viewed = viewedEvidences[batch.id] || new Set();
    const allViewed = batch.expenses.every(e => viewed.has(e.id));
    return allViewed;
  };

  const getUnviewedCount = (batch: CashBatch) => {
    const viewed = viewedEvidences[batch.id] || new Set();
    return batch.expenses.filter(e => e.receiptUrl && !viewed.has(e.id)).length;
  };

  const handleGenerateCode = async (batchId: string) => {
    setGeneratingCode(batchId);
    try {
      const res = await fetch(`/api/treasury/director/batches/${batchId}/generate-code`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        showNotification('success', `Código generado: ${data.confirmationCode}`);
        fetchBatches();
      } else {
        showNotification('error', data.error);
      }
    } catch (error) {
      showNotification('error', 'Error al generar código');
    } finally {
      setGeneratingCode(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showNotification('success', 'Código copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white font-medium animate-slide-in`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="text-green-400" />
              Cortes de Caja Pendientes
            </h1>
            <p className="text-slate-400 mt-1">Revisa y genera códigos de confirmación</p>
          </div>
          <Link
            href="/dashboard/director"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ← Volver
          </Link>
        </div>

        {/* Batches List */}
        {batches.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <Package className="mx-auto text-slate-500 mb-4" size={48} />
            <p className="text-slate-400">No hay cortes pendientes de revisión</p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Batch Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {batch.coordinator.profileImage ? (
                          <img 
                            src={batch.coordinator.profileImage} 
                            alt={batch.coordinator.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold">{batch.batchNumber}</p>
                        <p className="text-slate-400 text-sm">
                          {batch.coordinator.nombre} {batch.coordinator.apellido}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${batch.netAmount >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatMoney(batch.netAmount)}
                        </p>
                        <p className="text-slate-500 text-xs">{formatDate(batch.createdAt)}</p>
                      </div>
                      {expandedBatch === batch.id ? (
                        <ChevronUp className="text-slate-400" size={24} />
                      ) : (
                        <ChevronDown className="text-slate-400" size={24} />
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex gap-4 mt-3">
                    <span className="text-sm text-green-400">
                      💰 {batch.paymentCodes.length} códigos (+{formatMoney(batch.totalCollected)})
                    </span>
                    <span className="text-sm text-orange-400">
                      📋 {batch.expenses.length} gastos (-{formatMoney(batch.totalExpenses)})
                    </span>
                    {batch.confirmationCode && (
                      <span className="text-sm text-purple-400">
                        🔑 Código generado
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedBatch === batch.id && (
                  <div className="border-t border-slate-700 p-4 space-y-4">
                    {/* Códigos */}
                    {batch.paymentCodes.length > 0 && (
                      <div>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                          <Receipt size={18} className="text-green-400" />
                          Códigos Generados
                        </h4>
                        <div className="bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-700">
                                <th className="text-left py-1">Código</th>
                                <th className="text-left py-1">Referencia</th>
                                <th className="text-right py-1">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batch.paymentCodes.map(code => (
                                <tr key={code.id} className="text-slate-300 border-b border-slate-800">
                                  <td className="py-1 font-mono text-green-400">{code.code}</td>
                                  <td className="py-1">{code.reference || '-'}</td>
                                  <td className="py-1 text-right">{formatMoney(code.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Gastos con Evidencias */}
                    {batch.expenses.length > 0 && (
                      <div>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                          <DollarSign size={18} className="text-orange-400" />
                          Gastos y Evidencias
                          {getUnviewedCount(batch) > 0 && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {getUnviewedCount(batch)} por revisar
                            </span>
                          )}
                        </h4>
                        <div className="space-y-2">
                          {batch.expenses.map(expense => {
                            const viewed = viewedEvidences[batch.id]?.has(expense.id);
                            const category = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES['OTHER'];
                            
                            return (
                              <div 
                                key={expense.id} 
                                className={`bg-slate-900/50 rounded-lg p-3 flex items-center justify-between ${
                                  !viewed && expense.receiptUrl ? 'border border-orange-500/50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{category.icon}</span>
                                  <div>
                                    <p className="text-white font-medium">{expense.concept}</p>
                                    <p className="text-slate-400 text-xs">{category.label}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-orange-400 font-bold">
                                    -{formatMoney(expense.amount)}
                                  </span>
                                  {expense.receiptUrl ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingEvidence(expense.receiptUrl);
                                        markEvidenceViewed(batch.id, expense.id);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                                        viewed 
                                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                                      }`}
                                    >
                                      {viewed ? <CheckCircle size={16} /> : <Eye size={16} />}
                                      {viewed ? 'Revisado' : 'Ver Evidencia'}
                                    </button>
                                  ) : (
                                    <span className="text-red-400 text-sm flex items-center gap-1">
                                      <AlertTriangle size={16} />
                                      Sin evidencia
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Código de Confirmación */}
                    <div className="border-t border-slate-700 pt-4">
                      {batch.confirmationCode ? (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-400 text-sm">Código de confirmación generado:</p>
                              <p className="text-3xl font-mono font-bold text-white tracking-widest mt-1">
                                {batch.confirmationCode}
                              </p>
                              <p className="text-slate-500 text-xs mt-1">
                                Generado el {formatDate(batch.codeGeneratedAt!)}
                              </p>
                            </div>
                            <button
                              onClick={() => copyCode(batch.confirmationCode!)}
                              className="p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-400 transition-colors"
                            >
                              <Copy size={24} />
                            </button>
                          </div>
                          <p className="text-slate-400 text-sm mt-3">
                            📱 Proporciona este código al coordinador para que confirme la entrega del efectivo.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            {!canGenerateCode(batch) && batch.expenses.length > 0 && (
                              <p className="text-orange-400 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Debes revisar todas las evidencias de gastos antes de generar el código
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleGenerateCode(batch.id)}
                            disabled={!canGenerateCode(batch) || generatingCode === batch.id}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {generatingCode === batch.id ? (
                              <>
                                <Loader2 size={20} className="animate-spin" />
                                Generando...
                              </>
                            ) : (
                              <>
                                🔑 Generar Código de Confirmación
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ver Evidencia */}
      {viewingEvidence && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingEvidence(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingEvidence(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
              <X size={32} />
            </button>
            <img
              src={viewingEvidence}
              alt="Evidencia de gasto"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
