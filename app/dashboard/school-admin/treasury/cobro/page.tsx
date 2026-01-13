'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Plus, Trash2, Check, X, Copy, Search,
  QrCode, Wallet, AlertTriangle, CheckCircle, Clock,
  ArrowRight, Users, Building2, Printer
} from 'lucide-react';

interface PaymentCode {
  id: number;
  code: string;
  amount: number;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: { id: number; nombre: string } | null;
  vision: { id: number; nombre: string } | null;
}

interface Vision {
  id: number;
  nombre: string;
}

export default function TerminalCobroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<PaymentCode[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'REDEEMED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal nuevo código
  const [showNewCodeModal, setShowNewCodeModal] = useState(false);
  const [newCodeAmount, setNewCodeAmount] = useState('');
  const [newCodeVision, setNewCodeVision] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<PaymentCode | null>(null);
  
  // Notificación
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
      fetchCodes();
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

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.append('status', filter);
      if (selectedVision) params.append('visionId', selectedVision.toString());
      
      const res = await fetch(`/api/treasury/payment-codes?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchCodes();
    }
  }, [filter, selectedVision]);

  const handleGenerateCode = async () => {
    if (!newCodeAmount || parseFloat(newCodeAmount) <= 0) {
      setNotification({ type: 'error', message: 'Ingresa un monto válido' });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/treasury/payment-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newCodeAmount),
          visionId: newCodeVision,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedCode(data.code);
        setNotification({ type: 'success', message: 'Código generado exitosamente' });
        fetchCodes();
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al generar código' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelCode = async (codeId: number) => {
    if (!confirm('¿Estás seguro de cancelar este código?')) return;

    try {
      const res = await fetch('/api/treasury/payment-codes/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification({ type: 'success', message: 'Código cancelado' });
        fetchCodes();
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al cancelar' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: 'Código copiado al portapapeles' });
  };

  const filteredCodes = codes.filter((code) =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.redeemedBy?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Activo
          </span>
        );
      case 'REDEEMED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Canjeado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Cancelado
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Expirado
          </span>
        );
      default:
        return null;
    }
  };

  // Calcular totales
  const totalActive = codes.filter((c) => c.status === 'ACTIVE').reduce((sum, c) => sum + c.amount, 0);
  const totalRedeemed = codes.filter((c) => c.status === 'REDEEMED').reduce((sum, c) => sum + c.amount, 0);

  if (loading && codes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-8 h-8 text-emerald-400" />
              </div>
              Terminal de Cobro
            </h1>
            <p className="text-slate-400 mt-2">
              Genera códigos de pago en efectivo para tus participantes
            </p>
          </div>

          <button
            onClick={() => {
              setShowNewCodeModal(true);
              setGeneratedCode(null);
              setNewCodeAmount('');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-5 h-5" />
            Nuevo Código
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
                <p className="text-slate-400 text-sm">Deuda Pendiente</p>
                <p className="text-2xl font-bold text-white">${totalActive.toLocaleString()}</p>
                <p className="text-yellow-400 text-xs">{codes.filter((c) => c.status === 'ACTIVE').length} códigos activos</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Recaudado</p>
                <p className="text-2xl font-bold text-white">${totalRedeemed.toLocaleString()}</p>
                <p className="text-emerald-400 text-xs">{codes.filter((c) => c.status === 'REDEEMED').length} códigos canjeados</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <QrCode className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Códigos</p>
                <p className="text-2xl font-bold text-white">{codes.length}</p>
                <p className="text-purple-400 text-xs">Este período</p>
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
                placeholder="Buscar código o participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filtro estado */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="REDEEMED">Canjeados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>

            {/* Filtro visión */}
            <select
              value={selectedVision || ''}
              onChange={(e) => setSelectedVision(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas las visiones</option>
              {visiones.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Códigos */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Código</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Monto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Visión</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Canjeado por</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No hay códigos que mostrar
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-1 hover:bg-slate-700 rounded"
                            title="Copiar"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-semibold">${code.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(code.status)}</td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{code.vision?.nombre || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {code.redeemedBy ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300">{code.redeemedBy.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400 text-sm">
                          {new Date(code.createdAt).toLocaleDateString('es-MX')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {code.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancelCode(code.id)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Cancelar código"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Código */}
      {showNewCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {generatedCode ? '¡Código Generado!' : 'Nuevo Código de Pago'}
              </h2>
              <button
                onClick={() => setShowNewCodeModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {generatedCode ? (
              <div className="text-center">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 mb-4">
                  <code className="text-3xl font-mono font-bold text-emerald-400">
                    {generatedCode.code}
                  </code>
                </div>
                <p className="text-slate-300 mb-2">
                  Monto: <span className="font-bold text-white">${generatedCode.amount.toLocaleString()}</span>
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Comparte este código con el participante para que complete su pago
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(generatedCode.code)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedCode(null);
                      setNewCodeAmount('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Generar Otro
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Monto a redimir
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        value={newCodeAmount}
                        onChange={(e) => setNewCodeAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-xl font-semibold placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Visión (opcional)
                    </label>
                    <select
                      value={newCodeVision || ''}
                      onChange={(e) => setNewCodeVision(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Sin visión específica</option>
                      {visiones.map((v) => (
                        <option key={v.id} value={v.id}>{v.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-400 font-medium">Recuerda</p>
                      <p className="text-slate-400">
                        Cada código generado representa una deuda hacia la escuela hasta que sea canjeado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowNewCodeModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generating || !newCodeAmount}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Generar Código
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
