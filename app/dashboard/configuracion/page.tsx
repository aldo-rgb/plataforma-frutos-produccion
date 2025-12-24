'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Shield, Bell, Palette, Loader2, CheckCircle2, Mail, Phone, Building2, MapPin, Save, Upload, Camera } from 'lucide-react';
import { PrivacySettings } from '@/components/social/PrivacySettings';

interface UserProfile {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  profileImage: string | null;
  organizationId: number | null;
  Organization?: {
    name: string;
  } | null;
}

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'profile' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Error al cargar perfil');
      
      const data = await response.json();
      setProfile(data.user);
      setFormData({
        nombre: data.user.nombre || '',
        telefono: data.user.telefono || ''
      });
      setPreviewImage(data.user.profileImage);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setError('Error al cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a servidor
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir la imagen');
      }

      const data = await response.json();
      
      // Recargar perfil para actualizar la imagen
      await loadProfile();
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      setError(err.message || 'Error al subir la imagen');
      // Restaurar imagen anterior
      setPreviewImage(profile?.profileImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setShowSuccess(true);
      await loadProfile(); // Recargar datos
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      setError(err.message || 'Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'privacy' as const, label: 'Privacidad Social', icon: Shield },
    { id: 'profile' as const, label: 'Perfil', icon: User },
    { id: 'notifications' as const, label: 'Notificaciones', icon: Bell }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Configuración</h1>
          <p className="text-slate-400">Personaliza tu experiencia en F.R.U.T.O.S.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          {activeTab === 'privacy' && (
            <div>
              <PrivacySettings />
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Cargando perfil...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Success Message */}
                  {showSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle2 className="text-green-400" size={24} />
                      <div>
                        <p className="text-green-400 font-bold">¡Perfil actualizado!</p>
                        <p className="text-green-300 text-sm">Tus cambios se han guardado correctamente</p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Profile Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Foto de Perfil
                    </label>
                    
                    <div className="flex items-center gap-4">
                      {/* Avatar Preview */}
                      <div className="relative">
                        {previewImage || profile?.profileImage ? (
                          <img 
                            src={previewImage || profile?.profileImage} 
                            alt="Foto de perfil" 
                            className="w-24 h-24 rounded-full object-cover border-4 border-slate-700"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
                            <User className="w-12 h-12 text-slate-600" />
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Upload Button */}
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 border border-slate-600 text-white px-4 py-3 rounded-lg transition-all"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="animate-spin" size={18} />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Camera size={18} />
                              Cambiar Foto
                            </>
                          )}
                        </button>
                        <p className="text-xs text-slate-500 mt-2">
                          JPG, PNG o GIF. Máximo 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Tu nombre completo"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Teléfono (opcional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="+52 123 456 7890"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">El email no puede modificarse</p>
                  </div>

                  {/* Organization (if exists) */}
                  {profile?.Organization && (
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Organización
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                          type="text"
                          value={profile.Organization.name}
                          disabled
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
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
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Configuración de notificaciones próximamente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
