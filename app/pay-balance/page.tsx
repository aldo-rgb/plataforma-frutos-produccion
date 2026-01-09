'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Gift,
  CreditCard,
  Building2,
  QrCode,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  Ticket,
  ArrowRight,
  Phone,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface TicketBalance {
  level: string;
  levelName: string;
  amountPaid: number;
  totalCost: number;
  balance: number;
}

interface GiftCodeData {
  code: string;
  type: 'GOLDEN' | 'PLATINUM';
  value: number;
  tickets: { level: string; name: string }[];
}

function PayBalanceContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [loading, setLoading] = useState(true);
  const [ticketBalances, setTicketBalances] = useState<TicketBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('GIFT_CODE');
  
  // Gift code states
  const [giftCode, setGiftCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [validatedCode, setValidatedCode] = useState<GiftCodeData | null>(null);
  const [codeError, setCodeError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchBalances();
    }
  }, [status]);

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/tickets/my-balance');
      const data = await res.json();

      if (data.success) {
        setTicketBalances(data.balances || []);
        setTotalBalance(data.totalBalance || 0);
        
        // Si ya pagó todo, redirigir
        if (data.totalBalance === 0) {
          router.push(returnUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateGiftCode = async () => {
    if (!giftCode.trim()) {
      setCodeError('Ingresa un código de regalo');
      return;
    }

    setValidatingCode(true);
    setCodeError('');
    setValidatedCode(null);

    try {
      const res = await fetch('/api/gift-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (data.success) {
        setValidatedCode(data.giftCode);
      } else {
        setCodeError(data.error || 'Código inválido');
      }
    } catch (e) {
      console.error('Error validating code:', e);
      setCodeError('Error al validar el código');
    } finally {
      setValidatingCode(false);
    }
  };

  const handlePayment = async () => {
    if (!validatedCode) {
      setError('Debes validar un código de regalo primero');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/gift-codes/apply-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: validatedCode.code,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Recargar balances
        await fetchBalances();
        setValidatedCode(null);
        setGiftCode('');
        
        // Si ya no hay balance, redirigir
        if (data.remainingBalance === 0) {
          router.push(returnUrl);
        }
      } else {
        setError(data.error || 'Error al aplicar código');
      }
    } catch (e: any) {
      console.error('Payment error:', e);
      setError(e.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || status === 'loading') {
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
        <div className="absolute top-20 -right-40 w-96 h-96 bg-orange-500 opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-red-500 opacity-5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header Alert */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-500/50 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Lock className="text-orange-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-orange-400 mb-2">
                ⚠️ Pago Pendiente
              </h1>
              <p className="text-slate-300">
                Tienes un saldo pendiente que debes cubrir para acceder a tu entrenamiento.
                Completa tu pago para desbloquear todo el contenido.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Balance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 mb-8"
        >
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Ticket className="text-cyan-400" />
            Tu Saldo Pendiente
          </h2>

          <div className="space-y-3 mb-4">
            {ticketBalances.map((ticket, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <span className="text-white font-medium">{ticket.levelName}</span>
                  <div className="text-xs text-slate-500">
                    Pagado: ${ticket.amountPaid.toLocaleString()} / ${ticket.totalCost.toLocaleString()}
                  </div>
                </div>
                <span className="text-orange-400 font-bold">
                  ${ticket.balance.toLocaleString()} MXN
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <span className="text-lg font-bold text-white">Total a Pagar</span>
            <span className="text-2xl font-black text-orange-400">
              ${totalBalance.toLocaleString()} MXN
            </span>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="font-bold text-white mb-4">Método de Pago</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setPaymentMethod('GIFT_CODE')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'GIFT_CODE'
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <Gift className={`mx-auto mb-2 ${paymentMethod === 'GIFT_CODE' ? 'text-yellow-400' : 'text-slate-400'}`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'GIFT_CODE' ? 'text-yellow-400' : 'text-slate-300'}`}>
                Código Regalo
              </span>
            </button>

            <button
              onClick={() => setPaymentMethod('STRIPE')}
              className={`p-4 rounded-xl border-2 transition-all relative ${
                paymentMethod === 'STRIPE'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <div className="absolute top-1 right-1">
                <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-400">Pronto</span>
              </div>
              <CreditCard className={`mx-auto mb-2 ${paymentMethod === 'STRIPE' ? 'text-cyan-400' : 'text-slate-400'}`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'STRIPE' ? 'text-cyan-400' : 'text-slate-300'}`}>
                Tarjeta
              </span>
            </button>

            <button
              onClick={() => setPaymentMethod('PAYPAL')}
              className={`p-4 rounded-xl border-2 transition-all relative ${
                paymentMethod === 'PAYPAL'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <div className="absolute top-1 right-1">
                <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-400">Pronto</span>
              </div>
              <Building2 className={`mx-auto mb-2 ${paymentMethod === 'PAYPAL' ? 'text-blue-400' : 'text-slate-400'}`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'PAYPAL' ? 'text-blue-400' : 'text-slate-300'}`}>
                PayPal
              </span>
            </button>

            <button
              onClick={() => setPaymentMethod('TRANSFER')}
              className={`p-4 rounded-xl border-2 transition-all relative ${
                paymentMethod === 'TRANSFER'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <div className="absolute top-1 right-1">
                <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-400">Pronto</span>
              </div>
              <QrCode className={`mx-auto mb-2 ${paymentMethod === 'TRANSFER' ? 'text-green-400' : 'text-slate-400'}`} size={24} />
              <span className={`text-sm font-medium ${paymentMethod === 'TRANSFER' ? 'text-green-400' : 'text-slate-300'}`}>
                Transferencia
              </span>
            </button>
          </div>

          {/* Gift Code Input */}
          {paymentMethod === 'GIFT_CODE' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="text-yellow-400" size={20} />
                Ingresa tu Código de Pago
              </h3>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={giftCode}
                  onChange={(e) => {
                    setGiftCode(e.target.value.toUpperCase());
                    setCodeError('');
                    setValidatedCode(null);
                  }}
                  placeholder="GOLDEN-XXXXXXXX o PLATINUM-XXXXXXXX"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white uppercase tracking-widest font-mono focus:border-yellow-500 outline-none"
                />
                <button
                  onClick={validateGiftCode}
                  disabled={validatingCode}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {validatingCode ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    'Validar'
                  )}
                </button>
              </div>

              {codeError && (
                <p className="mt-3 text-red-400 text-sm flex items-center gap-2">
                  <XCircle size={16} />
                  {codeError}
                </p>
              )}

              {validatedCode && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="text-green-400" size={24} />
                    <span className="font-bold text-green-400">¡Código válido!</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Tipo:</span>{' '}
                      {validatedCode.type === 'GOLDEN' ? (
                        <span className="text-yellow-400 font-bold">🎫 GOLDEN TICKET</span>
                      ) : (
                        <span className="text-purple-400 font-bold">👑 PLATINUM TICKET</span>
                      )}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Valor:</span>{' '}
                      <span className="text-green-400 font-bold">${validatedCode.value.toLocaleString()} MXN</span>
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing || !validatedCode}
                className="w-full mt-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Aplicar Código y Pagar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Coming Soon for other methods */}
          {paymentMethod !== 'GIFT_CODE' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center">
              <CreditCard className="text-cyan-400 mx-auto mb-4" size={48} />
              <h3 className="font-bold text-white text-lg mb-2">Próximamente</h3>
              <p className="text-slate-400 mb-4">
                Este método de pago estará disponible muy pronto.
              </p>
              <p className="text-sm text-slate-500">
                Por ahora, contacta a tu administrador para obtener un código de regalo.
              </p>
            </div>
          )}
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center"
        >
          <h3 className="font-bold text-white mb-2">¿Necesitas ayuda?</h3>
          <p className="text-slate-400 text-sm mb-4">
            Contacta a tu administrador o escríbenos directamente
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:soporte@frutos.app"
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              <Mail size={16} />
              soporte@frutos.app
            </a>
            <a
              href="https://wa.me/5218100000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
            >
              <Phone size={16} />
              WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PayBalancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <PayBalanceContent />
    </Suspense>
  );
}
