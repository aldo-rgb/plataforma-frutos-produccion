'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Loader2, ArrowLeft, CheckCircle, User, Package, Zap, Shield, Star, Crown } from 'lucide-react';
import Image from 'next/image';

interface OrderData {
  id: string;
  precioTotal: number;
  cantidadSesiones: number;
  mentor: {
    nombre: string;
    imagen: string | null;
    titulo?: string;
    especialidad?: string;
  };
  plan: string;
  frecuencia: string;
}

export default function ProcesarPagoLoboPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenId = searchParams.get('ordenId');

  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [metodoPago, setMetodoPago] = useState<'PAYPAL' | 'STRIPE' | 'MERCADOPAGO'>('PAYPAL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ordenId) {
      router.push('/dashboard/suscripcion');
      return;
    }
    cargarOrden();
  }, [ordenId]);

  const cargarOrden = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lobo-solitario/orden/${ordenId}`);
      
      if (!res.ok) {
        throw new Error('No se pudo cargar la orden');
      }

      const data = await res.json();
      setOrderData(data.orden);
    } catch (err) {
      console.error('Error al cargar orden:', err);
      setError('No se pudo cargar la información de la orden');
    } finally {
      setLoading(false);
    }
  };

  const procesarPago = async () => {
    if (!ordenId || !metodoPago) return;

    try {
      setProcesando(true);
      setError(null);

      // Llamar al endpoint de procesar pago
      const res = await fetch('/api/lobo-solitario/procesar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenId,
          metodoPago,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || errorData.details || 'Error al procesar pago');
      }

      const data = await res.json();

      // Redirigir a la URL de pago del gateway
      if (data.approvalUrl) {
        console.log('✅ Redirigiendo a:', data.approvalUrl);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No se recibió URL de aprobación');
      }
    } catch (err: any) {
      console.error('💥 Error al procesar pago:', err);
      setError(err.message || 'Error al procesar el pago');
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando información de tu orden...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400 backdrop-blur-sm">
            <p className="text-lg font-semibold mb-2">⚠️ Error</p>
            <p>{error || 'No se encontró la orden'}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/suscripcion')}
            className="mt-6 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a suscripciones
          </button>
        </div>
      </div>
    );
  }

  const isPremium = orderData.plan === 'PREMIUM';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver</span>
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-4">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Pago Seguro</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 italic uppercase tracking-tight">
              Finalizar <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Suscripción</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Estás a un paso de comenzar tu transformación con mentor personal
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda - Información */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mentor Card */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-purple-400" />
                <h2 className="text-2xl font-black text-white italic uppercase">Tu Mentor</h2>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="relative">
                  {orderData.mentor.imagen ? (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-purple-500/20">
                      <Image
                        src={orderData.mentor.imagen}
                        alt={orderData.mentor.nombre}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ring-4 ring-purple-500/20">
                      <span className="text-3xl font-black text-white">
                        {orderData.mentor.nombre.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-slate-900"></div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{orderData.mentor.nombre}</h3>
                  <p className="text-purple-300 font-medium mb-1">
                    {orderData.mentor.titulo || 'Mentor Frutos del Espíritu'}
                  </p>
                  {orderData.mentor.especialidad && (
                    <p className="text-sm text-slate-400">
                      Especialidad: {orderData.mentor.especialidad}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <span className="text-xs text-slate-500">Verificado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <h2 className="text-2xl font-black text-white italic uppercase">Método de Pago</h2>
              </div>
              
              <div className="space-y-4">
                {/* PayPal */}
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  metodoPago === 'PAYPAL'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/50'
                }`}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value="PAYPAL"
                    checked={metodoPago === 'PAYPAL'}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">PayPal</p>
                      <p className="text-sm text-slate-400">Pago rápido y seguro</p>
                    </div>
                  </div>
                  {metodoPago === 'PAYPAL' && (
                    <CheckCircle className="w-6 h-6 text-purple-400" />
                  )}
                </label>

                {/* Stripe */}
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  metodoPago === 'STRIPE'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/50'
                }`}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value="STRIPE"
                    checked={metodoPago === 'STRIPE'}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Tarjeta de Crédito/Débito</p>
                      <p className="text-sm text-slate-400">Visa, Mastercard, American Express</p>
                    </div>
                  </div>
                  {metodoPago === 'STRIPE' && (
                    <CheckCircle className="w-6 h-6 text-purple-400" />
                  )}
                </label>

                {/* MercadoPago */}
                <label className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  metodoPago === 'MERCADOPAGO'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/50'
                }`}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value="MERCADOPAGO"
                    checked={metodoPago === 'MERCADOPAGO'}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">MercadoPago</p>
                      <p className="text-sm text-slate-400">Múltiples medios de pago</p>
                    </div>
                  </div>
                  {metodoPago === 'MERCADOPAGO' && (
                    <CheckCircle className="w-6 h-6 text-purple-400" />
                  )}
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm animate-in slide-in-from-top-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <p className="font-bold text-red-400 mb-1">Error al procesar el pago</p>
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha - Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-900 to-purple-900/30 border border-purple-500/30 rounded-3xl p-8 sticky top-8 backdrop-blur-sm">
              
              {isPremium && (
                <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-300 uppercase">Plan Premium</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-black text-white italic uppercase">Resumen</h2>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-sm">Plan</span>
                  <span className="font-bold text-white">{orderData.plan}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-sm">Frecuencia</span>
                  <span className="font-bold text-white">{orderData.frecuencia}</span>
                </div>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="text-white font-medium">
                      ${orderData.precioTotal.toLocaleString()} MXN
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold text-white">Total:</span>
                    <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                      ${orderData.precioTotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">MXN - Pago único</p>
                </div>
              </div>

              <button
                onClick={procesarPago}
                disabled={procesando}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-2xl font-black text-lg hover:from-purple-600 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wide"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-6 h-6" />
                    <span>Proceder al Pago</span>
                    <Zap className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="mt-6 p-4 bg-slate-950/50 rounded-xl border border-white/5">
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  🔒 Pago 100% seguro y cifrado. Al continuar, aceptas nuestros{' '}
                  <span className="text-purple-400 hover:text-purple-300 cursor-pointer">
                    términos y condiciones
                  </span>
                  .
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Garantía de satisfacción</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
