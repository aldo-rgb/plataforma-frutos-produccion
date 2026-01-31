'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  Star,
  MapPin,
  MessageCircle,
  Filter,
  ChevronDown,
  Loader2,
  User,
  Award,
  Shield,
  Gift,
  RefreshCw,
  X,
  Phone,
  Lock,
  Crown,
  ArrowLeft,
  Globe,
  Flame,
  Sparkles,
  Hand
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  _count: { profiles: number };
}

interface Vision {
  id: number;
  nombre: string;
  isActive: boolean;
}

interface BusinessProfile {
  id: number;
  headline: string;
  description: string;
  discountOffer: string;
  city: string;
  state: string;
  whatsappPhone: string;
  avgRating: number;
  totalReviews: number;
  nudgeCount: number; // Toques recibidos
  hasNudged: boolean; // Si el usuario actual ya dio toque
  galleryImages: string[];
  logoUrl: string | null;
  isVerified: boolean;
  isPLGraduate: boolean;
  websiteUrl: string | null;
  user: {
    id: number;
    nombre: string;
    imagen: string | null;
  };
  category: {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
  };
  vision: {
    id: number;
    nombre: string;
  } | null;
}

const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

export default function MarketplacePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Sección activa: 'public' (Irrazonables) o 'expo' (Razonables)
  const [activeSection, setActiveSection] = useState<'public' | 'expo'>('public');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtro de visión para Expo
  const [visions, setVisions] = useState<Vision[]>([]);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [userActiveVisionId, setUserActiveVisionId] = useState<number | null>(null);

  // Verificar acceso (Avanzado completado o PL)
  useEffect(() => {
    const checkLideratoAccess = async () => {
      try {
        const response = await fetch('/api/liderato-access');
        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.hasAccess === true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking Liderato access:', error);
        setHasAccess(false);
      }
    };
    checkLideratoAccess();
  }, []);

  const fetchProfiles = useCallback(async (page = 1) => {
    if (hasAccess !== true) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory.toString());
      if (selectedState) params.set('state', selectedState);
      params.set('sort', sortBy);
      params.set('page', page.toString());
      params.set('section', activeSection); // 'public' o 'expo'
      if (onlyVerified) params.set('verified', 'true');
      // Filtro de visión solo para Expo
      if (activeSection === 'expo' && selectedVision) {
        params.set('visionId', selectedVision.toString());
      }

      const res = await fetch(`/api/talent-directory/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedState, sortBy, onlyVerified, hasAccess, activeSection, selectedVision]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/talent-directory/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Obtener visiones disponibles y la visión activa del usuario
  const fetchVisions = async () => {
    try {
      // Obtener todas las visiones
      const visionsRes = await fetch('/api/visions/list');
      if (visionsRes.ok) {
        const data = await visionsRes.json();
        setVisions(data.visions || []);
      }

      // Obtener la visión activa del usuario (solo para mostrar cuál es "tu visión")
      const userVisionRes = await fetch('/api/user/vision-level');
      if (userVisionRes.ok) {
        const data = await userVisionRes.json();
        if (data.visionId) {
          setUserActiveVisionId(data.visionId);
          // NO seleccionar automáticamente - dejar en null para mostrar "Todas las visiones"
        }
      }
    } catch (error) {
      console.error('Error fetching visions:', error);
    }
  };

  useEffect(() => {
    if (hasAccess === true) {
      fetchCategories();
      fetchVisions();
      // Solo fetch profiles en sección 'public' aquí
      // Para 'expo', esperamos a que selectedVision esté listo
      if (activeSection === 'public') {
        fetchProfiles();
      }
    } else if (hasAccess === false) {
      setLoading(false);
    }
  }, [hasAccess]);

  // Recargar cuando cambia la sección o la visión seleccionada
  useEffect(() => {
    if (hasAccess === true) {
      // Para expo, selectedVision puede ser null (todas las visiones) - eso es válido
      // Solo esperar si estamos en expo y aún no se ha cargado la info inicial
      fetchProfiles(1);
    }
  }, [activeSection, selectedVision]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfiles(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedState('');
    setSortBy('rating');
    setOnlyVerified(false);
    fetchProfiles(1);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Hola ${name}, te contacto desde el Directorio de Talentos. Me interesa conocer más sobre tus servicios.`);
    window.open(`https://wa.me/52${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  // Estado para manejar toques en progreso
  const [nudgingProfile, setNudgingProfile] = useState<number | null>(null);

  const handleNudge = async (profileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (nudgingProfile) return;
    
    setNudgingProfile(profileId);
    try {
      const res = await fetch('/api/talent-directory/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      });

      const data = await res.json();
      
      if (res.ok) {
        // Actualizar el perfil localmente
        setProfiles(prev => prev.map(p => 
          p.id === profileId 
            ? { ...p, nudgeCount: data.nudgeCount, hasNudged: true }
            : p
        ));
      } else if (data.alreadyNudged) {
        // Ya dio toque, actualizar estado local
        setProfiles(prev => prev.map(p => 
          p.id === profileId ? { ...p, hasNudged: true } : p
        ));
      }
    } catch (error) {
      console.error('Error dando toque:', error);
    } finally {
      setNudgingProfile(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  // Pantalla de carga mientras verifica acceso
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Pantalla de acceso restringido
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              Contenido Exclusivo
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Programa de Liderato</span>
            </div>
            
            <p className="text-slate-400 mb-6">
              Esta sección está disponible para participantes 
              <span className="text-amber-300 font-medium">inscritos en Programa de Liderato</span> que han 
              <span className="text-emerald-300 font-medium">completado el nivel Avanzado</span>.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
            {activeSection === 'public' ? 'Directorio de Servicios' : 'Expo de Futuros Imposibles'}
          </h1>
          <p className="text-gray-400">
            {activeSection === 'public' 
              ? 'Emprendedores comprometidos listos para servirte 🔥' 
              : 'Próximos negocios preparándose para la Expo ✨'}
          </p>
        </div>

        {/* Tabs de sección */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => { setActiveSection('public'); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeSection === 'public'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <Flame className="w-5 h-5" />
            Directorio de Servicios
          </button>
          <button
            onClick={() => { setActiveSection('expo'); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeSection === 'expo'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            Expo de Futuros
          </button>
        </div>

        {/* Filtro de Visión para Expo */}
        {activeSection === 'expo' && visions.length > 0 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-xl border border-purple-500/30">
              <span className="text-purple-400 text-sm font-medium">Visión:</span>
              <select
                value={selectedVision || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedVision(value);
                }}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todas las visiones</option>
                {visions.map((vision) => (
                  <option key={vision.id} value={vision.id}>
                    {vision.nombre} {vision.id === userActiveVisionId ? '(Tu visión)' : ''} {vision.isActive ? '🟢' : ''}
                  </option>
                ))}
              </select>
              {selectedVision && selectedVision !== userActiveVisionId && userActiveVisionId && (
                <button
                  onClick={() => setSelectedVision(userActiveVisionId)}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  Ver mi visión
                </button>
              )}
            </div>
          </div>
        )}

        {/* Barra de búsqueda */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca un servicio (ej. Electricista, Abogado, Diseñador...)"
                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </form>

        {/* Filtros expandibles */}
        {showFilters && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Categoría</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name} ({cat._count.profiles})
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  {MEXICAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Ordenar por */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rating">⭐ Mejor Calificados</option>
                  <option value="verified">✅ Verificados primero</option>
                  <option value="reviews">💬 Más Reseñas</option>
                  <option value="recent">🆕 Más Recientes</option>
                </select>
              </div>

              {/* Solo verificados */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-white">Solo Graduados PL</span>
                  <Shield className="w-4 h-4 text-blue-400" />
                </label>
              </div>
            </div>

            {/* Botón limpiar */}
            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* Chips de filtros rápidos */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSortBy('rating'); fetchProfiles(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              sortBy === 'rating'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⭐ Mejor Calificados
          </button>
          <button
            onClick={() => { setSortBy('reviews'); fetchProfiles(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              sortBy === 'reviews'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💬 Con Reseñas
          </button>
        </div>

        {/* Resultados */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-400">
            {pagination.total} {activeSection === 'public' ? 'servicios' : 'negocios'} encontrados
          </p>
          <button
            onClick={() => fetchProfiles(pagination.page)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Grid de perfiles */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            {activeSection === 'public' ? (
              <>
                <Flame className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay servicios IRRAZONABLES disponibles</p>
                <p className="text-gray-500 text-sm">Los negocios que eligen ser públicos aparecerán aquí</p>
              </>
            ) : (
              <>
                <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay negocios en preparación</p>
                <p className="text-gray-500 text-sm">Los negocios para la Expo aparecerán aquí</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer ${
                  profile.isPLGraduate ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-gray-700'
                }`}
                onClick={() => router.push(`/dashboard/mercado/${profile.id}`)}
              >
                {/* Imagen de portada o logo */}
                <div className="relative h-40 bg-gradient-to-br from-gray-700 to-gray-800">
                  {profile.galleryImages?.[0] ? (
                    <Image
                      src={profile.galleryImages[0]}
                      alt={profile.headline}
                      fill
                      className="object-cover"
                    />
                  ) : profile.logoUrl ? (
                    <Image
                      src={profile.logoUrl}
                      alt={profile.headline}
                      fill
                      className="object-contain p-4"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-500" />
                      </div>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {profile.isPLGraduate && (
                      <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        PL
                      </span>
                    )}
                    {profile.isVerified && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Contador de Toques (solo en expo) */}
                  {activeSection === 'expo' && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-pink-500/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Hand className="w-3 h-3" />
                        {profile.nudgeCount || 0} toques
                      </span>
                    </div>
                  )}

                  {/* Descuento */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      {profile.discountOffer.length > 25 
                        ? profile.discountOffer.substring(0, 25) + '...' 
                        : profile.discountOffer}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  {/* Usuario y rating */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {profile.user.imagen ? (
                        <Image
                          src={profile.user.imagen}
                          alt={profile.user.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{profile.user.nombre}</p>
                      <p className="text-gray-500 text-xs truncate">
                        {profile.vision?.nombre || 'Comunidad'}
                      </p>
                    </div>
                    {profile.totalReviews > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-medium">{profile.avgRating.toFixed(1)}</span>
                        <span className="text-gray-500">({profile.totalReviews})</span>
                      </div>
                    )}
                  </div>

                  {/* Titular y categoría */}
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">
                    {profile.headline}
                  </h3>
                  <p className="text-sm text-blue-400 mb-2">
                    {profile.category.icon} {profile.category.name}
                  </p>

                  {/* Ubicación */}
                  <p className="text-gray-400 text-sm flex items-center gap-1 mb-3">
                    <MapPin className="w-4 h-4" />
                    {profile.city}, {profile.state}
                  </p>

                  {/* Descripción truncada */}
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                    {profile.description}
                  </p>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    {/* En sección expo: botón de dar toque */}
                    {activeSection === 'expo' && (
                      <button
                        onClick={(e) => handleNudge(profile.id, e)}
                        disabled={profile.hasNudged || nudgingProfile === profile.id}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          profile.hasNudged
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50 cursor-default'
                            : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25'
                        }`}
                      >
                        {nudgingProfile === profile.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Hand className={`w-5 h-5 ${profile.hasNudged ? '' : 'animate-pulse'}`} />
                        )}
                        {profile.hasNudged ? '¡Toque dado!' : '¡Dale un toque!'}
                      </button>
                    )}
                    
                    {/* En sección pública: botones de Web y WhatsApp */}
                    {activeSection === 'public' && (
                      <>
                        {profile.websiteUrl && (
                          <a
                            href={profile.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            <Globe className="w-5 h-5" />
                            Web
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(profile.whatsappPhone, profile.user.nombre);
                          }}
                          className={`${profile.websiteUrl ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors`}
                        >
                          <MessageCircle className="w-5 h-5" />
                          {profile.websiteUrl ? 'WhatsApp' : 'Contactar por WhatsApp'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => fetchProfiles(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-white">
              {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchProfiles(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
