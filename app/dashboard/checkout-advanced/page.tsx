'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Banknote,
  CreditCard,
  Building2,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Shield,
  AlertTriangle,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';

interface PriceConfig {
  ADVANCED: number;
  ADVANCED_BASE: number;
  PL: number;
  PL_BASE: number;
  COMBO: number;
  COMBO_BASE: number;
  APARTADO: number;
}

type PackageType = 'ADVANCED_ONLY' | 'COMBO' | 'APARTADO';

interface UpgradeData {
  type: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentVisionId: number;
  targetOrganizationId: number;
  targetOrganizationName: string;
  targetVisionId: number;
  targetVisionName: string;
  advancedStartDate: string;
  price: number;
  packageType?: PackageType;
  pendingDebt?: number;
  prices?: PriceConfig;
}

interface GiftCodeData {
  code: string;
  type: 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM';
  value: number;
  discountPercentage?: number;
  organizationName: string;
}

interface AppliedPayment {
  id: string;
  type: 'GIFT_CODE' | 'CARD';
  code?: string;
  codeType?: string;
  amount: number;
  description: string;
}

type PaymentMethod = 'GIFT_CODE' | 'STRIPE' | 'TRANSFER';

export default function CheckoutAdvancedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [upgradeData, setUpgradeData] = useState<UpgradeData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GIFT_CODE');
  const [appliedPayments, setAppliedPayments] = useState<AppliedPayment[]>([]);
  
  // Gift code states
  const [giftCode, setGiftCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [validatedCode, setValidatedCode] = useState<GiftCodeData | null>(null);
  const [codeError, setCodeError] = useState('');
  
  // Processing states
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load upgrade data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('pendingUpgrade');
    if (!storedData) {
      router.push('/dashboard/upgrade-advanced');
      return;
    }

    try {
      const data = JSON.parse(storedData);
      if (data.type !== 'UPGRADE_ADVANCED') {
        router.push('/dashboard/upgrade-advanced');
        return;
      }
      setUpgradeData(data);
      setLoading(false);
    } catch (e) {
      console.error('Error parsing upgrade data:', e);
      router.push('/dashboard/upgrade-advanced');
    }
  }, [router]);

  // Calculate totals
  const totalPrice = upgradeData?.price || 0;
  const totalPaid = appliedPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalPrice - totalPaid);

  // Validate gift code
  const validateGiftCode = async () => {
    if (!giftCode.trim()) {
      setCodeError('Ingresa un código');
      return;
    }

    setValidatingCode(true);
    setCodeError('');

    try {
      const res = await fetch('/api/gift-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: giftCode.trim().toUpperCase(),
          organizationId: upgradeData?.targetOrganizationId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setValidatedCode(data.giftCode);
      } else {
        setCodeError(data.error || 'Código inválido');
      }
    } catch (e) {
      setCodeError('Error al validar código');
    } finally {
      setValidatingCode(false);
    }
  };

  // Add gift code payment
  const addGiftCodePayment = () => {
    if (!validatedCode) return;

    // Check if code is already applied
    if (appliedPayments.some(p => p.code === validatedCode.code)) {
      setCodeError('Este código ya fue aplicado');
      return;
    }

    // Calculate how much this code covers
    let codeValue = validatedCode.value;
    
    // If it's a discount code, calculate percentage of remaining
    if (validatedCode.type === 'GOLDEN_DISCOUNT' && validatedCode.discountPercentage) {
      codeValue = (remaining * validatedCode.discountPercentage) / 100;
    }

    const amountToApply = Math.min(codeValue, remaining);

    if (amountToApply <= 0) {
      setCodeError('El monto ya está cubierto');
      return;
    }

    const newPayment: AppliedPayment = {
      id: `gc-${Date.now()}`,
      type: 'GIFT_CODE',
      code: validatedCode.code,
      codeType: validatedCode.type,
      amount: amountToApply,
      description: `Código ${validatedCode.type} - $${amountToApply.toLocaleString()}`,
    };

    setAppliedPayments(prev => [...prev, newPayment]);
    setValidatedCode(null);
    setGiftCode('');
  };

  // Remove payment
  const removePayment = (id: string) => {
    setAppliedPayments(prev => prev.filter(p => p.id !== id));
  };

  // Process upgrade
  const handleProcessUpgrade = async () => {
    if (!upgradeData) return;

    // Check if fully paid
    if (remaining > 0 && paymentMethod !== 'STRIPE') {
      setError(`Aún falta por pagar $${remaining.toLocaleString()} MXN`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // First, redeem all gift codes (payment codes)
      const giftCodes = appliedPayments.filter(p => p.type === 'GIFT_CODE');
      
      for (const payment of giftCodes) {
        if (payment.code) {
          // Usar la API correcta de redeem
          const redeemRes = await fetch('/api/gift-codes/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: payment.code,
              userId: upgradeData.userId,
              visionId: upgradeData.targetVisionId,
              isCashPayment: payment.code.startsWith('CASH-'),
            }),
          });

          const redeemData = await redeemRes.json();
          if (!redeemData.success) {
            console.error(`Error redeeming code ${payment.code}:`, redeemData.error);
            throw new Error(redeemData.error || 'Error al canjear código');
          }
        }
      }

      // Create the vision enrollment for ADVANCED
      const enrollRes = await fetch('/api/me/enroll-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: upgradeData.targetVisionId,
          organizationId: upgradeData.targetOrganizationId,
          paymentMethod: paymentMethod,
          amountPaid: totalPaid,
          appliedCodes: giftCodes.map(p => p.code),
          packageType: upgradeData.packageType || 'ADVANCED_ONLY',
          pendingDebt: upgradeData.pendingDebt || 0,
          prices: upgradeData.prices,
        }),
      });

      const enrollData = await enrollRes.json();

      if (!enrollData.success) {
        throw new Error(enrollData.error || 'Error al procesar inscripción');
      }

      // Store success data with package type for success page
      sessionStorage.setItem('advancedEnrollmentSuccess', JSON.stringify({
        level: enrollData.enrollment?.level || 'ADVANCED',
        organizationName: upgradeData.targetOrganizationName,
        startDate: upgradeData.advancedStartDate,
        visionName: upgradeData.targetVisionName,
        packageType: upgradeData.packageType || 'ADVANCED_ONLY',
        pendingDebt: upgradeData.pendingDebt || 0,
        plPrice: upgradeData.prices?.PL || 0,
      }));

      // Clear session storage
      sessionStorage.removeItem('pendingUpgrade');

      // Redirect to success
      router.push('/dashboard/upgrade-advanced/success');
    } catch (e: any) {
      console.error('Upgrade error:', e);
      setError(e.message || 'Error al procesar el upgrade');
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!upgradeData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/upgrade-advanced')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-500" />
            Pago - Avanzado
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-purple-900/30 to-slate-900">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Rocket className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {upgradeData.packageType === 'COMBO' 
                        ? 'Combo Avanzado + PL' 
                        : upgradeData.packageType === 'APARTADO'
                        ? 'Apartado - Avanzado + PL'
                        : 'Entrenamiento Avanzado'}
                    </h2>
                    <p className="text-slate-400 flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      {upgradeData.targetOrganizationName}
                    </p>
                    <p className="text-slate-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(upgradeData.advancedStartDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    {upgradeData.packageType === 'COMBO' 
                      ? 'Inversión Combo (Avanzado + PL)'
                      : upgradeData.packageType === 'APARTADO'
                      ? 'Apartado hoy'
                      : 'Inversión Avanzado'}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-white">
                      ${totalPrice.toLocaleString()} MXN
                    </span>
                    {upgradeData.prices && (
                      <span className="text-lg text-slate-500 line-through">
                        ${(upgradeData.packageType === 'COMBO' 
                          ? upgradeData.prices.COMBO_BASE 
                          : upgradeData.prices.ADVANCED_BASE
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mostrar desglose si es COMBO */}
                {upgradeData.packageType === 'COMBO' && upgradeData.prices && (
                  <div className="pt-2 border-t border-slate-700 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>• Avanzado</span>
                      <span>${upgradeData.prices.ADVANCED.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>• Participación Libre (PL)</span>
                      <span>${upgradeData.prices.PL.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Mostrar deuda pendiente si es APARTADO */}
                {upgradeData.packageType === 'APARTADO' && upgradeData.pendingDebt && upgradeData.pendingDebt > 0 && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-400 font-medium text-sm">⚠️ Deuda pendiente</p>
                        <p className="text-xs text-slate-400">Deberás pagar antes del inicio del Avanzado</p>
                      </div>
                      <span className="text-xl font-bold text-orange-400">
                        ${upgradeData.pendingDebt.toLocaleString()} MXN
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Payment Methods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Método de Pago
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('GIFT_CODE')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'GIFT_CODE'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Banknote className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === 'GIFT_CODE' ? 'text-purple-400' : 'text-slate-400'}`} />
                  <p className={`text-sm font-medium ${paymentMethod === 'GIFT_CODE' ? 'text-white' : 'text-slate-400'}`}>
                    Código de Referencia
                  </p>
                </button>
                <button
                  onClick={() => setPaymentMethod('STRIPE')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'STRIPE'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === 'STRIPE' ? 'text-purple-400' : 'text-slate-400'}`} />
                  <p className={`text-sm font-medium ${paymentMethod === 'STRIPE' ? 'text-white' : 'text-slate-400'}`}>
                    Tarjeta
                  </p>
                </button>
              </div>

              {/* Gift Code Input */}
              {paymentMethod === 'GIFT_CODE' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                      placeholder="CODIGO-REFERENCIA"
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={validateGiftCode}
                      disabled={validatingCode || !giftCode.trim()}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      {validatingCode ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>

                  {codeError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      {codeError}
                    </div>
                  )}

                  {validatedCode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="font-medium text-green-400">{validatedCode.code}</p>
                            <p className="text-sm text-slate-400">
                              Valor: ${validatedCode.value.toLocaleString()} MXN
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={addGiftCodePayment}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Aplicar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Applied Payments */}
                  {appliedPayments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Códigos aplicados:</p>
                      {appliedPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Banknote className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="text-white font-medium">{payment.code}</p>
                              <p className="text-xs text-slate-400">{payment.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removePayment(payment.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stripe Payment (Coming Soon) */}
              {paymentMethod === 'STRIPE' && remaining > 0 && (
                <div className="p-6 bg-slate-800/50 rounded-xl text-center">
                  <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">
                    Pago con tarjeta próximamente disponible
                  </p>
                  <p className="text-sm text-slate-500">
                    Contacta a tu administrador para otras opciones de pago
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Resumen</h3>
              </div>

              <div className="p-6 space-y-4">
                {appliedPayments.length > 0 && appliedPayments.map((payment) => (
                  <div key={payment.id} className="flex justify-between text-green-400">
                    <span>- {payment.code}</span>
                    <span>-${payment.amount.toLocaleString()}</span>
                  </div>
                ))}

                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total a pagar</span>
                    <span className={`text-xl font-bold ${remaining === 0 ? 'text-green-400' : 'text-white'}`}>
                      ${remaining.toLocaleString()} MXN
                    </span>
                  </div>
                </div>

                {remaining === 0 && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    ¡Pago completo con códigos!
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-6 pb-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-6 border-t border-slate-800">
                <button
                  onClick={handleProcessUpgrade}
                  disabled={processing || (remaining > 0 && paymentMethod !== 'STRIPE')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Confirmar Inscripción
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Pago seguro y encriptado
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
