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
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PaymentConfig {
  id?: number;
  provider: 'MERCADOPAGO' | 'STRIPE' | 'PAYPAL' | '';
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
}

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
  {
    id: 'PAYPAL',
    name: 'PayPal',
    logo: '/images/paypal-logo.png',
    color: 'bg-yellow-500',
    description: 'Conocido y confiable mundialmente',
    docsUrl: 'https://developer.paypal.com/api/rest/',
    fields: {
      publicKey: 'Client ID',
      secretKey: 'Client Secret',
      webhookSecret: 'Webhook ID (Opcional)',
    },
  },
];

export default function PaymentGatewayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [config, setConfig] = useState<PaymentConfig>({
    provider: '',
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
    isActive: true,
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

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
        if (data.config) {
          setConfig({
            id: data.config.id,
            provider: data.config.provider || '',
            publicKey: data.config.publicKey || '',
            secretKey: data.config.secretKey || '',
            webhookSecret: data.config.webhookSecret || '',
            isActive: data.config.isActive,
          });
          setHasExistingConfig(true);
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      showNotification('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.provider) {
      showNotification('error', 'Selecciona un proveedor de pagos');
      return;
    }

    if (!config.publicKey && !config.secretKey) {
      showNotification('error', 'Proporciona al menos una credencial');
      return;
    }

    setSaving(true);
    try {
      // Log para debug
      console.log('🔵 [pasarela-frontend] Enviando config:', {
        provider: config.provider,
        publicKeyLength: config.publicKey?.length,
        secretKeyLength: config.secretKey?.length,
        secretKeyContainsAsterisk: config.secretKey?.includes('*'),
        isActive: config.isActive,
      });
      
      const res = await fetch('/api/school-admin/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', data.message);
        setHasExistingConfig(true);
        // Actualizar estado con valores del servidor (enmascarados para secretos)
        if (data.config) {
          setConfig(prev => ({
            ...prev,
            id: data.config.id,
            provider: data.config.provider,
            publicKey: data.config.publicKey || '',
            secretKey: data.config.secretKey || '', // Será el valor enmascarado
            webhookSecret: data.config.webhookSecret || '',
            isActive: data.config.isActive,
          }));
        }
      } else {
        showNotification('error', data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('error', 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar la configuración de pasarela de pagos? Los usuarios no podrán pagar con tarjeta.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/school-admin/payment-gateway', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', 'Configuración eliminada');
        setConfig({
          provider: '',
          publicKey: '',
          secretKey: '',
          webhookSecret: '',
          isActive: true,
        });
        setHasExistingConfig(false);
      } else {
        showNotification('error', data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      showNotification('error', 'Error al eliminar la configuración');
    } finally {
      setDeleting(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const selectedProvider = PROVIDERS.find(p => p.id === config.provider);

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
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
                Cuando tus alumnos paguen inscripciones (Básico, Avanzado, PL) o tickets pendientes con tarjeta, 
                el dinero irá directamente a tu cuenta de {config.provider || 'la pasarela configurada'}. 
                Los pagos de licencias y membresías van a la cuenta administrativa global.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Selecciona un proveedor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setConfig(prev => ({ ...prev, provider: provider.id as any }))}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  config.provider === provider.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center`}>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {provider.name}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {provider.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Form */}
        {config.provider && selectedProvider && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Credenciales de {selectedProvider.name}
              </h2>
              <a
                href={selectedProvider.docsUrl}
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
                  {selectedProvider.fields.publicKey}
                </label>
                <input
                  type="text"
                  value={config.publicKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, publicKey: e.target.value }))}
                  placeholder={`Ingresa tu ${selectedProvider.fields.publicKey}`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedProvider.fields.secretKey}
                  <span className="ml-2 text-xs text-gray-500">
                    <Shield className="w-3 h-3 inline" /> Encriptado
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={config.secretKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    onFocus={() => {
                      // Si el valor actual contiene asteriscos (enmascarado), limpiar al hacer focus
                      if (config.secretKey.includes('*')) {
                        setConfig(prev => ({ ...prev, secretKey: '' }));
                      }
                    }}
                    placeholder={hasExistingConfig && config.secretKey.includes('*') 
                      ? 'Ingresa nueva credencial para actualizar' 
                      : `Ingresa tu ${selectedProvider.fields.secretKey}`}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {hasExistingConfig && config.secretKey.includes('*') && (
                  <p className="text-xs text-gray-500 mt-1">
                    La clave está enmascarada. Haz clic en el campo para ingresar una nueva.
                  </p>
                )}
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedProvider.fields.webhookSecret}
                  <span className="ml-2 text-xs text-gray-500">(Opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={config.webhookSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    placeholder={`Ingresa tu ${selectedProvider.fields.webhookSecret}`}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    {config.isActive ? 'Los usuarios pueden pagar con tarjeta' : 'Pagos con tarjeta deshabilitados'}
                  </p>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
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
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {hasExistingConfig && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar configuración
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !config.provider}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {hasExistingConfig ? 'Actualizar' : 'Guardar'} configuración
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            ¿Necesitas ayuda?
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
