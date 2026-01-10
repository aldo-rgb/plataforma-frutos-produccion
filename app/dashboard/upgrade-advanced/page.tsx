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
} from 'lucide-react';

interface VisionInfo {
  id: number;
  nombre: string;
  organizationId: number;
  organizationName: string;
  advancedStartDate: string | null;
  advancedEndDate: string | null;
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
}

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
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/upgrade-advanced');
    }
  }, [status, router]);

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
      price: prices?.ADVANCED || 4500,
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
                              <span className="ml-2 text-purple-400">
                                ({org.nextAdvancedVision.availableSpots} lugares)
                              </span>
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
              { icon: Star, text: 'Introspección profunda y sanación' },
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

        {/* Price Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Inversión</p>
              <p className="text-3xl font-bold text-white">
                ${(prices?.ADVANCED || 4500).toLocaleString()} <span className="text-lg text-slate-400">MXN</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Fin de semana completo</p>
              <p className="text-xs text-purple-400">Incluye materiales y alimentación</p>
            </div>
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
