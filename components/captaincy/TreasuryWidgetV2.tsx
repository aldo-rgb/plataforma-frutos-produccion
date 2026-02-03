'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Loader2,
  Wallet,
  Shirt,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Users,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import Image from 'next/image';

interface Member {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
}

interface BudgetItem {
  id: number;
  concept: string;
  amount: number;
}

interface BudgetPayment {
  id: number;
  userId: number;
  user: Member;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  verifiedBy: { id: number; nombre: string } | null;
  proofImage: string | null;
  notes: string | null;
}

interface Budget {
  id: number;
  name: string;
  description: string | null;
  totalAmount: number;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: number; nombre: string };
  items: BudgetItem[];
  payments: BudgetPayment[];
  stats: {
    totalPaid: number;
    totalPending: number;
    paidCount: number;
    pendingCount: number;
    totalMembers: number;
    progress: number;
  };
}

interface ShirtPayment {
  id: number;
  userId: number;
  user: Member;
  size: string | null;
  quantity: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  verifiedBy: { id: number; nombre: string } | null;
  proofImage: string | null;
  deliveredAt: string | null;
  notes: string | null;
}

interface ShirtProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: number; nombre: string };
  payments: ShirtPayment[];
  stats: {
    totalPaid: number;
    totalPending: number;
    paidCount: number;
    pendingCount: number;
    deliveredCount: number;
    totalMembers: number;
    progress: number;
  };
}

interface Props {
  visionId: number;
  visionName: string;
  isTreasurer: boolean;
}

export default function TreasuryWidgetV2({ visionId, visionName, isTreasurer }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  
  // Budget states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetMembers, setBudgetMembers] = useState<Member[]>([]);
  const [expandedBudget, setExpandedBudget] = useState<number | null>(null);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showArchivedBudgets, setShowArchivedBudgets] = useState(false);
  
  // Shirt states
  const [shirtProducts, setShirtProducts] = useState<ShirtProduct[]>([]);
  const [shirtMembers, setShirtMembers] = useState<Member[]>([]);
  const [memberSizes, setMemberSizes] = useState<Record<number, string>>({});
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [showCreateShirt, setShowCreateShirt] = useState(false);
  const [showArchivedShirts, setShowArchivedShirts] = useState(false);
  
  // Form states for new budget
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetDescription, setNewBudgetDescription] = useState('');
  const [newBudgetItems, setNewBudgetItems] = useState<{concept: string; amount: string}[]>([
    { concept: '', amount: '' }
  ]);
  const [selectedBudgetMembers, setSelectedBudgetMembers] = useState<number[]>([]);
  
  // Form states for new shirt
  const [newShirtName, setNewShirtName] = useState('');
  const [newShirtDescription, setNewShirtDescription] = useState('');
  const [newShirtPrice, setNewShirtPrice] = useState('');
  const [selectedShirtMembers, setSelectedShirtMembers] = useState<number[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    loadData();
  }, [visionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar presupuestos
      const budgetRes = await fetch(`/api/tribe-budgets?visionId=${visionId}`);
      const budgetData = await budgetRes.json();
      if (budgetData.success) {
        setBudgets(budgetData.budgets || []);
        setBudgetMembers(budgetData.members || []);
      }
      
      // Cargar playeras
      const shirtRes = await fetch(`/api/tribe-shirts?visionId=${visionId}`);
      const shirtData = await shirtRes.json();
      if (shirtData.success) {
        setShirtProducts(shirtData.products || []);
        setShirtMembers(shirtData.members || []);
        setMemberSizes(shirtData.memberSizes || {});
      }
    } catch (error) {
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // === BUDGET FUNCTIONS ===
  const createBudget = async () => {
    if (!newBudgetName.trim()) {
      showToast('Ingresa un nombre para el presupuesto', 'error');
      return;
    }
    
    const validItems = newBudgetItems.filter(i => i.concept.trim() && parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      showToast('Agrega al menos un concepto con monto', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tribe-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_budget',
          visionId,
          name: newBudgetName,
          description: newBudgetDescription,
          items: validItems.map(i => ({ concept: i.concept, amount: parseFloat(i.amount) })),
          memberIds: selectedBudgetMembers
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Presupuesto creado', 'success');
        setShowCreateBudget(false);
        setNewBudgetName('');
        setNewBudgetDescription('');
        setNewBudgetItems([{ concept: '', amount: '' }]);
        setSelectedBudgetMembers([]);
        loadData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleBudgetPayment = async (budgetId: number, memberId: number, currentlyPaid: boolean) => {
    try {
      const res = await fetch('/api/tribe-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_payment',
          visionId,
          budgetId,
          memberId,
          isPaid: !currentlyPaid
        })
      });

      const data = await res.json();
      if (data.success) {
        // Actualizar estado local
        setBudgets(prev => prev.map(b => {
          if (b.id === budgetId) {
            return {
              ...b,
              payments: b.payments.map(p => 
                p.userId === memberId 
                  ? { ...p, isPaid: !currentlyPaid, paidAt: !currentlyPaid ? new Date().toISOString() : null }
                  : p
              ),
              stats: {
                ...b.stats,
                paidCount: !currentlyPaid ? b.stats.paidCount + 1 : b.stats.paidCount - 1,
                pendingCount: !currentlyPaid ? b.stats.pendingCount - 1 : b.stats.pendingCount + 1,
                totalPaid: !currentlyPaid ? b.stats.totalPaid + b.totalAmount : b.stats.totalPaid - b.totalAmount,
                totalPending: !currentlyPaid ? b.stats.totalPending - b.totalAmount : b.stats.totalPending + b.totalAmount,
                progress: Math.round(((!currentlyPaid ? b.stats.paidCount + 1 : b.stats.paidCount - 1) / b.stats.totalMembers) * 100)
              }
            };
          }
          return b;
        }));
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const addBudgetItem = () => {
    setNewBudgetItems([...newBudgetItems, { concept: '', amount: '' }]);
  };

  const removeBudgetItem = (index: number) => {
    setNewBudgetItems(newBudgetItems.filter((_, i) => i !== index));
  };

  const updateBudgetItem = (index: number, field: 'concept' | 'amount', value: string) => {
    setNewBudgetItems(newBudgetItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const toggleBudgetActive = async (budgetId: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/tribe-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_budget_active',
          visionId,
          budgetId,
          isActive
        })
      });

      const data = await res.json();
      if (data.success) {
        setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, isActive } : b));
        showToast(isActive ? 'Presupuesto reactivado' : 'Presupuesto archivado', 'success');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const addMembersToBudget = async (budgetId: number) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;

    const existingUserIds = budget.payments.map(p => p.userId);
    const newMemberIds = budgetMembers
      .filter(m => !existingUserIds.includes(m.id))
      .map(m => m.id);

    if (newMemberIds.length === 0) {
      showToast('Todos los miembros ya están en este presupuesto', 'error');
      return;
    }

    try {
      const res = await fetch('/api/tribe-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_members_to_budget',
          visionId,
          budgetId,
          memberIds: newMemberIds
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`${data.addedCount} miembros agregados`, 'success');
        loadData();
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  // === SHIRT FUNCTIONS ===
  const createShirtProduct = async () => {
    if (!newShirtName.trim()) {
      showToast('Ingresa un nombre para la playera', 'error');
      return;
    }
    
    const price = parseFloat(newShirtPrice);
    if (!price || price <= 0) {
      showToast('Ingresa un precio válido', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tribe-shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_product',
          visionId,
          name: newShirtName,
          description: newShirtDescription,
          price,
          memberIds: selectedShirtMembers
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Playera creada', 'success');
        setShowCreateShirt(false);
        setNewShirtName('');
        setNewShirtDescription('');
        setNewShirtPrice('');
        setSelectedShirtMembers([]);
        loadData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleShirtPayment = async (productId: number, memberId: number, currentlyPaid: boolean) => {
    try {
      const res = await fetch('/api/tribe-shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_payment',
          visionId,
          productId,
          memberId,
          isPaid: !currentlyPaid
        })
      });

      const data = await res.json();
      if (data.success) {
        // Actualizar estado local
        setShirtProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              payments: p.payments.map(pay => 
                pay.userId === memberId 
                  ? { ...pay, isPaid: !currentlyPaid, paidAt: !currentlyPaid ? new Date().toISOString() : null }
                  : pay
              ),
              stats: {
                ...p.stats,
                paidCount: !currentlyPaid ? p.stats.paidCount + 1 : p.stats.paidCount - 1,
                pendingCount: !currentlyPaid ? p.stats.pendingCount - 1 : p.stats.pendingCount + 1,
                totalPaid: !currentlyPaid ? p.stats.totalPaid + p.price : p.stats.totalPaid - p.price,
                totalPending: !currentlyPaid ? p.stats.totalPending - p.price : p.stats.totalPending + p.price,
                progress: Math.round(((!currentlyPaid ? p.stats.paidCount + 1 : p.stats.paidCount - 1) / p.stats.totalMembers) * 100)
              }
            };
          }
          return p;
        }));
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const toggleShirtDelivered = async (productId: number, memberId: number, currentlyDelivered: boolean) => {
    try {
      const res = await fetch('/api/tribe-shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_delivered',
          visionId,
          productId,
          memberId,
          delivered: !currentlyDelivered
        })
      });

      const data = await res.json();
      if (data.success) {
        setShirtProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              payments: p.payments.map(pay => 
                pay.userId === memberId 
                  ? { ...pay, deliveredAt: !currentlyDelivered ? new Date().toISOString() : null }
                  : pay
              ),
              stats: {
                ...p.stats,
                deliveredCount: !currentlyDelivered ? p.stats.deliveredCount + 1 : p.stats.deliveredCount - 1
              }
            };
          }
          return p;
        }));
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const toggleProductActive = async (productId: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/tribe-shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_product_active',
          visionId,
          productId,
          isActive
        })
      });

      const data = await res.json();
      if (data.success) {
        setShirtProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive } : p));
        showToast(isActive ? 'Playera reactivada' : 'Playera archivada', 'success');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const addMembersToProduct = async (productId: number) => {
    const product = shirtProducts.find(p => p.id === productId);
    if (!product) return;

    const existingUserIds = product.payments.map(p => p.userId);
    const newMemberIds = shirtMembers
      .filter(m => !existingUserIds.includes(m.id))
      .map(m => m.id);

    if (newMemberIds.length === 0) {
      showToast('Todos los miembros ya están en esta playera', 'error');
      return;
    }

    try {
      const res = await fetch('/api/tribe-shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_members_to_product',
          visionId,
          productId,
          memberIds: newMemberIds
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`${data.addedCount} miembros agregados`, 'success');
        loadData();
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  // Calcular totales
  const budgetTotal = budgets.reduce((sum, b) => sum + (b.isActive ? b.stats.totalPaid : 0), 0);
  const shirtTotal = shirtProducts.reduce((sum, p) => sum + (p.isActive ? p.stats.totalPaid : 0), 0);

  const activeBudgets = budgets.filter(b => b.isActive);
  const archivedBudgets = budgets.filter(b => !b.isActive);
  const activeProducts = shirtProducts.filter(p => p.isActive);
  const archivedProducts = shirtProducts.filter(p => !p.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* Resumen General */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} className="text-emerald-400" />
            <p className="text-emerald-400 text-xs font-medium">Total Presupuestos</p>
          </div>
          <p className="text-2xl font-bold text-white">${budgetTotal.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Shirt size={18} className="text-purple-400" />
            <p className="text-purple-400 text-xs font-medium">Total Playeras</p>
          </div>
          <p className="text-2xl font-bold text-white">${shirtTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* === CAJA DE PRESUPUESTOS === */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white">Presupuestos</h3>
                <span className="text-xs text-white/60">({activeBudgets.length})</span>
              </div>
              {isTreasurer && (
                <button
                  onClick={() => {
                    setSelectedBudgetMembers(budgetMembers.map(m => m.id));
                    setShowCreateBudget(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus size={16} />
                  Nuevo
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {/* Formulario de nuevo presupuesto */}
            {showCreateBudget && (
              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-500/30 space-y-3">
                <h4 className="text-white font-medium">Nuevo Presupuesto</h4>
                
                <input
                  type="text"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  placeholder="Nombre del presupuesto"
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                />
                
                <textarea
                  value={newBudgetDescription}
                  onChange={(e) => setNewBudgetDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm resize-none"
                  rows={2}
                />

                <div className="space-y-2">
                  <p className="text-white/70 text-xs font-medium">Conceptos:</p>
                  {newBudgetItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.concept}
                        onChange={(e) => updateBudgetItem(idx, 'concept', e.target.value)}
                        placeholder="Concepto"
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateBudgetItem(idx, 'amount', e.target.value)}
                        placeholder="$"
                        className="w-24 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                      />
                      {newBudgetItems.length > 1 && (
                        <button
                          onClick={() => removeBudgetItem(idx)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addBudgetItem}
                    className="text-emerald-400 text-sm hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar concepto
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/70 text-xs font-medium mb-2">Total por persona: ${newBudgetItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0).toLocaleString()}</p>
                  
                  <p className="text-white/70 text-xs font-medium mb-1">Agregar miembros (opcional):</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {budgetMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:bg-white/5 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedBudgetMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBudgetMembers([...selectedBudgetMembers, member.id]);
                            } else {
                              setSelectedBudgetMembers(selectedBudgetMembers.filter(id => id !== member.id));
                            }
                          }}
                          className="rounded border-white/30"
                        />
                        {member.nombre}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedBudgetMembers(budgetMembers.map(m => m.id))}
                    className="text-emerald-400 text-xs hover:underline mt-1"
                  >
                    Seleccionar todos
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={createBudget}
                    disabled={saving}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateBudget(false);
                      setNewBudgetName('');
                      setNewBudgetDescription('');
                      setNewBudgetItems([{ concept: '', amount: '' }]);
                      setSelectedBudgetMembers([]);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de presupuestos activos */}
            {activeBudgets.length === 0 && !showCreateBudget ? (
              <div className="text-center py-8 text-white/50">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay presupuestos activos</p>
                {isTreasurer && (
                  <button
                    onClick={() => {
                      setSelectedBudgetMembers(budgetMembers.map(m => m.id));
                      setShowCreateBudget(true);
                    }}
                    className="mt-2 text-emerald-400 hover:underline text-sm"
                  >
                    Crear el primero
                  </button>
                )}
              </div>
            ) : (
              activeBudgets.map(budget => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  isExpanded={expandedBudget === budget.id}
                  onToggleExpand={() => setExpandedBudget(expandedBudget === budget.id ? null : budget.id)}
                  onTogglePayment={(memberId, isPaid) => toggleBudgetPayment(budget.id, memberId, isPaid)}
                  onArchive={() => toggleBudgetActive(budget.id, false)}
                  onAddMembers={() => addMembersToBudget(budget.id)}
                  isTreasurer={isTreasurer}
                />
              ))
            )}

            {/* Archivados */}
            {archivedBudgets.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowArchivedBudgets(!showArchivedBudgets)}
                  className="flex items-center gap-2 text-white/50 text-sm hover:text-white/70"
                >
                  <Archive size={14} />
                  Archivados ({archivedBudgets.length})
                  {showArchivedBudgets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {showArchivedBudgets && (
                  <div className="mt-2 space-y-2 opacity-60">
                    {archivedBudgets.map(budget => (
                      <BudgetCard
                        key={budget.id}
                        budget={budget}
                        isExpanded={expandedBudget === budget.id}
                        onToggleExpand={() => setExpandedBudget(expandedBudget === budget.id ? null : budget.id)}
                        onTogglePayment={(memberId, isPaid) => toggleBudgetPayment(budget.id, memberId, isPaid)}
                        onReactivate={() => toggleBudgetActive(budget.id, true)}
                        onAddMembers={() => addMembersToBudget(budget.id)}
                        isTreasurer={isTreasurer}
                        isArchived
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === CAJA DE PLAYERAS === */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">Playeras</h3>
                <span className="text-xs text-white/60">({activeProducts.length})</span>
              </div>
              {isTreasurer && (
                <button
                  onClick={() => {
                    setSelectedShirtMembers(shirtMembers.map(m => m.id));
                    setShowCreateShirt(true);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus size={16} />
                  Nueva
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {/* Formulario de nueva playera */}
            {showCreateShirt && (
              <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/30 space-y-3">
                <h4 className="text-white font-medium">Nueva Playera</h4>
                
                <input
                  type="text"
                  value={newShirtName}
                  onChange={(e) => setNewShirtName(e.target.value)}
                  placeholder="Nombre de la playera"
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                />
                
                <textarea
                  value={newShirtDescription}
                  onChange={(e) => setNewShirtDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm resize-none"
                  rows={2}
                />

                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-sm">Precio:</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                    <input
                      type="number"
                      value={newShirtPrice}
                      onChange={(e) => setNewShirtPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/70 text-xs font-medium mb-1">Agregar miembros (opcional):</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {shirtMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:bg-white/5 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedShirtMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedShirtMembers([...selectedShirtMembers, member.id]);
                            } else {
                              setSelectedShirtMembers(selectedShirtMembers.filter(id => id !== member.id));
                            }
                          }}
                          className="rounded border-white/30"
                        />
                        {member.nombre}
                        {memberSizes[member.id] && (
                          <span className="text-purple-400 text-xs">({memberSizes[member.id]})</span>
                        )}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedShirtMembers(shirtMembers.map(m => m.id))}
                    className="text-purple-400 text-xs hover:underline mt-1"
                  >
                    Seleccionar todos
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={createShirtProduct}
                    disabled={saving}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateShirt(false);
                      setNewShirtName('');
                      setNewShirtDescription('');
                      setNewShirtPrice('');
                      setSelectedShirtMembers([]);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de playeras activas */}
            {activeProducts.length === 0 && !showCreateShirt ? (
              <div className="text-center py-8 text-white/50">
                <Shirt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay playeras registradas</p>
                {isTreasurer && (
                  <button
                    onClick={() => {
                      setSelectedShirtMembers(shirtMembers.map(m => m.id));
                      setShowCreateShirt(true);
                    }}
                    className="mt-2 text-purple-400 hover:underline text-sm"
                  >
                    Crear la primera
                  </button>
                )}
              </div>
            ) : (
              activeProducts.map(product => (
                <ShirtProductCard
                  key={product.id}
                  product={product}
                  memberSizes={memberSizes}
                  isExpanded={expandedProduct === product.id}
                  onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                  onTogglePayment={(memberId, isPaid) => toggleShirtPayment(product.id, memberId, isPaid)}
                  onToggleDelivered={(memberId, isDelivered) => toggleShirtDelivered(product.id, memberId, isDelivered)}
                  onArchive={() => toggleProductActive(product.id, false)}
                  onAddMembers={() => addMembersToProduct(product.id)}
                  isTreasurer={isTreasurer}
                />
              ))
            )}

            {/* Archivados */}
            {archivedProducts.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowArchivedShirts(!showArchivedShirts)}
                  className="flex items-center gap-2 text-white/50 text-sm hover:text-white/70"
                >
                  <Archive size={14} />
                  Archivadas ({archivedProducts.length})
                  {showArchivedShirts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {showArchivedShirts && (
                  <div className="mt-2 space-y-2 opacity-60">
                    {archivedProducts.map(product => (
                      <ShirtProductCard
                        key={product.id}
                        product={product}
                        memberSizes={memberSizes}
                        isExpanded={expandedProduct === product.id}
                        onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        onTogglePayment={(memberId, isPaid) => toggleShirtPayment(product.id, memberId, isPaid)}
                        onToggleDelivered={(memberId, isDelivered) => toggleShirtDelivered(product.id, memberId, isDelivered)}
                        onReactivate={() => toggleProductActive(product.id, true)}
                        onAddMembers={() => addMembersToProduct(product.id)}
                        isTreasurer={isTreasurer}
                        isArchived
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// === COMPONENTE: Card de Presupuesto ===
function BudgetCard({
  budget,
  isExpanded,
  onToggleExpand,
  onTogglePayment,
  onArchive,
  onReactivate,
  onAddMembers,
  isTreasurer,
  isArchived = false
}: {
  budget: Budget;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTogglePayment: (memberId: number, isPaid: boolean) => void;
  onArchive?: () => void;
  onReactivate?: () => void;
  onAddMembers: () => void;
  isTreasurer: boolean;
  isArchived?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${isArchived ? 'border-white/10 bg-white/5' : 'border-emerald-500/30 bg-emerald-900/10'}`}>
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white">{budget.name}</h4>
            {isArchived && <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded">Archivado</span>}
          </div>
          <p className="text-xs text-white/60 mt-0.5">${budget.totalAmount.toLocaleString()} por persona</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-emerald-400 font-bold">{budget.stats.progress}%</p>
            <p className="text-xs text-white/50">{budget.stats.paidCount}/{budget.stats.totalMembers}</p>
          </div>
          {isExpanded ? <ChevronUp size={20} className="text-white/50" /> : <ChevronDown size={20} className="text-white/50" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
          {/* Desglose */}
          {budget.items.length > 0 && (
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-2">Desglose:</p>
              {budget.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-white/70">{item.concept}</span>
                  <span className="text-white">${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-medium">
                <span className="text-white">Total</span>
                <span className="text-emerald-400">${budget.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-green-500/10 rounded-lg py-2">
              <p className="text-green-400 font-bold">${budget.stats.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-white/50">Recaudado</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg py-2">
              <p className="text-yellow-400 font-bold">${budget.stats.totalPending.toLocaleString()}</p>
              <p className="text-xs text-white/50">Pendiente</p>
            </div>
          </div>

          {/* Lista de pagos */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {budget.payments.map(payment => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  payment.isPaid ? 'bg-green-500/10' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  {payment.user.profileImage ? (
                    <Image
                      src={payment.user.profileImage}
                      alt={payment.user.nombre}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs text-white">
                      {payment.user.nombre.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-white">{payment.user.nombre}</span>
                </div>
                
                {isTreasurer ? (
                  <button
                    onClick={() => onTogglePayment(payment.userId, payment.isPaid)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      payment.isPaid 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    <Check size={16} />
                  </button>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded ${
                    payment.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                  }`}>
                    {payment.isPaid ? 'Pagado' : 'Pendiente'}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Acciones */}
          {isTreasurer && (
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={onAddMembers}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg flex items-center justify-center gap-1"
              >
                <Users size={14} />
                Agregar miembros
              </button>
              {isArchived ? (
                <button
                  onClick={onReactivate}
                  className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg"
                >
                  <RotateCcw size={14} />
                </button>
              ) : (
                <button
                  onClick={onArchive}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg"
                >
                  <Archive size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === COMPONENTE: Card de Playera ===
function ShirtProductCard({
  product,
  memberSizes,
  isExpanded,
  onToggleExpand,
  onTogglePayment,
  onToggleDelivered,
  onArchive,
  onReactivate,
  onAddMembers,
  isTreasurer,
  isArchived = false
}: {
  product: ShirtProduct;
  memberSizes: Record<number, string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTogglePayment: (memberId: number, isPaid: boolean) => void;
  onToggleDelivered: (memberId: number, isDelivered: boolean) => void;
  onArchive?: () => void;
  onReactivate?: () => void;
  onAddMembers: () => void;
  isTreasurer: boolean;
  isArchived?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${isArchived ? 'border-white/10 bg-white/5' : 'border-purple-500/30 bg-purple-900/10'}`}>
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white">{product.name}</h4>
            {isArchived && <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded">Archivada</span>}
          </div>
          <p className="text-xs text-white/60 mt-0.5">${product.price.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-purple-400 font-bold">{product.stats.progress}%</p>
            <p className="text-xs text-white/50">{product.stats.paidCount}/{product.stats.totalMembers}</p>
          </div>
          {isExpanded ? <ChevronUp size={20} className="text-white/50" /> : <ChevronDown size={20} className="text-white/50" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-500/10 rounded-lg py-2">
              <p className="text-green-400 font-bold">${product.stats.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-white/50">Pagado</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg py-2">
              <p className="text-yellow-400 font-bold">${product.stats.totalPending.toLocaleString()}</p>
              <p className="text-xs text-white/50">Pendiente</p>
            </div>
            <div className="bg-purple-500/10 rounded-lg py-2">
              <p className="text-purple-400 font-bold">{product.stats.deliveredCount}</p>
              <p className="text-xs text-white/50">Entregadas</p>
            </div>
          </div>

          {/* Lista de pagos */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {product.payments.map(payment => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  payment.isPaid ? 'bg-green-500/10' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  {payment.user.profileImage ? (
                    <Image
                      src={payment.user.profileImage}
                      alt={payment.user.nombre}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs text-white">
                      {payment.user.nombre.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-white">{payment.user.nombre}</span>
                    {(payment.size || memberSizes[payment.userId]) && (
                      <span className="ml-2 text-xs text-purple-400">
                        Talla: {payment.size || memberSizes[payment.userId]}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {isTreasurer ? (
                    <>
                      <button
                        onClick={() => onTogglePayment(payment.userId, payment.isPaid)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          payment.isPaid 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/10 text-white/50 hover:bg-white/20'
                        }`}
                        title={payment.isPaid ? 'Pagado' : 'Marcar como pagado'}
                      >
                        <DollarSign size={14} />
                      </button>
                      {payment.isPaid && (
                        <button
                          onClick={() => onToggleDelivered(payment.userId, !!payment.deliveredAt)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            payment.deliveredAt 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-white/10 text-white/50 hover:bg-white/20'
                          }`}
                          title={payment.deliveredAt ? 'Entregada' : 'Marcar como entregada'}
                        >
                          <Package size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                      }`}>
                        {payment.isPaid ? '💰' : 'Pendiente'}
                      </span>
                      {payment.deliveredAt && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                          📦
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
          {isTreasurer && (
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={onAddMembers}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg flex items-center justify-center gap-1"
              >
                <Users size={14} />
                Agregar miembros
              </button>
              {isArchived ? (
                <button
                  onClick={onReactivate}
                  className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg"
                >
                  <RotateCcw size={14} />
                </button>
              ) : (
                <button
                  onClick={onArchive}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg"
                >
                  <Archive size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
