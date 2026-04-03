'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Share2, Info, X, Sparkles, GraduationCap, Users, Percent, Calendar, DollarSign, ArrowRight, User, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletData {
  user: {
    id: number;
    nombre: string;
    referralCode: string;
    balance: number;
    isGraduated: boolean;
    organizationSlug: string | null;
    commissionsEnabled: boolean;
  };
  stats: {
    available: number;
    totalEarned: number;
    totalReferrals: number;
    trainingEarned: number;
    workshopEarned: number;
    trainingReferrals: number;
    workshopReferrals: number;
  };
}

interface Transaction {
  id: number;
  referredUser: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
  } | null;
  productType: string;
  productLabel: string;
  saleAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: string;
  statusLabel: string;
  notes: string | null;
  createdAt: string;
}

export default function AmbassadorWalletMiniWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 h-full animate-pulse">
        <div className="h-5 bg-purple-500/20 rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-purple-500/20 rounded w-1/2"></div>
      </div>
    );
  }

  if (!data || !data.user.isGraduated || !data.user.commissionsEnabled) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 h-full flex flex-col">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <Gift className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Invita y Gana</h3>
          </div>
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Más información"
          >
            <Info className="w-4 h-4 text-purple-400" />
          </button>
        </div>

        {/* Balance y stats - LAYOUT ACTUALIZADO */}
        <div className="flex flex-col gap-2 mb-3">
          {/* Fila 1: Saldo y Referidos */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300/60 text-xs">Saldo</p>
              <p className="text-xl font-bold text-white">{formatMXN(data.user.balance)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">{data.stats.totalReferrals}</p>
              <p className="text-[10px] text-purple-300/60">Referidos</p>
            </div>
          </div>
          
          {/* Fila 2: Ganado por tipo (Entrenamientos y Talleres) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/30 rounded-lg p-2">
            {/* Entrenamientos */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <GraduationCap className="w-3 h-3 text-cyan-400" />
                <p className="text-[9px] text-cyan-400 font-medium">Entrenamientos</p>
              </div>
              <p className="text-sm font-bold text-white">{formatMXN(data.stats.trainingEarned || 0)}</p>
              <p className="text-[9px] text-purple-300/50">({data.stats.trainingReferrals || 0} refs)</p>
            </div>
            
            {/* Talleres */}
            <div className="text-center border-l border-slate-700/50">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Calendar className="w-3 h-3 text-pink-400" />
                <p className="text-[9px] text-pink-400 font-medium">Talleres</p>
              </div>
              <p className="text-sm font-bold text-white">{formatMXN(data.stats.workshopEarned || 0)}</p>
              <p className="text-[9px] text-purple-300/50">({data.stats.workshopReferrals || 0} refs)</p>
            </div>
          </div>
          
          {/* Total ganado */}
          <div className="text-center bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-500/20 rounded-lg py-1.5">
            <p className="text-[10px] text-emerald-400/70">Total Ganado</p>
            <p className="text-lg font-bold text-emerald-400">{formatMXN(data.stats.totalEarned)}</p>
          </div>
        </div>

        {/* Código y botones de compartir */}
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 font-mono text-sm text-purple-300 text-center truncate">
              {data.user.referralCode}
            </div>
            <button
              onClick={copyReferralLink}
              className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                copied 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              }`}
              title="Copiar link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-all flex-shrink-0"
              title="Compartir en WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowDetailModal(true)}
            className="w-full mt-2 text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
          >
            <Info className="w-3 h-3" />
            Ver comisiones detalladas
          </button>
        </div>
      </div>

      {/* Modal de información general de comisiones */}
      <AnimatePresence>
        {showInfoModal && (
          <CommissionInfoModal onClose={() => setShowInfoModal(false)} />
        )}
      </AnimatePresence>

      {/* Modal de detalle de comisiones (lista de referidos) */}
      <AnimatePresence>
        {showDetailModal && (
          <CommissionDetailModal 
            onClose={() => setShowDetailModal(false)} 
            stats={data.stats}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Modal con LISTA DETALLADA de referidos y comisiones
function CommissionDetailModal({ onClose, stats }: { onClose: () => void; stats: WalletData['stats'] }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/ambassador/transactions');
      const result = await res.json();
      if (result.success) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getProductIcon = (productType: string) => {
    if (productType === 'WORKSHOP') {
      return <Calendar className="w-4 h-4 text-pink-400" />;
    }
    return <GraduationCap className="w-4 h-4 text-cyan-400" />;
  };

  const getProductColor = (productType: string) => {
    if (productType === 'WORKSHOP') return 'pink';
    return 'cyan';
  };

  const getStatusBadge = (status: string, statusLabel: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'CLEARED': 'bg-green-500/20 text-green-400 border-green-500/30',
      'WITHDRAWN': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'SPENT': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${colors[status] || colors['PENDING']}`}>
        {statusLabel}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Mis Comisiones</h2>
              <p className="text-sm text-purple-300/70">Lista de invitados y ganancias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-800/30 border-b border-slate-700/50 flex-shrink-0">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.totalReferrals}</p>
            <p className="text-xs text-slate-400">Referidos</p>
          </div>
          <div className="text-center border-x border-slate-700/50">
            <p className="text-2xl font-bold text-emerald-400">{formatMXN(stats.totalEarned)}</p>
            <p className="text-xs text-slate-400">Total Ganado</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{formatMXN(stats.available)}</p>
            <p className="text-xs text-slate-400">Disponible</p>
          </div>
        </div>

        {/* Lista de transacciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Aún no tienes referidos</p>
              <p className="text-sm text-slate-500 mt-1">¡Comparte tu código y empieza a ganar!</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className={`bg-slate-800/50 border border-${getProductColor(transaction.productType)}-500/20 rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Info del referido */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full bg-${getProductColor(transaction.productType)}-500/20 flex items-center justify-center flex-shrink-0`}>
                      {transaction.referredUser?.imagen ? (
                        <img 
                          src={transaction.referredUser.imagen} 
                          alt={transaction.referredUser.nombre}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className={`w-5 h-5 text-${getProductColor(transaction.productType)}-400`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {transaction.referredUser?.nombre || 'Usuario'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          {getProductIcon(transaction.productType)}
                          <span className={`text-xs text-${getProductColor(transaction.productType)}-400`}>
                            {transaction.productLabel}
                          </span>
                        </div>
                        {getStatusBadge(transaction.status, transaction.statusLabel)}
                      </div>
                    </div>
                  </div>

                  {/* Comisión */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-400">
                      +{formatMXN(transaction.commissionAmount)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {transaction.commissionPercent * 100}% de {formatMXN(transaction.saleAmount)}
                    </p>
                  </div>
                </div>

                {/* Notas y fecha */}
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <p className="text-xs text-slate-500 truncate flex-1 mr-2">
                    {transaction.notes || 'Comisión por referido'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 p-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal con información detallada del sistema de comisiones
function CommissionInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sistema de Comisiones</h2>
              <p className="text-sm text-purple-300/70">Invita y Gana con cada referido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Cómo funciona */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              ¿Cómo Funciona?
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-400">1</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Comparte tu código de referido</strong> con amigos, familiares o cualquier persona interesada en transformar su vida.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-400">2</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Cuando tu referido paga</strong> cualquier entrenamiento o taller, automáticamente recibes tu comisión.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-400">3</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Acumula tu saldo</strong> y retíralo a tu cuenta bancaria o úsalo para comprar productos.
                </p>
              </div>
            </div>
          </section>

          {/* Resumen de porcentajes */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-400" />
              Resumen de Comisiones
            </h3>
            <div className="bg-slate-800/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="text-left p-3 text-slate-300 font-medium">Producto</th>
                    <th className="text-right p-3 text-slate-300 font-medium">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  <tr>
                    <td className="p-3 text-slate-400">Entrenamiento Básico</td>
                    <td className="p-3 text-right text-green-400 font-semibold">20%</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400">Jornada Completa (B+A+PL)</td>
                    <td className="p-3 text-right text-green-400 font-semibold">20%</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400">Entrenamiento Avanzado</td>
                    <td className="p-3 text-right text-yellow-400 font-semibold">10%</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400">Liderato (PL)</td>
                    <td className="p-3 text-right text-yellow-400 font-semibold">10%</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400">Talleres Extras</td>
                    <td className="p-3 text-right text-green-400 font-semibold">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-2">💡 Tips para Maximizar tus Ganancias</h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Comparte tu experiencia personal - las historias genuinas conectan mejor.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Invita a personas que realmente puedan beneficiarse del entrenamiento.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Usa WhatsApp para compartir tu link - es más personal y efectivo.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
          >
            ¡Entendido, vamos a invitar!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
