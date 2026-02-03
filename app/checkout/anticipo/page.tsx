'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  CheckCircle,
  XCircle,
  CreditCard,
  Sparkles,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';

interface CheckoutData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  visionId: number;
  visionName: string;
  organizationId: number;
  organizationName: string;
  logoUrl: string | null;
  website: string | null;
  originalPrice: number;
  anticipoAmount: number;
  remaining: number;
  deadline: string;
  ticketId: number | null;
  userId: number | null;
}

function AnticipoCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutId = searchParams.get('id');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'mercadopago'>('mercadopago');

  useEffect(() => {
    const fetchCheckoutData = async () => {
      if (!checkoutId && !email) {
        setError('Enlace inválido. No se encontraron los datos del checkout.');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (checkoutId) params.append('id', checkoutId);
        if (email) params.append('email', email);

        const res = await fetch(`/api/checkout/anticipo?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'No se encontró el checkout');
          setLoading(false);
          return;
        }

        setCheckoutData(data.checkout);
      } catch (err) {
        setError('Error al cargar los datos del checkout');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [checkoutId, email]);

  const handlePayAnticipo = async () => {
    if (!checkoutData) return;
    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/anticipo/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: checkoutData.id,
          ticketId: checkoutData.ticketId,
          amount: checkoutData.anticipoAmount,
          provider: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Error al procesar el pago');
        setProcessing(false);
        return;
      }

      // Redirect to payment URL
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-slate-400">Cargando información del checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !checkoutData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 text-center border border-red-500/30">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!checkoutData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header con logo */}
        <div className="text-center mb-8">
          {checkoutData.logoUrl ? (
            <div className="mb-4">
              <img
                src={checkoutData.logoUrl}
                alt={checkoutData.organizationName}
                className="h-16 mx-auto object-contain"
              />
            </div>
          ) : (
            <div className="text-5xl mb-4">🎓</div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">
            ¡No pierdas tu lugar!
          </h1>
          <p className="text-slate-400">
            Reserva tu lugar en <span className="text-amber-400 font-semibold">{checkoutData.visionName}</span>
          </p>
        </div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 overflow-hidden"
        >
          {/* Saludo */}
          <div className="p-6 border-b border-slate-700">
            <p className="text-slate-300">
              Hola <span className="font-semibold text-white">{checkoutData.firstName}</span>,
            </p>
            <p className="text-slate-400 mt-2">
              Notamos que no completaste tu inscripción. ¡Pero no te preocupes! Puedes asegurar tu lugar con un anticipo.
            </p>
          </div>

          {/* Detalles del anticipo */}
          <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-y border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Reserva con solo</span>
            </div>
            <div className="text-5xl font-bold text-amber-400 mb-4">
              ${checkoutData.anticipoAmount.toLocaleString('es-MX')} MXN
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>📋 Precio total:</span>
                <span className="text-slate-300">${checkoutData.originalPrice.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>💰 Anticipo:</span>
                <span className="text-amber-400 font-semibold">${checkoutData.anticipoAmount.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-700">
                <span>📅 Restante:</span>
                <span className="text-slate-300">${checkoutData.remaining.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="p-6 border-b border-slate-700">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
              Método de pago
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('mercadopago')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'mercadopago'
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl mb-1">💳</div>
                <div className="text-sm text-white font-medium">MercadoPago</div>
                <div className="text-xs text-slate-400">Tarjeta, OXXO, SPEI</div>
              </button>
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl mb-1">💎</div>
                <div className="text-sm text-white font-medium">Stripe</div>
                <div className="text-xs text-slate-400">Tarjeta internacional</div>
              </button>
            </div>
          </div>

          {/* Botón de pago */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <button
              onClick={handlePayAnticipo}
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  COMPLETAR MI INSCRIPCIÓN
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center mt-4">
              Al pagar el anticipo, aseguras tu lugar. El resto puedes pagarlo antes del inicio del programa.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">{checkoutData.organizationName}</p>
          {checkoutData.website && (
            <a
              href={checkoutData.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 text-sm hover:text-indigo-300 transition"
            >
              🌐 {checkoutData.website.replace('https://', '').replace('http://', '')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnticipoCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-400" />
        </div>
      }
    >
      <AnticipoCheckoutContent />
    </Suspense>
  );
}
