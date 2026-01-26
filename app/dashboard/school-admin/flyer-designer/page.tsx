'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Image, 
  Type, 
  MapPin, 
  AlertTriangle, 
  Save, 
  Eye, 
  Download,
  QrCode,
  MessageSquare,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface FlyerConfig {
  flyerBackgroundUrl: string;
  flyerHeadline: string;
  flyerSubheadline: string;
  flyerLocationDetail: string;
  flyerShowUrgencyBadge: boolean;
  flyerUrgencyText: string;
  flyerCtaText: string;
  flyerWhatsappNumber: string;
  // Datos de la visión (solo lectura)
  visionName?: string;
  visionDates?: string;
  visionLocation?: string;
  organizationName?: string;
  organizationLogo?: string;
}

export default function FlyerDesignerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const [config, setConfig] = useState<FlyerConfig>({
    flyerBackgroundUrl: '',
    flyerHeadline: 'Rompe tus límites mentales y transforma tus resultados en 3 días.',
    flyerSubheadline: 'Tu mejor versión está esperando que digas sí',
    flyerLocationDetail: '',
    flyerShowUrgencyBadge: true,
    flyerUrgencyText: 'CUPO LIMITADO',
    flyerCtaText: 'Escanea para registrarte',
    flyerWhatsappNumber: '',
  });

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
    fetchConfig();
  }, [status, session, router]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/school-admin/flyer-config');
      const data = await res.json();
      if (data.success) {
        setConfig({
          flyerBackgroundUrl: data.config.flyerBackgroundUrl || '',
          flyerHeadline: data.config.flyerHeadline || 'Rompe tus límites mentales y transforma tus resultados en 3 días.',
          flyerSubheadline: data.config.flyerSubheadline || '',
          flyerLocationDetail: data.config.flyerLocationDetail || '',
          flyerShowUrgencyBadge: data.config.flyerShowUrgencyBadge ?? true,
          flyerUrgencyText: data.config.flyerUrgencyText || 'CUPO LIMITADO',
          flyerCtaText: data.config.flyerCtaText || 'Escanea para registrarte',
          flyerWhatsappNumber: data.config.flyerWhatsappNumber || '',
          visionName: data.nextVision?.nombre,
          visionDates: data.nextVision?.fechas,
          visionLocation: data.nextVision?.lugar,
          organizationName: data.organization?.name,
          organizationLogo: data.organization?.logoUrl,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
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
      const res = await fetch('/api/school-admin/flyer-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Configuración guardada correctamente', 'success');
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showToast('Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    setGeneratingPreview(true);
    // La URL de preview usa la API de OG con un código de ejemplo
    const previewParams = new URLSearchParams({
      preview: 'true',
      org: session?.user?.organizationId?.toString() || '1'
    });
    setPreviewUrl(`/api/og/flyer?${previewParams.toString()}&t=${Date.now()}`);
    setGeneratingPreview(false);
  };

  const downloadFlyer = async () => {
    if (!previewUrl) {
      await generatePreview();
    }
    
    // Crear link de descarga
    const link = document.createElement('a');
    link.href = previewUrl || `/api/og/flyer?preview=true&org=${session?.user?.organizationId}`;
    link.download = `flyer-basico-${config.visionName?.replace(/\s+/g, '-') || 'evento'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sparkles className="text-amber-400" />
            Diseñador de Flyer de Invitación
          </h1>
          <p className="text-slate-400 mt-2">
            Personaliza el flyer que se enviará cuando tus usuarios compartan invitaciones por WhatsApp
          </p>
        </div>

        {/* Info de la Visión Actual */}
        {config.visionName && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl">
            <p className="text-purple-300 text-sm font-medium">Próximo Evento:</p>
            <p className="text-white font-bold text-lg">{config.visionName}</p>
            {config.visionDates && <p className="text-slate-400">{config.visionDates}</p>}
            {config.visionLocation && <p className="text-slate-400">📍 {config.visionLocation}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel de Configuración */}
          <div className="space-y-6">
            {/* Imagen de Fondo */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Image className="text-blue-400" size={20} />
                Imagen de Fondo
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Sube tu imagen de fondo a un servicio de hosting y pega la URL aquí. 
                Recomendado: 1200x630 píxeles para mejor calidad.
              </p>
              <input
                type="url"
                value={config.flyerBackgroundUrl}
                onChange={(e) => setConfig({ ...config, flyerBackgroundUrl: e.target.value })}
                placeholder="https://ejemplo.com/mi-flyer-fondo.jpg"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              {config.flyerBackgroundUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border border-slate-600">
                  <img 
                    src={config.flyerBackgroundUrl} 
                    alt="Preview" 
                    className="w-full h-40 object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Textos */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Type className="text-green-400" size={20} />
                Textos del Flyer
              </h2>
              
              <div className="space-y-4">
                {/* Headline */}
                <div>
                  <label className="text-white font-medium text-sm">Gancho Principal (Headline)</label>
                  <textarea
                    value={config.flyerHeadline}
                    onChange={(e) => setConfig({ ...config, flyerHeadline: e.target.value })}
                    placeholder="Rompe tus límites mentales y transforma tus resultados en 3 días."
                    rows={2}
                    className="w-full mt-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                {/* Subheadline */}
                <div>
                  <label className="text-white font-medium text-sm">Subtítulo (opcional)</label>
                  <input
                    type="text"
                    value={config.flyerSubheadline}
                    onChange={(e) => setConfig({ ...config, flyerSubheadline: e.target.value })}
                    placeholder="Tu mejor versión está esperando que digas sí"
                    className="w-full mt-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* CTA Text */}
                <div>
                  <label className="text-white font-medium text-sm flex items-center gap-2">
                    <QrCode size={16} className="text-purple-400" />
                    Texto junto al QR
                  </label>
                  <input
                    type="text"
                    value={config.flyerCtaText}
                    onChange={(e) => setConfig({ ...config, flyerCtaText: e.target.value })}
                    placeholder="Escanea para registrarte"
                    className="w-full mt-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="text-red-400" size={20} />
                Detalle de Ubicación
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Agrega detalles adicionales de la ubicación (zona, colonia, etc.)
              </p>
              <input
                type="text"
                value={config.flyerLocationDetail}
                onChange={(e) => setConfig({ ...config, flyerLocationDetail: e.target.value })}
                placeholder="Zona Sur, Col. Del Valle"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              {config.visionLocation && (
                <p className="text-slate-500 text-sm mt-2">
                  Ubicación base: {config.visionLocation}
                </p>
              )}
            </div>

            {/* Urgencia */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={20} />
                Elemento de Urgencia
              </h2>
              
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg mb-4">
                <div>
                  <label className="text-white font-medium">Mostrar Badge de Urgencia</label>
                  <p className="text-slate-400 text-sm">Agrega un elemento visual de escasez</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, flyerShowUrgencyBadge: !config.flyerShowUrgencyBadge })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.flyerShowUrgencyBadge ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.flyerShowUrgencyBadge ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.flyerShowUrgencyBadge && (
                <input
                  type="text"
                  value={config.flyerUrgencyText}
                  onChange={(e) => setConfig({ ...config, flyerUrgencyText: e.target.value })}
                  placeholder="CUPO LIMITADO"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              )}
            </div>

            {/* WhatsApp */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="text-green-400" size={20} />
                WhatsApp de Contacto
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Número para que los interesados puedan contactar (opcional)
              </p>
              <input
                type="tel"
                value={config.flyerWhatsappNumber}
                onChange={(e) => setConfig({ ...config, flyerWhatsappNumber: e.target.value })}
                placeholder="81 3972 2871"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
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

          {/* Panel de Preview */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="text-blue-400" size={20} />
                  Vista Previa
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={generatePreview}
                    disabled={generatingPreview}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <RefreshCw size={16} className={generatingPreview ? 'animate-spin' : ''} />
                    Actualizar
                  </button>
                  <button
                    onClick={downloadFlyer}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Descargar
                  </button>
                </div>
              </div>

              {/* Preview Container */}
              <div className="relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-600">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview del Flyer" 
                    className="w-full h-auto"
                    key={previewUrl}
                  />
                ) : config.flyerBackgroundUrl ? (
                  <div className="relative">
                    <img 
                      src={config.flyerBackgroundUrl} 
                      alt="Background" 
                      className="w-full h-auto"
                    />
                    {/* Overlay de preview básico */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                      {config.flyerShowUrgencyBadge && (
                        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {config.flyerUrgencyText}
                        </div>
                      )}
                      <p className="text-white font-bold text-lg mb-2">{config.flyerHeadline}</p>
                      {config.flyerSubheadline && (
                        <p className="text-slate-300 text-sm">{config.flyerSubheadline}</p>
                      )}
                      <div className="mt-4 flex items-center gap-4">
                        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                          <QrCode size={60} className="text-slate-800" />
                        </div>
                        <p className="text-white text-sm">{config.flyerCtaText}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[1200/630] flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                    <Image size={48} className="mb-4 opacity-50" />
                    <p>Agrega una imagen de fondo para ver la vista previa</p>
                    <p className="text-sm mt-2">Haz clic en "Actualizar" después de guardar para ver el flyer completo</p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">
                  💡 <strong>Tip:</strong> El QR se generará automáticamente con el código de referido de cada usuario cuando compartan. 
                  Esta vista previa muestra cómo se verá el flyer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
