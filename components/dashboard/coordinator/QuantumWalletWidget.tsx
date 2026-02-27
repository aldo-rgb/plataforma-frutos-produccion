'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  event: string;
  eventLabel: string;
  studentName: string;
  visionName: string;
  amount: number;
  status: string;
  notes: string | null;
  isPositive: boolean;
}

interface WalletSummary {
  totalAccumulated: number;
  pendingReview: number;
  authorized: number;
  paid: number;
  availableForWithdraw: number;
}

interface WalletData {
  coordinator: {
    id: number;
    name: string;
    role: string;
  };
  summary: WalletSummary;
  transactions: Transaction[];
  statsByEvent: Record<string, { count: number; total: number }>;
  lastUpdated: string;
}

export default function QuantumWalletWidget() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/coordinator/wallet');
      const data = await res.json();
      
      if (data.success) {
        setWallet(data.wallet);
        setError(null);
      } else {
        setError(data.error || 'Error al cargar wallet');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
            En Revisión
          </span>
        );
      case 'AUTHORIZED':
        return (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs">
            Autorizado
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs">
            Pagado
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl p-6 border border-purple-500/30">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-700/30 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-purple-700/30 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-purple-700/30 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 text-purple-300">
          <Wallet className="w-5 h-5" />
          <h3 className="font-bold">Wallet de Comisiones</h3>
        </div>
        <p className="text-gray-400 mt-2 text-sm">{error || 'No hay datos disponibles'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Wallet className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Wallet de Comisiones</h3>
              <p className="text-xs text-purple-300/70">Comisiones por Check-in</p>
            </div>
          </div>
          <button 
            onClick={fetchWallet}
            disabled={refreshing}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-purple-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Balance Principal */}
      <div className="p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20">
        <p className="text-purple-300 text-sm mb-1">Saldo Acumulado</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            {formatMXN(wallet.summary.totalAccumulated)}
          </span>
          <span className="text-purple-300 text-sm">MXN</span>
        </div>
        
        {/* Mini estadísticas */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-yellow-500/10 rounded-lg p-2">
            <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>En Revisión</span>
            </div>
            <p className="text-white font-semibold text-sm">
              {formatMXN(wallet.summary.pendingReview)}
            </p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2">
            <div className="flex items-center gap-1 text-green-400 text-xs mb-1">
              <CheckCircle className="w-3 h-3" />
              <span>Autorizado</span>
            </div>
            <p className="text-white font-semibold text-sm">
              {formatMXN(wallet.summary.authorized)}
            </p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2">
            <div className="flex items-center gap-1 text-blue-400 text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              <span>Pagado</span>
            </div>
            <p className="text-white font-semibold text-sm">
              {formatMXN(wallet.summary.paid)}
            </p>
          </div>
        </div>
      </div>

      {/* Toggle para ver transacciones */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-purple-300 hover:bg-purple-500/10 transition-colors border-t border-purple-500/20"
      >
        <span className="text-sm font-medium">
          {expanded ? 'Ocultar' : 'Ver'} Historial ({wallet.transactions.length})
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Lista de transacciones */}
      {expanded && (
        <div className="max-h-80 overflow-y-auto">
          {wallet.transactions.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aún no tienes comisiones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {wallet.transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="px-4 py-3 hover:bg-purple-500/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        tx.isPositive 
                          ? 'bg-green-500/20' 
                          : 'bg-red-500/20'
                      }`}>
                        {tx.isPositive ? (
                          <ArrowUpRight className="w-3 h-3 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {tx.eventLabel}
                        </p>
                        <p className="text-purple-300/70 text-xs">
                          {tx.studentName}
                        </p>
                        <p className="text-purple-300/50 text-xs">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        tx.isPositive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {tx.isPositive ? '+' : ''}{formatMXN(tx.amount)}
                      </p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer con botones de acción */}
      {wallet.summary.authorized > 0 && (
        <div className="p-4 bg-purple-900/30 border-t border-purple-500/20">
          <div className="flex gap-2">
            <button className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
              Solicitar Retiro
            </button>
            <button className="py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors">
              Facturar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
