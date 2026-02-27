'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, DollarSign, Users, Settings, RefreshCw,
  CheckCircle, AlertTriangle, TrendingUp, Wallet, XCircle,
  CheckSquare, Square, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import Link from 'next/link';

interface VisionConfig {
  id: number;
  visionId: number;
  visionName: string;
  basicSeatedRate: number;
  advanceSeatedRate: number;
  advanceComboRate: number;
  plStartRate: number;
  plWeek3Rate: number;
  plGuestRate: number;
  plGradRate: number;
  isActive: boolean;
}

interface CommissionStats {
  totalPending: number;
  totalAuthorized: number;
  totalPaid: number;
  byEvent: Record<string, { count: number; total: number }>;
}

interface PendingCommission {
  id: number;
  coordinatorId: number;
  coordinatorName: string;
  coordinatorEmail: string;
  participantId: number;
  participantName: string;
  triggerEvent: string;
  triggerEventLabel: string;
  amount: number;
  status: string;
  visionId: number;
  visionName: string;
  organizationName: string;
  createdAt: string;
  notes: string | null;
}

export default function GestionComisionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<VisionConfig[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [editedConfig, setEditedConfig] = useState<VisionConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estado para panel de autorización
  const [activeTab, setActiveTab] = useState<'config' | 'authorize'>('authorize');
  const [pendingCommissions, setPendingCommissions] = useState<PendingCommission[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<number>>(new Set());
  const [loadingPending, setLoadingPending] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.rol !== 'SCHOOL_ADMIN' && session?.user?.rol !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
    fetchPendingCommissions();
  }, [status, session]);

  const fetchPendingCommissions = async () => {
    try {
      setLoadingPending(true);
      const res = await fetch('/api/school-admin/comisiones/pending?status=PENDING_REVIEW');
      const data = await res.json();
      if (data.success) {
        setPendingCommissions(data.commissions);
      }
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedCommissions.size === pendingCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(pendingCommissions.map(c => c.id)));
    }
  };

  const handleSelectCommission = (id: number) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const handleAuthorize = async () => {
    if (selectedCommissions.size === 0) return;
    
    try {
      setProcessingAction(true);
      const res = await fetch('/api/school-admin/comisiones/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authorize',
          commissionIds: Array.from(selectedCommissions)
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedCommissions(new Set());
        fetchPendingCommissions();
        fetchData(); // Refresh stats
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al autorizar' });
    } finally {
      setProcessingAction(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReject = async () => {
    if (selectedCommissions.size === 0) return;
    
    try {
      setProcessingAction(true);
      const res = await fetch('/api/school-admin/comisiones/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          commissionIds: Array.from(selectedCommissions)
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedCommissions(new Set());
        fetchPendingCommissions();
        fetchData(); // Refresh stats
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al rechazar' });
    } finally {
      setProcessingAction(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsRes, statsRes] = await Promise.all([
        fetch('/api/school-admin/comisiones/config'),
        fetch('/api/school-admin/comisiones/stats')
      ]);

      const configsData = await configsRes.json();
      const statsData = await statsRes.json();

      if (configsData.success) {
        setConfigs(configsData.configs);
        if (configsData.configs.length > 0 && !selectedVision) {
          setSelectedVision(configsData.configs[0].visionId);
          setEditedConfig(configsData.configs[0]);
        }
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Error al cargar datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleVisionChange = (visionId: number) => {
    setSelectedVision(visionId);
    const config = configs.find(c => c.visionId === visionId);
    if (config) {
      setEditedConfig({ ...config });
    }
  };

  const handleRateChange = (field: keyof VisionConfig, value: string) => {
    if (!editedConfig) return;
    const numValue = parseFloat(value) || 0;
    setEditedConfig({
      ...editedConfig,
      [field]: numValue
    });
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    try {
      setSaving(true);
      const res = await fetch('/api/school-admin/comisiones/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: editedConfig.visionId,
          basicSeatedRate: editedConfig.basicSeatedRate,
          advanceSeatedRate: editedConfig.advanceSeatedRate,
          advanceComboRate: editedConfig.advanceComboRate,
          plStartRate: editedConfig.plStartRate,
          plWeek3Rate: editedConfig.plWeek3Rate,
          plGuestRate: editedConfig.plGuestRate,
          plGradRate: editedConfig.plGradRate
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        // Actualizar la lista local
        setConfigs(configs.map(c => 
          c.visionId === editedConfig.visionId ? { ...c, ...editedConfig } : c
        ));
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3"></div>
            <div className="h-64 bg-slate-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/dashboard/school-admin" 
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-7 h-7 text-green-400" />
              Gestión de Comisiones
            </h1>
            <p className="text-slate-400 text-sm">Configura los montos de comisiones por check-in para coordinadores</p>
          </div>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Pendientes de Revisión</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatMXN(stats.totalPending)}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>Autorizadas</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatMXN(stats.totalAuthorized)}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Total Pagado</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatMXN(stats.totalPaid)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('authorize')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'authorize'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Autorizar Comisiones
            {pendingCommissions.length > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCommissions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurar Tarifas
          </button>
        </div>

        {/* Panel de Autorización */}
        {activeTab === 'authorize' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Comisiones Pendientes de Autorización
                </h3>
                <p className="text-sm text-slate-400">Revisa y autoriza las comisiones generadas automáticamente</p>
              </div>
              <button
                onClick={fetchPendingCommissions}
                disabled={loadingPending}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-slate-400 ${loadingPending ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingPending ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                <p className="text-slate-400">Cargando comisiones...</p>
              </div>
            ) : pendingCommissions.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-300 font-medium">No hay comisiones pendientes</p>
                <p className="text-sm text-slate-500">Todas las comisiones han sido procesadas</p>
              </div>
            ) : (
              <>
                {/* Action bar */}
                <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                    >
                      {selectedCommissions.size === pendingCommissions.length ? (
                        <CheckSquare className="w-5 h-5 text-green-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                      {selectedCommissions.size === pendingCommissions.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                    {selectedCommissions.size > 0 && (
                      <span className="text-sm text-slate-400">
                        {selectedCommissions.size} seleccionada(s) • Total: {formatMXN(
                          pendingCommissions
                            .filter(c => selectedCommissions.has(c.id))
                            .reduce((sum, c) => sum + c.amount, 0)
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={selectedCommissions.size === 0 || processingAction}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                    <button
                      onClick={handleAuthorize}
                      disabled={selectedCommissions.size === 0 || processingAction}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingAction ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Autorizar
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50 text-left">
                      <tr>
                        <th className="p-3 text-slate-400 font-medium text-sm w-10"></th>
                        <th className="p-3 text-slate-400 font-medium text-sm">Coordinador</th>
                        <th className="p-3 text-slate-400 font-medium text-sm">Participante</th>
                        <th className="p-3 text-slate-400 font-medium text-sm">Evento</th>
                        <th className="p-3 text-slate-400 font-medium text-sm">Visión</th>
                        <th className="p-3 text-slate-400 font-medium text-sm text-right">Monto</th>
                        <th className="p-3 text-slate-400 font-medium text-sm">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {pendingCommissions.map((commission) => (
                        <tr 
                          key={commission.id} 
                          className={`hover:bg-slate-700/30 transition-colors cursor-pointer ${
                            selectedCommissions.has(commission.id) ? 'bg-green-500/10' : ''
                          }`}
                          onClick={() => handleSelectCommission(commission.id)}
                        >
                          <td className="p-3">
                            {selectedCommissions.has(commission.id) ? (
                              <CheckSquare className="w-5 h-5 text-green-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500" />
                            )}
                          </td>
                          <td className="p-3">
                            <p className="text-white font-medium">{commission.coordinatorName}</p>
                            <p className="text-xs text-slate-500">{commission.coordinatorEmail}</p>
                          </td>
                          <td className="p-3 text-slate-300">{commission.participantName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              commission.triggerEvent.includes('BASIC') ? 'bg-blue-500/20 text-blue-300' :
                              commission.triggerEvent.includes('ADVANCE') ? 'bg-purple-500/20 text-purple-300' :
                              commission.triggerEvent.includes('PL') ? 'bg-amber-500/20 text-amber-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {commission.triggerEventLabel}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-sm">{commission.visionName}</td>
                          <td className={`p-3 text-right font-bold ${
                            commission.amount >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {commission.amount >= 0 ? '+' : ''}{formatMXN(commission.amount)}
                          </td>
                          <td className="p-3 text-slate-500 text-sm">
                            {new Date(commission.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Selector de Visión y Configuración */}
        {activeTab === 'config' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          {/* Selector de Visión */}
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <label className="block text-sm text-slate-400 mb-2">Seleccionar Visión</label>
            <select
              value={selectedVision || ''}
              onChange={(e) => handleVisionChange(Number(e.target.value))}
              className="w-full sm:w-auto bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {configs.map((config) => (
                <option key={config.visionId} value={config.visionId}>
                  {config.visionName}
                </option>
              ))}
            </select>
          </div>

          {/* Formulario de Tarifas */}
          {editedConfig && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                Tarifas de Comisión
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Básico */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-blue-400 mb-2 font-medium">
                    🎓 Básico - Check-in
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.basicSeatedRate}
                      onChange={(e) => handleRateChange('basicSeatedRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Por alumno sentado en Básico</p>
                </div>

                {/* Avanzado Normal */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-purple-400 mb-2 font-medium">
                    🚀 Avanzado - Normal
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.advanceSeatedRate}
                      onChange={(e) => handleRateChange('advanceSeatedRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Por alumno en Avanzado</p>
                </div>

                {/* Avanzado Combo */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-pink-400 mb-2 font-medium">
                    💎 Avanzado - Combo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.advanceComboRate}
                      onChange={(e) => handleRateChange('advanceComboRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Si compró combo antes del evento</p>
                </div>

                {/* PL Semana 1 */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-amber-400 mb-2 font-medium">
                    🌟 PL - Semana 1 (Arranque)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.plStartRate}
                      onChange={(e) => handleRateChange('plStartRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Check-in inicio del PL</p>
                </div>

                {/* PL Semana 3 */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-orange-400 mb-2 font-medium">
                    🎯 PL - Semana 3 (Cierre)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.plWeek3Rate}
                      onChange={(e) => handleRateChange('plWeek3Rate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Bono por retención semana 3</p>
                </div>

                {/* PL Invitado */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-teal-400 mb-2 font-medium">
                    👥 PL - Bono Invitado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.plGuestRate}
                      onChange={(e) => handleRateChange('plGuestRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Por invitado que paga</p>
                </div>

                {/* PL Graduación */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <label className="block text-sm text-emerald-400 mb-2 font-medium">
                    🎉 PL - Graduación
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={editedConfig.plGradRate}
                      onChange={(e) => handleRateChange('plGradRate', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Al completar el PL</p>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}

          {configs.length === 0 && (
            <div className="p-8 text-center">
              <Settings className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay visiones configuradas</p>
              <p className="text-sm text-slate-500 mt-1">Las configuraciones se crean automáticamente al asignar coordinadores a una visión</p>
            </div>
          )}
        </div>
        )}

        {/* Información adicional */}
        <div className="mt-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            ¿Cómo funciona?
          </h4>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• Las comisiones se generan automáticamente cuando se hace check-in a un participante</li>
            <li>• El sistema verifica que el participante tenga pago completo antes de generar la comisión</li>
            <li>• Las comisiones aparecen como "Pendientes de Revisión" hasta que un admin las autorice</li>
            <li>• Los coordinadores pueden ver su wallet en tiempo real desde su dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
