'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Globe,
  Gift,
  Camera,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  ImagePlus,
  X,
  Award,
  Shield
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface BusinessProfile {
  id: number;
  headline: string;
  categoryId: number;
  description: string;
  discountOffer: string;
  city: string;
  state: string;
  coverageZone: string | null;
  whatsappPhone: string;
  email: string | null;
  website: string | null;
  galleryImages: string[];
  logoUrl: string | null;
  avgRating: number;
  totalReviews: number;
  status: string;
  isVerified: boolean;
  isPLGraduate: boolean;
  category: Category;
}

const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

export default function MyBusinessProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isPLGraduate, setIsPLGraduate] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    headline: '',
    categoryId: 0,
    description: '',
    discountOffer: '',
    city: '',
    state: '',
    coverageZone: '',
    whatsappPhone: '',
    email: '',
    website: '',
    galleryImages: [] as string[],
    logoUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and profile in parallel
      const [catRes, profileRes] = await Promise.all([
        fetch('/api/talent-directory/categories'),
        fetch('/api/talent-directory/my-profile')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setHasProfile(profileData.hasProfile);
        setIsPLGraduate(profileData.isPLGraduate);
        
        if (profileData.profile) {
          setProfile(profileData.profile);
          setForm({
            headline: profileData.profile.headline || '',
            categoryId: profileData.profile.categoryId || 0,
            description: profileData.profile.description || '',
            discountOffer: profileData.profile.discountOffer || '',
            city: profileData.profile.city || '',
            state: profileData.profile.state || '',
            coverageZone: profileData.profile.coverageZone || '',
            whatsappPhone: profileData.profile.whatsappPhone || '',
            email: profileData.profile.email || '',
            website: profileData.profile.website || '',
            galleryImages: profileData.profile.galleryImages || [],
            logoUrl: profileData.profile.logoUrl || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.headline.trim()) newErrors.headline = 'El titular es obligatorio';
    if (form.headline.length > 100) newErrors.headline = 'Máximo 100 caracteres';
    if (!form.categoryId) newErrors.categoryId = 'Selecciona una categoría';
    if (!form.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (form.description.length < 20) newErrors.description = 'Mínimo 20 caracteres';
    if (!form.discountOffer.trim()) newErrors.discountOffer = 'El beneficio para la comunidad es obligatorio';
    if (!form.city.trim()) newErrors.city = 'La ciudad es obligatoria';
    if (!form.state) newErrors.state = 'El estado es obligatorio';
    if (!form.whatsappPhone.trim()) newErrors.whatsappPhone = 'El WhatsApp es obligatorio';
    if (form.galleryImages.length > 5) newErrors.galleryImages = 'Máximo 5 imágenes';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const method = hasProfile ? 'PATCH' : 'POST';
      const res = await fetch('/api/talent-directory/my-profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setHasProfile(true);
        alert(hasProfile ? 'Perfil actualizado correctamente' : 'Perfil creado correctamente');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!profile) return;
    
    const newStatus = profile.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    
    try {
      const res = await fetch('/api/talent-directory/my-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setProfile({ ...profile, status: newStatus });
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const addImageUrl = () => {
    const url = prompt('Ingresa la URL de la imagen:');
    if (url && form.galleryImages.length < 5) {
      setForm({ ...form, galleryImages: [...form.galleryImages, url] });
    }
  };

  const removeImage = (index: number) => {
    const newImages = form.galleryImages.filter((_, i) => i !== index);
    setForm({ ...form, galleryImages: newImages });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // Si está baneado
  if (profile?.status === 'BANNED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Perfil Suspendido</h1>
            <p className="text-red-300 mb-4">
              Tu perfil en el Directorio de Talentos ha sido suspendido debido a múltiples reseñas negativas (5+ de 1 estrella).
            </p>
            <p className="text-gray-400 text-sm">
              Si crees que esto es un error, contacta a soporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {hasProfile ? 'Mi Perfil Empresarial' : 'Crear Perfil Empresarial'}
          </h1>
          <p className="text-gray-400">
            {hasProfile 
              ? 'Edita tu información para que la comunidad te encuentre'
              : 'Completa tu perfil para aparecer en el Directorio de Talentos'}
          </p>
        </div>

        {/* Badges de estado */}
        {hasProfile && (
          <div className="flex flex-wrap gap-3 mb-6">
            {isPLGraduate && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">Graduado PL</span>
              </div>
            )}
            {profile?.isVerified && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">Verificado</span>
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              profile?.status === 'ACTIVE' 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-gray-500/20 border border-gray-500/30'
            }`}>
              {profile?.status === 'ACTIVE' ? (
                <>
                  <Eye className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm font-medium">Visible</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm font-medium">Oculto</span>
                </>
              )}
            </div>
            {profile && profile.totalReviews > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-300 text-sm font-medium">
                  {profile.avgRating.toFixed(1)} ({profile.totalReviews} reseñas)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Información del Negocio
            </h2>
            
            <div className="space-y-4">
              {/* Titular */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Titular Profesional *
                </label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="Ej: Arquitecto Bioclimático, Plomero 24/7, Venta de Seguros"
                  maxLength={100}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-between mt-1">
                  {errors.headline && <span className="text-red-400 text-xs">{errors.headline}</span>}
                  <span className="text-gray-500 text-xs ml-auto">{form.headline.length}/100</span>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Selecciona una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <span className="text-red-400 text-xs">{errors.categoryId}</span>}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descripción del Servicio *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="¿Qué haces? ¿Qué problemas solucionas? Describe tu servicio..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.description && <span className="text-red-400 text-xs">{errors.description}</span>}
              </div>

              {/* Beneficio para la comunidad */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" />
                  Beneficio Exclusivo para la Comunidad *
                </label>
                <input
                  type="text"
                  value={form.discountOffer}
                  onChange={(e) => setForm({ ...form, discountOffer: e.target.value })}
                  placeholder="Ej: 15% de descuento, Diagnóstico gratis, Primera consulta sin costo"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.discountOffer && <span className="text-red-400 text-xs">{errors.discountOffer}</span>}
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-400" />
              Ubicación
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Ej: Monterrey"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.city && <span className="text-red-400 text-xs">{errors.city}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un estado</option>
                  {MEXICAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && <span className="text-red-400 text-xs">{errors.state}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Zona de Cobertura (opcional)</label>
                <input
                  type="text"
                  value={form.coverageZone}
                  onChange={(e) => setForm({ ...form, coverageZone: e.target.value })}
                  placeholder="Ej: Zona Metropolitana, Todo el estado, Nacional"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              Contacto
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  placeholder="Ej: 8112345678"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.whatsappPhone && <span className="text-red-400 text-xs">{errors.whatsappPhone}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Sitio Web (opcional)
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://misitio.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Galería */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" />
              Portafolio (máx. 5 imágenes)
            </h2>
            
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Logo o Foto de Perfil</label>
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="URL de tu logo"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Galería */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Galería de Trabajos</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {form.galleryImages.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-700">
                      <Image src={url} alt={`Trabajo ${index + 1}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.galleryImages.length < 5 && (
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 flex flex-col items-center justify-center text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-xs">Agregar</span>
                    </button>
                  )}
                </div>
                {errors.galleryImages && <span className="text-red-400 text-xs">{errors.galleryImages}</span>}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {hasProfile ? 'Guardar Cambios' : 'Crear Perfil'}
            </button>

            {hasProfile && (
              <button
                type="button"
                onClick={handleToggleVisibility}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  profile?.status === 'ACTIVE'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {profile?.status === 'ACTIVE' ? (
                  <>
                    <EyeOff className="w-5 h-5" />
                    Ocultar Perfil
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Mostrar Perfil
                  </>
                )}
              </button>
            )}

            {hasProfile && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/mercado/${profile?.id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                <Eye className="w-5 h-5" />
                Ver como público
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
