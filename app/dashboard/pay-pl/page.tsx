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
  Package,
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
  apartadoPrice: number;
  comboPrice: number;
  advancedPaid: number;
  completeComboPrice: number;
  depositForApartado: number;
  remainingAfterApartado: number;
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

  // Pagar para completar el COMBO ($7,000)
  const handlePayCombo = async () => {
    if (!ticket || !pricing) return;

    const paymentData = {
      type: 'PL_COMBO_COMPLETE',
      ticketId: ticket.id,
      visionName: ticket.visionName,
      organizationName: ticket.organizationName,
      price: pricing.completeComboPrice, // $7,000
      originalPrice: pricing.comboPrice, // $14,500 (combo total)
      advancedPaid: pricing.advancedPaid, // $7,500 (ya pagado)
      hasDeposit: false,
      depositAmount: 0,
      isPromo: true,
      isComboComplete: true,
    };

    sessionStorage.setItem('pendingPLPayment', JSON.stringify(paymentData));
    router.push('/dashboard/checkout-pl');
  };

  // Pagar el monto restante (después de depósito o precio completo)
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
            Opciones de Pago
          </h3>

          <div className="space-y-3">
            {/* Show available options when PROMO_AVAILABLE */}
            {ticket?.status === 'PROMO_AVAILABLE' && pricing?.canPayPromo && !pricing?.hasDeposit && (
              <>
                <div className="flex justify-between items-center py-2 px-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <span className="text-cyan-400 text-sm">Opción 1: Completar apartado ($9,000)</span>
                  <span className="font-bold text-cyan-400">${formatPrice(pricing?.depositForApartado || 1500)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <span className="text-emerald-400 text-sm">Opción 2: Completar COMBO</span>
                  <span className="font-bold text-emerald-400">${formatPrice(pricing?.completeComboPrice || 7000)}</span>
                </div>
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <p className="text-xs text-slate-500">
                    Ya pagaste <span className="text-white font-semibold">${formatPrice(pricing?.advancedPaid || 7500)}</span> de Avanzado. 
                    COMBO total: <span className="text-yellow-400 font-semibold">${formatPrice(pricing?.comboPrice || 14500)}</span>.
                    Con apartado debes <span className="text-cyan-400 font-semibold">${formatPrice(pricing?.remainingAfterApartado || 5500)}</span> antes del inicio.
                  </p>
                </div>
              </>
            )}

            {/* Show remaining after deposit/apartado */}
            {pricing?.hasDeposit && pricing.canPayPromo && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">COMBO Avanzado + PL:</span>
                  <span className="text-xl font-bold text-yellow-400">${formatPrice(pricing.comboPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Apartado pagado:</span>
                  <span className="font-bold">-${formatPrice(pricing.apartadoPrice)}</span>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Restante a pagar:</span>
                    <span className="text-2xl font-black text-white">${formatPrice(pricing.remainingAfterApartado)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Show base price if promo expired */}
            {!pricing?.canPayPromo && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Precio Base PL:</span>
                <span className="text-2xl font-black text-yellow-400">${formatPrice(pricing?.basePrice || 11000)}</span>
              </div>
            )}

            {/* Applied Gift Code */}
            {appliedCode && (
              <div className="flex justify-between items-center text-emerald-400">
                <span>Código aplicado:</span>
                <span className="font-bold">-${formatPrice(appliedCode.value)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons based on status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Option 1: Pay $1,500 deposit to reserve promo price (only if PROMO_AVAILABLE) */}
          {ticket?.status === 'PROMO_AVAILABLE' && !deadlines?.depositExpired && (
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/20 border-2 border-cyan-500/50 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Gift className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-bold text-lg">Opción 1: Completar APARTADO</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Paga <span className="text-cyan-400 font-bold">${formatPrice(pricing?.depositForApartado || 1500)}</span> ahora para 
                    completar el apartado de <span className="text-yellow-400 font-bold">${formatPrice(pricing?.apartadoPrice || 9000)}</span>.
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Después pagarás <span className="text-white font-semibold">${formatPrice(pricing?.remainingAfterApartado || 5500)}</span> restantes 
                    antes del inicio del Avanzado.
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
                    Completar Apartado ${formatPrice(pricing?.depositForApartado || 1500)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Option 2: Complete COMBO - Pay $7,000 (only if PROMO_AVAILABLE and no deposit yet) */}
          {ticket?.status === 'PROMO_AVAILABLE' && !deadlines?.depositExpired && !pricing?.hasDeposit && (
            <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/20 border-2 border-emerald-500/50 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Package className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold text-lg">Opción 2: Completar COMBO</h4>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">RECOMENDADO</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    Paga <span className="text-emerald-400 font-bold">${formatPrice(pricing?.completeComboPrice || 7000)}</span> y completa el 
                    <span className="text-yellow-400 font-bold"> COMBO Avanzado + Liderato</span> de ${formatPrice(pricing?.comboPrice || 14500)}.
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Ya pagaste ${formatPrice(pricing?.advancedPaid || 7500)} de Avanzado. ¡Activa tu lugar en Liderato ahora!
                  </p>
                </div>
              </div>

              <button
                onClick={handlePayCombo}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Completar COMBO ${formatPrice(pricing?.completeComboPrice || 7000)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* If RESERVED (has deposit) - Show remaining payment */}
          {ticket?.status === 'RESERVED' && pricing?.canPayPromo && (
            <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border-2 border-yellow-500/50 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-bold text-lg">Completar Pago de Liderato</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Ya tienes <span className="text-emerald-400 font-bold">${formatPrice(pricing.depositAmount)}</span> de depósito.
                    Paga <span className="text-yellow-400 font-bold">${formatPrice(pricing.amountToPay)}</span> para activar tu lugar.
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
                    Pagar ${formatPrice(pricing.amountToPay)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* If promo expired - Show base price option */}
          {!pricing?.canPayPromo && (
            <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-bold">Pagar Liderato</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    El precio promocional ha expirado. El precio actual es de 
                    <span className="text-yellow-400 font-bold"> ${formatPrice(pricing?.basePrice || 11000)}</span>.
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
                    Pagar ${formatPrice(pricing?.basePrice || 11000)}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Warning if promo expired with deposit */}
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
