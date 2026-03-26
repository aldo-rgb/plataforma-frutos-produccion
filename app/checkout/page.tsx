'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Ticket,
  Crown,
  Banknote,
  CreditCard,
  Building2,
  QrCode,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Shield,
  Star,
  AlertTriangle,
  Plus,
  Trash2,
  Wallet,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

interface RegistrationData {
  nombre: string;
  apodo: string;
  telefono: string;
  horarioLlamada: string;
  email: string;
  password: string;
  organizationId: number;
  organizationName: string;
  visionId: number | null;
  visionName: string | null;
  referralCode: string | null;
  profession: string;
  birthdate: string;
  children: number;
  goals: string[];
  expectations: string;
}

interface GiftCodeData {
  code: string;
  type: 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM' | 'CASH_PAYMENT';
  value: number;
  discountPercentage?: number;
  organizationName: string;
  visionName: string | null;
  tickets: { level: string; name: string }[];
  ticketsIncluded?: string[];
  description?: string;
  isCashPayment?: boolean;
  reference?: string;
}

interface AppliedPayment {
  id: string;
  type: 'GIFT_CODE' | 'CARD' | 'CASH_PAYMENT';
  code?: string;
  codeType?: 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM' | 'CASH_PAYMENT';
  amount: number;
  description: string;
  discountPercentage?: number;
}

interface PriceConfig {
  BASIC: number;
  ADVANCED: number;
  PL: number;
  FULL_VISION: number;
}

type TicketSelection = 'BASIC_ONLY' | 'FULL_VISION';
type PaymentMethod = 'GIFT_CODE' | 'STRIPE' | 'MERCADOPAGO' | 'TRANSFER';

interface BankConfig {
  bankName: string;
  bankAccountClabe: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  transferWhatsappNumber: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get registration data from sessionStorage
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [prices, setPrices] = useState<PriceConfig | null>(null);
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);
  const [brandColor, setBrandColor] = useState<string>('#6366F1');
  const [loading, setLoading] = useState(true);
  
  // Checkout tracking for abandoned cart
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  
  // UI states
  const [step, setStep] = useState<'ticket' | 'payment' | 'confirm'>('ticket');
  const [ticketSelection, setTicketSelection] = useState<TicketSelection>('BASIC_ONLY');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('STRIPE');
  
  // Multiple payments support
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
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Track checkout for abandoned cart detection
  const trackCheckoutStart = async (data: RegistrationData, price: number) => {
    try {
      const res = await fetch('/api/checkout/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: data.visionId,
          email: data.email,
          phone: data.telefono,
          firstName: data.nombre?.split(' ')[0],
          lastName: data.nombre?.split(' ').slice(1).join(' '),
          originalPrice: price,
          // Enviar todos los datos de registro para crear usuario si abandona
          registrationData: {
            nombre: data.nombre,
            apodo: data.apodo,
            telefono: data.telefono,
            horarioLlamada: data.horarioLlamada,
            email: data.email,
            organizationId: data.organizationId,
            organizationName: data.organizationName,
            visionId: data.visionId,
            visionName: data.visionName,
            referralCode: data.referralCode,
            profession: data.profession,
            birthdate: data.birthdate,
            children: data.children,
            goals: data.goals,
            expectations: data.expectations,
          },
          // Enviar password para hashear en el servidor
          password: data.password,
        }),
      });
      const result = await res.json();
      if (result.success && result.checkoutId) {
        setCheckoutId(result.checkoutId);
        // Store in sessionStorage for recovery
        sessionStorage.setItem('checkoutTrackingId', result.checkoutId);
      }
    } catch (e) {
      console.error('Error tracking checkout:', e);
    }
  };

  // Remove tracking when checkout completes
  const clearCheckoutTracking = async () => {
    const trackingId = checkoutId || sessionStorage.getItem('checkoutTrackingId');
    if (trackingId) {
      try {
        await fetch(`/api/checkout/track?checkoutId=${trackingId}`, {
          method: 'DELETE',
        });
        sessionStorage.removeItem('checkoutTrackingId');
        setCheckoutId(null);
      } catch (e) {
        console.error('Error clearing checkout tracking:', e);
      }
    }
  };

  useEffect(() => {
    // Check if we have registration data
    const storedData = sessionStorage.getItem('pendingRegistration');
    if (!storedData) {
      // No registration data, redirect to signup
      router.push('/auth/signup');
      return;
    }

    try {
      const data = JSON.parse(storedData);
      setRegistrationData(data);
      fetchPrices(data.organizationId);
    } catch (e) {
      console.error('Error parsing registration data:', e);
      router.push('/auth/signup');
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

  const fetchPrices = async (organizationId: number) => {
    try {
      const res = await fetch(`/api/public/prices?organizationId=${organizationId}`);
      const data = await res.json();
      
      if (data.success) {
        setPrices(data.prices);
        // Set bank config if available
        if (data.bankConfig) {
          setBankConfig(data.bankConfig);
        }
        // Set brand color if available
        if (data.branding?.brandColor) {
          setBrandColor(data.branding.brandColor);
        }
      } else {
        // Use default prices
        setPrices({
          BASIC: 3500,
          ADVANCED: 4500,
          PL: 5500,
          FULL_VISION: 12000,
        });
      }
    } catch (e) {
      console.error('Error fetching prices:', e);
      setPrices({
        BASIC: 3500,
        ADVANCED: 4500,
        PL: 5500,
        FULL_VISION: 12000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Start checkout tracking when we have registration data and prices
  useEffect(() => {
    if (registrationData && prices && registrationData.visionId && !checkoutId) {
      // Track checkout start for abandoned cart detection
      trackCheckoutStart(registrationData, prices.BASIC);
    }
  }, [registrationData, prices]);

  const validateGiftCode = async () => {
    if (!giftCode.trim()) {
      setCodeError('Ingresa un código de regalo');
      return;
    }

    // Check if code is already applied
    const codeUpperCase = giftCode.trim().toUpperCase();
    if (appliedPayments.some(p => p.code === codeUpperCase)) {
      setCodeError('Este código ya ha sido aplicado');
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
        // Auto-agregar el código inmediatamente
        setTimeout(() => {
          addGiftCodePaymentWithData(data.giftCode);
        }, 300);
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

  // Add validated code to applied payments (with data parameter for auto-add)
  const addGiftCodePaymentWithData = (codeData: typeof validatedCode) => {
    if (!codeData || !prices) return;

    const currentPaid = appliedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate how much this code covers
    let codeValue = 0;
    let description = '';

    if (codeData.type === 'GOLDEN') {
      // GOLDEN covers full BASIC price
      const remaining = prices.BASIC - currentPaid;
      codeValue = Math.min(prices.BASIC, Math.max(0, remaining));
      description = '🎫 Básico - Nivel Inicial Gratis';
    } else if (codeData.type === 'GOLDEN_DISCOUNT') {
      // GOLDEN_DISCOUNT gives a percentage discount on BASIC
      const discountAmount = Math.round(prices.BASIC * ((codeData.discountPercentage || 0) / 100));
      const remaining = prices.BASIC - currentPaid;
      codeValue = Math.min(discountAmount, Math.max(0, remaining));
      description = `🎫 Golden ${codeData.discountPercentage}% - Descuento`;
    } else if (codeData.type === 'PLATINUM') {
      // PLATINUM covers full FULL_VISION price - calculate against FULL price, not current selection
      const remaining = prices.FULL_VISION - currentPaid;
      codeValue = Math.min(prices.FULL_VISION, Math.max(0, remaining));
      description = '👑 Jornada Completa - Visión Completa';
      // Auto-switch to FULL_VISION if PLATINUM
      setTicketSelection('FULL_VISION');
    } else if (codeData.type === 'CASH_PAYMENT') {
      // CASH_PAYMENT - applies the value directly as payment
      const totalPrice = ticketSelection === 'FULL_VISION' ? prices.FULL_VISION : prices.BASIC;
      const remaining = totalPrice - currentPaid;
      codeValue = Math.min(codeData.value || 0, Math.max(0, remaining));
      description = `🎟️ Pago con Código - $${(codeData.value || 0).toLocaleString('es-MX')} MXN`;
    }

    // Determinar el tipo de pago
    const paymentType = codeData.type === 'CASH_PAYMENT' || codeData.isCashPayment 
      ? 'CASH_PAYMENT' 
      : 'GIFT_CODE';

    // Add to applied payments
    setAppliedPayments(prev => [...prev, {
      id: `code-${Date.now()}`,
      type: paymentType,
      code: codeData.code,
      codeType: codeData.type,
      amount: codeValue,
      description,
      discountPercentage: codeData.discountPercentage,
    }]);

    // Clear the input
    setGiftCode('');
    setValidatedCode(null);
  };

  // Wrapper function for manual add (uses current validatedCode state)
  const addGiftCodePayment = () => {
    addGiftCodePaymentWithData(validatedCode);
  };

  // Remove a payment from the list
  const removePayment = (paymentId: string) => {
    setAppliedPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  // Calculate remaining balance
  const getRemainingBalance = () => {
    if (!prices) return 0;
    const totalPrice = ticketSelection === 'FULL_VISION' ? prices.FULL_VISION : prices.BASIC;
    const totalPaid = appliedPayments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalPrice - totalPaid);
  };

  // Check if payment is complete (either fully paid or has pending card/transfer payment)
  const isPaymentComplete = () => {
    return getRemainingBalance() === 0 || (getRemainingBalance() > 0 && (paymentMethod === 'STRIPE' || paymentMethod === 'MERCADOPAGO' || paymentMethod === 'TRANSFER'));
  };

  const handlePayment = async () => {
    if (!registrationData) return;
    
    // Validar datos de factura si requiere
    if (requiresInvoice) {
      if (!invoiceData.rfc || !invoiceData.name || !invoiceData.zipCode || !invoiceData.regime || !invoiceData.cfdiUse) {
        setError('Por favor completa todos los datos fiscales para la factura');
        return;
      }
      if (invoiceData.rfc.length < 12 || invoiceData.rfc.length > 13) {
        setError('El RFC debe tener 12 o 13 caracteres');
        return;
      }
    }
    
    console.log('[CHECKOUT] registrationData:', registrationData);
    
    setProcessing(true);
    setError('');

    try {
      const remainingBalance = getRemainingBalance();
      const giftCodes = appliedPayments.filter(p => p.type === 'GIFT_CODE');

      // If there's remaining balance and no card/transfer payment method selected
      if (remainingBalance > 0 && paymentMethod !== 'STRIPE' && paymentMethod !== 'MERCADOPAGO' && paymentMethod !== 'TRANSFER') {
        setError(`Aún falta por pagar $${remainingBalance.toLocaleString()} MXN. Agrega más códigos o selecciona pago con tarjeta/transferencia.`);
        setProcessing(false);
        return;
      }

      // If paying with TRANSFER, create a pending order and show bank details
      if (remainingBalance > 0 && paymentMethod === 'TRANSFER') {
        const codesToRedeem = appliedPayments.filter(p => p.type === 'GIFT_CODE' || p.type === 'CASH_PAYMENT');
        
        console.log('[CHECKOUT] Creando orden pendiente de transferencia...');
        
        const transferRes = await fetch('/api/checkout/create-transfer-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: registrationData.organizationId,
            visionId: registrationData.visionId,
            amount: remainingBalance,
            ticketSelection: ticketSelection,
            userData: {
              nombre: registrationData.nombre,
              email: registrationData.email,
              apodo: registrationData.apodo,
              telefono: registrationData.telefono,
              password: registrationData.password,
              horarioLlamada: registrationData.horarioLlamada,
              profession: registrationData.profession,
              birthdate: registrationData.birthdate,
              children: registrationData.children,
              goals: registrationData.goals,
              expectations: registrationData.expectations,
              referralCode: registrationData.referralCode,
            },
            appliedCodes: codesToRedeem.map(p => p.code),
            // Datos de facturación
            requiresInvoice,
            invoiceData: requiresInvoice ? {
              rfc: invoiceData.rfc.toUpperCase(),
              name: invoiceData.name.toUpperCase(),
              zipCode: invoiceData.zipCode,
              regime: invoiceData.regime,
              cfdiUse: invoiceData.cfdiUse,
            } : null,
          }),
        });

        const transferData = await transferRes.json();
        console.log('[CHECKOUT] Respuesta:', transferData);

        if (!transferRes.ok || !transferData.success) {
          const errorMsg = transferData.error || transferData.details || 'Error al crear la orden';
          console.error('[CHECKOUT] Error:', errorMsg);
          throw new Error(errorMsg);
        }

        // Clear session storage
        sessionStorage.removeItem('pendingRegistration');

        // Redirect to transfer pending page with order reference and org info
        router.push(`/checkout/transfer-pending?ref=${transferData.orderReference}&email=${encodeURIComponent(registrationData.email)}&amount=${remainingBalance}&orgId=${registrationData.organizationId}`);
        return;
      }

      // If paying with card (Stripe or MercadoPago), redirect to payment gateway FIRST (user will be created after payment)
      if (remainingBalance > 0 && (paymentMethod === 'STRIPE' || paymentMethod === 'MERCADOPAGO')) {
        const codesToRedeem = appliedPayments.filter(p => p.type === 'GIFT_CODE' || p.type === 'CASH_PAYMENT');
        
        console.log('[CHECKOUT] Creando pago con pasarela:', paymentMethod);
        console.log('[CHECKOUT] Datos:', { 
          orgId: registrationData.organizationId, 
          visionId: registrationData.visionId,
          amount: remainingBalance,
          paymentMethod: paymentMethod
        });
        
        const paymentRes = await fetch('/api/checkout/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: registrationData.organizationId,
            visionId: registrationData.visionId,
            amount: remainingBalance,
            ticketSelection: ticketSelection,
            paymentMethod: paymentMethod, // 'STRIPE' o 'MERCADOPAGO'
            userData: {
              nombre: registrationData.nombre,
              email: registrationData.email,
              apodo: registrationData.apodo,
              telefono: registrationData.telefono,
              password: registrationData.password,
              horarioLlamada: registrationData.horarioLlamada,
              profession: registrationData.profession,
              birthdate: registrationData.birthdate,
              children: registrationData.children,
              goals: registrationData.goals,
              expectations: registrationData.expectations,
              referralCode: registrationData.referralCode,
            },
            appliedCodes: codesToRedeem.map(p => p.code),
            // Datos de facturación
            requiresInvoice,
            invoiceData: requiresInvoice ? {
              rfc: invoiceData.rfc.toUpperCase(),
              name: invoiceData.name.toUpperCase(),
              zipCode: invoiceData.zipCode,
              regime: invoiceData.regime,
              cfdiUse: invoiceData.cfdiUse,
            } : null,
          }),
        });

        console.log('[CHECKOUT] Respuesta status:', paymentRes.status);
        
        const paymentData = await paymentRes.json();
        console.log('[CHECKOUT] Respuesta:', paymentData);

        if (!paymentRes.ok || !paymentData.success || !paymentData.paymentUrl) {
          const errorMsg = paymentData.error || paymentData.details || 'Error al crear el pago';
          console.error('[CHECKOUT] Error:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[CHECKOUT] Redirigiendo a:', paymentData.paymentUrl);
        
        // Guardar URL por si la redirección automática falla
        setPaymentUrl(paymentData.paymentUrl);
        
        // Intentar redirección automática
        // Algunos navegadores móviles bloquean redirecciones automáticas
        setTimeout(() => {
          window.location.href = paymentData.paymentUrl;
        }, 100);
        
        return;
      }

      // If no card payment (only gift codes), register the user first
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const registerData = await registerRes.json();

      if (!registerData.success) {
        throw new Error(registerData.error || 'Error al registrar usuario');
      }

      const userId = registerData.userId || registerData.user?.id;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario registrado');
      }

      // Redeem all gift codes and cash payment codes
      const codesToRedeem = appliedPayments.filter(p => p.type === 'GIFT_CODE' || p.type === 'CASH_PAYMENT');
      console.log('[CHECKOUT] Códigos a canjear:', codesToRedeem.map(p => ({ code: p.code, type: p.type })));
      
      for (const payment of codesToRedeem) {
        if (payment.code) {
          console.log('[CHECKOUT] Canjeando código:', payment.code, 'tipo:', payment.type);
          const redeemRes = await fetch('/api/gift-codes/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: payment.code,
              userId: userId,
              visionId: registrationData.visionId,
              isCashPayment: payment.type === 'CASH_PAYMENT',
            }),
          });

          const redeemData = await redeemRes.json();
          console.log('[CHECKOUT] Respuesta redeem:', redeemData);

          if (!redeemData.success) {
            console.error(`Error redeeming code ${payment.code}:`, redeemData.error);
            // Continue with other codes even if one fails
          }
        }
      }

      // Clear session storage
      sessionStorage.removeItem('pendingRegistration');

      // Clear checkout tracking (user completed payment)
      await clearCheckoutTracking();

      // Calculate total tickets created
      const ticketsCreated = codesToRedeem.reduce((sum, p) => {
        if (p.codeType === 'PLATINUM') return sum + 3;
        return sum + 1;
      }, 0);

      // Redirect to success
      router.push(`/checkout/success?email=${encodeURIComponent(registrationData.email)}&tickets=${ticketsCreated}`);
        
    } catch (e: any) {
      console.error('Payment error:', e);
      setError(e.message || 'Error al procesar el pago');
      setProcessing(false);
    }
  };

  const goBack = () => {
    if (step === 'payment') {
      setStep('ticket');
    } else if (step === 'confirm') {
      setStep('payment');
    } else {
      router.push('/auth/signup');
    }
  };

  const goNext = () => {
    if (step === 'ticket') {
      setStep('payment');
    } else if (step === 'payment') {
      const remaining = getRemainingBalance();
      // Allow to continue if: fully paid OR will pay remaining with card (Stripe/MercadoPago) OR transfer
      if (remaining > 0 && paymentMethod !== 'STRIPE' && paymentMethod !== 'MERCADOPAGO' && paymentMethod !== 'TRANSFER') {
        setCodeError(`Falta por pagar $${remaining.toLocaleString()} MXN. Agrega más códigos o selecciona pago con tarjeta/transferencia.`);
        return;
      }
      setStep('confirm');
    }
  };

  if (loading || !registrationData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const getTotalAmount = () => {
    if (!prices) return 0;
    
    if (ticketSelection === 'FULL_VISION') {
      return prices.FULL_VISION;
    }
    
    return prices.BASIC;
  };

  const getTotalPaid = () => {
    return appliedPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ 
                backgroundColor: step === 'ticket' ? brandColor : '#1e293b',
                color: step === 'ticket' ? 'white' : '#94a3b8'
              }}
            >1</div>
            <div 
              className="w-12 h-0.5"
              style={{ backgroundColor: step !== 'ticket' ? brandColor : '#334155' }}
            ></div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ 
                backgroundColor: step === 'payment' ? brandColor : '#1e293b',
                color: step === 'payment' ? 'white' : '#94a3b8'
              }}
            >2</div>
            <div 
              className="w-12 h-0.5"
              style={{ backgroundColor: step === 'confirm' ? brandColor : '#334155' }}
            ></div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ 
                backgroundColor: step === 'confirm' ? brandColor : '#1e293b',
                color: step === 'confirm' ? 'white' : '#94a3b8'
              }}
            >3</div>
          </div>
        </div>

        {/* Welcome Banner */}
        <div 
          className="rounded-2xl p-6 mb-8 border"
          style={{ 
            backgroundColor: `${brandColor}15`,
            borderColor: `${brandColor}30`
          }}
        >
          <h1 className="text-2xl font-bold mb-2">
            ¡Hola, {registrationData.nombre.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-400">
            Ya casi terminas. Selecciona tu plan y completa el pago para unirte a{' '}}
            <span className="text-white font-semibold">{registrationData.organizationName}</span>
            {registrationData.visionName && (
              <> en la visión <span className="text-white font-semibold">{registrationData.visionName}</span></>
            )}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Ticket Selection */}
          {step === 'ticket' && (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold mb-6">Selecciona tu Ticket de Acceso</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* BASIC ONLY */}
                <button
                  onClick={() => setTicketSelection('BASIC_ONLY')}
                  className="text-left p-6 rounded-2xl border transition-all bg-slate-900/50 hover:bg-slate-900"
                  style={ticketSelection === 'BASIC_ONLY' ? { 
                    borderColor: brandColor,
                    backgroundColor: '#0f172a'
                  } : { borderColor: '#1e293b' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: ticketSelection === 'BASIC_ONLY' ? `${brandColor}20` : '#1e293b' }}
                    >
                      <Ticket 
                        size={32}
                        style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#64748b' }}
                      />
                    </div>
                    <div>
                      <h3 
                        className="font-bold text-lg"
                        style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#cbd5e1' }}
                      >
                        BÁSICO
                      </h3>
                      <p className="text-sm text-slate-500">Nivel Básico</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#64748b' }} />
                      Acceso al nivel BÁSICO completo
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#64748b' }} />
                      3 dias de entrenamiento
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#64748b' }} />
                      Acceso a mentorías grupales
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : '#64748b' }} />
                      Entrenador certificado
                    </li>
                  </ul>
                  
                  <div className="text-right">
                    <span 
                      className="text-3xl font-bold"
                      style={{ color: ticketSelection === 'BASIC_ONLY' ? brandColor : 'white' }}
                    >
                      ${prices?.BASIC.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-sm ml-1">MXN</span>
                  </div>
                </button>

                {/* FULL VISION */}
                <button
                  onClick={() => setTicketSelection('FULL_VISION')}
                  className="text-left p-6 rounded-2xl border transition-all relative overflow-hidden bg-slate-900/50 hover:bg-slate-900"
                  style={ticketSelection === 'FULL_VISION' ? { 
                    borderColor: brandColor,
                    backgroundColor: '#0f172a'
                  } : { borderColor: '#1e293b' }}
                >
                  {/* Best Value Badge */}
                  <div className="absolute top-4 right-4">
                    <span 
                      className="px-3 py-1 text-white text-xs font-bold rounded-full"
                      style={{ backgroundColor: brandColor }}
                    >
                      RECOMENDADO
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: ticketSelection === 'FULL_VISION' ? `${brandColor}20` : '#1e293b' }}
                    >
                      <Crown 
                        size={32}
                        style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#64748b' }}
                      />
                    </div>
                    <div>
                      <h3 
                        className="font-bold text-lg"
                        style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#cbd5e1' }}
                      >
                        JORNADA COMPLETA
                      </h3>
                      <p className="text-sm text-slate-500">Visión Completa</p></p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#64748b' }} />
                      Acceso a 3 niveles (BÁSICO, AVANZADO, TU VIDA)
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#64748b' }} />
                      +10 semanas de entrenamiento
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#64748b' }} />
                      Mentorías 1:1 con expertos
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle size={16} style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : '#64748b' }} />
                      Acceso a comunidad premium
                    </li>
                  </ul>
                  
                  {/* Quantum Matter License */}
                  <div 
                    className="mb-6 p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: `${brandColor}10`,
                      borderColor: `${brandColor}30`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🚀</span>
                      <span style={{ color: brandColor }} className="font-bold text-sm">INCLUYE LICENCIA EXCLUSIVA</span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      Software <span style={{ color: brandColor }} className="font-bold">Quantum Matter</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Mentoría Virtual + Seguimiento de Metas Asistido por IA
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-slate-600 text-sm line-through mr-2">
                      ${prices ? (prices.FULL_VISION + 5000).toLocaleString() : '---'}
                    </span>
                    <span 
                      className="text-3xl font-bold"
                      style={{ color: ticketSelection === 'FULL_VISION' ? brandColor : 'white' }}
                    >
                      ${prices?.FULL_VISION.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-sm ml-1">MXN</span>
                  </div>
                </button>
              </div>

              <button
                onClick={goNext}
                className="w-full mt-8 py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Continuar al Pago
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {/* Step 2: Payment Method */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold mb-6">Método de Pago</h2>
              
              {/* Payment Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-slate-400" size={20} />
                    <span className="font-bold text-white">Resumen de Pago</span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {ticketSelection === 'FULL_VISION' ? 'Jornada Completa' : 'Básico'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Precio total:</span>
                    <span className="font-bold text-white">${getTotalAmount().toLocaleString()} MXN</span>
                  </div>
                  {appliedPayments.length > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Pagos aplicados:</span>
                      <span className="font-bold text-white">-${getTotalPaid().toLocaleString()} MXN</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between">
                    <span className="text-slate-400">
                      {getRemainingBalance() > 0 ? 'Saldo pendiente:' : '✓ Pagado:'}
                    </span>
                    <span className="font-bold text-lg text-white">
                      ${getRemainingBalance().toLocaleString()} MXN
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice (Factura) Section */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-800 rounded-lg flex-shrink-0">
                      <Receipt className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-white font-medium">¿Necesitas factura?</span>
                      <p className="text-xs text-slate-500">Proporciona tus datos fiscales</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresInvoice(!requiresInvoice)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      requiresInvoice ? 'bg-white' : 'bg-slate-700'
                    }`}
                  >
                    <span 
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform shadow-md ${
                        requiresInvoice ? 'translate-x-6 bg-slate-900' : 'translate-x-0 bg-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Formulario fiscal (si requiere) */}
                {requiresInvoice && (
                  <div className="mt-4 space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Datos exactamente como aparecen en tu Constancia de Situación Fiscal
                    </p>

                    {loadingCatalogs ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* RFC */}
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">RFC *</label>
                          <input
                            type="text"
                            value={invoiceData.rfc}
                            onChange={(e) => setInvoiceData({ ...invoiceData, rfc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13) })}
                            placeholder="XAXX010101000"
                            maxLength={13}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white transition-colors font-mono uppercase"
                          />
                          <p className="text-xs text-slate-600 mt-1">{invoiceData.rfc.length}/13 caracteres</p>
                        </div>

                        {/* Razón Social */}
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Razón Social *</label>
                          <input
                            type="text"
                            value={invoiceData.name}
                            onChange={(e) => setInvoiceData({ ...invoiceData, name: e.target.value.toUpperCase() })}
                            placeholder="NOMBRE COMPLETO O EMPRESA"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white transition-colors uppercase"
                          />
                          <p className="text-xs text-slate-600 mt-1">Sin S.A. de C.V., exactamente como aparece en tu constancia</p>
                        </div>

                        {/* Código Postal */}
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Código Postal Fiscal *</label>
                          <input
                            type="text"
                            value={invoiceData.zipCode}
                            onChange={(e) => setInvoiceData({ ...invoiceData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                            placeholder="00000"
                            maxLength={5}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white transition-colors font-mono"
                          />
                        </div>

                        {/* Régimen Fiscal */}
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Régimen Fiscal *</label>
                          <select
                            value={invoiceData.regime}
                            onChange={(e) => setInvoiceData({ ...invoiceData, regime: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
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
                          <label className="block text-sm font-medium text-slate-400 mb-1">Uso de CFDI *</label>
                          <select
                            value={invoiceData.cfdiUse}
                            onChange={(e) => setInvoiceData({ ...invoiceData, cfdiUse: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-white transition-colors"
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
              </div>

              {/* Applied Payments */}
              {appliedPayments.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                  <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-white" />
                    Pagos Aplicados ({appliedPayments.length})
                  </h4>
                  <div className="space-y-2">
                    {appliedPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {payment.type === 'GIFT_CODE' || payment.type === 'CASH_PAYMENT' ? (
                            <Banknote className="text-slate-400" size={18} />
                          ) : (
                            <CreditCard className="text-slate-400" size={18} />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{payment.description}</p>
                            {payment.code && (
                              <p className="text-xs text-slate-600 font-mono">{payment.code}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">${payment.amount.toLocaleString()}</span>
                          <button
                            onClick={() => removePayment(payment.id)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Tarjeta (Stripe) */}
                <button
                  onClick={() => setPaymentMethod('STRIPE')}
                  disabled={getRemainingBalance() === 0}
                  className={`p-4 rounded-xl border transition-all relative ${
                    paymentMethod === 'STRIPE'
                      ? 'border-white bg-white/5'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  } ${getRemainingBalance() === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {getRemainingBalance() > 0 && paymentMethod === 'STRIPE' && (
                    <div className="absolute -top-2 -right-2">
                      <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded-full font-bold">
                        ${getRemainingBalance().toLocaleString()}
                      </span>
                    </div>
                  )}
                  <CreditCard className={`mx-auto mb-2 ${paymentMethod === 'STRIPE' ? 'text-white' : 'text-slate-500'}`} size={24} />
                  <span className={`text-sm font-medium ${paymentMethod === 'STRIPE' ? 'text-white' : 'text-slate-400'}`}>
                    Tarjeta
                  </span>
                </button>

                {/* Mercado Pago */}
                <button
                  onClick={() => setPaymentMethod('MERCADOPAGO')}
                  disabled={getRemainingBalance() === 0}
                  className={`p-4 rounded-xl border transition-all relative ${
                    paymentMethod === 'MERCADOPAGO'
                      ? 'border-white bg-white/5'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  } ${getRemainingBalance() === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {getRemainingBalance() > 0 && paymentMethod === 'MERCADOPAGO' && (
                    <div className="absolute -top-2 -right-2">
                      <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded-full font-bold">
                        ${getRemainingBalance().toLocaleString()}
                      </span>
                    </div>
                  )}
                  <Wallet className={`mx-auto mb-2 ${paymentMethod === 'MERCADOPAGO' ? 'text-white' : 'text-slate-500'}`} size={24} />
                  <span className={`text-sm font-medium ${paymentMethod === 'MERCADOPAGO' ? 'text-white' : 'text-slate-400'}`}>
                    Mercado Pago
                  </span>
                </button>

                {/* Código de Descuento */}
                <button
                  onClick={() => setPaymentMethod('GIFT_CODE')}
                  className={`p-4 rounded-xl border transition-all ${
                    paymentMethod === 'GIFT_CODE'
                      ? 'border-white bg-white/5'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <QrCode className={`mx-auto mb-2 ${paymentMethod === 'GIFT_CODE' ? 'text-white' : 'text-slate-500'}`} size={24} />
                  <span className={`text-sm font-medium ${paymentMethod === 'GIFT_CODE' ? 'text-white' : 'text-slate-400'}`}>
                    Código
                  </span>
                </button>
              </div>

              {/* Gift Code Input */}
              {paymentMethod === 'GIFT_CODE' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Banknote className="text-slate-400" size={20} />
                    Agregar Código de Referencia
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={giftCode}
                      onChange={(e) => {
                        setGiftCode(e.target.value.toUpperCase());
                        setCodeError('');
                        setValidatedCode(null);
                      }}
                      placeholder="CODIGO-XXXXXXXX"
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white uppercase tracking-widest font-mono text-sm focus:border-white outline-none"
                    />
                    <button
                      onClick={validateGiftCode}
                      disabled={validatingCode}
                      className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {validatingCode ? (
                        <Loader2 className="animate-spin mx-auto" size={20} />
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
                    <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="text-white animate-spin" size={24} />
                        <span className="font-bold text-white">¡Código válido! Agregando...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer Info */}
              {paymentMethod === 'TRANSFER' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Building2 className="text-slate-400" size={20} />
                    Pago por Transferencia Bancaria
                  </h3>
                  
                  {bankConfig && bankConfig.bankName ? (
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-500 text-sm mb-1">Banco</p>
                        <p className="text-white font-bold">{bankConfig.bankName}</p>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-500 text-sm mb-1">CLABE Interbancaria</p>
                        <p className="text-white font-mono font-bold tracking-wider">{bankConfig.bankAccountClabe}</p>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-500 text-sm mb-1">Beneficiario</p>
                        <p className="text-white font-bold">{bankConfig.bankAccountHolder}</p>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-500 text-sm mb-1">Monto a Transferir</p>
                        <p className="text-white font-bold text-xl">${getTotalAmount().toLocaleString()} MXN</p>
                      </div>
                      
                      {bankConfig.transferWhatsappNumber && (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                          <p className="text-slate-400 text-sm">
                            <strong className="text-white">Importante:</strong> Después de realizar la transferencia, envía tu comprobante de pago al WhatsApp <span className="text-white font-bold">{bankConfig.transferWhatsappNumber}</span> junto con tu nombre completo para activar tu cuenta.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">
                        <strong className="text-white">Nota:</strong> La organización no ha configurado datos bancarios para transferencias. Por favor, contacta al administrador o elige otro método de pago.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Card Payment Info */}
              {paymentMethod === 'STRIPE' && getRemainingBalance() > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="text-slate-400" size={20} />
                    Pagar con Tarjeta
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Pagarás <span className="text-white font-bold">${getRemainingBalance().toLocaleString()} MXN</span> con tarjeta de crédito/débito.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Serás redirigido a la pasarela de pago segura para completar tu transacción.
                  </p>
                </div>
              )}

              <button
                onClick={goNext}
                disabled={appliedPayments.length === 0 && getRemainingBalance() > 0 && paymentMethod !== 'STRIPE' && paymentMethod !== 'MERCADOPAGO' && paymentMethod !== 'TRANSFER'}
                className="w-full mt-8 py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                {getRemainingBalance() > 0 && paymentMethod === 'STRIPE' ? (
                  <>
                    Continuar al Pago con Tarjeta
                    <ArrowRight size={20} />
                  </>
                ) : getRemainingBalance() > 0 && paymentMethod === 'MERCADOPAGO' ? (
                  <>
                    Continuar al Pago con Mercado Pago
                    <ArrowRight size={20} />
                  </>
                ) : getRemainingBalance() > 0 && paymentMethod === 'TRANSFER' ? (
                  <>
                    Ver Datos de Transferencia
                    <ArrowRight size={20} />
                  </>
                ) : getRemainingBalance() > 0 ? (
                  <>Agregar forma de pago ({`$${getRemainingBalance().toLocaleString()} pendiente`})</>
                ) : (
                  <>
                    Continuar
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold mb-6">Confirma tu Compra</h2>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4">Resumen del Pedido</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      {ticketSelection === 'FULL_VISION' ? (
                        <Crown className="text-slate-400" size={24} />
                      ) : (
                        <Ticket className="text-slate-400" size={24} />
                      )}
                      <div>
                        <p className="font-bold text-white">
                          {ticketSelection === 'FULL_VISION' ? 'JORNADA COMPLETA' : 'BÁSICO'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {ticketSelection === 'FULL_VISION' 
                            ? 'Visión Completa (3 niveles)' 
                            : 'Nivel Básico'}
                        </p>
                      </div>
                    </div>
                    <span className="text-white font-bold">
                      ${ticketSelection === 'FULL_VISION' 
                        ? prices?.FULL_VISION.toLocaleString() 
                        : prices?.BASIC.toLocaleString()} MXN
                    </span>
                  </div>

                  {/* Applied Payments in Confirmation */}
                  {appliedPayments.length > 0 && (
                    <>
                      {appliedPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center pb-4 border-b border-slate-700">
                          <div className="flex items-center gap-3">
                            {payment.type === 'GIFT_CODE' || payment.type === 'CASH_PAYMENT' ? (
                              <Banknote className="text-green-400" size={24} />
                            ) : (
                              <CreditCard className="text-cyan-400" size={24} />
                            )}
                            <div>
                              <p className="font-bold text-white">{payment.description}</p>
                              {payment.code && (
                                <p className="text-sm text-slate-400 font-mono">{payment.code}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-green-400 font-bold">
                            -${payment.amount.toLocaleString()} MXN
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-white">
                      {getRemainingBalance() === 0 ? 'Total Pagado' : 'Saldo a Pagar'}
                    </span>
                    <span className={`text-2xl font-black ${getRemainingBalance() === 0 ? 'text-green-400' : 'text-cyan-400'}`}>
                      {getRemainingBalance() === 0 ? (
                        <>✓ $0 MXN</>
                      ) : (
                        <>${getRemainingBalance().toLocaleString()} MXN</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4">Datos del Participante</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Nombre:</span>
                    <p className="text-white">{registrationData.nombre}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="text-white">{registrationData.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Organización:</span>
                    <p className="text-white">{registrationData.organizationName}</p>
                  </div>
                  {registrationData.visionName && (
                    <div>
                      <span className="text-slate-500">Visión:</span>
                      <p className="text-white">{registrationData.visionName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl mb-8">
                <Shield className="text-slate-400 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-white">Compra Segura</p>
                  <p className="text-slate-500">Tu información está protegida con encriptación de nivel bancario.</p>
                </div>
              </div>

              {/* Mostrar enlace manual si la redirección automática falla */}
              {paymentUrl && (
                <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <p className="text-white font-bold mb-2">🔗 Si no fuiste redirigido automáticamente:</p>
                  <a 
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg text-center transition-all"
                  >
                    Click aquí para ir a pagar →
                  </a>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {getRemainingBalance() === 0 
                      ? 'Canjear Códigos y Registrarse' 
                      : paymentMethod === 'TRANSFER'
                        ? `Ver Datos para Transferir $${getRemainingBalance().toLocaleString()} MXN`
                        : `Pagar $${getRemainingBalance().toLocaleString()} MXN y Registrarse`}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
