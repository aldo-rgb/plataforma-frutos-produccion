'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Share2, Info, X, Sparkles, GraduationCap, Users, Percent, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletData {
  user: {
    id: number;
    nombre: string;
    referralCode: string;
    balance: number;
    isGraduated: boolean;
    organizationSlug: string | null;
  };
  stats: {
    available: number;
    totalEarned: number;
    totalReferrals: number;
  };
}

export default function AmbassadorWalletMiniWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  if (!data || !data.user.isGraduated) {
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

        {/* Balance y stats en una fila */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-purple-300/60 text-xs">Saldo</p>
            <p className="text-xl font-bold text-white">{formatMXN(data.user.balance)}</p>
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-green-400">{data.stats.totalReferrals}</p>
              <p className="text-[10px] text-purple-300/60">Referidos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-300">{formatMXN(data.stats.totalEarned)}</p>
              <p className="text-[10px] text-purple-300/60">Ganado</p>
            </div>
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
            onClick={() => setShowInfoModal(true)}
            className="w-full mt-2 text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
          >
            <Info className="w-3 h-3" />
            Ver comisiones detalladas
          </button>
        </div>
      </div>

      {/* Modal de información de comisiones */}
      <AnimatePresence>
        {showInfoModal && (
          <CommissionInfoModal onClose={() => setShowInfoModal(false)} />
        )}
      </AnimatePresence>
    </>
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

          {/* Comisiones por Visión */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-400" />
              Comisiones por Entrenamientos de Visión
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Básico */}
              <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-900/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-semibold">Básico</span>
                  <span className="text-2xl font-bold text-white">20%</span>
                </div>
                <p className="text-xs text-slate-400">El primer paso de transformación</p>
                <div className="mt-2 pt-2 border-t border-cyan-500/20">
                  <p className="text-xs text-slate-500">Ejemplo: Si pagan $6,500</p>
                  <p className="text-sm text-green-400 font-semibold">Ganas $1,300</p>
                </div>
              </div>

              {/* Combo */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-400 font-semibold">Jornada Completa</span>
                  <span className="text-2xl font-bold text-white">20%</span>
                </div>
                <p className="text-xs text-slate-400">Básico + Avanzado + PL juntos</p>
                <div className="mt-2 pt-2 border-t border-purple-500/20">
                  <p className="text-xs text-slate-500">Ejemplo: Si pagan $23,000</p>
                  <p className="text-sm text-green-400 font-semibold">Ganas $4,600</p>
                </div>
              </div>

              {/* Avanzado */}
              <div className="bg-gradient-to-br from-amber-900/20 to-amber-900/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-semibold">Avanzado</span>
                  <span className="text-2xl font-bold text-white">10%</span>
                </div>
                <p className="text-xs text-slate-400">Breakthrough - El siguiente nivel</p>
                <div className="mt-2 pt-2 border-t border-amber-500/20">
                  <p className="text-xs text-slate-500">Ejemplo: Si pagan $7,500</p>
                  <p className="text-sm text-green-400 font-semibold">Ganas $750</p>
                </div>
              </div>

              {/* PL */}
              <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-900/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-semibold">Liderato (PL)</span>
                  <span className="text-2xl font-bold text-white">10%</span>
                </div>
                <p className="text-xs text-slate-400">El camino del líder</p>
                <div className="mt-2 pt-2 border-t border-yellow-500/20">
                  <p className="text-xs text-slate-500">Ejemplo: Si pagan $7,000</p>
                  <p className="text-sm text-green-400 font-semibold">Ganas $700</p>
                </div>
              </div>
            </div>
          </section>

          {/* Comisiones por Talleres */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-400" />
              Comisiones por Talleres Extras
            </h3>
            <div className="bg-gradient-to-br from-pink-900/20 to-pink-900/10 border border-pink-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-pink-400 font-semibold">Todos los Talleres</span>
                  <p className="text-xs text-slate-400 mt-1">El Camino del Lider, Parejas, y más</p>
                </div>
                <span className="text-2xl font-bold text-white">20%</span>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">¿Cómo invitar a talleres?</strong>
                </p>
                <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                  <li>Comparte el link del taller con tu código de referido</li>
                  <li>Cuando se registren, deben seleccionar tu nombre en &quot;¿Quién te invitó?&quot;</li>
                  <li>La comisión se acredita cuando completan el pago</li>
                </ul>
              </div>

              <div className="mt-3 pt-3 border-t border-pink-500/20 flex items-center justify-between">
                <p className="text-xs text-slate-500">Ejemplo: Taller de $2,500</p>
                <p className="text-sm text-green-400 font-semibold">Ganas $500</p>
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

          {/* Cómo usar tu dinero */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              ¿Cómo Usar Tu Dinero?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="font-medium text-white">Retiro Bancario</span>
                </div>
                <p className="text-xs text-slate-400">
                  Transfiere tu saldo a tu cuenta CLABE. El proceso toma 1-3 días hábiles.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg">
                    <Gift className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="font-medium text-white">Crédito en Compras</span>
                </div>
                <p className="text-xs text-slate-400">
                  Usa tu saldo para pagar entrenamientos, talleres o productos (próximamente).
                </p>
              </div>
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
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>Recuerda: no es vender, es compartir algo que transformó tu vida.</span>
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
