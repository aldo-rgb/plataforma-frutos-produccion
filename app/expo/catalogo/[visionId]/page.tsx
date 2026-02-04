'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Star,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Phone,
  ArrowRight,
  Sparkles,
  Users,
  Award,
  Loader2,
  UserPlus,
  X,
  Check
} from 'lucide-react';

interface CatalogExhibitor {
  id: number;
  userId: number;
  headline: string;
  description: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  userName: string;
  userImage: string | null;
  logoUrl: string | null;
  status: string;
  isReadyForBusiness: boolean;
  avgRating: number;
  totalReviews: number;
  website: string | null;
  city: string | null;
  whatsappPhone: string | null;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  count: number;
}

interface VisionInfo {
  id: number;
  nombre: string;
  organizacion: string;
}

export default function CatalogoExpoPage({ params }: { params: Promise<{ visionId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const visionId = parseInt(resolvedParams.visionId);

  // Estados
  const [loading, setLoading] = useState(true);
  const [exhibitors, setExhibitors] = useState<CatalogExhibitor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visionInfo, setVisionInfo] = useState<VisionInfo | null>(null);
  
  // Pre-registro
  const [showPreRegister, setShowPreRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [referrerSearch, setReferrerSearch] = useState('');
  const [referrerResults, setReferrerResults] = useState<any[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null);
  const [searchingReferrer, setSearchingReferrer] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  
  // Modal de detalles
  const [selectedExhibitor, setSelectedExhibitor] = useState<CatalogExhibitor | null>(null);
  useEffect(() => {
    loadCatalog();
    loadVisionInfo();
  }, [visionId]);

  const loadVisionInfo = async () => {
    try {
      const response = await fetch(`/api/expo/vision-info?visionId=${visionId}`);
      const data = await response.json();
      if (data.success) {
        setVisionInfo(data.vision);
      }
    } catch (error) {
      console.error('Error cargando info de visión:', error);
    }
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/expo/catalog?visionId=${visionId}`);
      const data = await response.json();
      
      setExhibitors(data.exhibitors || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar referidor
  const searchReferrer = async (query: string) => {
    setReferrerSearch(query);
    if (query.length < 2) {
      setReferrerResults([]);
      return;
    }

    setSearchingReferrer(true);
    try {
      const response = await fetch(`/api/expo/search-referrer?query=${encodeURIComponent(query)}&visionId=${visionId}`);
      const data = await response.json();
      setReferrerResults(data.users || []);
    } catch (error) {
      console.error('Error buscando referidor:', error);
    } finally {
      setSearchingReferrer(false);
    }
  };

  // Registrar visitante
  const handlePreRegister = async () => {
    if (!registerName.trim()) {
      setRegisterError('Por favor ingresa tu nombre');
      return;
    }

    setRegistering(true);
    setRegisterError('');

    try {
      const response = await fetch('/api/expo/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim() || undefined,
          phone: registerPhone.trim() || undefined,
          referrerId: selectedReferrer?.id || undefined,
          referrerName: selectedReferrer?.nombre || undefined,
          relationship: 'visitor',
          firstExhibitorId: selectedReferrer?.id || exhibitors[0]?.userId || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar token y redirigir
        localStorage.setItem('expo_visitor_token', data.token);
        localStorage.setItem('expo_visitor_name', registerName.trim());
        
        // Redirigir al proceso de calificación
        if (selectedReferrer) {
          router.push(`/expo/calificar?exhibitor=${selectedReferrer.id}`);
        } else {
          // Ir al primer expositor del catálogo
          const firstExhibitor = exhibitors[0];
          if (firstExhibitor) {
            router.push(`/expo/calificar?exhibitor=${firstExhibitor.userId}`);
          } else {
            router.push(`/expo/calificar`);
          }
        }
      } else {
        setRegisterError(data.error || 'Error al registrarse');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      setRegisterError('Error de conexión');
    } finally {
      setRegistering(false);
    }
  };

  // Filtrar expositores
  const filteredExhibitors = exhibitors.filter(ex => {
    const matchCategory = !selectedCategory || ex.categoryId === selectedCategory;
    const matchSearch = !searchQuery || 
      ex.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Sparkles className="w-8 h-8 text-yellow-300" />
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Expo de Futuros Imposibles
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </motion.div>
          
          {visionInfo && (
            <p className="text-orange-100 text-lg">
              {visionInfo.nombre} • {visionInfo.organizacion}
            </p>
          )}
          
          <p className="text-orange-200/80 mt-2">
            Conoce a nuestros emprendedores y sus negocios
          </p>
        </div>
      </div>

      {/* Botón Pre-registro flotante */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-orange-500/30 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-5 h-5" />
            <span className="text-sm">{exhibitors.length} expositores</span>
          </div>
          
          <button
            onClick={() => setShowPreRegister(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span>Pre-registro Express</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Búsqueda */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar negocio o emprendedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !selectedCategory
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({exhibitors.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-xs opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Expositores */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredExhibitors.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No se encontraron expositores</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExhibitors.map((exhibitor, index) => (
              <motion.div
                key={exhibitor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedExhibitor(exhibitor)}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all group cursor-pointer"
              >
                {/* Header con imagen */}
                <div className="relative h-32 bg-gradient-to-br from-orange-600/20 to-purple-600/20">
                  {exhibitor.logoUrl ? (
                    <Image
                      src={exhibitor.logoUrl}
                      alt={exhibitor.headline}
                      fill
                      className="object-cover"
                    />
                  ) : exhibitor.userImage ? (
                    <Image
                      src={exhibitor.userImage}
                      alt={exhibitor.userName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">{exhibitor.categoryIcon}</span>
                    </div>
                  )}
                  
                  {/* Badge categoría */}
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-medium text-white flex items-center gap-1">
                    <span>{exhibitor.categoryIcon}</span>
                    <span>{exhibitor.categoryName}</span>
                  </div>

                  {/* Rating */}
                  {exhibitor.totalReviews > 0 && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-500/90 rounded-full text-xs font-bold text-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{exhibitor.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                    {exhibitor.headline}
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    por {exhibitor.userName}
                  </p>

                  {exhibitor.description && (
                    <p className="text-sm text-slate-300 line-clamp-2 mb-3">
                      {exhibitor.description}
                    </p>
                  )}

                  {/* Info adicional */}
                  <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {exhibitor.city && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {exhibitor.city}
                      </span>
                    )}
                    {exhibitor.totalReviews > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Award className="w-3 h-3" />
                        {exhibitor.totalReviews} votos
                      </span>
                    )}
                  </div>

                  {/* Status del negocio */}
                  <div className={`rounded-lg px-3 py-2 mb-4 ${
                    exhibitor.isReadyForBusiness 
                      ? 'bg-emerald-500/20 border border-emerald-500/30' 
                      : 'bg-blue-500/20 border border-blue-500/30'
                  }`}>
                    <p className={`text-sm font-medium ${
                      exhibitor.isReadyForBusiness ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {exhibitor.isReadyForBusiness 
                        ? '✅ Listo para ser contratado' 
                        : '🚀 Negocio en emprendimiento'}
                    </p>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2">
                    {exhibitor.website && (
                      <a
                        href={exhibitor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver Página
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReferrer({ id: exhibitor.userId, nombre: exhibitor.userName });
                        setShowPreRegister(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      <Star className="w-4 h-4" />
                      Calificar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detalles del Expositor */}
      <AnimatePresence>
        {selectedExhibitor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExhibitor(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header con imagen */}
              <div className="relative h-48 bg-gradient-to-br from-orange-600/30 to-purple-600/30">
                {selectedExhibitor.logoUrl ? (
                  <Image
                    src={selectedExhibitor.logoUrl}
                    alt={selectedExhibitor.headline}
                    fill
                    className="object-cover"
                  />
                ) : selectedExhibitor.userImage ? (
                  <Image
                    src={selectedExhibitor.userImage}
                    alt={selectedExhibitor.userName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl">{selectedExhibitor.categoryIcon}</span>
                  </div>
                )}
                
                {/* Botón cerrar */}
                <button
                  onClick={() => setSelectedExhibitor(null)}
                  className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                {/* Badge categoría */}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-sm font-medium text-white flex items-center gap-2">
                  <span>{selectedExhibitor.categoryIcon}</span>
                  <span>{selectedExhibitor.categoryName}</span>
                </div>

                {/* Rating */}
                {selectedExhibitor.totalReviews > 0 && (
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-yellow-500/90 rounded-full text-sm font-bold text-black flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{selectedExhibitor.avgRating.toFixed(1)}</span>
                    <span className="text-xs font-normal">({selectedExhibitor.totalReviews})</span>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {selectedExhibitor.headline}
                </h2>
                <p className="text-slate-400 mb-4">
                  por {selectedExhibitor.userName}
                </p>

                {/* Descripción completa */}
                {selectedExhibitor.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Acerca del negocio</h3>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedExhibitor.description}
                    </p>
                  </div>
                )}

                {/* Info adicional */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {selectedExhibitor.city && (
                    <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                      <MapPin className="w-4 h-4" />
                      {selectedExhibitor.city}
                    </span>
                  )}
                  {selectedExhibitor.whatsappPhone && (
                    <a 
                      href={`https://wa.me/${selectedExhibitor.whatsappPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-emerald-400 bg-emerald-500/20 px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                  {selectedExhibitor.totalReviews > 0 && (
                    <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                      <Award className="w-4 h-4" />
                      {selectedExhibitor.totalReviews} votos
                    </span>
                  )}
                </div>

                {/* Status del negocio */}
                <div className={`rounded-xl px-4 py-3 mb-6 ${
                  selectedExhibitor.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-blue-500/20 border border-blue-500/30'
                }`}>
                  <p className={`font-medium ${
                    selectedExhibitor.status === 'ACTIVE'
                      ? 'text-emerald-400'
                      : 'text-blue-400'
                  }`}>
                    {selectedExhibitor.status === 'ACTIVE'
                      ? '✓ Listo para ser contratado'
                      : '🚀 Negocio en emprendimiento'}
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  {selectedExhibitor.website && (
                    <a
                      href={selectedExhibitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Ver Página
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSelectedExhibitor(null);
                      setSelectedReferrer({ id: selectedExhibitor.userId, nombre: selectedExhibitor.userName });
                      setShowPreRegister(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl transition-all font-medium"
                  >
                    <Star className="w-5 h-5" />
                    Calificar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pre-registro */}
      <AnimatePresence>
        {showPreRegister && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreRegister(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-emerald-500" />
                  Pre-registro Express
                </h2>
                <button
                  onClick={() => setShowPreRegister(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-6">
                Regístrate para poder calificar a los emprendedores y participar en la expo
              </p>

              {/* Referidor seleccionado */}
              {selectedReferrer && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-orange-400 text-sm font-medium">Calificarás a:</p>
                    <p className="text-white font-bold">{selectedReferrer.nombre}</p>
                  </div>
                  <button
                    onClick={() => setSelectedReferrer(null)}
                    className="p-1 hover:bg-orange-500/20 rounded"
                  >
                    <X className="w-4 h-4 text-orange-400" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tu nombre completo *
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Email (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Teléfono (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Teléfono <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="33 1234 5678"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Buscar referidor (si no hay seleccionado) */}
                {!selectedReferrer && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      ¿Quién te invitó? <span className="text-slate-500">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={referrerSearch}
                        onChange={(e) => searchReferrer(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {searchingReferrer && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                      )}
                    </div>
                    
                    {/* Resultados de búsqueda */}
                    {referrerResults.length > 0 && (
                      <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl max-h-40 overflow-y-auto">
                        {referrerResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedReferrer(user);
                              setReferrerSearch('');
                              setReferrerResults([]);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-700 text-white text-sm flex items-center gap-2"
                          >
                            <Check className="w-4 h-4 text-emerald-500" />
                            {user.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {registerError && (
                  <p className="text-red-400 text-sm">{registerError}</p>
                )}

                {/* Botón registrar */}
                <button
                  onClick={handlePreRegister}
                  disabled={registering || !registerName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Registrarme y Continuar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
