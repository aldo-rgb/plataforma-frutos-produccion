'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Rocket, Crown, Sparkles, Check, Gift, 
  CreditCard, Zap, Star, Clock, Shield, 
  ChevronRight, AlertCircle, Loader2, Lock,
  PartyPopper, Timer, TrendingUp, Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PricingInfo {
  advancedPromoPrice: number;      // $7,500 - Durante entrenamiento
  advancedRegularPrice: number;    // $9,000 - Después del entrenamiento
  comboFullPrice: number;          // $14,500 - Avanzado + PL completo
  comboDepositPrice: number;       // $9,000 - Apartado combo
  plPromoPrice: number;            // $5,500 - PL promocional (deuda restante)
  isTrainingActive: boolean;       // Si el entrenamiento básico está activo
  promoDeadline?: Date;            // Fecha límite promo
  advancedStartDate?: Date;        // Fecha inicio avanzado
}

interface UpgradePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricing?: Partial<PricingInfo>;
  userName?: string;
  onPaymentSuccess?: (option: string, amount: number) => void;
}

type PaymentOption = 'advanced_promo' | 'advanced_regular' | 'combo_full' | 'combo_deposit';
type PaymentMethod = 'reference_code' | 'paypal' | 'stripe' | 'mercadopago';

export default function UpgradePaymentModal({
  isOpen,
  onClose,
  pricing = {},
  userName = 'Guerrero',
  onPaymentSuccess
}: UpgradePaymentModalProps) {
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [referenceCode, setReferenceCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<'options' | 'payment' | 'success'>('options');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  // Precios por defecto (configurables por organización)
  const prices: PricingInfo = {
    advancedPromoPrice: pricing.advancedPromoPrice || 7500,
    advancedRegularPrice: pricing.advancedRegularPrice || 9000,
    comboFullPrice: pricing.comboFullPrice || 14500,
    comboDepositPrice: pricing.comboDepositPrice || 9000,
    plPromoPrice: pricing.plPromoPrice || 5500,
    isTrainingActive: pricing.isTrainingActive ?? true,
    promoDeadline: pricing.promoDeadline,
    advancedStartDate: pricing.advancedStartDate,
  };

  // Countdown para promo
  useEffect(() => {
    if (!prices.promoDeadline) return;

    const updateCountdown = () => {
      const now = new Date();
      const deadline = new Date(prices.promoDeadline!);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('¡Expirado!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else {
        setCountdown(`${hours}h ${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [prices.promoDeadline]);

  const handleSelectOption = (option: PaymentOption) => {
    setSelectedOption(option);
    setStep('payment');
    setError(null);
  };

  const handleValidateCode = async () => {
    if (!referenceCode.trim()) {
      setError('Ingresa un código de referencia');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/payment/validate-reference-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: referenceCode,
          option: selectedOption,
          amount: getSelectedAmount()
        })
      });

      const data = await res.json();

      if (data.success) {
        setStep('success');
        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        onPaymentSuccess?.(selectedOption!, getSelectedAmount());
      } else {
        setError(data.error || 'Código inválido');
      }
    } catch (err) {
      setError('Error al validar el código');
    } finally {
      setIsValidating(false);
    }
  };

  const getSelectedAmount = () => {
    switch (selectedOption) {
      case 'advanced_promo': return prices.advancedPromoPrice;
      case 'advanced_regular': return prices.advancedRegularPrice;
      case 'combo_full': return prices.comboFullPrice;
      case 'combo_deposit': return prices.comboDepositPrice;
      default: return 0;
    }
  };

  const getOptionDetails = (option: PaymentOption) => {
    switch (option) {
      case 'advanced_promo':
        return {
          title: '🔥 Precio Especial',
          subtitle: 'Solo durante el entrenamiento',
          price: prices.advancedPromoPrice,
          originalPrice: prices.advancedRegularPrice,
          savings: prices.advancedRegularPrice - prices.advancedPromoPrice,
          badge: 'MEJOR PRECIO',
          badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
          includes: ['Fin de semana Avanzado completo', 'Material de trabajo', 'Acceso a comunidad Avanzado'],
          highlight: true,
          available: prices.isTrainingActive,
        };
      case 'advanced_regular':
        return {
          title: 'Avanzado',
          subtitle: 'Precio regular',
          price: prices.advancedRegularPrice,
          includes: ['Fin de semana Avanzado completo', 'Material de trabajo', 'Acceso a comunidad Avanzado'],
          highlight: false,
          available: true,
        };
      case 'combo_full':
        return {
          title: '👑 Combo Completo',
          subtitle: 'Avanzado + Tu Vida PL',
          price: prices.comboFullPrice,
          originalPrice: prices.advancedRegularPrice + prices.plPromoPrice + 3000,
          savings: (prices.advancedRegularPrice + prices.plPromoPrice + 3000) - prices.comboFullPrice,
          badge: 'MÁXIMO AHORRO',
          badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          includes: [
            'Fin de semana Avanzado completo',
            'Fin de semana Tu Vida PL completo',
            'Materiales de ambos programas',
            'Acceso VIP a comunidad',
            'Mentorías exclusivas'
          ],
          highlight: true,
          available: true,
        };
      case 'combo_deposit':
        return {
          title: '💎 Aparta tu Lugar',
          subtitle: 'Avanzado + PL con enganche',
          price: prices.comboDepositPrice,
          pendingAmount: prices.plPromoPrice,
          badge: 'GARANTIZA LUGAR',
          badgeColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
          includes: [
            'Lugar garantizado en Avanzado',
            'Lugar apartado en Tu Vida PL',
            `Deuda pendiente: $${prices.plPromoPrice.toLocaleString()} antes del Avanzado`
          ],
          highlight: false,
          available: true,
          hasDebt: true,
        };
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 border border-purple-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-900/90 to-slate-900/90 backdrop-blur-sm p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {step === 'success' ? '¡Felicidades!' : 'Desbloquea tu Siguiente Nivel'}
                  </h2>
                  <p className="text-purple-300/80">
                    {step === 'success' 
                      ? 'Tu transformación continúa' 
                      : `${userName}, es momento de ir más profundo`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Countdown Banner */}
            {prices.isTrainingActive && countdown && step === 'options' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl"
              >
                <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-amber-300 font-medium">
                  Precio especial termina en: <span className="font-bold text-amber-400">{countdown}</span>
                </span>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Options */}
              {step === 'options' && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Urgency Banner */}
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-sm text-red-300">
                      <span className="font-bold">¡Lugares limitados!</span> Solo quedan pocos espacios para el próximo Avanzado. No pierdas tu oportunidad.
                    </p>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Promo Price */}
                    {prices.isTrainingActive && (
                      <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectOption('advanced_promo')}
                        className="relative text-left p-6 bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-slate-900 border-2 border-amber-500/50 rounded-2xl hover:border-amber-400 transition-all group overflow-hidden"
                      >
                        {/* Badge */}
                        <div className="absolute top-0 right-0">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                            🔥 MEJOR PRECIO
                          </div>
                        </div>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-6 h-6 text-amber-400" />
                            <span className="text-lg font-bold text-white">Precio Especial</span>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-black text-amber-400">
                              ${prices.advancedPromoPrice.toLocaleString()}
                            </span>
                            <span className="text-lg text-slate-500 line-through">
                              ${prices.advancedRegularPrice.toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-emerald-400 font-medium mb-4">
                            ¡Ahorras ${(prices.advancedRegularPrice - prices.advancedPromoPrice).toLocaleString()} MXN!
                          </p>

                          <p className="text-sm text-slate-400 mb-4">
                            Solo disponible durante tu entrenamiento Básico
                          </p>

                          <div className="space-y-2">
                            {['Fin de semana Avanzado completo', 'Materiales incluidos', 'Comunidad exclusiva'].map((item, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-amber-400" />
                                <span className="text-xs text-slate-300">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.button>
                    )}

                    {/* Option 2: Regular Price */}
                    <motion.button
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectOption('advanced_regular')}
                      className="relative text-left p-6 bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-600/50 rounded-2xl hover:border-purple-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Rocket className="w-6 h-6 text-purple-400" />
                        <span className="text-lg font-bold text-white">Avanzado</span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-4xl font-black text-white">
                          ${prices.advancedRegularPrice.toLocaleString()}
                        </span>
                        <span className="text-slate-500">MXN</span>
                      </div>

                      <p className="text-sm text-slate-400 mb-4">
                        Precio regular del programa
                      </p>

                      <div className="space-y-2">
                        {['Fin de semana Avanzado completo', 'Materiales incluidos', 'Comunidad exclusiva'].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-slate-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </motion.button>

                    {/* Option 3: Combo Full */}
                    <motion.button
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectOption('combo_full')}
                      className="relative text-left p-6 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-slate-900 border-2 border-purple-500/50 rounded-2xl hover:border-purple-400 transition-all group overflow-hidden md:col-span-2"
                    >
                      {/* Badge */}
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                          👑 MÁXIMO AHORRO
                        </div>
                      </div>

                      {/* Animated border */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Crown className="w-6 h-6 text-purple-400" />
                            <span className="text-lg font-bold text-white">Combo Completo</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full">
                              Avanzado + Tu Vida PL
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                              ${prices.comboFullPrice.toLocaleString()}
                            </span>
                            <span className="text-lg text-slate-500 line-through">
                              ${(prices.advancedRegularPrice + prices.plPromoPrice + 3000).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-emerald-400 font-medium mb-4">
                            ¡Ahorras ${((prices.advancedRegularPrice + prices.plPromoPrice + 3000) - prices.comboFullPrice).toLocaleString()} MXN!
                          </p>
                        </div>

                        <div className="space-y-2 md:text-right">
                          {[
                            'Ambos fines de semana incluidos',
                            'Todos los materiales',
                            'Acceso VIP comunidad',
                            'Mentorías exclusivas'
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 md:justify-end">
                              <span className="text-xs text-slate-300">{item}</span>
                              <Check className="w-4 h-4 text-purple-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.button>

                    {/* Option 4: Deposit */}
                    <motion.button
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectOption('combo_deposit')}
                      className="relative text-left p-6 bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-slate-900 border border-emerald-500/30 rounded-2xl hover:border-emerald-400/50 transition-all group md:col-span-2"
                    >
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                          💎 GARANTIZA LUGAR
                        </div>
                      </div>

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-6 h-6 text-emerald-400" />
                            <span className="text-lg font-bold text-white">Aparta tu Lugar</span>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-black text-emerald-400">
                              ${prices.comboDepositPrice.toLocaleString()}
                            </span>
                            <span className="text-slate-500">hoy</span>
                          </div>

                          <p className="text-sm text-slate-400">
                            + ${prices.plPromoPrice.toLocaleString()} antes del inicio del Avanzado
                          </p>
                        </div>

                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Compromiso de pago</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Deuda de <span className="text-amber-400 font-bold">${prices.plPromoPrice.toLocaleString()}</span> debe liquidarse antes del inicio del Avanzado
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-6 pt-4">
                    {[
                      { icon: Shield, text: 'Pago Seguro' },
                      { icon: Heart, text: '+10,000 Graduados' },
                      { icon: Star, text: '4.9/5 Valoración' },
                    ].map((badge, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-400">
                        <badge.icon className="w-4 h-4" />
                        <span className="text-xs">{badge.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Payment Method */}
              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Back button */}
                  <button
                    onClick={() => { setStep('options'); setError(null); }}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Volver a opciones</span>
                  </button>

                  {/* Selected Option Summary */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Seleccionaste</p>
                        <p className="text-lg font-bold text-white">
                          {selectedOption === 'advanced_promo' && 'Avanzado - Precio Especial'}
                          {selectedOption === 'advanced_regular' && 'Avanzado - Precio Regular'}
                          {selectedOption === 'combo_full' && 'Combo Avanzado + PL'}
                          {selectedOption === 'combo_deposit' && 'Apartado Combo'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-purple-400">
                          ${getSelectedAmount().toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">MXN</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Método de Pago</h3>
                    
                    <div className="space-y-3">
                      {/* Reference Code - Active */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedMethod === 'reference_code'
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50'
                        }`}
                        onClick={() => setSelectedMethod('reference_code')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Gift className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">Código de Referencia</p>
                            <p className="text-xs text-slate-400">Regalo o pago en efectivo</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedMethod === 'reference_code' 
                              ? 'border-purple-500 bg-purple-500' 
                              : 'border-slate-600'
                          }`}>
                            {selectedMethod === 'reference_code' && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </motion.div>

                      {/* Disabled Methods */}
                      {[
                        { id: 'paypal', name: 'PayPal', icon: CreditCard },
                        { id: 'stripe', name: 'Tarjeta de Crédito/Débito', icon: CreditCard },
                        { id: 'mercadopago', name: 'Mercado Pago', icon: CreditCard },
                      ].map((method) => (
                        <div
                          key={method.id}
                          className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                              <method.icon className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-500">{method.name}</p>
                              <p className="text-xs text-slate-600">Próximamente</p>
                            </div>
                            <Lock className="w-4 h-4 text-slate-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reference Code Input */}
                  {selectedMethod === 'reference_code' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Ingresa tu código
                        </label>
                        <input
                          type="text"
                          value={referenceCode}
                          onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                          placeholder="XXXXXX"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          maxLength={10}
                        />
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-red-400 text-sm"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleValidateCode}
                        disabled={isValidating || !referenceCode}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirmar Pago</span>
                            <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>

                      <p className="text-center text-xs text-slate-500">
                        ¿No tienes código? Contacta a tu coordinador para obtener uno.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center"
                  >
                    <PartyPopper className="w-12 h-12 text-white" />
                  </motion.div>

                  <h3 className="text-3xl font-black text-white mb-2">
                    ¡Bienvenido al Siguiente Nivel!
                  </h3>
                  <p className="text-lg text-slate-400 mb-6">
                    Tu inscripción al Avanzado ha sido confirmada
                  </p>

                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 mb-8">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Pago confirmado: ${getSelectedAmount().toLocaleString()} MXN</span>
                  </div>

                  <div className="space-y-3 max-w-md mx-auto text-left bg-slate-800/50 rounded-2xl p-6">
                    <h4 className="font-bold text-white">Próximos pasos:</h4>
                    {[
                      'Recibirás un correo con los detalles',
                      'Tu Game Changer te contactará pronto',
                      'Prepárate para una experiencia transformadora'
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-sm font-bold text-purple-400">
                          {i + 1}
                        </div>
                        <span className="text-sm text-slate-300">{step}</span>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="mt-8 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl"
                  >
                    ¡Entendido!
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
