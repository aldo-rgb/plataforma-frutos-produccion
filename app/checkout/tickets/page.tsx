'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { quantumTheme } from '@/lib/theme/quantum';
import { CreditCard, Ticket, Clock, Sparkles } from 'lucide-react';
import { CountdownTimer } from '@/components/countdown/CountdownTimer';
import { DynamicPricing } from '@/components/countdown/DynamicPricing';

interface Vision {
  id: number;
  nombre: string;
  startDate: string;
}

interface PriceConfig {
  level: string;
  regularPrice: string;
  promoPrice?: string;
  comboAdvPL?: string;
  partialPayment?: string;
}

export default function TicketCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const visionId = searchParams.get('visionId');

  const [loading, setLoading] = useState(false);
  const [vision, setVision] = useState<Vision | null>(null);
  const [priceConfig, setPriceConfig] = useState<PriceConfig[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<'BASIC' | 'ADVANCED' | 'PL' | null>(null);
  const [selectedType, setSelectedType] = useState<'STANDARD' | 'PROMO_50' | 'COMBO_PARTIAL'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'partial'>('full');
  const [step, setStep] = useState<'select' | 'payment' | 'processing'>('select');
  const [provider, setProvider] = useState<'stripe' | 'mercadopago'>('stripe');

  // Calcular countdown
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (vision?.startDate) {
      const interval = setInterval(() => {
        const now = new Date();
        const start = new Date(vision.startDate);
        const diff = start.getTime() - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else {
          setTimeLeft('¡Evento comenzado!');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [vision]);

  useEffect(() => {
    // Fetch vision y precios
    const fetchData = async () => {
      try {
        // TODO: Implementar API para obtener visión y precios
        // Por ahora datos mock
        setVision({
          id: 1,
          nombre: 'ZERO V1',
          startDate: '2026-01-09T00:00:00Z',
        });

        setPriceConfig([
          {
            level: 'BASIC',
            regularPrice: '5000',
            promoPrice: '4000',
            partialPayment: '2500',
          },
          {
            level: 'ADVANCED',
            regularPrice: '7000',
            promoPrice: '5600',
            partialPayment: '3500',
          },
          {
            level: 'PL',
            regularPrice: '10000',
            promoPrice: '8000',
            comboAdvPL: '15000',
            partialPayment: '5000',
          },
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [visionId]);

  const getPrice = () => {
    const config = priceConfig.find(p => p.level === selectedLevel);
    if (!config) return '0';

    if (selectedType === 'PROMO_50' && config.promoPrice) {
      return paymentMethod === 'partial' && config.partialPayment 
        ? config.partialPayment 
        : config.promoPrice;
    }

    if (selectedType === 'COMBO_PARTIAL' && config.comboAdvPL) {
      return config.comboAdvPL;
    }

    return paymentMethod === 'partial' && config.partialPayment
      ? config.partialPayment
      : config.regularPrice;
  };

  const handlePurchase = async () => {
    if (!selectedLevel || !session) return;

    setStep('processing');
    setLoading(true);

    try {
      // Llamar a la API de checkout
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visionId,
          level: selectedLevel,
          type: selectedType,
          paymentMethod,
          provider,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Error al crear sesión de pago');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
      setLoading(false);
      setStep('payment');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con Countdown */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 mb-6">
            <Sparkles size={20} className="text-cyan-400" />
            <span className="text-cyan-300 font-medium">Quantum Ticket System</span>
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {vision?.nombre || 'Adquiere tu Ticket'}
          </h1>

          {timeLeft && (
            <div className="flex items-center justify-center gap-3 text-2xl">
              <Clock size={24} className="text-amber-400" />
              <span className="font-mono text-amber-300">{timeLeft}</span>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'select' 
              ? 'bg-cyan-500/20 border border-cyan-500/50' 
              : 'bg-slate-800/50'
          }`}>
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
              1
            </div>
            <span>Seleccionar</span>
          </div>

          <div className="h-px w-12 bg-slate-700" />

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'payment' 
              ? 'bg-cyan-500/20 border border-cyan-500/50' 
              : 'bg-slate-800/50'
          }`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              2
            </div>
            <span>Pago</span>
          </div>

          <div className="h-px w-12 bg-slate-700" />

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'processing' 
              ? 'bg-cyan-500/20 border border-cyan-500/50' 
              : 'bg-slate-800/50'
          }`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              3
            </div>
            <span>Confirmación</span>
          </div>
        </div>

        {/* Step 1: Selección de Nivel */}
        {step === 'select' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* BASIC */}
            <div 
              onClick={() => setSelectedLevel('BASIC')}
              className={`p-6 rounded-2xl cursor-pointer transition-all ${
                selectedLevel === 'BASIC'
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400 shadow-xl shadow-green-500/20'
                  : 'bg-slate-800/50 border border-slate-700 hover:border-green-500/50'
              }`}
            >
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-2xl font-bold mb-2">Básico</h3>
              <p className="text-slate-400 mb-4">Nivel de entrada</p>
              
              <div className="text-3xl font-bold mb-4">
                ${priceConfig.find(p => p.level === 'BASIC')?.regularPrice || '0'} MXN
              </div>

              {priceConfig.find(p => p.level === 'BASIC')?.promoPrice && (
                <div className="text-amber-400 text-sm mb-2">
                  Promo: ${priceConfig.find(p => p.level === 'BASIC')?.promoPrice} MXN
                </div>
              )}

              <ul className="space-y-2 text-sm text-slate-300">
                <li>✓ Acceso completo</li>
                <li>✓ Material digital</li>
                <li>✓ Soporte básico</li>
              </ul>
            </div>

            {/* ADVANCED */}
            <div 
              onClick={() => setSelectedLevel('ADVANCED')}
              className={`p-6 rounded-2xl cursor-pointer transition-all ${
                selectedLevel === 'ADVANCED'
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400 shadow-xl shadow-purple-500/20'
                  : 'bg-slate-800/50 border border-slate-700 hover:border-purple-500/50'
              }`}
            >
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-2">Avanzado</h3>
              <p className="text-slate-400 mb-4">Nivel intermedio</p>
              
              <div className="text-3xl font-bold mb-4">
                ${priceConfig.find(p => p.level === 'ADVANCED')?.regularPrice || '0'} MXN
              </div>

              {priceConfig.find(p => p.level === 'ADVANCED')?.promoPrice && (
                <div className="text-amber-400 text-sm mb-2">
                  Promo: ${priceConfig.find(p => p.level === 'ADVANCED')?.promoPrice} MXN
                </div>
              )}

              <ul className="space-y-2 text-sm text-slate-300">
                <li>✓ Todo lo de Básico</li>
                <li>✓ Sesiones adicionales</li>
                <li>✓ Material exclusivo</li>
              </ul>
            </div>

            {/* PL (Liderato) */}
            <div 
              onClick={() => setSelectedLevel('PL')}
              className={`p-6 rounded-2xl cursor-pointer transition-all ${
                selectedLevel === 'PL'
                  ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-400 shadow-xl shadow-amber-500/20'
                  : 'bg-slate-800/50 border border-slate-700 hover:border-amber-500/50'
              }`}
            >
              <div className="text-4xl mb-4">👑</div>
              <h3 className="text-2xl font-bold mb-2">Liderato</h3>
              <p className="text-slate-400 mb-4">Nivel premium</p>
              
              <div className="text-3xl font-bold mb-4">
                ${priceConfig.find(p => p.level === 'PL')?.regularPrice || '0'} MXN
              </div>

              {priceConfig.find(p => p.level === 'PL')?.comboAdvPL && (
                <div className="text-amber-400 text-sm mb-2">
                  Combo Avanzado + PL: ${priceConfig.find(p => p.level === 'PL')?.comboAdvPL} MXN
                </div>
              )}

              <ul className="space-y-2 text-sm text-slate-300">
                <li>✓ Todo lo de Avanzado</li>
                <li>✓ Certificación</li>
                <li>✓ Mentoría 1:1</li>
              </ul>
            </div>
          </div>
        )}

        {/* Opciones de Tipo y Pago */}
        {step === 'select' && selectedLevel && (
          <div className="mt-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Opciones de Pago</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 cursor-pointer hover:border-cyan-500/50">
                <input
                  type="radio"
                  name="type"
                  value="STANDARD"
                  checked={selectedType === 'STANDARD'}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">Precio Regular</div>
                  <div className="text-sm text-slate-400">
                    ${priceConfig.find(p => p.level === selectedLevel)?.regularPrice || '0'} MXN
                  </div>
                </div>
              </label>

              {priceConfig.find(p => p.level === selectedLevel)?.promoPrice && (
                <label className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:border-amber-500/50">
                  <input
                    type="radio"
                    name="type"
                    value="PROMO_50"
                    checked={selectedType === 'PROMO_50'}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-amber-400">Precio Promocional</div>
                    <div className="text-sm text-slate-400">
                      ${priceConfig.find(p => p.level === selectedLevel)?.promoPrice || '0'} MXN
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentMethod === 'partial'}
                  onChange={(e) => setPaymentMethod(e.target.checked ? 'partial' : 'full')}
                  className="w-4 h-4"
                />
                <span>Pago Parcial</span>
              </label>
              {paymentMethod === 'partial' && (
                <span className="text-cyan-400 text-sm">
                  Paga ${priceConfig.find(p => p.level === selectedLevel)?.partialPayment || '0'} MXN ahora
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg mb-6">
              <span className="text-lg font-medium">Total a Pagar:</span>
              <span className="text-3xl font-bold text-cyan-400">${getPrice()} MXN</span>
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 font-bold text-lg transition-all shadow-lg shadow-cyan-500/20"
            >
              Continuar al Pago
            </button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 bg-slate-800/50 rounded-2xl border border-slate-700">
              <h3 className="text-2xl font-bold mb-6">Método de Pago</h3>

              <div className="space-y-4 mb-8">
                <button 
                  onClick={() => setProvider('stripe')}
                  className={`w-full p-6 rounded-xl transition-all flex items-center gap-4 ${
                    provider === 'stripe'
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-2 border-purple-500'
                      : 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 hover:border-purple-500/50'
                  }`}
                >
                  <CreditCard size={32} className="text-purple-400" />
                  <div className="text-left">
                    <div className="font-bold text-lg">Stripe</div>
                    <div className="text-sm text-slate-400">Tarjetas de crédito/débito</div>
                  </div>
                  {provider === 'stripe' && (
                    <div className="ml-auto w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => setProvider('mercadopago')}
                  disabled
                  className="w-full p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 opacity-50 cursor-not-allowed transition-all flex items-center gap-4"
                >
                  <CreditCard size={32} className="text-blue-400" />
                  <div className="text-left">
                    <div className="font-bold text-lg">MercadoPago</div>
                    <div className="text-sm text-slate-400">Próximamente</div>
                  </div>
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 py-3 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 font-medium transition-all"
                >
                  Atrás
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-12 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="animate-spin w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-2">Procesando tu pago...</h3>
              <p className="text-slate-400">Por favor espera un momento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
