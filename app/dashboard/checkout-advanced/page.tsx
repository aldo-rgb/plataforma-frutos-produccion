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
  Receipt,
} from 'lucide-react';

interface PriceConfig {
  ADVANCED: number;
  ADVANCED_BASE: number;
  PL: number;
  PL_BASE: number;
  COMBO: number;
  COMBO_BASE: number;
  APARTADO: number;
  APARTADO_SALDO?: number;
}

type PackageType = 'ADVANCED_ONLY' | 'COMBO' | 'APARTADO' | 'PL_BASE' | 'PL_CON_CREDITO' | 'PL_APARTADO' | 'PL_COMPLETO';

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

type PaymentMethod = 'GIFT_CODE' | 'STRIPE' | 'MERCADOPAGO' | 'TRANSFER';

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
  
  // Invoice (Factura) states
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    rfc: '',
    name: '',
    zipCode: '',
    regime: '',
    cfdiUse: '',
  });
  const [satCatalogs, setSatCatalogs] = useState<{
    regimenFiscal: Array<{ code: string; name: string }>;
    usoCfdi: Array<{ code: string; name: string }>;
  } | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  
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
      
      // DEBUG: Log received data
      console.log('🔍 DEBUG checkout-advanced received:', {
        price: data.price,
        packageType: data.packageType,
        panorama: data.panorama,
        prices: data.prices,
      });
      
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

  // Cargar catálogos del SAT cuando se activa el switch de factura
  useEffect(() => {
    const loadSatCatalogs = async () => {
      if (requiresInvoice && !satCatalogs) {
        setLoadingCatalogs(true);
        try {
          const res = await fetch('/api/invoices');
          const data = await res.json();
          if (data.success) {
            setSatCatalogs(data.catalogs);
          }
        } catch (err) {
          console.error('Error loading SAT catalogs:', err);
        } finally {
          setLoadingCatalogs(false);
        }
      }
    };
    loadSatCatalogs();
  }, [requiresInvoice, satCatalogs]);

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
        // Auto-apply the validated code
        const validCode = data.giftCode;
        
        // Check if code is already applied
        if (appliedPayments.some(p => p.code === validCode.code)) {
          setCodeError('Este código ya fue aplicado');
          setValidatingCode(false);
          return;
        }

        // Calculate how much this code covers
        let codeValue = validCode.value;
        
        // If it's a discount code, calculate percentage of remaining
        if (validCode.type === 'GOLDEN_DISCOUNT' && validCode.discountPercentage) {
          codeValue = (remaining * validCode.discountPercentage) / 100;
        }

        const amountToApply = Math.min(codeValue, remaining);

        if (amountToApply <= 0) {
          setCodeError('El monto ya está cubierto');
          setValidatingCode(false);
          return;
        }

        const newPayment: AppliedPayment = {
          id: `gc-${Date.now()}`,
          type: 'GIFT_CODE',
          code: validCode.code,
          codeType: validCode.type,
          amount: amountToApply,
          description: `Código ${validCode.type} - $${amountToApply.toLocaleString()}`,
        };

        setAppliedPayments(prev => [...prev, newPayment]);
        setValidatedCode(null);
        setGiftCode('');
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

    // Check if fully paid (for gift codes) or if paying with card
    if (remaining > 0 && paymentMethod !== 'STRIPE' && paymentMethod !== 'MERCADOPAGO') {
      setError(`Aún falta por pagar $${remaining.toLocaleString()} MXN`);
      return;
    }

    // Validate invoice data if required
    if (requiresInvoice) {
      if (!invoiceData.rfc || invoiceData.rfc.length < 12) {
        setError('El RFC debe tener al menos 12 caracteres');
        return;
      }
      if (!invoiceData.name) {
        setError('Ingresa la razón social');
        return;
      }
      if (!invoiceData.zipCode || invoiceData.zipCode.length !== 5) {
        setError('El código postal debe tener 5 dígitos');
        return;
      }
      if (!invoiceData.regime) {
        setError('Selecciona el régimen fiscal');
        return;
      }
      if (!invoiceData.cfdiUse) {
        setError('Selecciona el uso del CFDI');
        return;
      }
    }

    setProcessing(true);
    setError('');

    try {
      // If paying with card (STRIPE/MercadoPago), redirect to payment gateway
      if ((paymentMethod === 'STRIPE' || paymentMethod === 'MERCADOPAGO') && remaining > 0) {
        // Log the request data
        const requestData = {
          visionId: upgradeData.targetVisionId,
          organizationId: upgradeData.targetOrganizationId,
          packageType: upgradeData.packageType || 'ADVANCED_ONLY',
          amount: remaining,
          pendingDebt: upgradeData.pendingDebt || 0,
          prices: upgradeData.prices,
          appliedCodes: appliedPayments.filter(p => p.type === 'GIFT_CODE').map(p => p.code),
          requiresInvoice,
          invoiceData: requiresInvoice ? invoiceData : null,
          paymentMethod: paymentMethod, // Enviar el método de pago seleccionado
        };
        console.log('🔍 DEBUG create-payment request:', requestData);
        
        const paymentRes = await fetch('/api/checkout-advanced/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        const paymentData = await paymentRes.json();
        console.log('🔍 DEBUG create-payment response:', paymentData);

        if (!paymentData.success || !paymentData.paymentUrl) {
          throw new Error(paymentData.error || paymentData.details || 'Error al crear el pago');
        }

        // Redirect to Mercado Pago
        window.location.href = paymentData.paymentUrl;
        return;
      }

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

      // Build success URL with data for public success page
      const successData = {
        level: enrollData.enrollment?.level || 'ADVANCED',
        packageType: upgradeData.packageType || 'ADVANCED_ONLY',
        visionName: upgradeData.targetVisionName,
        amount: 0,
        organizationName: upgradeData.targetOrganizationName,
        startDate: upgradeData.advancedStartDate,
      };
      
      // Redirect to public success page
      router.push(`/upgrade-advanced/success?data=${encodeURIComponent(JSON.stringify(successData))}`);
    } catch (e: any) {
      console.error('Upgrade error:', e);
      setError(e.message || 'Error al procesar el upgrade');
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Próximamente';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Próximamente';
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
            {upgradeData?.packageType === 'PL_BASE' || upgradeData?.packageType === 'PL_CON_CREDITO' 
              ? 'Pago - Tu VIDA (PL)' 
              : 'Pago - Avanzado'}
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
                        : upgradeData.packageType === 'PL_APARTADO'
                        ? 'Apartado Combo - Tu VIDA'
                        : upgradeData.packageType === 'PL_COMPLETO'
                        ? 'Combo Completo - Tu VIDA'
                        : upgradeData.packageType === 'PL_BASE' || upgradeData.packageType === 'PL_CON_CREDITO'
                        ? 'Tu VIDA'
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
                      : upgradeData.packageType === 'PL_APARTADO'
                      ? 'Pago para apartar'
                      : upgradeData.packageType === 'PL_COMPLETO'
                      ? 'Pago para completar COMBO'
                      : upgradeData.packageType === 'PL_BASE' || upgradeData.packageType === 'PL_CON_CREDITO'
                      ? 'Inversión Tu VIDA'
                      : 'Inversión Avanzado'}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-white">
                      ${totalPrice.toLocaleString()} MXN
                    </span>
                    {/* No mostrar precio tachado para PL_APARTADO o PL_COMPLETO ya que son precios especiales */}
                    {upgradeData.prices && upgradeData.packageType !== 'PL_APARTADO' && upgradeData.packageType !== 'PL_COMPLETO' && (
                      <span className="text-lg text-slate-500 line-through">
                        ${(upgradeData.packageType === 'COMBO' 
                          ? upgradeData.prices.COMBO_BASE 
                          : upgradeData.packageType === 'PL_BASE' || upgradeData.packageType === 'PL_CON_CREDITO'
                          ? upgradeData.prices.PL_BASE
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

                {/* Mostrar deuda pendiente si es APARTADO o PL_APARTADO */}
                {(upgradeData.packageType === 'APARTADO' || upgradeData.packageType === 'PL_APARTADO') && upgradeData.pendingDebt && upgradeData.pendingDebt > 0 && (
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

                {/* Mostrar desglose de lo ya pagado si es PL_APARTADO o PL_COMPLETO */}
                {(upgradeData.packageType === 'PL_APARTADO' || upgradeData.packageType === 'PL_COMPLETO') && upgradeData.prices && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-400 font-medium text-sm">✓ Ya pagaste (Avanzado)</p>
                        <p className="text-xs text-slate-400">Inversión previa acreditada</p>
                      </div>
                      <span className="text-xl font-bold text-emerald-400">
                        ${upgradeData.prices.ADVANCED?.toLocaleString() || 0} MXN
                      </span>
                    </div>
                  </div>
                )}

                {/* Mostrar crédito si tiene PL_CON_CREDITO */}
                {upgradeData.packageType === 'PL_CON_CREDITO' && upgradeData.prices?.APARTADO_SALDO && upgradeData.prices.APARTADO_SALDO > 0 && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-400 font-medium text-sm">✨ Saldo a favor aplicado</p>
                        <p className="text-xs text-slate-400">Por tu pago de apartado anterior</p>
                      </div>
                      <span className="text-xl font-bold text-emerald-400">
                        -${upgradeData.prices.APARTADO_SALDO.toLocaleString()} MXN
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

              <div className="grid grid-cols-3 gap-3 mb-6">
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
                  onClick={() => setPaymentMethod('MERCADOPAGO')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'MERCADOPAGO'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Wallet className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === 'MERCADOPAGO' ? 'text-purple-400' : 'text-slate-400'}`} />
                  <p className={`text-xs font-medium text-center ${paymentMethod === 'MERCADOPAGO' ? 'text-white' : 'text-slate-400'}`}>
                    Transferencia o Meses sin intereses
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

              {/* Stripe Payment (MercadoPago) */}
              {paymentMethod === 'STRIPE' && remaining > 0 && (
                <div className="p-6 bg-slate-800/50 rounded-xl text-center">
                  <CreditCard className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-white font-medium mb-2">
                    Pago con tarjeta de crédito/débito
                  </p>
                  <p className="text-slate-400 text-sm mb-4">
                    Serás redirigido a Stripe para completar tu pago de forma segura
                  </p>
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                    <Shield className="w-4 h-4" />
                    Pago 100% seguro
                  </div>
                </div>
              )}
            </motion.div>

            {/* Invoice (Factura) Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                    <Receipt className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">¿Necesitas factura?</span>
                    <p className="text-xs text-slate-400">Proporciona tus datos fiscales</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresInvoice(!requiresInvoice)}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    requiresInvoice ? 'bg-purple-500' : 'bg-slate-600'
                  }`}
                >
                  <span 
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      requiresInvoice ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Formulario fiscal (si requiere) */}
              {requiresInvoice && (
                <div className="mt-4 space-y-4 p-4 bg-slate-800/50 rounded-xl border border-amber-500/30">
                  <p className="text-amber-400 text-xs font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Datos exactamente como aparecen en tu Constancia de Situación Fiscal
                  </p>

                  {loadingCatalogs ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* RFC */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">RFC *</label>
                        <input
                          type="text"
                          value={invoiceData.rfc}
                          onChange={(e) => setInvoiceData({ ...invoiceData, rfc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13) })}
                          placeholder="XAXX010101000"
                          maxLength={13}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono uppercase"
                        />
                        <p className="text-xs text-slate-500 mt-1">{invoiceData.rfc.length}/13 caracteres</p>
                      </div>

                      {/* Razón Social */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Razón Social *</label>
                        <input
                          type="text"
                          value={invoiceData.name}
                          onChange={(e) => setInvoiceData({ ...invoiceData, name: e.target.value.toUpperCase() })}
                          placeholder="NOMBRE COMPLETO O EMPRESA"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors uppercase"
                        />
                        <p className="text-xs text-slate-500 mt-1">Sin S.A. de C.V., exactamente como aparece en tu constancia</p>
                      </div>

                      {/* Código Postal */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Código Postal Fiscal *</label>
                        <input
                          type="text"
                          value={invoiceData.zipCode}
                          onChange={(e) => setInvoiceData({ ...invoiceData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                          placeholder="00000"
                          maxLength={5}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                        />
                      </div>

                      {/* Régimen Fiscal */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Régimen Fiscal *</label>
                        <select
                          value={invoiceData.regime}
                          onChange={(e) => setInvoiceData({ ...invoiceData, regime: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="">Selecciona tu régimen fiscal</option>
                          {satCatalogs?.regimenFiscal.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} - {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Uso de CFDI */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Uso de CFDI *</label>
                        <select
                          value={invoiceData.cfdiUse}
                          onChange={(e) => setInvoiceData({ ...invoiceData, cfdiUse: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="">Selecciona el uso</option>
                          {satCatalogs?.usoCfdi.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code} - {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
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
                  disabled={processing || (remaining > 0 && paymentMethod === 'GIFT_CODE')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {paymentMethod === 'STRIPE' ? 'Redirigiendo a pago...' : 'Procesando...'}
                    </>
                  ) : paymentMethod === 'STRIPE' && remaining > 0 ? (
                    <>
                      Pagar con Tarjeta
                      <CreditCard className="w-5 h-5" />
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
