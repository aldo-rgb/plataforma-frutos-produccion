'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Gift,
  Plus,
  Loader2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Search,
  Filter,
  Sparkles,
  Crown,
  Ticket,
  Users,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface GiftCode {
  id: number;
  code: string;
  type: 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM';
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  value: number | null;
  discountPercentage: number | null;
  vision: { id: number; nombre: string } | null;
  creator: { id: number; nombre: string };
  usedBy: { id: number; nombre: string; email: string } | null;
  usedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  ticketsGenerated: number;
  createdAt: string;
}

interface Vision {
  id: number;
  nombre: string;
}

export default function GiftCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    type: 'GOLDEN' as 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM',
    quantity: 1,
    visionId: '',
    expiresAt: '',
    notes: '',
    discountPercentage: 50, // Default 50%
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, visionesRes] = await Promise.all([
        fetch('/api/school-admin/gift-codes'),
        fetch('/api/director/visiones'),
      ]);

      const codesData = await codesRes.json();
      const visionesData = await visionesRes.json();

      if (codesData.success) {
        setGiftCodes(codesData.giftCodes);
      }

      if (visionesData.success) {
        setVisiones(visionesData.visiones || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);

    try {
      const res = await fetch('/api/school-admin/gift-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          quantity: formData.quantity,
          visionId: formData.visionId ? parseInt(formData.visionId) : null,
          expiresAt: formData.expiresAt || null,
          notes: formData.notes || null,
          discountPercentage: formData.type === 'GOLDEN_DISCOUNT' ? formData.discountPercentage : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          type: 'GOLDEN',
          quantity: 1,
          visionId: '',
          expiresAt: '',
          notes: '',
          discountPercentage: 50,
        });
        fetchData();
      } else {
        alert(data.error || 'Error al crear códigos');
      }
    } catch (error) {
      console.error('Error creating codes:', error);
      alert('Error al crear códigos');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (codeId: number) => {
    if (!confirm('¿Estás seguro de cancelar este código?')) return;

    try {
      const res = await fetch(`/api/school-admin/gift-codes?id=${codeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Error al cancelar código');
      }
    } catch (error) {
      console.error('Error cancelling code:', error);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Activo</span>;
      case 'USED':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1"><Users size={12} /> Usado</span>;
      case 'EXPIRED':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1"><Clock size={12} /> Expirado</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Cancelado</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (code: GiftCode) => {
    if (code.type === 'GOLDEN') {
      return (
        <span className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 rounded-full text-xs font-bold flex items-center gap-1">
          <Ticket size={12} /> GOLDEN
        </span>
      );
    }
    if (code.type === 'GOLDEN_DISCOUNT') {
      return (
        <span className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full text-xs font-bold flex items-center gap-1">
          <Ticket size={12} /> GOLDEN {code.discountPercentage}%
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 rounded-full text-xs font-bold flex items-center gap-1">
        <Crown size={12} /> PLATINUM
      </span>
    );
  };

  // Filtrar códigos
  const filteredCodes = giftCodes.filter(code => {
    if (filterStatus !== 'ALL' && code.status !== filterStatus) return false;
    if (filterType !== 'ALL' && code.type !== filterType) return false;
    if (searchTerm && !code.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: giftCodes.length,
    active: giftCodes.filter(c => c.status === 'ACTIVE').length,
    used: giftCodes.filter(c => c.status === 'USED').length,
    golden: giftCodes.filter(c => c.type === 'GOLDEN').length,
    platinum: giftCodes.filter(c => c.type === 'PLATINUM').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-yellow-500 opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-purple-500 opacity-5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/school-admin"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500">
                🎁 Códigos de Becados
              </h1>
              <p className="text-slate-400 mt-1">
                Genera y gestiona tickets de regalo para tus participantes
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold rounded-xl transition-all transform hover:scale-105"
          >
            <Plus size={20} />
            Generar Códigos
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total" value={stats.total} icon={<Gift />} color="cyan" />
          <StatCard title="Activos" value={stats.active} icon={<CheckCircle />} color="green" />
          <StatCard title="Usados" value={stats.used} icon={<Users />} color="blue" />
          <StatCard title="Golden" value={stats.golden} icon={<Ticket />} color="yellow" />
          <StatCard title="Platinum" value={stats.platinum} icon={<Crown />} color="purple" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">✅ Activos</option>
            <option value="USED">👤 Usados</option>
            <option value="EXPIRED">⏰ Expirados</option>
            <option value="CANCELLED">❌ Cancelados</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="GOLDEN">🎫 Golden</option>
            <option value="PLATINUM">💎 Platinum</option>
          </select>
        </div>

        {/* Codes List */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
          {filteredCodes.length === 0 ? (
            <div className="p-12 text-center">
              <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">
                No hay códigos de regalo
              </h3>
              <p className="text-slate-500">
                {giftCodes.length === 0
                  ? 'Crea tu primer código de regalo para empezar'
                  : 'No se encontraron códigos con los filtros seleccionados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-slate-400 font-medium">Código</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Tipo</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Estado</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Valor</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Usado por</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Fecha</th>
                    <th className="text-right p-4 text-slate-400 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code) => (
                    <tr key={code.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-cyan-400 text-sm bg-slate-800 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode === code.code ? (
                              <CheckCircle size={16} className="text-green-400" />
                            ) : (
                              <Copy size={16} className="text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">{getTypeBadge(code)}</td>
                      <td className="p-4">{getStatusBadge(code.status)}</td>
                      <td className="p-4 text-slate-300">
                        {code.value ? `$${code.value.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4">
                        {code.usedBy ? (
                          <div>
                            <div className="text-white text-sm">{code.usedBy.nombre}</div>
                            <div className="text-slate-500 text-xs">{code.usedBy.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {new Date(code.createdAt).toLocaleDateString('es-MX')}
                      </td>
                      <td className="p-4 text-right">
                        {code.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancel(code.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Cancelar código"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl">
                  <Sparkles className="text-yellow-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Generar Códigos de Regalo</h2>
                  <p className="text-slate-400 text-sm">Crea tickets de regalo para tus participantes</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Tipo de código */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de Ticket
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'GOLDEN' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.type === 'GOLDEN'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Ticket className={`mx-auto mb-2 ${formData.type === 'GOLDEN' ? 'text-yellow-400' : 'text-slate-400'}`} size={32} />
                      <div className={`font-bold text-sm ${formData.type === 'GOLDEN' ? 'text-yellow-400' : 'text-slate-300'}`}>
                        GOLDEN TICKET
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        1 entrada gratis
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'GOLDEN_DISCOUNT' })}
                      className={`p-4 rounded-xl border-2 transition-all relative ${
                        formData.type === 'GOLDEN_DISCOUNT'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                        % OFF
                      </div>
                      <Ticket className={`mx-auto mb-2 ${formData.type === 'GOLDEN_DISCOUNT' ? 'text-green-400' : 'text-slate-400'}`} size={32} />
                      <div className={`font-bold text-sm ${formData.type === 'GOLDEN_DISCOUNT' ? 'text-green-400' : 'text-slate-300'}`}>
                        CON DESCUENTO
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Descuento personalizado
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'PLATINUM' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.type === 'PLATINUM'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Crown className={`mx-auto mb-2 ${formData.type === 'PLATINUM' ? 'text-purple-400' : 'text-slate-400'}`} size={32} />
                      <div className={`font-bold text-sm ${formData.type === 'PLATINUM' ? 'text-purple-400' : 'text-slate-300'}`}>
                        PLATINUM TICKET
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Visión Completa (3 niveles)
                      </div>
                    </button>
                  </div>

                  {/* Porcentaje de descuento - solo si es GOLDEN_DISCOUNT */}
                  {formData.type === 'GOLDEN_DISCOUNT' && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <label className="block text-sm font-medium text-green-400 mb-2">
                        Porcentaje de descuento
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="95"
                          step="5"
                          value={formData.discountPercentage}
                          onChange={(e) => setFormData({ ...formData, discountPercentage: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="w-20 flex items-center gap-1">
                          <input
                            type="number"
                            min="5"
                            max="95"
                            value={formData.discountPercentage}
                            onChange={(e) => setFormData({ ...formData, discountPercentage: Math.min(95, Math.max(5, parseInt(e.target.value) || 5)) })}
                            className="w-14 px-2 py-1 bg-slate-800 border border-slate-600 rounded-lg text-white text-center text-sm"
                          />
                          <span className="text-green-400 font-bold">%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        El usuario pagará el {100 - formData.discountPercentage}% del precio de Básico
                      </div>
                    </div>
                  )}
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cantidad de códigos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 outline-none"
                  />
                </div>

                {/* Visión (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Visión específica (opcional)
                  </label>
                  <select
                    value={formData.visionId}
                    onChange={(e) => setFormData({ ...formData, visionId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="">Cualquier visión</option>
                    {visiones.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha de expiración */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fecha de expiración (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 outline-none"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notas internas (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ej: Para evento especial, regalo a colaborador..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generar {formData.quantity} Código(s)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-600/20 text-cyan-400',
    green: 'from-green-500/20 to-green-600/20 text-green-400',
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
    yellow: 'from-yellow-500/20 to-amber-500/20 text-yellow-400',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-sm border border-slate-700/50 rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className="opacity-70">{icon}</div>
        <div>
          <div className="text-2xl font-black">{value}</div>
          <div className="text-xs opacity-70">{title}</div>
        </div>
      </div>
    </div>
  );
}
