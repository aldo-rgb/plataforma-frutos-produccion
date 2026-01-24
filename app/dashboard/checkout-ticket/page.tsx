'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Ticket,
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface TicketData {
  id: string;
  level: string;
  status: string;
  paymentStatus: string;
  costAtPurchase: number;
  amountPaid: number;
  vision: {
    id: number;
    nombre: string;
    advancedStartDate?: string | null;
  };
  organization: {
    id: number;
    name: string;
  };
}

interface GiftCodeData {
  code: string;
  type: string;
  value: number;
  organizationName: string;
  isCashPayment?: boolean;
}

// Helper function to check if payment deadline has passed
// Payment deadline is 7:00 PM on the day of advancedStartDate
function isPaymentDeadlinePassed(advancedStartDate: string | null | undefined): boolean {
  if (!advancedStartDate) return false;
  
  const advancedDate = new Date(advancedStartDate);
  // Set deadline to 7:00 PM on the advanced start date
  const deadline = new Date(advancedDate);
  deadline.setHours(19, 0, 0, 0);
  
  const now = new Date();
  return now >= deadline;
}

// Helper function to format deadline
function formatDeadline(advancedStartDate: string | null | undefined): string {
  if (!advancedStartDate) return '';
  
  const advancedDate = new Date(advancedStartDate);
  const deadline = new Date(advancedDate);
  deadline.setHours(19, 0, 0, 0);
  
  return deadline.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function CheckoutTicketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const ticketId = searchParams.get('ticketId');

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'GIFT_CODE' | 'CARD'>('GIFT_CODE');
  const [giftCode, setGiftCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [appliedCode, setAppliedCode] = useState<GiftCodeData | null>(null);

  const fetchTicketDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'No se encontró el ticket');
        return;
      }

      // Check if payment deadline has passed for PL tickets
      if (data.ticket.level === 'PL' && isPaymentDeadlinePassed(data.ticket.vision.advancedStartDate)) {
        setError('El plazo para pagar este ticket ha expirado. El límite era a las 12:00 PM del día de inicio del entrenamiento avanzado.');
        return;
      }

      setTicket(data.ticket);
    } catch (err) {
      setError('Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Verificar autenticación
  useEffect(() => {
    if (session === null) {
      router.push('/login');
    }
  }, [session, router]);

  // Cargar detalles del ticket
  useEffect(() => {
    if (ticketId && session) {
      fetchTicketDetails();
    }
  }, [ticketId, session, fetchTicketDetails]);

  // Check if deadline is approaching (for PL tickets)
  const isDeadlineApproaching = ticket?.level === 'PL' && ticket?.vision?.advancedStartDate;
  const deadlineText = isDeadlineApproaching ? formatDeadline(ticket.vision.advancedStartDate) : null;

  const pendingAmount = ticket ? (ticket.costAtPurchase - ticket.amountPaid) : 0;
  const discountAmount = appliedCode ? appliedCode.value : 0;
  const finalAmount = Math.max(0, pendingAmount - discountAmount);

  const validateGiftCode = async () => {
    if (!giftCode.trim()) return;

    setValidatingCode(true);
    try {
      const res = await fetch('/api/gift-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      // El API devuelve success y giftCode, no valid
      if (data.success && data.giftCode) {
        setAppliedCode({
          code: data.giftCode.code,
          type: data.giftCode.type,
          value: data.giftCode.value || 0,
          organizationName: data.giftCode.organization?.name || '',
          isCashPayment: data.giftCode.isCashPayment || false,
        });
        setGiftCode('');
      } else {
        setError(data.error || data.message || 'Código inválido');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Error al validar código');
      setTimeout(() => setError(null), 3000);
    } finally {
      setValidatingCode(false);
    }
  };

  const processPayment = async () => {
    if (!ticket) return;

    setProcessing(true);
    setError(null);

    try {
      // If paying with card, redirect to payment gateway
      if (paymentMethod === 'CARD' && finalAmount > 0) {
        const paymentRes = await fetch('/api/tickets/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.id,
            amount: finalAmount,
          }),
        });

        const paymentData = await paymentRes.json();

        if (!paymentData.success || !paymentData.paymentUrl) {
          throw new Error(paymentData.error || 'Error al crear el pago');
        }

        // Redirect to payment gateway
        window.location.href = paymentData.paymentUrl;
        return;
      }

      // Redeem the gift code if applied
      if (appliedCode) {
        const redeemRes = await fetch('/api/gift-codes/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCode.code,
            userId: session?.user?.id,
            visionId: ticket.vision.id,
            isCashPayment: appliedCode.code.startsWith('CASH-'),
          }),
        });

        const redeemData = await redeemRes.json();
        if (!redeemData.success) {
          throw new Error(redeemData.message || 'Error al canjear código');
        }
      }

      // Update ticket payment status
      const res = await fetch(`/api/tickets/${ticketId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: discountAmount,
          paymentMethod: appliedCode ? 'GIFT_CODE' : 'OTHER',
          giftCode: appliedCode?.code,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar pago');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/my-tickets');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al procesar pago');
    } finally {
      setProcessing(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'BASIC': 'Básico',
      'ADVANCED': 'Avanzado',
      'PL': 'Liderato (PL)',
    };
    return labels[level] || level;
  };

  // Mostrar loading mientras se verifica la sesión
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <Link href="/dashboard/my-tickets">
            <button className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
              Volver a Tickets
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center max-w-md"
        >
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">¡Pago Completado!</h2>
          <p className="text-gray-400">Tu ticket ha sido activado exitosamente.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/my-tickets">
            <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-orange-400" />
            <h1 className="text-xl font-bold text-white">Pago de Ticket</h1>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="bg-[#161b22]/80 rounded-xl border border-orange-500/20 p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">{getLevelLabel(ticket?.level || '')}</h3>
              <p className="text-sm text-gray-400">{ticket?.vision.nombre}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Costo total:</span>
              <span className="text-white">${ticket?.costAtPurchase.toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ya pagado:</span>
              <span className="text-emerald-400">${ticket?.amountPaid.toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <span className="text-orange-400 font-semibold">Pendiente:</span>
              <span className="text-orange-400 font-bold">${pendingAmount.toLocaleString()} MXN</span>
            </div>
          </div>
        </div>

        {/* Deadline Warning for PL tickets */}
        {deadlineText && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">⏰ Fecha límite de pago</h4>
                <p className="text-sm text-amber-300/80">
                  Este ticket debe pagarse antes de:
                </p>
                <p className="text-sm text-white font-semibold mt-1">
                  {deadlineText}
                </p>
                <p className="text-xs text-amber-300/60 mt-2">
                  Después de esta fecha, el ticket será cancelado y deberás adquirir uno nuevo a precio regular.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="bg-[#161b22]/80 rounded-xl border border-gray-700/50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Método de Pago</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setPaymentMethod('GIFT_CODE')}
              className={`p-3 rounded-xl border-2 transition-all ${
                paymentMethod === 'GIFT_CODE'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <Banknote className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'GIFT_CODE' ? 'text-orange-400' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${paymentMethod === 'GIFT_CODE' ? 'text-white' : 'text-gray-400'}`}>
                Código
              </p>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`p-3 rounded-xl border-2 transition-all ${
                paymentMethod === 'CARD'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <CreditCard className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'CARD' ? 'text-orange-400' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${paymentMethod === 'CARD' ? 'text-white' : 'text-gray-400'}`}>
                Tarjeta
              </p>
            </button>
          </div>

          {/* Gift Code Input */}
          {paymentMethod === 'GIFT_CODE' && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="CODIGO-REFERENCIA"
                  className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={validateGiftCode}
                  disabled={validatingCode || !giftCode.trim()}
                  className="px-4 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validar'}
                </button>
              </div>

              {/* Applied Code */}
              {appliedCode && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">{appliedCode.code}</p>
                      <p className="text-xs text-gray-400">Descuento: ${appliedCode.value.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppliedCode(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          )}

          {/* Card Payment Info */}
          {paymentMethod === 'CARD' && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
              <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-white font-medium mb-1">Pago con tarjeta</p>
              <p className="text-gray-400 text-sm">
                Serás redirigido a la pasarela de pago segura
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-[#161b22]/80 rounded-xl border border-gray-700/50 p-4 mb-6">
          <h3 className="font-semibold text-white mb-3">Resumen</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Monto pendiente:</span>
              <span className="text-white">${pendingAmount.toLocaleString()} MXN</span>
            </div>
            {appliedCode && (
              <div className="flex justify-between text-emerald-400">
                <span>- {appliedCode.code}</span>
                <span>-${discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <span className="font-semibold text-white">Total a pagar:</span>
              <span className={`font-bold text-xl ${finalAmount === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                ${finalAmount.toLocaleString()} MXN
              </span>
            </div>
          </div>

          {finalAmount === 0 && appliedCode && (
            <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>¡Pago completo con código!</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Pay Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={processPayment}
          disabled={processing || (finalAmount > 0 && paymentMethod === 'GIFT_CODE' && !appliedCode)}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{paymentMethod === 'CARD' ? 'Redirigiendo...' : 'Procesando...'}</span>
            </>
          ) : finalAmount === 0 ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Activar Ticket</span>
            </>
          ) : paymentMethod === 'CARD' ? (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Pagar ${finalAmount.toLocaleString()} MXN</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Pagar Ticket</span>
            </>
          )}
        </motion.button>

        {/* Security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 text-xs">
          <Shield className="w-4 h-4" />
          <span>Pago seguro y encriptado</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutTicketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    }>
      <CheckoutTicketContent />
    </Suspense>
  );
}
