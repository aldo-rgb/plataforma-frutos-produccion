'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Receipt, Plus, Check, X, AlertTriangle, CheckCircle, Clock,
  Upload, Camera, FileText, Wallet, Filter, Search, Eye,
  ThumbsUp, ThumbsDown, Building2
} from 'lucide-react';

interface Expense {
  id: number;
  concept: string;
  description: string | null;
  amount: number;
  category: string;
  receiptUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  deductedFromCash: boolean;
  createdAt: string;
  vision: { id: number; nombre: string } | null;
  user: { id: number; nombre: string };
  approvedBy: { id: number; nombre: string } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
}

interface Vision {
  id: number;
  nombre: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'SUPPLIES', label: 'Materiales', icon: '📦' },
  { value: 'TRANSPORT', label: 'Transporte', icon: '🚗' },
  { value: 'FOOD', label: 'Alimentos', icon: '🍽️' },
  { value: 'VENUE', label: 'Renta de espacio', icon: '🏛️' },
  { value: 'EQUIPMENT', label: 'Equipo', icon: '🖥️' },
  { value: 'MARKETING', label: 'Marketing', icon: '📢' },
  { value: 'OTHER', label: 'Otro', icon: '📋' },
];

export default function GastosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal nuevo gasto
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    concept: '',
    description: '',
    amount: '',
    category: 'SUPPLIES',
    visionId: null as number | null,
    deductedFromCash: true,
    receiptUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal aprobar/rechazar
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
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
      fetchVisiones();
      fetchExpenses();
    }
  }, [status, session]);

  const fetchVisiones = async () => {
    try {
      const res = await fetch('/api/coordinador/visiones');
      const data = await res.json();
      if (data.success) {
        setVisiones(data.visiones || []);
      }
    } catch (error) {
      console.error('Error fetching visiones:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.append('status', filter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      
      const res = await fetch(`/api/treasury/expenses?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(data.summary || {});
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchExpenses();
    }
  }, [filter, categoryFilter]);

  const handleSubmitExpense = async () => {
    if (!newExpense.concept || !newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      setNotification({ type: 'error', message: 'Completa los campos requeridos' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/treasury/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: 'Gasto registrado exitosamente' });
        setShowNewExpenseModal(false);
        setNewExpense({
          concept: '',
          description: '',
          amount: '',
          category: 'SUPPLIES',
          visionId: null,
          deductedFromCash: true,
          receiptUrl: '',
        });
        fetchExpenses();
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al registrar gasto' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (expenseId: number, approved: boolean) => {
    try {
      const res = await fetch(`/api/treasury/expenses/${expenseId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          rejectionReason: !approved ? rejectionReason : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification({
          type: 'success',
          message: approved ? 'Gasto aprobado' : 'Gasto rechazado',
        });
        setShowApprovalModal(false);
        setSelectedExpense(null);
        setRejectionReason('');
        fetchExpenses();
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al procesar' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Aprobado
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category) || { label: category, icon: '📋' };
  };

  const filteredExpenses = expenses.filter((expense) =>
    expense.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.user.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Totales
  const totalPending = expenses.filter((e) => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = expenses.filter((e) => e.status === 'APPROVED').reduce((sum, e) => sum + e.amount, 0);

  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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
              <div className="p-3 rounded-xl bg-orange-500/20">
                <Receipt className="w-8 h-8 text-orange-400" />
              </div>
              Gestor de Gastos
            </h1>
            <p className="text-slate-400 mt-2">
              Registra y gestiona los gastos operativos
            </p>
          </div>

          <button
            onClick={() => setShowNewExpenseModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/25"
          >
            <Plus className="w-5 h-5" />
            Nuevo Gasto
          </button>
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
                <p className="text-slate-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</p>
                <p className="text-yellow-400 text-xs">{expenses.filter((e) => e.status === 'PENDING').length} gastos</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Aprobados</p>
                <p className="text-2xl font-bold text-white">${totalApproved.toLocaleString()}</p>
                <p className="text-green-400 text-xs">{expenses.filter((e) => e.status === 'APPROVED').length} gastos</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">De Caja</p>
                <p className="text-2xl font-bold text-white">
                  ${expenses.filter((e) => e.deductedFromCash && e.status === 'APPROVED').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </p>
                <p className="text-purple-400 text-xs">Deducidos del efectivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Filtro estado */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
            </select>

            {/* Filtro categoría */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">Todas las categorías</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Gastos */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Concepto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Monto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Solicitante</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No hay gastos que mostrar
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => {
                    const categoryInfo = getCategoryInfo(expense.category);
                    return (
                      <tr key={expense.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{expense.concept}</p>
                            {expense.description && (
                              <p className="text-slate-400 text-sm truncate max-w-xs">{expense.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-semibold">${expense.amount.toLocaleString()}</span>
                          {expense.deductedFromCash && (
                            <span className="ml-2 text-xs text-purple-400">(caja)</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span>{categoryInfo.icon}</span>
                            {categoryInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(expense.status)}</td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{expense.user.nombre}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-sm">
                            {new Date(expense.createdAt).toLocaleDateString('es-MX')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {expense.receiptUrl && (
                              <a
                                href={expense.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                                title="Ver comprobante"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            {isAdmin && expense.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(expense.id, true)}
                                  className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                  title="Aprobar"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowApprovalModal(true);
                                  }}
                                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                  title="Rechazar"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Gasto */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nuevo Gasto</h2>
              <button
                onClick={() => setShowNewExpenseModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Concepto *
                </label>
                <input
                  type="text"
                  value={newExpense.concept}
                  onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                  placeholder="Ej: Compra de materiales"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monto *
                  </label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Visión (opcional)
                </label>
                <select
                  value={newExpense.visionId || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, visionId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Sin visión específica</option>
                  {visiones.map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL del comprobante
                </label>
                <input
                  type="url"
                  value={newExpense.receiptUrl}
                  onChange={(e) => setNewExpense({ ...newExpense, receiptUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="deductedFromCash"
                  checked={newExpense.deductedFromCash}
                  onChange={(e) => setNewExpense({ ...newExpense, deductedFromCash: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="deductedFromCash" className="text-slate-300">
                  Pagado del efectivo recaudado
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewExpenseModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitExpense}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    Registrar Gasto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showApprovalModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Rechazar Gasto</h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedExpense(null);
                  setRejectionReason('');
                }}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-slate-300">
                <strong>Concepto:</strong> {selectedExpense.concept}
              </p>
              <p className="text-slate-300">
                <strong>Monto:</strong> ${selectedExpense.amount.toLocaleString()}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Motivo del rechazo
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica por qué se rechaza este gasto..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedExpense(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(selectedExpense.id, false)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
