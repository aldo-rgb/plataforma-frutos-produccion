'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Shield,
  ExternalLink,
  Info,
  Zap,
  HelpCircle,
  X,
  Building2,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PaymentConfig {
  id?: number;
  provider: 'MERCADOPAGO' | 'STRIPE' | '';
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
}

// Configuración por proveedor (nuevo - soporta múltiples)
interface ProviderConfigs {
  MERCADOPAGO: PaymentConfig;
  STRIPE: PaymentConfig;
}

const DEFAULT_CONFIG: PaymentConfig = {
  provider: '',
  publicKey: '',
  secretKey: '',
  webhookSecret: '',
  isActive: true,
};

const DEFAULT_PROVIDER_CONFIGS: ProviderConfigs = {
  MERCADOPAGO: { ...DEFAULT_CONFIG, provider: 'MERCADOPAGO' },
  STRIPE: { ...DEFAULT_CONFIG, provider: 'STRIPE' },
};

const PROVIDERS = [
  {
    id: 'MERCADOPAGO',
    name: 'Mercado Pago',
    logo: '/images/mercadopago-logo.png',
    color: 'bg-blue-500',
    description: 'Ideal para México y Latinoamérica',
    docsUrl: 'https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integration-configuration/integrate-with-pix',
    fields: {
      publicKey: 'Public Key',
      secretKey: 'Access Token',
      webhookSecret: 'Webhook Secret (Opcional)',
    },
  },
  {
    id: 'STRIPE',
    name: 'Stripe',
    logo: '/images/stripe-logo.png',
    color: 'bg-purple-500',
    description: 'Aceptado mundialmente, fácil integración',
    docsUrl: 'https://stripe.com/docs/keys',
    fields: {
      publicKey: 'Publishable Key (pk_...)',
      secretKey: 'Secret Key (sk_...)',
      webhookSecret: 'Webhook Signing Secret (whsec_...)',
    },
  },
];

interface BankConfig {
  bankName: string;
  bankAccountClabe: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  transferWhatsappNumber: string;
}

export default function PaymentGatewayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Ahora guarda el provider que está guardando
  const [savingBank, setSavingBank] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null); // Ahora guarda el provider que está eliminando
  const [organizationName, setOrganizationName] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Nuevo: Configuraciones por proveedor (soporta múltiples)
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>(DEFAULT_PROVIDER_CONFIGS);
  // Proveedor actualmente siendo editado/expandido
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: '',
    bankAccountClabe: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    transferWhatsappNumber: '',
  });

  const [showSecretKey, setShowSecretKey] = useState<Record<string, boolean>>({});
  const [showWebhookSecret, setShowWebhookSecret] = useState<Record<string, boolean>>({});
  const [testingPayment, setTestingPayment] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Helper para verificar si un proveedor tiene configuración existente
  const hasExistingConfig = (provider: string) => {
    const cfg = providerConfigs[provider as keyof ProviderConfigs];
    return cfg?.id !== undefined;
  };

  // Helper para contar proveedores configurados
  const configuredProvidersCount = Object.values(providerConfigs).filter(c => c.id !== undefined).length;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchConfig();
    }
  }, [status, session]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/school-admin/payment-gateway', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();

      if (data.success) {
        setOrganizationName(data.organizationName);
        
        // Cargar todas las configuraciones de proveedores
        if (data.configs && Array.isArray(data.configs)) {
          const newProviderConfigs = { ...DEFAULT_PROVIDER_CONFIGS };
          data.configs.forEach((cfg: any) => {
            if (cfg.provider && newProviderConfigs[cfg.provider as keyof ProviderConfigs]) {
              newProviderConfigs[cfg.provider as keyof ProviderConfigs] = {
                id: cfg.id,
                provider: cfg.provider,
                publicKey: cfg.publicKey || '',
                secretKey: cfg.secretKey || '',
                webhookSecret: cfg.webhookSecret || '',
                isActive: cfg.isActive,
              };
            }
          });
          setProviderConfigs(newProviderConfigs);
        }
        
        // Cargar configuración bancaria
        if (data.bankConfig) {
          setBankConfig({
            bankName: data.bankConfig.bankName || '',
            bankAccountClabe: data.bankConfig.bankAccountClabe || '',
            bankAccountHolder: data.bankConfig.bankAccountHolder || '',
            bankAccountNumber: data.bankConfig.bankAccountNumber || '',
            transferWhatsappNumber: data.bankConfig.transferWhatsappNumber || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      showNotification('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankConfig = async () => {
    if (!bankConfig.bankName || !bankConfig.bankAccountClabe || !bankConfig.bankAccountHolder) {
      showNotification('error', 'Banco, CLABE y Beneficiario son requeridos');
      return;
    }

    setSavingBank(true);
    try {
      const res = await fetch('/api/school-admin/payment-gateway/bank-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankConfig),
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', data.message);
        if (data.bankConfig) {
          setBankConfig(data.bankConfig);
        }
      } else {
        showNotification('error', data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving bank config:', error);
      showNotification('error', 'Error al guardar la configuración bancaria');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSave = async (providerId: string) => {
    const config = providerConfigs[providerId as keyof ProviderConfigs];
    
    if (!config.publicKey && !config.secretKey) {
      showNotification('error', 'Proporciona al menos una credencial');
      return;
    }

    setSaving(providerId);
    try {
      // Log para debug
      console.log('🔵 [pasarela-frontend] Enviando config:', {
        provider: providerId,
        publicKeyLength: config.publicKey?.length,
        secretKeyLength: config.secretKey?.length,
        secretKeyContainsAsterisk: config.secretKey?.includes('*'),
        isActive: config.isActive,
      });
      
      const res = await fetch('/api/school-admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          publicKey: config.publicKey,
          secretKey: config.secretKey,
          webhookSecret: config.webhookSecret,
          isActive: config.isActive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', `${providerId} configurado correctamente`);
        // Actualizar estado con valores del servidor (enmascarados para secretos)
        if (data.config) {
          setProviderConfigs(prev => ({
            ...prev,
            [providerId]: {
              id: data.config.id,
              provider: data.config.provider,
              publicKey: data.config.publicKey || '',
              secretKey: data.config.secretKey || '', // Será el valor enmascarado
              webhookSecret: data.config.webhookSecret || '',
              isActive: data.config.isActive,
            },
          }));
        }
      } else {
        showNotification('error', data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('error', 'Error al guardar la configuración');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (providerId: string) => {
    const providerName = PROVIDERS.find(p => p.id === providerId)?.name || providerId;
    if (!confirm(`¿Estás seguro de eliminar la configuración de ${providerName}?`)) {
      return;
    }

    setDeleting(providerId);
    try {
      const res = await fetch(`/api/school-admin/payment-gateway?provider=${providerId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', `Configuración de ${providerName} eliminada`);
        setProviderConfigs(prev => ({
          ...prev,
          [providerId]: { ...DEFAULT_CONFIG, provider: providerId as any },
        }));
        setExpandedProvider(null);
      } else {
        showNotification('error', data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      showNotification('error', 'Error al eliminar la configuración');
    } finally {
      setDeleting(null);
    }
  };

  const handleTestPayment = async (providerId: string) => {
    if (!hasExistingConfig(providerId)) {
      showNotification('error', 'Primero guarda la configuración del proveedor');
      return;
    }

    setTestingPayment(providerId);
    try {
      const res = await fetch('/api/school-admin/payment-gateway/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        // Abrir el link de pago en nueva pestaña
        window.open(data.paymentUrl, '_blank');
        showNotification('success', `Link de pago de $${data.amount} MXN abierto en nueva pestaña`);
      } else {
        showNotification('error', data.error || 'Error al crear pago de prueba');
      }
    } catch (error) {
      console.error('Error creating test payment:', error);
      showNotification('error', 'Error al crear pago de prueba');
    } finally {
      setTestingPayment(null);
    }
  };

  // Helper para actualizar config de un proveedor específico
  const updateProviderConfig = (providerId: string, updates: Partial<PaymentConfig>) => {
    setProviderConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId as keyof ProviderConfigs], ...updates },
    }));
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Cómo configurar Mercado Pago
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Paso 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Accede al Panel de Desarrolladores
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        Inicia sesión en tu cuenta de Mercado Pago y ve al panel de desarrolladores.
                      </p>
                      <a
                        href="https://www.mercadopago.com.mx/developers/panel/app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ir a Mercado Pago Developers
                      </a>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Crea o selecciona tu aplicación
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Si no tienes una aplicación, haz clic en "Crear aplicación". 
                        Selecciona "Pagos online" → "CheckoutPro".
                      </p>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Copia las credenciales de PRODUCCIÓN
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        En tu aplicación, ve a <strong>"Credenciales"</strong> y selecciona la pestaña <strong>"Productivas"</strong>.
                      </p>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                        <p className="text-sm">
                          <strong>Public Key:</strong> Copia la "Public Key" y pégala aquí
                        </p>
                        <p className="text-sm">
                          <strong>Access Token:</strong> Copia el "Access Token" y pégalo en el campo correspondiente
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Paso 4 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Guarda y prueba
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Haz clic en "Guardar configuración" y luego usa el botón "Probar $10" 
                        para verificar que todo funciona correctamente.
                      </p>
                    </div>
                  </div>

                  {/* Nota importante */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1">
                          Importante
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          Usa las credenciales de <strong>Producción</strong> (no las de Prueba) para recibir pagos reales. 
                          Los pagos irán directamente a tu cuenta de Mercado Pago.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/school-admin"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pasarela de Pagos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configura cómo tu organización recibe pagos con tarjeta
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Ayuda
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                ¿Cómo funciona?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Puedes configurar <strong>múltiples pasarelas de pago</strong>. Cuando tus alumnos paguen inscripciones o tickets, 
                podrán elegir entre las opciones que hayas habilitado. El dinero irá directamente a tu cuenta de cada pasarela.
              </p>
              {configuredProvidersCount > 0 && (
                <p className="text-sm text-blue-800 dark:text-blue-400 mt-2">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Tienes <strong>{configuredProvidersCount}</strong> pasarela(s) configurada(s).
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Provider Cards - Ahora soporta múltiples */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pasarelas de Pago
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Haz clic en una pasarela para configurarla. Puedes tener varias activas al mismo tiempo.
          </p>
          
          <div className="space-y-4">
            {PROVIDERS.map((provider) => {
              const config = providerConfigs[provider.id as keyof ProviderConfigs];
              const isConfigured = config?.id !== undefined;
              const isExpanded = expandedProvider === provider.id;
              const isActive = config?.isActive && isConfigured;

              return (
                <div key={provider.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Provider Header - Clickeable */}
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                    className={`w-full p-4 text-left transition-colors ${
                      isExpanded 
                        ? 'bg-amber-50 dark:bg-amber-900/20' 
                        : isConfigured 
                          ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center`}>
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {provider.name}
                            </span>
                            {isConfigured && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                isActive 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {isActive ? '✓ Activa' : 'Desactivada'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Provider Form - Expandible */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">
                          Credenciales de {provider.name}
                        </span>
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        >
                          Ver documentación
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <div className="space-y-4">
                        {/* Public Key */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {provider.fields.publicKey}
                          </label>
                          <input
                            type="text"
                            value={config.publicKey}
                            onChange={(e) => updateProviderConfig(provider.id, { publicKey: e.target.value })}
                            placeholder={`Ingresa tu ${provider.fields.publicKey}`}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>

                        {/* Secret Key */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {provider.fields.secretKey}
                            <span className="ml-2 text-xs text-gray-500">
                              <Shield className="w-3 h-3 inline" /> Encriptado
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type={showSecretKey[provider.id] ? 'text' : 'password'}
                              value={config.secretKey}
                              onChange={(e) => updateProviderConfig(provider.id, { secretKey: e.target.value })}
                              onFocus={() => {
                                if (config.secretKey.includes('*')) {
                                  updateProviderConfig(provider.id, { secretKey: '' });
                                }
                              }}
                              placeholder={isConfigured && config.secretKey.includes('*') 
                                ? 'Ingresa nueva credencial para actualizar' 
                                : `Ingresa tu ${provider.fields.secretKey}`}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecretKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showSecretKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Webhook Secret */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {provider.fields.webhookSecret}
                            <span className="ml-2 text-xs text-gray-500">(Opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showWebhookSecret[provider.id] ? 'text' : 'password'}
                              value={config.webhookSecret}
                              onChange={(e) => updateProviderConfig(provider.id, { webhookSecret: e.target.value })}
                              placeholder={`Ingresa tu ${provider.fields.webhookSecret}`}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowWebhookSecret(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showWebhookSecret[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Pasarela activa
                            </p>
                            <p className="text-sm text-gray-500">
                              {config.isActive ? 'Los usuarios pueden pagar con esta pasarela' : 'Pasarela deshabilitada'}
                            </p>
                          </div>
                          <button
                            onClick={() => updateProviderConfig(provider.id, { isActive: !config.isActive })}
                            className={`relative w-14 h-7 rounded-full transition-colors ${
                              config.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                config.isActive ? 'translate-x-8' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Test Payment Button */}
                        {isConfigured && config.isActive && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-amber-900 dark:text-amber-300">
                                    Probar pasarela
                                  </p>
                                  <p className="text-sm text-amber-700 dark:text-amber-400">
                                    Genera un link de pago de $10 MXN
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleTestPayment(provider.id)}
                                  disabled={testingPayment === provider.id}
                                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  {testingPayment === provider.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Zap className="w-4 h-4" />
                                  )}
                                  Probar $10
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            {isConfigured && (
                              <button
                                onClick={() => handleDelete(provider.id)}
                                disabled={deleting === provider.id}
                                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {deleting === provider.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Eliminar
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleSave(provider.id)}
                            disabled={saving === provider.id || (!config.publicKey && !config.secretKey)}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving === provider.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {isConfigured ? 'Actualizar' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección de Transferencia Bancaria */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Configuración para Transferencias
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Datos bancarios que se mostrarán cuando un usuario elija pagar por transferencia
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Banco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankConfig.bankName}
                  onChange={(e) => setBankConfig(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Ej: BBVA, Santander, Banorte..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* CLABE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CLABE Interbancaria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankConfig.bankAccountClabe}
                  onChange={(e) => setBankConfig(prev => ({ ...prev, bankAccountClabe: e.target.value.replace(/\D/g, '').slice(0, 18) }))}
                  placeholder="18 dígitos"
                  maxLength={18}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {bankConfig.bankAccountClabe.length}/18 dígitos
                </p>
              </div>

              {/* Beneficiario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Beneficiario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankConfig.bankAccountHolder}
                  onChange={(e) => setBankConfig(prev => ({ ...prev, bankAccountHolder: e.target.value }))}
                  placeholder="Nombre como aparece en la cuenta"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Número de cuenta (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Cuenta <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={bankConfig.bankAccountNumber}
                  onChange={(e) => setBankConfig(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                  placeholder="Número de cuenta"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* WhatsApp para comprobantes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  WhatsApp para recibir comprobantes <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankConfig.transferWhatsappNumber}
                  onChange={(e) => setBankConfig(prev => ({ ...prev, transferWhatsappNumber: e.target.value }))}
                  placeholder="Ej: +52 81 1234 5678"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Los usuarios enviarán su comprobante de pago a este número para activar su cuenta
                </p>
              </div>
            </div>

            {/* Botón guardar configuración bancaria */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveBankConfig}
                disabled={savingBank}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingBank ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar datos bancarios
              </button>
            </div>
          </div>

          {/* Preview de cómo se verá */}
          {bankConfig.bankName && bankConfig.bankAccountClabe && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                Vista previa (así lo verán los usuarios):
              </h4>
              <div className="bg-slate-900 rounded-xl p-5 space-y-3 text-white">
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco</span>
                  <span className="font-bold">{bankConfig.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CLABE</span>
                  <span className="font-mono font-bold">{bankConfig.bankAccountClabe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Beneficiario</span>
                  <span className="font-bold">{bankConfig.bankAccountHolder}</span>
                </div>
                {bankConfig.transferWhatsappNumber && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm">
                    <strong>Importante:</strong> Después de la transferencia, envía tu comprobante al WhatsApp{' '}
                    <span className="font-bold text-white">{bankConfig.transferWhatsappNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help Section - Pasarelas */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            ¿Necesitas ayuda con las pasarelas?
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Mercado Pago:</strong> Ve a{' '}
              <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                Mercado Pago Developers
              </a>{' '}
              → Tus integraciones → Crear aplicación → Credenciales de producción
            </p>
            <p>
              <strong>Stripe:</strong> Ve a{' '}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                Stripe Dashboard
              </a>{' '}
              → Developers → API Keys
            </p>
            <p>
              <strong>PayPal:</strong> Ve a{' '}
              <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                PayPal Developer
              </a>{' '}
              → My Apps & Credentials → Create App
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
