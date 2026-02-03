'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Paintbrush, Image, Type, Eye, EyeOff, Save, Upload, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BrandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);

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
    slug: '',
    whatsappInviteImageUrl: '',
    // Videos descargables
    videoBienvenidaLideres1Url: '',
    videoBienvenidaLideres2Url: '',
    video2daLlamadaPerdidaUrl: '',
    videoInvitacionTransformadoraUrl: '',
    video3raLlamadaUrl: '',
    videoEnrolamientoUrl: '',
    videoCierreLideresTuVidaUrl: ''
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingWhatsapp, setUploadingWhatsapp] = useState(false);

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
          slug: data.organization.slug || '',
          whatsappInviteImageUrl: data.organization.whatsappInviteImageUrl || '',
          // Videos descargables
          videoBienvenidaLideres1Url: data.organization.videoBienvenidaLideres1Url || '',
          videoBienvenidaLideres2Url: data.organization.videoBienvenidaLideres2Url || '',
          video2daLlamadaPerdidaUrl: data.organization.video2daLlamadaPerdidaUrl || '',
          videoInvitacionTransformadoraUrl: data.organization.videoInvitacionTransformadoraUrl || '',
          video3raLlamadaUrl: data.organization.video3raLlamadaUrl || '',
          videoEnrolamientoUrl: data.organization.videoEnrolamientoUrl || '',
          videoCierreLideresTuVidaUrl: data.organization.videoCierreLideresTuVidaUrl || ''
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'loginBackgroundUrl' | 'whatsappInviteImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'error');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    // Set uploading state
    if (field === 'logoUrl') setUploadingLogo(true);
    else if (field === 'loginBackgroundUrl') setUploadingBackground(true);
    else if (field === 'whatsappInviteImageUrl') setUploadingWhatsapp(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'organization-branding');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success && data.url) {
        setBranding(prev => ({ ...prev, [field]: data.url }));
        showToast('Imagen subida correctamente', 'success');
      } else {
        showToast(data.error || 'Error al subir la imagen', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error al subir la imagen', 'error');
    } finally {
      if (field === 'logoUrl') setUploadingLogo(false);
      else if (field === 'loginBackgroundUrl') setUploadingBackground(false);
      else if (field === 'whatsappInviteImageUrl') setUploadingWhatsapp(false);
    }
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

            {/* Logo Upload */}
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <label className="text-white font-medium flex items-center gap-2 mb-3">
                <Image size={18} className="text-blue-400" />
                Logo de la Organización
              </label>
              
              {/* Preview del logo actual */}
              {branding.logoUrl && (
                <div className="mb-3 p-4 bg-slate-800 rounded-lg flex items-center justify-center">
                  <img 
                    src={branding.logoUrl} 
                    alt="Logo actual" 
                    className="max-h-20 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Botón de subir */}
              <input
                type="file"
                ref={logoInputRef}
                onChange={(e) => handleImageUpload(e, 'logoUrl')}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {branding.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                  </>
                )}
              </button>

              {/* O pegar URL manualmente */}
              <div className="text-slate-400 text-xs text-center mb-2">o pega una URL directamente:</div>
              <input
                type="url"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
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

            {/* Background Image Upload */}
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <label className="text-white font-medium flex items-center gap-2 mb-3">
                <Image size={18} className="text-green-400" />
                Imagen de Fondo del Login (opcional)
              </label>
              
              {/* Preview del fondo actual */}
              {branding.loginBackgroundUrl && (
                <div className="mb-3 rounded-lg overflow-hidden border border-slate-600">
                  <img 
                    src={branding.loginBackgroundUrl} 
                    alt="Fondo actual" 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Botón de subir */}
              <input
                type="file"
                ref={backgroundInputRef}
                onChange={(e) => handleImageUpload(e, 'loginBackgroundUrl')}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => backgroundInputRef.current?.click()}
                disabled={uploadingBackground}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
              >
                {uploadingBackground ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {branding.loginBackgroundUrl ? 'Cambiar Fondo' : 'Subir Imagen de Fondo'}
                  </>
                )}
              </button>

              {/* O pegar URL manualmente */}
              <div className="text-slate-400 text-xs text-center mb-2">o pega una URL directamente:</div>
              <input
                type="url"
                value={branding.loginBackgroundUrl}
                onChange={(e) => setBranding({ ...branding, loginBackgroundUrl: e.target.value })}
                placeholder="https://ejemplo.com/fondo.jpg"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Botón de Automatizaciones */}
            <div className="p-4 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium flex items-center gap-2">
                    🚀 Centro de Automatizaciones
                  </label>
                  <p className="text-slate-400 text-sm">Envía videos promocionales por correo o WhatsApp a tus usuarios</p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/school-admin/automatizaciones')}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  <span>Abrir Panel</span>
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-slate-600 pt-6 mt-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                📱 Imagen para Invitaciones de WhatsApp
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Esta imagen se usará como fondo cuando tus usuarios compartan invitaciones por WhatsApp. 
                Recomendamos una imagen de 1200x630 píxeles.
              </p>
              
              {/* WhatsApp Image Upload */}
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <label className="text-white font-medium flex items-center gap-2 mb-3">
                  <Image size={18} className="text-green-400" />
                  Imagen para WhatsApp
                </label>

                {/* Preview de imagen de WhatsApp */}
                {branding.whatsappInviteImageUrl && (
                  <div className="mb-3 relative rounded-lg overflow-hidden border border-slate-600">
                    <img 
                      src={branding.whatsappInviteImageUrl} 
                      alt="Preview WhatsApp" 
                      className="w-full h-auto max-h-40 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white font-bold text-xs">Entrenamiento Básico</p>
                      <p className="text-slate-300 text-[10px]">Vista previa</p>
                    </div>
                  </div>
                )}

                {/* Botón de subir */}
                <input
                  type="file"
                  ref={whatsappInputRef}
                  onChange={(e) => handleImageUpload(e, 'whatsappInviteImageUrl')}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => whatsappInputRef.current?.click()}
                  disabled={uploadingWhatsapp}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
                >
                  {uploadingWhatsapp ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {branding.whatsappInviteImageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                    </>
                  )}
                </button>

                {/* O pegar URL manualmente */}
                <div className="text-slate-400 text-xs text-center mb-2">o pega una URL directamente:</div>
                <input
                  type="url"
                  value={branding.whatsappInviteImageUrl}
                  onChange={(e) => setBranding({ ...branding, whatsappInviteImageUrl: e.target.value })}
                  placeholder="https://ejemplo.com/invitacion-basico.jpg"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            {/* Separador - Videos Descargables */}
            <div className="border-t border-slate-600 pt-6 mt-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                🎬 Videos Descargables para Líderes
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Configura las URLs de los videos que tus líderes podrán descargar. Estos videos aparecerán en la sección de "Descargables" de la plataforma.
              </p>

              {/* Video 1 - Bienvenida Líderes a Básico Video 1 */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">1</span>
                  Bienvenida Líderes a Básico Video 1
                </label>
                <input
                  type="url"
                  value={branding.videoBienvenidaLideres1Url}
                  onChange={(e) => setBranding({ ...branding, videoBienvenidaLideres1Url: e.target.value })}
                  placeholder="https://ejemplo.com/video-bienvenida-1.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 2 - Bienvenida Líderes a Básico Video 2 */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                  Bienvenida Líderes a Básico Video 2
                </label>
                <input
                  type="url"
                  value={branding.videoBienvenidaLideres2Url}
                  onChange={(e) => setBranding({ ...branding, videoBienvenidaLideres2Url: e.target.value })}
                  placeholder="https://ejemplo.com/video-bienvenida-2.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 3 - 2da llamada perdida */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                  2da Llamada Perdida
                </label>
                <input
                  type="url"
                  value={branding.video2daLlamadaPerdidaUrl}
                  onChange={(e) => setBranding({ ...branding, video2daLlamadaPerdidaUrl: e.target.value })}
                  placeholder="https://ejemplo.com/video-2da-llamada.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 4 - Invitación Transformadora al Básico */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                  Invitación Transformadora al Básico
                </label>
                <input
                  type="url"
                  value={branding.videoInvitacionTransformadoraUrl}
                  onChange={(e) => setBranding({ ...branding, videoInvitacionTransformadoraUrl: e.target.value })}
                  placeholder="https://ejemplo.com/video-invitacion.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 5 - 3ra Llamada */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">5</span>
                  3ra Llamada
                </label>
                <input
                  type="url"
                  value={branding.video3raLlamadaUrl}
                  onChange={(e) => setBranding({ ...branding, video3raLlamadaUrl: e.target.value })}
                  placeholder="https://ejemplo.com/video-3ra-llamada.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 6 - Enrolamiento */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">6</span>
                  Enrolamiento
                </label>
                <input
                  type="url"
                  value={branding.videoEnrolamientoUrl}
                  onChange={(e) => setBranding({ ...branding, videoEnrolamientoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/video-enrolamiento.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Video 7 - Cierre para líderes Tu Vida */}
              <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
                <label className="text-white font-medium flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-bold text-white">7</span>
                  Cierre para Líderes Tu Vida
                </label>
                <input
                  type="url"
                  value={branding.videoCierreLideresTuVidaUrl}
                  onChange={(e) => setBranding({ ...branding, videoCierreLideresTuVidaUrl: e.target.value })}
                  placeholder="https://ejemplo.com/video-cierre.mp4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
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
                    Powered by <span className="text-purple-400">Appsync</span>
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
