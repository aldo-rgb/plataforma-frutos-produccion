'use client';

import { useState, useEffect } from 'react';
import { 
  Gift, DollarSign, Users, Copy, Check, ExternalLink,
  TrendingUp, Wallet, ChevronDown, ChevronUp, Share2,
  CreditCard, Building
} from 'lucide-react';

interface WalletTransaction {
  id: number;
  referredName: string;
  productType: string;
  productLabel: string;
  saleAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

interface WalletData {
  user: {
    id: number;
    nombre: string;
    referralCode: string;
    balance: number;
    isGraduated: boolean;
    hasBankInfo: boolean;
    organizationSlug: string | null;
    commissionsEnabled: boolean;
  };
  stats: {
    available: number;
    withdrawn: number;
    spent: number;
    totalEarned: number;
    totalReferrals: number;
  };
  transactions: WalletTransaction[];
}

export default function AmbassadorWalletWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const res = await fetch('/api/ambassador/wallet');
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching ambassador wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!data?.user.referralCode) return;
    
    // Generar link con organización si está disponible
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
    const link = data.user.organizationSlug 
      ? `${baseUrl}/org/${data.user.organizationSlug}?ref=${data.user.referralCode}`
      : `${baseUrl}/registro?ref=${data.user.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    if (!data?.user.referralCode) return;
    
    // Generar link con organización si está disponible
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
    const link = data.user.organizationSlug 
      ? `${baseUrl}/org/${data.user.organizationSlug}?ref=${data.user.referralCode}`
      : `${baseUrl}/registro?ref=${data.user.referralCode}`;
    const message = encodeURIComponent(
      `🎓 ¡Te invito a vivir una experiencia que abrirá posibilidades a tu vida!

✨ Entrenamiento Básico de Transformación Cuántica

🏆 3 días intensivos de conciencia y romper creencias limitantes
📝 Entrenamiento práctico para resultados reales
🤝 Una comunidad extraordinaria

👉 Conoce más y regístrate aquí:
${link}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
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
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-purple-500/20 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-purple-500/20 rounded w-1/2"></div>
      </div>
    );
  }

  if (!data || !data.user.isGraduated || !data.user.commissionsEnabled) {
    return null; // No mostrar si no es graduado o si las comisiones están deshabilitadas en la organización
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Invita y Gana</h3>
              <p className="text-sm text-purple-300/70">Gana comisiones por cada referido</p>
            </div>
          </div>
          <button
            onClick={fetchWalletData}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Actualizar"
          >
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        {/* Balance principal */}
        <div className="text-center py-4">
          <p className="text-purple-300/70 text-sm mb-1">Saldo Disponible</p>
          <p className="text-4xl font-bold text-white">{formatMXN(data.user.balance)}</p>
          <p className="text-purple-300/50 text-xs mt-1">MXN</p>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-purple-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{data.stats.totalReferrals}</p>
            <p className="text-xs text-purple-300/70">Referidos</p>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-300">{formatMXN(data.stats.totalEarned)}</p>
            <p className="text-xs text-purple-300/70">Total Ganado</p>
          </div>
        </div>
      </div>

      {/* Link de referido */}
      <div className="p-4 sm:p-6 bg-purple-900/20 border-b border-purple-500/20">
        <p className="text-sm text-purple-300/70 mb-2">Tu código de referido:</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-800/50 rounded-lg px-4 py-3 font-mono text-lg text-purple-300 text-center">
            {data.user.referralCode}
          </div>
          <button
            onClick={copyReferralLink}
            className={`p-3 rounded-lg transition-all ${
              copied 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
            }`}
            title="Copiar link"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={shareOnWhatsApp}
            className="p-3 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-all"
            title="Compartir en WhatsApp"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-purple-300/50 mt-2 text-center">
          Comparte este código y gana 20% en Básico/Combo, 10% en Avanzado/PL
        </p>
      </div>

      {/* Botón usar dinero */}
      {data.user.balance > 0 && (
        <div className="p-4 sm:p-6 border-b border-purple-500/20">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Usar Mi Dinero
          </button>
        </div>
      )}

      {/* Historial expandible */}
      <div className="border-t border-purple-500/20">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between text-purple-300/70 hover:bg-purple-500/10 transition-colors"
        >
          <span className="text-sm">Historial ({data.transactions.length})</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="max-h-64 overflow-y-auto">
            {data.transactions.length === 0 ? (
              <div className="p-6 text-center text-purple-300/50">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aún no tienes referidos</p>
                <p className="text-xs mt-1">¡Comparte tu código y empieza a ganar!</p>
              </div>
            ) : (
              <div className="divide-y divide-purple-500/10">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {tx.referredName} compró {tx.productLabel}
                        </p>
                        <p className="text-xs text-purple-300/50">
                          {tx.commissionPercent}% de {formatMXN(tx.saleAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+{formatMXN(tx.commissionAmount)}</p>
                        <p className="text-xs text-purple-300/50">
                          {new Date(tx.createdAt).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de retiro (simplificado) */}
      {showWithdrawModal && (
        <WithdrawModal 
          balance={data.user.balance}
          hasBankInfo={data.user.hasBankInfo}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            fetchWalletData();
          }}
        />
      )}
    </div>
  );
}

// Componente del modal de retiro
function WithdrawModal({ 
  balance, 
  hasBankInfo, 
  onClose, 
  onSuccess 
}: { 
  balance: number;
  hasBankInfo: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'select' | 'bank' | 'credit'>('select');
  const [amount, setAmount] = useState(balance.toString());
  const [bankClabe, setBankClabe] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWithdraw = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ambassador/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_withdrawal',
          amount: parseFloat(amount),
          bankClabe,
          bankName,
          accountHolder
        })
      });

      const result = await res.json();
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.message || 'Error al procesar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-white">Usar Mi Dinero</h3>
          <p className="text-purple-300/70 text-sm">Disponible: ${balance.toFixed(2)} MXN</p>
        </div>

        {mode === 'select' && (
          <div className="p-6 space-y-4">
            <button
              onClick={() => setMode('bank')}
              className="w-full p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <Building className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Retirar a Banco</p>
                  <p className="text-sm text-purple-300/50">Transferencia a tu CLABE</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('credit')}
              className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-medium">Usar como Crédito</p>
                  <p className="text-sm text-green-300/50">Comprar productos o boletos</p>
                </div>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-purple-300/70 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {mode === 'bank' && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-purple-300/70 mb-1">Monto a retirar</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={balance}
                className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-300/70 mb-1">CLABE Interbancaria</label>
              <input
                type="text"
                value={bankClabe}
                onChange={(e) => setBankClabe(e.target.value)}
                maxLength={18}
                placeholder="18 dígitos"
                className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-300/70 mb-1">Banco</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ej: BBVA, Santander..."
                className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-300/70 mb-1">Titular de la cuenta</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Nombre completo"
                className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setMode('select')}
                className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Atrás
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading || !bankClabe || parseFloat(amount) <= 0}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Solicitar Retiro'}
              </button>
            </div>
          </div>
        )}

        {mode === 'credit' && (
          <div className="p-6 text-center">
            <CreditCard className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Próximamente</p>
            <p className="text-purple-300/70 text-sm mb-4">
              Podrás usar tu saldo para comprar productos y boletos directamente.
            </p>
            <button
              onClick={() => setMode('select')}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
