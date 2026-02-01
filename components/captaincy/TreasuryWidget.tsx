'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Wallet,
  Building2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Shirt,
  Landmark,
  DollarSign,
  Eye,
  EyeOff,
  Plus,
  Filter,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  User
} from 'lucide-react';

interface BankAccount {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  clabe: string | null;
  accountType: string;
  alias: string | null;
  referenceNote: string | null;
  isActive: boolean;
  configuredBy: { id: number; nombre: string };
}

interface Income {
  id: number;
  category: string;
  concept: string;
  amount: number;
  payerUserId: number | null;
  payerName: string | null;
  payerEmail: string | null;
  proofImage: string | null;
  proofNotes: string | null;
  status: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  payer: { id: number; nombre: string; email: string; profileImage: string | null } | null;
  verifiedBy: { id: number; nombre: string } | null;
  shirtOrder: { id: number; size: string; quantity: number } | null;
  project: { id: number; name: string } | null;
}

interface ShirtOrder {
  id: number;
  size: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paidAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  user: { id: number; nombre: string; email: string; profileImage: string | null };
}

interface MemberSize {
  id: number;
  userId: number;
  size: string;
  createdAt: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    profileImage: string | null;
  };
}

interface ShirtType {
  id: string;
  name: string;
  price: number;
}

interface Props {
  visionId: number;
  visionName: string;
  isTreasurer: boolean;
}

const categoryLabels: Record<string, string> = {
  SHIRT: '👕 Playera',
  LEGACY_FORGE: '🌟 Legacy Forge',
  CONTRIBUTION: '💰 Contribución',
  EVENT: '🎉 Evento',
  OTHER: '📦 Otro'
};

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock },
  VERIFIED: { label: 'Verificado', color: 'text-green-400 bg-green-500/20', icon: CheckCircle2 },
  REJECTED: { label: 'Rechazado', color: 'text-red-400 bg-red-500/20', icon: XCircle },
  REFUNDED: { label: 'Reembolsado', color: 'text-gray-400 bg-gray-500/20', icon: DollarSign }
};

const shirtStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pendiente de Pago', color: 'text-yellow-400 bg-yellow-500/20' },
  PAID: { label: 'Pagado', color: 'text-blue-400 bg-blue-500/20' },
  IN_PRODUCTION: { label: 'En Producción', color: 'text-purple-400 bg-purple-500/20' },
  READY: { label: 'Listo', color: 'text-cyan-400 bg-cyan-500/20' },
  DELIVERED: { label: 'Entregado', color: 'text-green-400 bg-green-500/20' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-400 bg-red-500/20' }
};

export default function TreasuryWidget({ visionId, visionName, isTreasurer }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bank' | 'incomes' | 'shirts'>('bank');
  
  // Data states
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [shirtOrders, setShirtOrders] = useState<ShirtOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Shirt payment system states
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([]);
  const [newShirtName, setNewShirtName] = useState('');
  const [newShirtPrice, setNewShirtPrice] = useState('');
  const [editingShirtConfig, setEditingShirtConfig] = useState(false);
  const [togglingPayment, setTogglingPayment] = useState<number | null>(null);
  const [allMemberSizes, setAllMemberSizes] = useState<MemberSize[]>([]);
  
  // Computed total
  const totalShirtCost = shirtTypes.reduce((sum, s) => sum + s.price, 0);
  
  // UI states
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showClabe, setShowClabe] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [expandedIncome, setExpandedIncome] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  // Form states
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    clabe: '',
    accountType: 'DEBIT',
    alias: '',
    referenceNote: ''
  });
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [saving, setSaving] = useState(false);

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
      const params = new URLSearchParams({ visionId: visionId.toString() });
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const res = await fetch(`/api/tribe-treasury?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al cargar datos', 'error');
        return;
      }

      setBankAccount(data.bankAccount);
      setIncomes(data.incomes || []);
      setShirtOrders(data.shirtOrders || []);
      setStats(data.stats);
      
      // Load shirt types and member sizes
      setShirtTypes(data.shirtTypes || []);
      setAllMemberSizes(data.allMemberSizes || []);

      if (data.bankAccount) {
        setBankForm({
          bankName: data.bankAccount.bankName,
          accountHolder: data.bankAccount.accountHolder,
          accountNumber: data.bankAccount.accountNumber,
          clabe: data.bankAccount.clabe || '',
          accountType: data.bankAccount.accountType,
          alias: data.bankAccount.alias || '',
          referenceNote: data.bankAccount.referenceNote || ''
        });
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveBankAccount = async () => {
    if (!bankForm.bankName || !bankForm.accountHolder || !bankForm.accountNumber) {
      showToast('Completa los campos requeridos', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tribe-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_bank_account',
          visionId,
          ...bankForm
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Cuenta bancaria configurada', 'success');
        setBankAccount(data.bankAccount);
        setEditingBank(false);
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const verifyIncome = async (incomeId: number, approved: boolean, rejectionReason?: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/tribe-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_income',
          visionId,
          incomeId,
          approved,
          rejectionReason
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(approved ? 'Ingreso verificado' : 'Ingreso rechazado', 'success');
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

  const updateShirtOrderStatus = async (orderId: number, newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/tribe-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_shirt_order_status',
          visionId,
          orderId,
          newStatus
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Estado actualizado', 'success');
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

  const maskNumber = (num: string, showFull: boolean) => {
    if (showFull) return num;
    return '••••' + num.slice(-4);
  };

  // Agregar tipo de camiseta
  const addShirtType = () => {
    if (!newShirtName.trim()) {
      showToast('Ingresa el nombre de la camiseta', 'error');
      return;
    }
    const price = parseFloat(newShirtPrice);
    if (isNaN(price) || price <= 0) {
      showToast('Ingresa un precio válido', 'error');
      return;
    }

    const newType: ShirtType = {
      id: Date.now().toString(),
      name: newShirtName.trim(),
      price: price
    };

    setShirtTypes([...shirtTypes, newType]);
    setNewShirtName('');
    setNewShirtPrice('');
  };

  // Eliminar tipo de camiseta
  const removeShirtType = (id: string) => {
    setShirtTypes(shirtTypes.filter(s => s.id !== id));
  };

  // Guardar configuración de camisetas
  const saveShirtConfig = async () => {
    if (shirtTypes.length === 0) {
      showToast('Agrega al menos un tipo de camiseta', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tribe-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_shirt_types',
          visionId,
          shirtTypes
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Cotización guardada', 'success');
        setEditingShirtConfig(false);
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

  // Toggle pago de playera
  const toggleShirtPayment = async (memberId: number, size: string, currentlyPaid: boolean) => {
    setTogglingPayment(memberId);
    try {
      const res = await fetch('/api/tribe-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_shirt_payment',
          visionId,
          memberId,
          size,
          paid: !currentlyPaid
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(currentlyPaid ? 'Pago desmarcado' : 'Pago registrado', 'success');
        // Actualizar estado local en lugar de recargar todo
        if (!currentlyPaid) {
          // Agregar a shirtOrders localmente
          const member = allMemberSizes.find(m => m.userId === memberId);
          if (member) {
            const newOrder: ShirtOrder = {
              id: Date.now(), // ID temporal
              size,
              quantity: 1,
              unitPrice: shirtTypes.reduce((sum, s) => sum + s.price, 0),
              totalAmount: shirtTypes.reduce((sum, s) => sum + s.price, 0),
              status: 'PAID',
              paidAt: new Date().toISOString(),
              deliveredAt: null,
              createdAt: new Date().toISOString(),
              user: member.user
            };
            setShirtOrders(prev => [...prev, newOrder]);
          }
        } else {
          // Remover de shirtOrders localmente
          setShirtOrders(prev => prev.filter(o => o.user.id !== memberId));
        }
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setTogglingPayment(null);
    }
  };

  // Verificar si un miembro ya pagó
  const isMemberPaid = (userId: number) => {
    return shirtOrders.some(order => order.user.id === userId && order.status !== 'CANCELLED');
  };

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

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bank'
              ? 'bg-emerald-600 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Building2 size={18} />
          Cuenta Bancaria
        </button>
        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'incomes'
              ? 'bg-emerald-600 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <DollarSign size={18} />
          Ingresos
          {incomes.filter(i => i.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full font-bold">
              {incomes.filter(i => i.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('shirts')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'shirts'
              ? 'bg-emerald-600 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Shirt size={18} />
          Playeras
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-4 border border-green-500/20">
            <p className="text-green-400 text-xs font-medium mb-1">Total Verificado</p>
            <p className="text-2xl font-bold text-white">${stats.totalVerified?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-xl p-4 border border-yellow-500/20">
            <p className="text-yellow-400 text-xs font-medium mb-1">Pendiente</p>
            <p className="text-2xl font-bold text-white">${stats.totalPending?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/20">
            <p className="text-purple-400 text-xs font-medium mb-1">Playeras</p>
            <p className="text-2xl font-bold text-white">{stats.shirtStats?.totalOrders || 0}</p>
          </div>
        </div>
      )}

      {/* Bank Account Tab */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          {!bankAccount && !editingBank ? (
            <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
              <Building2 className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Configura la Cuenta Bancaria</h3>
              <p className="text-white/60 mb-6">
                Agrega los datos bancarios para que los miembros de la tribu puedan realizar sus depósitos.
              </p>
              {isTreasurer && (
                <button
                  onClick={() => setEditingBank(true)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 mx-auto"
                >
                  <Plus size={20} />
                  Configurar Cuenta
                </button>
              )}
            </div>
          ) : editingBank ? (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard size={20} className="text-emerald-400" />
                Datos Bancarios
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Banco *</label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="Ej: BBVA, Banorte, etc."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Tipo de Cuenta</label>
                  <select
                    value={bankForm.accountType}
                    onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="DEBIT">Débito</option>
                    <option value="CREDIT">Crédito</option>
                    <option value="SAVINGS">Ahorro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Titular de la Cuenta *</label>
                <input
                  type="text"
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                  placeholder="Nombre completo del titular"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Número de Cuenta/Tarjeta *</label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    placeholder="Últimos 4 dígitos o completo"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1 block">CLABE (18 dígitos)</label>
                  <input
                    type="text"
                    value={bankForm.clabe}
                    onChange={(e) => setBankForm({ ...bankForm, clabe: e.target.value })}
                    placeholder="CLABE interbancaria"
                    maxLength={18}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Alias (opcional)</label>
                  <input
                    type="text"
                    value={bankForm.alias}
                    onChange={(e) => setBankForm({ ...bankForm, alias: e.target.value })}
                    placeholder="Alias para transferencias"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Concepto Sugerido</label>
                  <input
                    type="text"
                    value={bankForm.referenceNote}
                    onChange={(e) => setBankForm({ ...bankForm, referenceNote: e.target.value })}
                    placeholder="Ej: TRIBU + Tu Nombre"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingBank(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveBankAccount}
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                  Guardar
                </button>
              </div>
            </div>
          ) : bankAccount ? (
            <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 rounded-xl p-6 border border-emerald-500/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{bankAccount.bankName}</h3>
                    <p className="text-emerald-400/80 text-sm">{bankAccount.accountType === 'DEBIT' ? 'Débito' : bankAccount.accountType === 'CREDIT' ? 'Crédito' : 'Ahorro'}</p>
                  </div>
                </div>
                {isTreasurer && (
                  <button
                    onClick={() => setEditingBank(true)}
                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    Editar
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm">Titular</span>
                  <span className="text-white font-medium">{bankAccount.accountHolder}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm">Número de Cuenta</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{maskNumber(bankAccount.accountNumber, showAccountNumber)}</span>
                    <button onClick={() => setShowAccountNumber(!showAccountNumber)} className="text-white/40 hover:text-white">
                      {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {bankAccount.clabe && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60 text-sm">CLABE</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">{maskNumber(bankAccount.clabe, showClabe)}</span>
                      <button onClick={() => setShowClabe(!showClabe)} className="text-white/40 hover:text-white">
                        {showClabe ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {bankAccount.alias && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60 text-sm">Alias</span>
                    <span className="text-white">{bankAccount.alias}</span>
                  </div>
                )}

                {/* Solo mostrar referenceNote si NO es JSON de configuración de playeras */}
                {bankAccount.referenceNote && !bankAccount.referenceNote.startsWith('{"shirtTypes"') && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-yellow-400 text-xs font-medium mb-1">💡 Concepto sugerido para depósitos:</p>
                    <p className="text-white font-medium">{bankAccount.referenceNote}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Incomes Tab */}
      {activeTab === 'incomes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); loadData(); }}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="VERIFIED">Verificados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); loadData(); }}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">Todas las categorías</option>
              <option value="SHIRT">Playeras</option>
              <option value="LEGACY_FORGE">Legacy Forge</option>
              <option value="CONTRIBUTION">Contribuciones</option>
              <option value="OTHER">Otros</option>
            </select>
          </div>

          {incomes.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay ingresos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => {
                const statusInfo = statusLabels[income.status];
                const StatusIcon = statusInfo?.icon || Clock;
                const isExpanded = expandedIncome === income.id;

                return (
                  <div
                    key={income.id}
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedIncome(isExpanded ? null : income.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            {income.payer?.profileImage ? (
                              <img src={income.payer.profileImage} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-white/50" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{income.concept}</p>
                            <p className="text-white/50 text-sm">
                              {income.payer?.nombre || income.payerName || 'Anónimo'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-white font-bold">${income.amount.toLocaleString()}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color}`}>
                              {statusInfo?.label}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-white/50">Categoría:</span>
                            <span className="text-white ml-2">{categoryLabels[income.category]}</span>
                          </div>
                          <div>
                            <span className="text-white/50">Fecha:</span>
                            <span className="text-white ml-2">
                              {new Date(income.createdAt).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          {income.shirtOrder && (
                            <div>
                              <span className="text-white/50">Playera:</span>
                              <span className="text-white ml-2">
                                Talla {income.shirtOrder.size} x{income.shirtOrder.quantity}
                              </span>
                            </div>
                          )}
                          {income.project && (
                            <div>
                              <span className="text-white/50">Proyecto:</span>
                              <span className="text-white ml-2">{income.project.name}</span>
                            </div>
                          )}
                        </div>

                        {income.proofImage && (
                          <div className="mt-3">
                            <p className="text-white/50 text-sm mb-2">Comprobante:</p>
                            <img
                              src={income.proofImage}
                              alt="Comprobante"
                              className="max-w-full h-48 object-contain rounded-lg bg-white/5"
                            />
                          </div>
                        )}

                        {income.proofNotes && (
                          <p className="text-white/70 text-sm bg-white/5 p-3 rounded-lg">
                            📝 {income.proofNotes}
                          </p>
                        )}

                        {income.status === 'PENDING' && isTreasurer && (
                          <div className="flex gap-3 pt-3">
                            <button
                              onClick={() => verifyIncome(income.id, true)}
                              disabled={saving}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Check size={18} />
                              Verificar
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Razón del rechazo:');
                                if (reason) verifyIncome(income.id, false, reason);
                              }}
                              disabled={saving}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <X size={18} />
                              Rechazar
                            </button>
                          </div>
                        )}

                        {income.status === 'REJECTED' && income.rejectionReason && (
                          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-red-400 text-sm">❌ Rechazado: {income.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Shirts Tab */}
      {activeTab === 'shirts' && (
        <div className="space-y-4">
          {/* Configuración de cotización de camisetas */}
          {isTreasurer && bankAccount && (
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Shirt size={18} className="text-purple-400" />
                    Cotización de Camisetas
                  </h4>
                  <p className="text-white/50 text-sm">Agrega los tipos de camisetas y sus precios</p>
                </div>
                
                {!editingShirtConfig && shirtTypes.length > 0 && (
                  <button
                    onClick={() => setEditingShirtConfig(true)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Lista de camisetas agregadas */}
              {shirtTypes.length > 0 && !editingShirtConfig && (
                <div className="space-y-2 mb-4">
                  {shirtTypes.map((shirt) => (
                    <div key={shirt.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                      <span className="text-white">{shirt.name}</span>
                      <span className="text-emerald-400 font-bold">${shirt.price.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-emerald-500/20 rounded-lg px-4 py-3 border border-emerald-500/30">
                    <span className="text-emerald-300 font-medium">Total por persona</span>
                    <span className="text-emerald-400 font-bold text-xl">${totalShirtCost.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Formulario para agregar camisetas */}
              {(editingShirtConfig || shirtTypes.length === 0) && (
                <div className="space-y-3">
                  {/* Lista editable */}
                  {shirtTypes.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {shirtTypes.map((shirt) => (
                        <div key={shirt.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-white">{shirt.name}</span>
                            <span className="text-emerald-400 font-medium">${shirt.price.toLocaleString()}</span>
                          </div>
                          <button
                            onClick={() => removeShirtType(shirt.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input para nueva camiseta */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newShirtName}
                      onChange={(e) => setNewShirtName(e.target.value)}
                      placeholder="Ej: Camiseta negra"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-white">$</span>
                      <input
                        type="number"
                        value={newShirtPrice}
                        onChange={(e) => setNewShirtPrice(e.target.value)}
                        placeholder="Precio"
                        className="w-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-right"
                        min="0"
                      />
                    </div>
                    <button
                      onClick={addShirtType}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Total y botones */}
                  {shirtTypes.length > 0 && (
                    <>
                      <div className="flex items-center justify-between bg-emerald-500/20 rounded-lg px-4 py-3 border border-emerald-500/30">
                        <span className="text-emerald-300 font-medium">Total por persona</span>
                        <span className="text-emerald-400 font-bold text-xl">${totalShirtCost.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={saveShirtConfig}
                          disabled={saving}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          Guardar Cotización
                        </button>
                        {editingShirtConfig && (
                          <button
                            onClick={() => {
                              setEditingShirtConfig(false);
                              loadData(); // Recargar datos originales
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {!bankAccount && isTreasurer && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-300 text-sm">
                Primero configura la cuenta bancaria para poder gestionar pagos de playeras
              </p>
            </div>
          )}

          {/* Lista de participantes con tallas */}
          {allMemberSizes.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Shirt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay participantes con talla registrada</p>
              <p className="text-sm mt-2">Los participantes registran su talla al votar por el logo</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white/50 px-4 py-2">
                <span>Participante</span>
                <div className="flex items-center gap-8">
                  <span className="w-16 text-center">Talla</span>
                  <span className="w-24 text-center">Monto</span>
                  <span className="w-24 text-center">Estado</span>
                </div>
              </div>
              
              {allMemberSizes.map((member) => {
                const isPaid = isMemberPaid(member.userId);
                const memberOrder = shirtOrders.find(o => o.user.id === member.userId);
                
                return (
                  <div 
                    key={member.id} 
                    className={`bg-white/5 rounded-xl p-4 border transition-all ${
                      isPaid 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {member.user.profileImage ? (
                          <img 
                            src={member.user.profileImage} 
                            alt={member.user.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{member.user.nombre}</p>
                          <p className="text-white/40 text-xs">{member.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        {/* Talla */}
                        <div className="w-16 text-center">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-bold">
                            {member.size}
                          </span>
                        </div>
                        
                        {/* Monto */}
                        <div className="w-24 text-center">
                          <span className="text-white font-medium">
                            ${totalShirtCost.toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Estado / Toggle */}
                        <div className="w-24 flex justify-center">
                          {isTreasurer && bankAccount ? (
                            <button
                              onClick={() => toggleShirtPayment(member.userId, member.size, isPaid)}
                              disabled={togglingPayment === member.userId || totalShirtCost === 0}
                              className={`relative w-14 h-8 rounded-full transition-all ${
                                isPaid 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-600 hover:bg-gray-500'
                              } ${togglingPayment === member.userId ? 'opacity-50' : ''} ${totalShirtCost === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow ${
                                isPaid ? 'left-7' : 'left-1'
                              }`}>
                                {togglingPayment === member.userId && (
                                  <Loader2 className="w-4 h-4 absolute top-1 left-1 animate-spin text-gray-500" />
                                )}
                              </div>
                            </button>
                          ) : (
                            <span className={`px-3 py-1 text-xs rounded-full ${
                              isPaid 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isPaid ? '✓ Pagado' : 'Pendiente'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Info adicional si está pagado */}
                    {isPaid && memberOrder && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                        <span className="text-white/50">
                          Pagado el {new Date(memberOrder.paidAt || memberOrder.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${shirtStatusLabels[memberOrder.status]?.color}`}>
                          {shirtStatusLabels[memberOrder.status]?.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Resumen */}
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-white/50 text-xs">Total Participantes</p>
                    <p className="text-xl font-bold text-white">{allMemberSizes.length}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Pagados</p>
                    <p className="text-xl font-bold text-green-400">
                      {allMemberSizes.filter(m => isMemberPaid(m.userId)).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Total Recaudado</p>
                    <p className="text-xl font-bold text-emerald-400">
                      ${(allMemberSizes.filter(m => isMemberPaid(m.userId)).length * totalShirtCost).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
