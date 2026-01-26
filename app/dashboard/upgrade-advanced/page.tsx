'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  Star,
  Sparkles,
  Shield,
  AlertCircle,
  Timer,
  Package,
  Crown,
  Zap,
  CreditCard,
} from 'lucide-react';

// Tipo de panorama del usuario
type UserPanorama = 'BASICO_EN_CURSO' | 'BASICO_COMPLETADO' | 'AVANZADO_EN_CURSO' | 'YA_INSCRITO_PL' | 'NO_INSCRITO';

interface VisionInfo {
  id: number;
  nombre: string;
  organizationId: number;
  organizationName: string;
  advancedStartDate: string | null;
  advancedEndDate: string | null;
  basicEndDate: string | null;
  basicStartDate: string | null;
}

interface OrganizationOption {
  id: number;
  name: string;
  logoUrl: string | null;
  nextAdvancedVision: {
    id: number;
    nombre: string;
    startDate: string;
    endDate: string;
    availableSpots: number;
  } | null;
}

interface NextPLVision {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

interface PriceConfig {
  ADVANCED: number;      // Precio promo avanzado
  ADVANCED_BASE: number; // Precio base avanzado
  PL: number;            // Precio promo PL
  PL_BASE: number;       // Precio base PL
  COMBO: number;         // Precio promo combo
  COMBO_BASE: number;    // Precio base combo
  APARTADO_SALDO: number; // Crédito a favor si pagó apartado
}

// Opciones de paquete según el panorama
type PackageType = 
  | 'ADVANCED_PROMO'      // Panorama 1: Solo avanzado precio promo
  | 'ADVANCED_BASE'       // Panorama 2: Solo avanzado precio base
  | 'COMBO_BASE'          // Panorama 1 y 2: Combo precio base
  | 'APARTADO'            // Panorama 1: Apartado (paga promo avanzado + deuda promo PL)
  | 'PL_BASE'             // Panorama 3: PL precio base
  | 'PL_CON_CREDITO';     // Panorama 3: PL con crédito de apartado

export default function UpgradeAdvancedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Estado del usuario
  const [panorama, setPanorama] = useState<UserPanorama | null>(null);
  const [currentVision, setCurrentVision] = useState<VisionInfo | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [prices, setPrices] = useState<PriceConfig | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [nextPLVision, setNextPLVision] = useState<NextPLVision | null>(null);
  const [hasApartadoCredit, setHasApartadoCredit] = useState(false);
  const [promoDeadline, setPromoDeadline] = useState<string | null>(null);
  
  // Countdown state
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [promoExpired, setPromoExpired] = useState(false);
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/upgrade-advanced');
    }
  }, [status, router]);

  // Countdown timer - la promo es válida hasta el inicio del Avanzado
  useEffect(() => {
    if (!promoDeadline) return;

    const calculateCountdown = () => {
      const now = new Date();
      const deadline = new Date(promoDeadline);
      
      if (now >= deadline) {
        setPromoExpired(true);
        setCountdown(null);
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
  }, [promoDeadline]);

  // Fetch user's current vision and available organizations
  useEffect(() => {
    if (session?.user?.id) {
      fetchUpgradeInfo();
    }
  }, [session]);

  const fetchUpgradeInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/me/upgrade-advanced-info');
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error || 'Error al cargar información');
        return;
      }
      
      setPanorama(data.panorama);
      setCurrentVision(data.currentVision);
      setOrganizations(data.availableOrganizations || []);
      setPrices(data.prices);
      setNextPLVision(data.nextPLVision);
      setHasApartadoCredit(data.hasApartadoCredit || false);
      setPromoDeadline(data.promoDeadline);
      
      // Default to current organization
      if (data.currentVision?.organizationId) {
        setSelectedOrgId(data.currentVision.organizationId);
      }

      // Selección default según el panorama
      if (data.panorama === 'BASICO_EN_CURSO') {
        setSelectedPackage('COMBO_BASE'); // Recomendado
      } else if (data.panorama === 'BASICO_COMPLETADO') {
        setSelectedPackage('COMBO_BASE'); // Recomendado
      } else if (data.panorama === 'AVANZADO_EN_CURSO') {
        setSelectedPackage(data.hasApartadoCredit ? 'PL_CON_CREDITO' : 'PL_BASE');
      }
    } catch (err) {
      console.error('Error fetching upgrade info:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);
  const selectedVision = selectedOrg?.nextAdvancedVision;

  // Calcular precio según el paquete seleccionado
  const getPackagePrice = (): number => {
    if (!prices) return 0;
    
    switch (selectedPackage) {
      case 'ADVANCED_PROMO':
        return prices.ADVANCED;
      case 'ADVANCED_BASE':
        return prices.ADVANCED_BASE;
      case 'COMBO_BASE':
        return prices.COMBO_BASE;
      case 'APARTADO':
        // Apartado: Hoy paga Combo promo ($9,000)
        return prices.COMBO;
      case 'PL_BASE':
        // Durante avanzado: usar precio promo ($9,000)
        return prices.PL;
      case 'PL_CON_CREDITO':
        // Con crédito: precio promo - saldo a favor
        return Math.max(0, prices.PL - prices.APARTADO_SALDO);
      default:
        return 0;
    }
  };

  // Deuda pendiente (solo aplica para APARTADO)
  const getPendingDebt = (): number => {
    if (!prices || selectedPackage !== 'APARTADO') return 0;
    return prices.PL; // Debe pagar el promo de PL antes del inicio de avanzado
  };

  const handleConfirm = async () => {
    if (!selectedPackage || !prices) {
      setError('Selecciona una opción de pago');
      return;
    }

    // Para panoramas 1 y 2, necesitan seleccionar una visión de avanzado
    if ((panorama === 'BASICO_EN_CURSO' || panorama === 'BASICO_COMPLETADO') && !selectedVision) {
      setError('Selecciona una sede con evento disponible');
      return;
    }

    setSubmitting(true);
    
    // Store upgrade data in sessionStorage for checkout
    const upgradeData = {
      type: 'UPGRADE_ADVANCED',
      userId: session?.user?.id,
      userName: session?.user?.name,
      userEmail: session?.user?.email,
      panorama: panorama,
      currentVisionId: currentVision?.id,
      targetOrganizationId: selectedOrgId,
      targetOrganizationName: selectedOrg?.name,
      targetVisionId: selectedVision?.id || nextPLVision?.id,
      targetVisionName: selectedVision?.nombre || nextPLVision?.name,
      startDate: selectedVision?.startDate || nextPLVision?.startDate,
      price: getPackagePrice(),
      packageType: selectedPackage,
      pendingDebt: getPendingDebt(),
      prices: prices,
      hasApartadoCredit: hasApartadoCredit,
    };
    
    sessionStorage.setItem('pendingUpgrade', JSON.stringify(upgradeData));
    
    // Redirect to checkout
    router.push('/dashboard/checkout-advanced');
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return price.toLocaleString('es-MX');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error && !currentVision && panorama !== 'YA_INSCRITO_PL') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-red-500/30 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de "Ya inscrito en PL"
  if (panorama === 'YA_INSCRITO_PL') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-yellow-500/30 text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">¡Ya estás inscrito en PL!</h2>
          <p className="text-slate-400 mb-6">
            Ya cuentas con inscripción completa en el nivel de TU VIDA.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ====================
  // PANORAMA 3: AVANZADO EN CURSO
  // ====================
  if (panorama === 'AVANZADO_EN_CURSO') {
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
              Inscripción a PL
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
            <h2 className="text-3xl font-bold text-white mb-2">
              Programa de Liderato
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Estás cursando el nivel Avanzado. Continúa tu formación completa con PL.
            </p>
          </motion.div>

          {/* Next PL Vision Info - Oculto para no mostrar fecha antes del pago */}
          {/* La información del PL se mostrará después de completar la inscripción */}

          {/* Crédito de Apartado si existe */}
          {hasApartadoCredit && prices && prices.APARTADO_SALDO > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-r from-emerald-900/40 to-green-900/30 border border-emerald-500/40 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-300">¡Tienes un saldo a favor!</p>
                    <p className="text-sm text-slate-400">
                      Por tu pago de apartado anterior
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-400">
                  ${formatPrice(prices.APARTADO_SALDO)}
                </span>
              </div>
            </motion.div>
          )}

          {/* PL Option Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedPackage === 'PL_BASE' || selectedPackage === 'PL_CON_CREDITO'
                ? 'border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-amber-900/20'
                : 'border-slate-700 bg-slate-800/30 hover:border-yellow-500/50'
            }`}
            onClick={() => setSelectedPackage(hasApartadoCredit ? 'PL_CON_CREDITO' : 'PL_BASE')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-yellow-500/30 to-amber-500/20 rounded-xl">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">TU VIDA</h3>
                  <p className="text-sm text-slate-400">El nivel más alto de formación</p>
                </div>
              </div>
              {(selectedPackage === 'PL_BASE' || selectedPackage === 'PL_CON_CREDITO') && (
                <Check className="w-6 h-6 text-yellow-400" />
              )}
            </div>

            <div className="border-t border-slate-700 pt-4">
              {hasApartadoCredit && prices && prices.APARTADO_SALDO > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Precio base:</span>
                    <span className="line-through">${formatPrice(prices.PL_BASE)}</span>
                  </div>
                  <div className="flex justify-between text-yellow-400 font-semibold">
                    <span>🔥 Precio promo:</span>
                    <span>${formatPrice(prices.PL)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>✨ Tu saldo a favor:</span>
                    <span>-${formatPrice(prices.APARTADO_SALDO)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white text-xl font-bold pt-3 mt-2 border-t border-slate-600">
                    <span>Disponible por solo:</span>
                    <span className="text-2xl text-yellow-400">${formatPrice(Math.max(0, prices.PL - prices.APARTADO_SALDO))}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Precio base:</span>
                    <span className="line-through">${formatPrice(prices?.PL_BASE || 11000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 font-semibold">🔥 Precio promo:</span>
                    <span className="text-3xl font-black text-yellow-400">${formatPrice(prices?.PL || 9000)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quantum AI Highlight */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 p-4 bg-gradient-to-r from-purple-600/20 via-cyan-500/20 to-blue-600/20 border border-purple-500/40 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white flex items-center gap-2">
                    Incluye acceso a Quantum AI
                    <span className="px-2 py-0.5 bg-purple-500/30 rounded text-[10px] text-purple-300 font-bold">EXCLUSIVO</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Mentoría asistida por Inteligencia Artificial para acelerar tu crecimiento
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                '8 sesiones intensivas',
                'Entrenadores Certificados',
                'Comunidad exclusiva',
                'Mentoría personalizada',
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col gap-3"
          >
            <button
              onClick={handleConfirm}
              disabled={submitting || !selectedPackage}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Continuar al Pago
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ====================
  // PANORAMA 1 y 2: BÁSICO EN CURSO / BÁSICO COMPLETADO
  // ====================
  const isBasicoEnCurso = panorama === 'BASICO_EN_CURSO';
  const showPromoOptions = isBasicoEnCurso && !promoExpired;

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
            <Rocket className="w-5 h-5 text-purple-500" />
            {isBasicoEnCurso ? 'Continúa tu Formación' : 'Upgrade a Avanzado'}
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl mb-4">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {isBasicoEnCurso 
              ? '¡Es Momento de Romper Barreras!' 
              : '¡Felicidades por completar el Básico!'}
          </h2>
          <p className="text-slate-400 max-w-md mx-auto">
            {isBasicoEnCurso 
              ? 'Estás cursando el nivel Básico. Elige cómo quieres continuar tu formación.'
              : 'Es momento de continuar con tu formación en el nivel Avanzado.'}
          </p>
        </motion.div>

        {/* Current Vision Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mb-6"
        >
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Check className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {isBasicoEnCurso ? 'Cursando Básico' : 'Básico Completado'} en {currentVision?.organizationName}
                </p>
                <p className="text-sm text-slate-400">
                  {currentVision?.nombre}
                </p>
              </div>
            </div>
          </div>

          {/* Sede Selection */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Sede para Avanzado
            </h3>
            
            <button
              onClick={() => setShowOrgSelector(!showOrgSelector)}
              className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">
                    {selectedOrg?.name || 'Selecciona una sede'}
                  </p>
                  {selectedVision && (
                    <p className="text-sm text-slate-400">
                      {formatDate(selectedVision.startDate)}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showOrgSelector ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showOrgSelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setSelectedOrgId(org.id);
                        setShowOrgSelector(false);
                      }}
                      disabled={!org.nextAdvancedVision}
                      className={`w-full p-4 rounded-xl border transition-all text-left ${
                        selectedOrgId === org.id
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : org.nextAdvancedVision
                          ? 'bg-slate-800/30 border-slate-700 hover:border-purple-500/30'
                          : 'bg-slate-800/20 border-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{org.name}</p>
                          {org.nextAdvancedVision ? (
                            <p className="text-sm text-slate-400">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {formatDate(org.nextAdvancedVision.startDate)}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500">Sin evento programado</p>
                          )}
                        </div>
                        {selectedOrgId === org.id && (
                          <Check className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Countdown Timer - Solo para promo */}
        {showPromoOptions && countdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-amber-900/40 to-orange-900/30 border border-amber-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-bold">🔥 PRECIOS PROMOCIONALES - Válido hasta:</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                {countdown.days > 0 && (
                  <>
                    <span className="bg-amber-500/20 px-2 py-1 rounded text-white font-bold">{countdown.days.toString().padStart(2, '0')}d</span>
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
          </motion.div>
        )}

        {/* Package Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Selecciona tu Opción
          </h3>

          <div className="space-y-3">
            {/* ====================
                PANORAMA 1: BÁSICO EN CURSO - 3 opciones
                ==================== */}
            {isBasicoEnCurso && (
              <>
                {/* Opción 1: Precio Promocional Avanzado */}
                <button
                  onClick={() => setSelectedPackage('ADVANCED_PROMO')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPackage === 'ADVANCED_PROMO'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage === 'ADVANCED_PROMO' ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                        <Zap className={`w-5 h-5 ${selectedPackage === 'ADVANCED_PROMO' ? 'text-purple-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Solo Avanzado</p>
                        <p className="text-sm text-slate-400">Precio Promocional</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-purple-400">${formatPrice(prices?.ADVANCED || 7500)}</p>
                      <p className="text-sm text-slate-500 line-through">${formatPrice(prices?.ADVANCED_BASE || 9000)}</p>
                    </div>
                  </div>
                  {selectedPackage === 'ADVANCED_PROMO' && (
                    <div className="mt-3 pt-2 border-t border-purple-500/30">
                      <p className="text-xs text-emerald-400">✓ Precio especial por estar cursando Básico</p>
                      <p className="text-xs text-slate-400 mt-1">Solo nivel Avanzado • Pago único</p>
                    </div>
                  )}
                </button>

                {/* Opción 2: Combo Avanzado + PL - Precio Base */}
                <button
                  onClick={() => setSelectedPackage('COMBO_BASE')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                    selectedPackage === 'COMBO_BASE'
                      ? 'border-amber-500 bg-gradient-to-r from-amber-900/30 to-purple-900/20'
                      : 'border-slate-700 hover:border-amber-500/50 bg-slate-800/30'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    ⭐ MEJOR VALOR
                  </div>
                  <div className="flex items-start justify-between pt-2">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage === 'COMBO_BASE' ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                        <Crown className={`w-5 h-5 ${selectedPackage === 'COMBO_BASE' ? 'text-amber-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Combo Avanzado + PL</p>
                        <p className="text-sm text-slate-400">Formación Completa</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-400">${formatPrice(prices?.COMBO_BASE || 14500)}</p>
                      <p className="text-sm text-emerald-400">
                        Ahorras ${formatPrice((prices?.ADVANCED_BASE || 9000) + (prices?.PL_BASE || 11000) - (prices?.COMBO_BASE || 14500))}
                      </p>
                    </div>
                  </div>
                  {selectedPackage === 'COMBO_BASE' && (
                    <div className="mt-3 pt-2 border-t border-amber-500/30 space-y-1">
                      <p className="text-xs text-emerald-400">✓ Avanzado + TU VIDA incluidos</p>
                      <p className="text-xs text-amber-400">✓ Certificación completa • Acceso prioritario</p>
                    </div>
                  )}
                </button>

                {/* Opción 3: Apartado */}
                <button
                  onClick={() => setSelectedPackage('APARTADO')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPackage === 'APARTADO'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 hover:border-cyan-500/50 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage === 'APARTADO' ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
                        <Sparkles className={`w-5 h-5 ${selectedPackage === 'APARTADO' ? 'text-cyan-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Apartado</p>
                        <p className="text-sm text-slate-400">Paga en 2 partes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Apartado: Hoy = Combo promo, Después = PL promo */}
                      <p className="text-lg font-bold text-cyan-400">Hoy: ${formatPrice(prices?.COMBO || 9000)}</p>
                      <p className="text-sm text-slate-400">Después: ${formatPrice(prices?.PL || 5500)}</p>
                    </div>
                  </div>
                  {selectedPackage === 'APARTADO' && (
                    <div className="mt-3 pt-2 border-t border-cyan-500/30 space-y-1">
                      <p className="text-xs text-cyan-400">✓ Hoy pagas Combo promo (${formatPrice(prices?.COMBO || 9000)})</p>
                      <p className="text-xs text-slate-400">✓ Antes del inicio pagas TU VIDA promo (${formatPrice(prices?.PL || 5500)})</p>
                      <p className="text-xs text-emerald-400">✓ Total: ${formatPrice((prices?.COMBO || 9000) + (prices?.PL || 5500))} - ¡Precio de Combo Base asegurado!</p>
                    </div>
                  )}
                </button>
              </>
            )}

            {/* ====================
                PANORAMA 2: BÁSICO COMPLETADO - 2 opciones
                ==================== */}
            {panorama === 'BASICO_COMPLETADO' && (
              <>
                {/* Opción 1: Solo Avanzado - Precio Base */}
                <button
                  onClick={() => setSelectedPackage('ADVANCED_BASE')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPackage === 'ADVANCED_BASE'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage === 'ADVANCED_BASE' ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                        <Rocket className={`w-5 h-5 ${selectedPackage === 'ADVANCED_BASE' ? 'text-purple-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Solo Avanzado</p>
                        <p className="text-sm text-slate-400">Precio Base</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-purple-400">${formatPrice(prices?.ADVANCED_BASE || 9000)}</p>
                    </div>
                  </div>
                  {selectedPackage === 'ADVANCED_BASE' && (
                    <div className="mt-3 pt-2 border-t border-purple-500/30">
                      <p className="text-xs text-emerald-400">✓ Acceso al nivel Avanzado</p>
                      <p className="text-xs text-slate-400">✓ Formación intensiva</p>
                    </div>
                  )}
                </button>

                {/* Opción 2: Combo - Precio Base */}
                <button
                  onClick={() => setSelectedPackage('COMBO_BASE')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                    selectedPackage === 'COMBO_BASE'
                      ? 'border-amber-500 bg-gradient-to-r from-amber-900/30 to-purple-900/20'
                      : 'border-slate-700 hover:border-amber-500/50 bg-slate-800/30'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    ⭐ RECOMENDADO
                  </div>
                  <div className="flex items-start justify-between pt-2">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selectedPackage === 'COMBO_BASE' ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                        <Crown className={`w-5 h-5 ${selectedPackage === 'COMBO_BASE' ? 'text-amber-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Combo Avanzado + PL</p>
                        <p className="text-sm text-slate-400">Formación Completa</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-400">${formatPrice(prices?.COMBO_BASE || 14500)}</p>
                      <p className="text-sm text-emerald-400">
                        Ahorras ${formatPrice((prices?.ADVANCED_BASE || 9000) + (prices?.PL_BASE || 11000) - (prices?.COMBO_BASE || 14500))}
                      </p>
                    </div>
                  </div>
                  {selectedPackage === 'COMBO_BASE' && (
                    <div className="mt-3 pt-2 border-t border-amber-500/30 space-y-1">
                      <p className="text-xs text-emerald-400">✓ Avanzado + TU VIDA</p>
                      <p className="text-xs text-amber-400">✓ Válido hasta el inicio del Avanzado</p>
                    </div>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-500/20 rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Lo que te espera en Avanzado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Star, text: 'Introspección profunda' },
              { icon: Shield, text: 'Trabajo en relaciones familiares' },
              { icon: Rocket, text: 'Liberación de bloqueos emocionales' },
              { icon: Sparkles, text: 'Conexión con tu propósito de vida' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <item.icon className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedVision || !selectedPackage}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Confirmar y Continuar al Pago
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </motion.div>
      </div>
    </div>
  );
}
