'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Crown,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  Sparkles,
  Timer,
  CreditCard,
  Gift,
} from 'lucide-react';

interface PLTicketInfo {
  id: string;
  status: string;
  type: string;
  costAtPurchase: number;
  amountPaid: number;
  visionName: string;
  organizationName: string;
}

interface PricingInfo {
  basePrice: number;
  promoPrice: number;
  currentPrice: number;
  depositAmount: number;
  hasDeposit: boolean;
  amountToPay: number;
  canPayPromo: boolean;
}

interface DeadlineInfo {
  depositDeadline: string | null;
  promoDeadline: string | null;
  depositExpired: boolean;
  promoExpired: boolean;
}

export default function PayPLPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [hasPlTicket, setHasPlTicket] = useState(false);
  const [ticket, setTicket] = useState<PLTicketInfo | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineInfo | null>(null);
  
  // Payment state
  const [giftCode, setGiftCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [appliedCode, setAppliedCode] = useState<{ code: string; value: number } | null>(null);
  
  // Countdown
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPLStatus();
    }
  }, [session]);

  // Countdown timer for promo deadline
  useEffect(() => {
    if (!deadlines?.promoDeadline || deadlines.promoExpired) return;

    const calculateCountdown = () => {
      const now = new Date();
      const deadline = new Date(deadlines.promoDeadline!);
      
      if (now >= deadline) {
        setCountdown(null);
        fetchPLStatus(); // Refresh to update pricing
        return;
      }
      
      const diff = deadline.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [deadlines]);

  const fetchPLStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tickets/pl-deposit');
      const data = await res.json();
      
      if (data.success) {
        setHasPlTicket(data.hasPlTicket);
        setTicket(data.ticket || null);
        setPricing(data.pricing || null);
        setDeadlines(data.deadlines || null);
      } else {
        setError(data.error || 'Error al cargar información');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const validateGiftCode = async () => {
    if (!giftCode.trim()) return;

    setValidatingCode(true);
    setError('');

    try {
      const res = await fetch('/api/gift-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (data.success && data.giftCode) {
        setAppliedCode({
          code: data.giftCode.code,
          value: data.giftCode.value || 0,
        });
        setGiftCode('');
      } else {
        setError(data.error || 'Código inválido');
      }
    } catch (err) {
      setError('Error al validar código');
    } finally {
      setValidatingCode(false);
    }
  };

  const handlePayDeposit = async () => {
    if (!ticket) return;

    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/tickets/pl-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          paymentMethod: appliedCode ? 'GIFT_CODE' : 'OTHER',
          giftCode: appliedCode?.code,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh status
        await fetchPLStatus();
        alert('¡Depósito realizado con éxito! Has reservado el precio promocional.');
      } else {
        setError(data.error || 'Error al procesar el depósito');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayFull = async () => {
    if (!ticket || !pricing) return;

    // Store payment data and redirect to checkout
    const paymentData = {
      type: 'PL_PAYMENT',
      ticketId: ticket.id,
      visionName: ticket.visionName,
      organizationName: ticket.organizationName,
      price: pricing.amountToPay,
      originalPrice: pricing.currentPrice,
      hasDeposit: pricing.hasDeposit,
      depositAmount: pricing.depositAmount,
      isPromo: pricing.canPayPromo,
    };

    sessionStorage.setItem('pendingPLPayment', JSON.stringify(paymentData));
    router.push('/dashboard/checkout-pl');
  };

  const formatPrice = (price: number) => price.toLocaleString('es-MX');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando información de Liderato...</p>
        </div>
      </div>
    );
  }

  if (!hasPlTicket) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
          <Crown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sin Ticket de Liderato</h2>
          <p className="text-slate-400 mb-6">
            No tienes un ticket de Liderato pendiente. Primero debes inscribirte al nivel Avanzado.
          </p>
          <button
            onClick={() => router.push('/dashboard/upgrade-advanced')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-bold"
          >
            Ir a Inscripción
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Pago de Liderato
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-600 to-amber-400 rounded-2xl mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">TU VIDA - Liderato</h2>
          <p className="text-slate-400">{ticket?.visionName}</p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-6 mb-6 border-2 ${
            ticket?.status === 'PROMO_AVAILABLE'
              ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/20 border-cyan-500/30'
              : ticket?.status === 'RESERVED'
              ? 'bg-gradient-to-r from-emerald-900/30 to-green-900/20 border-emerald-500/30'
              : 'bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border-yellow-500/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {ticket?.status === 'PROMO_AVAILABLE' ? (
              <Sparkles className="w-6 h-6 text-cyan-400" />
            ) : ticket?.status === 'RESERVED' ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <Clock className="w-6 h-6 text-yellow-400" />
            )}
            <div>
              <p className="font-bold text-white">
                {ticket?.status === 'PROMO_AVAILABLE' 
                  ? '¡Precio Promocional Disponible!'
                  : ticket?.status === 'RESERVED'
                  ? '¡Lugar Reservado!'
                  : 'Pago Pendiente'}
              </p>
              <p className="text-sm text-slate-400">
                {ticket?.status === 'PROMO_AVAILABLE'
                  ? 'Paga $1,500 para reservar el precio de $9,000'
                  : ticket?.status === 'RESERVED'
                  ? `Tienes $${formatPrice(pricing?.depositAmount || 0)} a favor`
                  : 'Completa tu pago para activar tu lugar'}
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          {countdown && pricing?.canPayPromo && (
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-bold text-sm">
                    {ticket?.status === 'PROMO_AVAILABLE' 
                      ? '⏰ Tiempo para reservar:'
                      : '🔥 Precio promo válido hasta:'}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  {countdown.days > 0 && (
                    <>
                      <span className="bg-amber-500/20 px-2 py-1 rounded text-white font-bold">{countdown.days}d</span>
                      <span className="text-amber-400">:</span>
                    </>
                  )}
                  <span className="bg-amber-500/20 px-2 py-1 rounded text-white font-bold">{countdown.hours.toString().padStart(2, '0')}h</span>
                  <span className="text-amber-400">:</span>
                  <span className="bg-amber-500/20 px-2 py-1 rounded text-white font-bold">{countdown.minutes.toString().padStart(2, '0')}m</span>
                  <span className="text-amber-400">:</span>
                  <span className="bg-amber-500/20 px-2 py-1 rounded text-white font-bold">{countdown.seconds.toString().padStart(2, '0')}s</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-yellow-400" />
            Resumen de Pago
          </h3>

          <div className="space-y-3">
            {/* Base/Promo Price */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">
                {pricing?.canPayPromo ? 'Precio Promocional:' : 'Precio Base:'}
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-yellow-400">
                  ${formatPrice(pricing?.currentPrice || 11000)}
                </span>
                {pricing?.canPayPromo && (
                  <span className="text-slate-500 text-sm line-through ml-2">
                    ${formatPrice(pricing?.basePrice || 11000)}
                  </span>
                )}
              </div>
            </div>

            {/* Deposit if applicable */}
            {pricing?.hasDeposit && pricing.canPayPromo && (
              <div className="flex justify-between items-center text-emerald-400">
                <span>Tu saldo a favor:</span>
                <span className="font-bold">-${formatPrice(pricing.depositAmount)}</span>
              </div>
            )}

            {/* Applied Gift Code */}
            {appliedCode && (
              <div className="flex justify-between items-center text-emerald-400">
                <span>Código aplicado:</span>
                <span className="font-bold">-${formatPrice(appliedCode.value)}</span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Total a Pagar:</span>
                <span className="text-3xl font-black text-white">
                  ${formatPrice(Math.max(0, (pricing?.amountToPay || 11000) - (appliedCode?.value || 0)))}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons based on status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Option 1: Pay $1,500 deposit (only if PROMO_AVAILABLE) */}
          {ticket?.status === 'PROMO_AVAILABLE' && !deadlines?.depositExpired && (
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/20 border border-cyan-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Gift className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-bold">Opción 1: Reservar con Depósito</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Paga solo <span className="text-cyan-400 font-bold">$1,500</span> ahora para 
                    asegurar el precio promocional de <span className="text-yellow-400 font-bold">$9,000</span>.
                    Después pagarás los <span className="text-white font-bold">$7,500</span> restantes 
                    antes del fin del Avanzado.
                  </p>
                </div>
              </div>

              {/* Gift Code Input for deposit */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="Código de pago (opcional)"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={validateGiftCode}
                  disabled={validatingCode || !giftCode.trim()}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-colors"
                >
                  {validatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validar'}
                </button>
              </div>

              <button
                onClick={handlePayDeposit}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Pagar Depósito $1,500
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Option 2: Pay full amount */}
          <div className={`bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 rounded-2xl p-6 ${
            ticket?.status === 'PROMO_AVAILABLE' && !deadlines?.depositExpired ? '' : ''
          }`}>
            <div className="flex items-start gap-3 mb-4">
              <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-bold">
                  {ticket?.status === 'PROMO_AVAILABLE' && !deadlines?.depositExpired 
                    ? 'Opción 2: Pagar Completo Ahora'
                    : 'Pagar Liderato'}
                </h4>
                <p className="text-slate-400 text-sm mt-1">
                  {pricing?.canPayPromo ? (
                    <>
                      Paga <span className="text-yellow-400 font-bold">${formatPrice(pricing.amountToPay)}</span> ahora 
                      y activa tu lugar inmediatamente.
                      {pricing.hasDeposit && (
                        <> Ya tienes <span className="text-emerald-400 font-bold">${formatPrice(pricing.depositAmount)}</span> a favor.</>
                      )}
                    </>
                  ) : (
                    <>
                      El precio promocional ha expirado. El precio actual es de 
                      <span className="text-yellow-400 font-bold"> ${formatPrice(pricing?.basePrice || 11000)}</span>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handlePayFull}
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Pagar ${formatPrice(pricing?.amountToPay || 11000)}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Warning if promo expired */}
          {!pricing?.canPayPromo && pricing?.hasDeposit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-bold text-sm">Promoción Expirada</p>
                <p className="text-slate-400 text-sm">
                  El plazo para usar tu depósito de ${formatPrice(pricing.depositAmount)} ha vencido. 
                  El precio actual es de ${formatPrice(pricing.basePrice)}.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
