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
} from 'lucide-react';

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

export default function UpgradeAdvancedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // User's current info
  const [currentVision, setCurrentVision] = useState<VisionInfo | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [prices, setPrices] = useState<PriceConfig | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('ADVANCED_ONLY');
  
  // Countdown state - hasta las 9 PM del último día del entrenamiento
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [promoExpired, setPromoExpired] = useState(false);
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/upgrade-advanced');
    }
  }, [status, router]);

  // Countdown timer - hasta las 9 PM del último día del entrenamiento básico
  useEffect(() => {
    if (!currentVision?.basicEndDate) return;

    const calculateCountdown = () => {
      const now = new Date();
      
      // Fecha límite del cronómetro: último día del entrenamiento a las 9 PM
      const endDate = new Date(currentVision.basicEndDate!);
      endDate.setHours(21, 0, 0, 0); // 9:00 PM
      
      // Fecha límite real del precio promo: 11:59 PM del último día
      const promoDeadline = new Date(currentVision.basicEndDate!);
      promoDeadline.setHours(23, 59, 59, 999);
      
      // Verificar si la promo ya expiró (después de las 11:59 PM)
      if (now > promoDeadline) {
        setPromoExpired(true);
        setCountdown(null);
        return;
      }
      
      // Calcular tiempo restante hasta las 9 PM
      const diff = endDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        // Después de las 9 PM pero antes de las 11:59 PM - mostrar 00:00:00
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [currentVision?.basicEndDate]);

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
      
      setCurrentVision(data.currentVision);
      setOrganizations(data.availableOrganizations || []);
      setPrices(data.prices);
      
      // Default to current organization
      if (data.currentVision?.organizationId) {
        setSelectedOrgId(data.currentVision.organizationId);
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
  const getPackagePrice = () => {
    if (!prices) return 0;
    switch (selectedPackage) {
      case 'ADVANCED_ONLY':
        return prices.ADVANCED; // Precio promo del avanzado solo
      case 'COMBO':
        return prices.COMBO; // Precio configurado del combo
      case 'APARTADO':
        // Apartado = paga el costo base del Avanzado
        return prices.ADVANCED_BASE;
      default:
        return prices.ADVANCED;
    }
  };

  // Calcular deuda pendiente (solo para APARTADO)
  const getPendingDebt = () => {
    if (!prices || selectedPackage !== 'APARTADO') return 0;
    // Deuda = precio promocional del PL (debe pagarse antes del inicio del Avanzado)
    return prices.PL;
  };

  const handleConfirm = async () => {
    if (!selectedOrgId || !selectedVision) {
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
      currentVisionId: currentVision?.id,
      targetOrganizationId: selectedOrgId,
      targetOrganizationName: selectedOrg?.name,
      targetVisionId: selectedVision.id,
      targetVisionName: selectedVision.nombre,
      advancedStartDate: selectedVision.startDate,
      price: getPackagePrice(),
      packageType: selectedPackage,
      pendingDebt: getPendingDebt(),
      prices: prices, // Pasar todos los precios para referencia
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

  if (error && !currentVision) {
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
            Upgrade a Avanzado
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
            ¡Es Momento de Romper Barreras!
          </h2>
          <p className="text-slate-400 max-w-md mx-auto">
            El entrenamiento Avanzado te llevará más profundo. Confirma tu sede y prepárate para transformarte.
          </p>
        </motion.div>

        {/* Confirmation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mb-6"
        >
          {/* Current Enrollment Info */}
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
              Tu Información Actual
            </h3>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Check className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  Básico Completado en {currentVision?.organizationName}
                </p>
                <p className="text-sm text-slate-400">
                  {currentVision?.nombre}
                </p>
              </div>
            </div>
          </div>

          {/* Sede Selection */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Sede para Avanzado
            </h3>
            
            {/* Selected Organization */}
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

            {/* Organization Options */}
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

            {/* Same Sede Notice */}
            {selectedOrgId === currentVision?.organizationId && (
              <p className="text-sm text-green-400 mt-3 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Continuarás en la misma sede donde hiciste tu Básico
              </p>
            )}
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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

        {/* Package Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Selecciona tu Paquete
          </h3>

          {/* Countdown Timer */}
          {!promoExpired && countdown && (
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/30 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-bold">🔥 PRECIO ESPECIAL - Termina en:</span>
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
            </div>
          )}

          <div className="space-y-3">
            {/* Opción 1: Solo Avanzado */}
            <button
              onClick={() => setSelectedPackage('ADVANCED_ONLY')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedPackage === 'ADVANCED_ONLY'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${selectedPackage === 'ADVANCED_ONLY' ? 'bg-purple-500/20' : 'bg-slate-700'}`}>
                    <Rocket className={`w-5 h-5 ${selectedPackage === 'ADVANCED_ONLY' ? 'text-purple-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Solo Avanzado</p>
                    <p className="text-sm text-slate-400">Entrenamiento Avanzado completo</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">${(prices?.ADVANCED || 7500).toLocaleString()}</p>
                  {!promoExpired && prices?.ADVANCED_BASE && prices.ADVANCED_BASE > (prices?.ADVANCED || 0) && (
                    <p className="text-sm text-slate-500 line-through">${prices.ADVANCED_BASE.toLocaleString()}</p>
                  )}
                </div>
              </div>
              {selectedPackage === 'ADVANCED_ONLY' && (
                <div className="mt-2 pt-2 border-t border-purple-500/30">
                  <p className="text-xs text-emerald-400">✓ Pago único • Acceso inmediato</p>
                </div>
              )}
            </button>

            {/* Opción 2: Combo Avanzado + PL */}
            <button
              onClick={() => setSelectedPackage('COMBO')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                selectedPackage === 'COMBO'
                  ? 'border-amber-500 bg-gradient-to-r from-amber-900/30 to-purple-900/20'
                  : 'border-slate-700 hover:border-amber-500/50 bg-slate-800/30'
              }`}
            >
              {/* Badge Recomendado */}
              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                ⭐ RECOMENDADO
              </div>
              <div className="flex items-start justify-between pt-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${selectedPackage === 'COMBO' ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                    <Crown className={`w-5 h-5 ${selectedPackage === 'COMBO' ? 'text-amber-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Combo Avanzado + PL</p>
                    <p className="text-sm text-slate-400">Visión completa: Avanzado + Participación Libre</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-amber-400">${(prices?.COMBO || 14500).toLocaleString()}</p>
                  {prices?.ADVANCED_BASE && prices?.PL_BASE && (
                    <p className="text-sm text-slate-500 line-through">${(prices.ADVANCED_BASE + prices.PL_BASE).toLocaleString()}</p>
                  )}
                </div>
              </div>
              {selectedPackage === 'COMBO' && (
                <div className="mt-3 pt-2 border-t border-amber-500/30 space-y-1">
                  <p className="text-xs text-emerald-400">✓ Incluye Avanzado (${(prices?.ADVANCED || 7500).toLocaleString()}) + PL (${(prices?.PL || 7000).toLocaleString()})</p>
                  <p className="text-xs text-amber-400">✓ Mejor precio garantizado • Sin preocupaciones</p>
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
                    <Zap className={`w-5 h-5 ${selectedPackage === 'APARTADO' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Aparta tu lugar con este precio</p>
                    <p className="text-sm text-slate-400">Paga el Avanzado hoy y el PL promocional antes del inicio</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-cyan-400">${(prices?.ADVANCED_BASE || 9000).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Pagas hoy</p>
                </div>
              </div>
              {selectedPackage === 'APARTADO' && (
                <div className="mt-3 pt-2 border-t border-cyan-500/30 space-y-1">
                  <p className="text-xs text-emerald-400">✓ Pagas hoy: Avanzado ${(prices?.ADVANCED_BASE || 9000).toLocaleString()} MXN</p>
                  <p className="text-xs text-orange-400">⚠️ Pendiente: PL ${(prices?.PL || 5500).toLocaleString()} MXN (antes del inicio del Avanzado)</p>
                  <p className="text-xs text-cyan-400">✓ Precio promocional del PL asegurado</p>
                </div>
              )}
            </button>
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
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedVision}
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
