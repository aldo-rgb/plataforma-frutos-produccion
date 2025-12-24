'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Building, 
  CreditCard, 
  DollarSign,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PaymentSettings {
  // Bank Transfer
  bankName: string;
  accountNumber: string;
  clabe: string;
  beneficiary: string;
  
  // Stripe
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeEnabled: boolean;
  
  // PayPal
  paypalClientId: string;
  paypalClientSecret: string;
  paypalEnabled: boolean;
  
  // Mercado Pago
  mercadoPagoPublicKey: string;
  mercadoPagoAccessToken: string;
  mercadoPagoEnabled: boolean;
}

export default function PaymentSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [settings, setSettings] = useState<PaymentSettings>({
    bankName: 'BBVA',
    accountNumber: '0123456789',
    clabe: '012345678901234567',
    beneficiary: 'Frutos del Espíritu A.C.',
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeEnabled: false,
    paypalClientId: '',
    paypalClientSecret: '',
    paypalEnabled: false,
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: '',
    mercadoPagoEnabled: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'ADMINISTRADOR') {
      router.push('/dashboard');
    } else {
      fetchSettings();
    }
  }, [status, session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      const result = await res.json();
      
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <DollarSign size={32} className="text-purple-400" />
            Configuración de Pagos
          </h1>
          <p className="text-slate-400">
            Configura los métodos de pago disponibles para la plataforma
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-200' 
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          } flex items-center gap-3`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Bank Transfer Settings */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Building className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">Transferencia Bancaria</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Banco
              </label>
              <input
                type="text"
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Beneficiario
              </label>
              <input
                type="text"
                value={settings.beneficiary}
                onChange={(e) => setSettings({ ...settings, beneficiary: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Número de Cuenta
              </label>
              <input
                type="text"
                value={settings.accountNumber}
                onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CLABE Interbancaria
              </label>
              <input
                type="text"
                value={settings.clabe}
                onChange={(e) => setSettings({ ...settings, clabe: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                maxLength={18}
              />
            </div>
          </div>
        </div>

        {/* Stripe Settings */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-white">Stripe</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.stripeEnabled}
                onChange={(e) => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-300">Activado</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Public Key
              </label>
              <input
                type="text"
                value={settings.stripePublicKey}
                onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                placeholder="pk_..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Secret Key
              </label>
              <input
                type="password"
                value={settings.stripeSecretKey}
                onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                placeholder="sk_..."
              />
            </div>
          </div>
        </div>

        {/* PayPal Settings */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8">
                <svg viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg" className="h-full">
                  <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906z" fill="#179BD7"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">PayPal</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.paypalEnabled}
                onChange={(e) => setSettings({ ...settings, paypalEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-300">Activado</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={settings.paypalClientId}
                onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={settings.paypalClientSecret}
                onChange={(e) => setSettings({ ...settings, paypalClientSecret: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Mercado Pago Settings */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center p-1">
                <img 
                  src="data:image/png;base64,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" 
                  alt="Mercado Pago"
                  className="h-full w-auto object-contain"
                />
              </div>
              <h2 className="text-xl font-bold text-white">Mercado Pago</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mercadoPagoEnabled}
                onChange={(e) => setSettings({ ...settings, mercadoPagoEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-300">Activado</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Public Key
              </label>
              <input
                type="text"
                value={settings.mercadoPagoPublicKey}
                onChange={(e) => setSettings({ ...settings, mercadoPagoPublicKey: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={settings.mercadoPagoAccessToken}
                onChange={(e) => setSettings({ ...settings, mercadoPagoAccessToken: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
