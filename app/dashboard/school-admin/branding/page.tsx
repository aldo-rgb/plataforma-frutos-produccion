'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Paintbrush, Image, Type, Eye, EyeOff, Save, Upload, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

export default function BrandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Branding state
  const [branding, setBranding] = useState({
    logoUrl: '',
    brandColor: '#6366f1',
    loginBackgroundUrl: '',
    loginWelcomeMessage: 'Bienvenido al Portal de Entrenamiento',
    showPoweredBy: true,
    customLoginEnabled: false,
    slug: ''
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchBranding();
  }, [status, session, router]);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/school-admin/branding');
      const data = await res.json();
      if (data.success) {
        setBranding({
          logoUrl: data.organization.logoUrl || '',
          brandColor: data.organization.brandColor || '#6366f1',
          loginBackgroundUrl: data.organization.loginBackgroundUrl || '',
          loginWelcomeMessage: data.organization.loginWelcomeMessage || 'Bienvenido al Portal de Entrenamiento',
          showPoweredBy: data.organization.showPoweredBy ?? true,
          customLoginEnabled: data.organization.customLoginEnabled ?? false,
          slug: data.organization.slug || ''
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      showToast('Error al cargar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/school-admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Configuración guardada correctamente', 'success');
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      showToast('Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'loginBackgroundUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (field === 'loginBackgroundUrl') {
        setPreviewImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to your storage (implement your upload logic here)
    // For now, just show the preview
    showToast('Sube la imagen a tu servidor de archivos y pega la URL', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const loginUrl = branding.slug ? `/org/${branding.slug}/login` : null;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Paintbrush className="text-purple-400" />
            Personalizar Login de Mi Escuela
          </h1>
          <p className="text-slate-400 mt-2">
            Configura la apariencia de la página de inicio de sesión para tus usuarios
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="bg-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">⚙️ Configuración</h2>

            {/* Enable Custom Login */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <div>
                <label className="text-white font-medium">Activar Login Personalizado</label>
                <p className="text-slate-400 text-sm">Permite a tus usuarios acceder con tu branding</p>
              </div>
              <button
                onClick={() => setBranding({ ...branding, customLoginEnabled: !branding.customLoginEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  branding.customLoginEnabled ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    branding.customLoginEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Custom Login URL */}
            {branding.customLoginEnabled && loginUrl && (
              <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                <label className="text-purple-300 font-medium text-sm">URL de Login Personalizado</label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-slate-900 text-purple-400 px-3 py-2 rounded text-sm">
                    {typeof window !== 'undefined' ? window.location.origin : ''}{loginUrl}
                  </code>
                  <a
                    href={loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            )}

            {/* Logo URL */}
            <div>
              <label className="text-white font-medium flex items-center gap-2">
                <Image size={18} className="text-blue-400" />
                URL del Logo
              </label>
              <input
                type="url"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Brand Color */}
            <div>
              <label className="text-white font-medium flex items-center gap-2">
                <Paintbrush size={18} className="text-pink-400" />
                Color Principal
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={branding.brandColor}
                  onChange={(e) => setBranding({ ...branding, brandColor: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-600"
                />
                <input
                  type="text"
                  value={branding.brandColor}
                  onChange={(e) => setBranding({ ...branding, brandColor: e.target.value })}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="text-white font-medium flex items-center gap-2">
                <Type size={18} className="text-yellow-400" />
                Mensaje de Bienvenida
              </label>
              <input
                type="text"
                value={branding.loginWelcomeMessage}
                onChange={(e) => setBranding({ ...branding, loginWelcomeMessage: e.target.value })}
                placeholder="Bienvenido al Portal de Entrenamiento"
                className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Background Image URL */}
            <div>
              <label className="text-white font-medium flex items-center gap-2">
                <Image size={18} className="text-green-400" />
                URL de Imagen de Fondo (opcional)
              </label>
              <input
                type="url"
                value={branding.loginBackgroundUrl}
                onChange={(e) => setBranding({ ...branding, loginBackgroundUrl: e.target.value })}
                placeholder="https://ejemplo.com/fondo.jpg"
                className="w-full mt-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Show Powered By */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <div>
                <label className="text-white font-medium">Mostrar "Powered by Frutos"</label>
                <p className="text-slate-400 text-sm">Muestra el crédito a la plataforma</p>
              </div>
              <button
                onClick={() => setBranding({ ...branding, showPoweredBy: !branding.showPoweredBy })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  branding.showPoweredBy ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    branding.showPoweredBy ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="text-blue-400" />
              Vista Previa
            </h2>

            <div
              className="rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl"
              style={{
                backgroundImage: branding.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="bg-slate-900/80 backdrop-blur-sm p-8 min-h-[400px] flex flex-col items-center justify-center">
                {/* Logo */}
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="h-16 w-auto mb-6 object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 bg-slate-700 rounded-full flex items-center justify-center mb-6">
                    <span className="text-2xl">🏫</span>
                  </div>
                )}

                {/* Welcome Message */}
                <h1 className="text-xl font-bold text-white mb-6 text-center">
                  {branding.loginWelcomeMessage || 'Bienvenido'}
                </h1>

                {/* Mock Form */}
                <div className="w-full max-w-xs space-y-4">
                  <div className="bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3">
                    <span className="text-slate-400 text-sm">correo@ejemplo.com</span>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3">
                    <span className="text-slate-400 text-sm">••••••••</span>
                  </div>
                  <button
                    className="w-full py-3 text-white font-bold rounded-lg transition-all"
                    style={{ backgroundColor: branding.brandColor }}
                  >
                    Iniciar Sesión
                  </button>
                </div>

                {/* Powered By */}
                {branding.showPoweredBy && (
                  <p className="text-slate-500 text-xs mt-8">
                    Powered by <span className="text-purple-400">Frutos</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
