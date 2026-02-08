'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Star,
  Check,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  QrCode,
  Loader2,
  Rocket,
  X,
  User,
  Trophy,
  Sparkles,
  Search,
  ChevronRight,
  Award,
  MessageSquare,
  Grid3X3,
  ArrowLeft,
  Filter,
  ExternalLink,
  Camera
} from 'lucide-react';

interface ExhibitorData {
  id: number;
  nombre: string;
  apellido: string;
  imagen: string | null;
  headline: string | null;
}

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
  discountOffer: string;
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

interface RatedExhibitor {
  id: string;
  exhibitorId: number;
  exhibitorName: string;
  exhibitorImage: string | null;
  rating: number;
  ratedAt: string;
}

type HiringIntent = 'YES' | 'MAYBE' | 'NO';

function CalificarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedExhibitor = searchParams.get('exhibitor');

  // Estados
  const [loading, setLoading] = useState(true);
  const [visitorName, setVisitorName] = useState('');
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  
  // Lista de expositores calificados
  const [ratedExhibitors, setRatedExhibitors] = useState<RatedExhibitor[]>([]);
  
  // Modo actual: 'hub', 'rating' o 'catalog'
  const [mode, setMode] = useState<'hub' | 'rating' | 'catalog'>('hub');
  
  // Datos del expositor actual
  const [currentExhibitor, setCurrentExhibitor] = useState<ExhibitorData | null>(null);
  const [loadingExhibitor, setLoadingExhibitor] = useState(false);
  
  // Catálogo de expositores
  const [catalogExhibitors, setCatalogExhibitors] = useState<CatalogExhibitor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [currentVisionId, setCurrentVisionId] = useState<number | null>(null);
  const [currentVisionName, setCurrentVisionName] = useState<string>('');
  
  // Formulario de calificación
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hiringIntent, setHiringIntent] = useState<HiringIntent | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Buscar expositor manualmente
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExhibitorData[]>([]);
  const [searching, setSearching] = useState(false);
  
  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Verificar registro al cargar
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('expo_visitor_token');
      const name = localStorage.getItem('expo_visitor_name');
      
      if (!token) {
        // No registrado, redirigir a inicio
        router.push('/');
        return;
      }
      
      // Verificar token
      try {
        const res = await fetch(`/api/expo/visitor/verify?token=${token}`);
        if (!res.ok) {
          localStorage.removeItem('expo_visitor_token');
          localStorage.removeItem('expo_visitor_name');
          router.push('/');
          return;
        }
        
        const data = await res.json();
        setVisitorToken(token);
        setVisitorName(data.name || name || 'Visitante');
        setRatedExhibitors(data.ratings || []);
        
        // Si hay un expositor preseleccionado, obtener su visionId y cargarlo
        if (preselectedExhibitor) {
          // Primero obtener la info del expositor incluyendo visionId
          const exhibitorRes = await fetch(`/api/expo/exhibitor/${preselectedExhibitor}`);
          if (exhibitorRes.ok) {
            const exhibitorData = await exhibitorRes.json();
            if (exhibitorData.visionId) {
              setCurrentVisionId(exhibitorData.visionId);
              setCurrentVisionName(exhibitorData.visionName || '');
            }
          }
          loadExhibitor(preselectedExhibitor);
        }
      } catch (err) {
        console.error('Error verificando token:', err);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, [router, preselectedExhibitor]);

  // Cargar datos de un expositor
  const loadExhibitor = async (exhibitorId: string) => {
    setLoadingExhibitor(true);
    setError(null);
    
    try {
      // Verificar si ya lo calificó
      const alreadyRated = ratedExhibitors.some(r => r.exhibitorId === parseInt(exhibitorId));
      if (alreadyRated) {
        setError('Ya calificaste a este expositor');
        setLoadingExhibitor(false);
        return;
      }
      
      const res = await fetch(`/api/expo/exhibitor/${exhibitorId}`);
      if (!res.ok) throw new Error('Expositor no encontrado');
      
      const data = await res.json();
      setCurrentExhibitor(data.exhibitor);
      
      // Guardar la visión del expositor para filtrar el catálogo
      if (data.visionId && !currentVisionId) {
        setCurrentVisionId(data.visionId);
        setCurrentVisionName(data.visionName || '');
      }
      
      setMode('rating');
      
      // Reset formulario
      setRating(0);
      setHiringIntent(null);
      setFeedback('');
      setSubmitted(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar expositor');
    } finally {
      setLoadingExhibitor(false);
    }
  };

  // Iniciar escáner QR
  const startScanner = async () => {
    setScannerError(null);
    setShowScanner(true);
    
    // Esperar a que el DOM se actualice
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // QR escaneado exitosamente
            console.log('QR escaneado:', decodedText);
            stopScanner();
            
            // Extraer información del QR
            // Formatos esperados:
            // - https://impactocuantico.net/expo/votar/123 (expositor individual)
            // - /expo/votar/123
            // - https://impactocuantico.net/expo/catalogo/5 (catálogo de visión)
            // - /expo/catalogo/5
            // - 123 (solo el ID del expositor)
            
            // Verificar si es un catálogo de visión
            if (decodedText.includes('/expo/catalogo/')) {
              const match = decodedText.match(/\/expo\/catalogo\/(\d+)/);
              if (match) {
                const visionId = parseInt(match[1]);
                setCurrentVisionId(visionId);
                setMode('catalog');
                loadCatalogWithVision(visionId);
                return;
              }
            }
            
            // Verificar si es un expositor individual
            let exhibitorId: string | null = null;
            
            if (decodedText.includes('/expo/votar/')) {
              const match = decodedText.match(/\/expo\/votar\/(\d+)/);
              if (match) exhibitorId = match[1];
            } else if (/^\d+$/.test(decodedText)) {
              exhibitorId = decodedText;
            }
            
            if (exhibitorId) {
              loadExhibitor(exhibitorId);
            } else {
              setError('Código QR no válido. Intenta de nuevo.');
            }
          },
          (errorMessage) => {
            // Ignorar errores de escaneo continuo
          }
        );
      } catch (err: any) {
        console.error('Error iniciando escáner:', err);
        setScannerError(err.message || 'No se pudo acceder a la cámara');
        setShowScanner(false);
      }
    }, 100);
  };

  // Detener escáner QR
  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setShowScanner(false);
  };

  // Buscar expositores
  const searchExhibitors = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`/api/expo/search-exhibitors?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.exhibitors || []);
      }
    } catch (err) {
      console.error('Error buscando:', err);
    } finally {
      setSearching(false);
    }
  };

  // Cargar catálogo de expositores (filtrado por visión)
  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      // Construir URL con filtro de visión si existe
      const params = new URLSearchParams();
      if (currentVisionId) {
        params.set('visionId', currentVisionId.toString());
      }
      
      const url = `/api/expo/catalog${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCatalogExhibitors(data.exhibitors || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Cargar catálogo con visionId específico (para cuando viene del escáner QR)
  const loadCatalogWithVision = async (visionId: number) => {
    setLoadingCatalog(true);
    try {
      const url = `/api/expo/catalog?visionId=${visionId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCatalogExhibitors(data.exhibitors || []);
        setCategories(data.categories || []);
        if (data.visionName) {
          setCurrentVisionName(data.visionName);
        }
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Filtrar exhibidores por categoría
  const filteredCatalogExhibitors = selectedCategory
    ? catalogExhibitors.filter(e => e.categoryId === selectedCategory)
    : catalogExhibitors;

  // Enviar calificación
  const submitRating = async () => {
    if (!currentExhibitor || !visitorToken) return;
    
    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }
    
    if (!hiringIntent) {
      setError('Por favor indica tu intención de contratar');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/expo/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibitorId: currentExhibitor.id,
          visitorToken,
          rating,
          hiringIntent,
          feedback: feedback.trim() || null
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar calificación');
      }
      
      // Marcar como enviado
      setSubmitted(true);
      
      // Celebración
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333ea', '#ec4899', '#22c55e']
      });
      
      // Agregar a la lista de calificados
      setRatedExhibitors(prev => [...prev, {
        id: data.reviewId,
        exhibitorId: currentExhibitor.id,
        exhibitorName: currentExhibitor.nombre,
        exhibitorImage: currentExhibitor.imagen,
        rating,
        ratedAt: new Date().toISOString()
      }]);
      
      // Volver al hub después de un momento
      setTimeout(() => {
        setMode('hub');
        setCurrentExhibitor(null);
        setSearchQuery('');
        setSearchResults([]);
      }, 2500);
      
    } catch (err: any) {
      setError(err.message || 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-purple-300">Cargando plataforma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-purple-500/30 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">¡Hola, {visitorName}!</p>
              <p className="text-purple-300 text-xs">{ratedExhibitors.length} calificaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{ratedExhibitors.length * 10}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {mode === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Título */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Plataforma de Calificaciones
                </h1>
                <p className="text-purple-300 text-sm">
                  Escanea el QR de un expositor o búscalo manualmente
                </p>
              </div>

              {/* Acciones principales */}
              <div className="grid grid-cols-2 gap-4">
                {/* Escanear QR */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startScanner}
                  className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-2xl border border-purple-500/30 text-center"
                >
                  <Camera className="w-10 h-10 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Escanear QR</p>
                  <p className="text-purple-200 text-xs mt-1">Del gafete</p>
                </motion.button>

                {/* Buscar */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => document.getElementById('search-input')?.focus()}
                  className="bg-gradient-to-br from-pink-600 to-pink-700 p-6 rounded-2xl border border-pink-500/30 text-center"
                >
                  <Search className="w-10 h-10 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Buscar</p>
                  <p className="text-pink-200 text-xs mt-1">Por nombre</p>
                </motion.button>
              </div>

              {/* Botón Ver Catálogo */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setMode('catalog');
                  loadCatalog();
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-3"
              >
                <Grid3X3 className="w-6 h-6 text-white" />
                <div className="text-left">
                  <p className="text-white font-medium">Ver Catálogo de Expositores</p>
                  <p className="text-emerald-200 text-xs">Explora todos los negocios por categoría</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white ml-auto" />
              </motion.button>

              {/* Búsqueda manual */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchExhibitors(e.target.value);
                    }}
                    placeholder="Buscar expositor por nombre..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  {searching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
                  >
                    {searchResults.map((exhibitor) => {
                      const alreadyRated = ratedExhibitors.some(r => r.exhibitorId === exhibitor.id);
                      return (
                        <button
                          key={exhibitor.id}
                          onClick={() => !alreadyRated && loadExhibitor(exhibitor.id.toString())}
                          disabled={alreadyRated}
                          className={`w-full flex items-center gap-3 p-4 border-b border-slate-700/50 last:border-b-0 transition-colors ${
                            alreadyRated
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-700/30'
                          }`}
                        >
                          <img
                            src={exhibitor.imagen || '/default-avatar.png'}
                            alt={exhibitor.nombre}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">
                              {exhibitor.nombre}
                            </p>
                            {exhibitor.headline && (
                              <p className="text-slate-400 text-sm truncate">
                                {exhibitor.headline}
                              </p>
                            )}
                          </div>
                          {alreadyRated ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {/* Lista de calificados */}
              {ratedExhibitors.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Tus Calificaciones ({ratedExhibitors.length})
                  </h2>
                  <div className="space-y-2">
                    {ratedExhibitors.map((rated) => (
                      <div
                        key={rated.id}
                        className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-3"
                      >
                        <img
                          src={rated.exhibitorImage || '/default-avatar.png'}
                          alt={rated.exhibitorName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{rated.exhibitorName}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= rated.rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : mode === 'catalog' ? (
            /* ===== CATÁLOGO DE EXPOSITORES ===== */
            <motion.div
              key="catalog"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Header del catálogo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMode('hub');
                    setSelectedCategory(null);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-purple-400 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Catálogo de Expositores</h1>
                  <p className="text-purple-300 text-sm">
                    {catalogExhibitors.length} negocios disponibles
                    {currentVisionName && (
                      <span className="ml-1">• {currentVisionName}</span>
                    )}
                  </p>
                </div>
              </div>

              {loadingCatalog ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Cargando catálogo...</p>
                </div>
              ) : (
                <>
                  {/* Filtros por categoría */}
                  {categories.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-300 text-sm">
                        <Filter className="w-4 h-4" />
                        <span>Filtrar por área:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === null
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Todas ({catalogExhibitors.length})
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedCategory === cat.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {cat.icon} {cat.name} ({cat.count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de expositores */}
                  <div className="space-y-3">
                    {filteredCatalogExhibitors.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No hay expositores en esta categoría
                      </div>
                    ) : (
                      filteredCatalogExhibitors.map((exhibitor) => {
                        const alreadyRated = ratedExhibitors.some(r => r.exhibitorId === exhibitor.userId);
                        return (
                          <motion.div
                            key={exhibitor.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
                          >
                            {/* Header con imagen y nombre */}
                            <div className="p-4 flex items-start gap-4">
                              <img
                                src={exhibitor.logoUrl || exhibitor.userImage || '/default-avatar.png'}
                                alt={exhibitor.headline}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500/30"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate">{exhibitor.headline}</h3>
                                <p className="text-purple-300 text-sm">{exhibitor.userName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                                    {exhibitor.categoryIcon} {exhibitor.categoryName}
                                  </span>
                                  {exhibitor.avgRating > 0 && (
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                      <Star className="w-3 h-3 fill-yellow-400" />
                                      <span>{exhibitor.avgRating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {alreadyRated && (
                                <div className="p-2 rounded-full bg-emerald-500/20">
                                  <Check className="w-5 h-5 text-emerald-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Descripción */}
                            <div className="px-4 pb-3">
                              <p className="text-slate-400 text-sm line-clamp-2">{exhibitor.description}</p>
                            </div>
                            
                            {/* Info adicional */}
                            {(exhibitor.city || exhibitor.whatsappPhone) && (
                              <div className="px-4 pb-3 flex items-center gap-4 text-xs text-slate-500">
                                {exhibitor.city && (
                                  <span className="flex items-center gap-1">
                                    📍 {exhibitor.city}
                                  </span>
                                )}
                                {exhibitor.whatsappPhone && (
                                  <span className="flex items-center gap-1">
                                    📱 {exhibitor.whatsappPhone}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Descuento */}
                            {exhibitor.discountOffer && (
                              <div className="px-4 pb-3">
                                <span className="text-xs text-emerald-400">
                                  🎁 {exhibitor.discountOffer}
                                </span>
                              </div>
                            )}
                            
                            {/* Botones de acción */}
                            <div className="px-4 pb-4 flex items-center gap-2">
                              {/* Botón Ver Página */}
                              {exhibitor.website && (
                                <a
                                  href={exhibitor.website.startsWith('http') ? exhibitor.website : `https://${exhibitor.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-all text-center flex items-center justify-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Ver Página
                                </a>
                              )}
                              
                              {/* Botón Calificar */}
                              <button
                                onClick={() => !alreadyRated && loadExhibitor(exhibitor.userId.toString())}
                                disabled={alreadyRated}
                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  alreadyRated
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                                }`}
                              >
                                {alreadyRated ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Ya calificado
                                  </>
                                ) : (
                                  <>
                                    <Star className="w-4 h-4" />
                                    Calificar
                                  </>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            /* ===== MODO RATING ===== */
            <motion.div
              key="rating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Botón volver */}
              <button
                onClick={() => {
                  setMode('hub');
                  setCurrentExhibitor(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300"
              >
                ← Volver al inicio
              </button>

              {loadingExhibitor ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Cargando expositor...</p>
                </div>
              ) : currentExhibitor && (
                <>
                  {/* Header del expositor */}
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <img
                        src={currentExhibitor.imagen || '/default-avatar.png'}
                        alt={currentExhibitor.nombre}
                        className="w-full h-full rounded-full object-cover border-4 border-purple-500/50 shadow-2xl shadow-purple-500/30"
                      />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {currentExhibitor.nombre}
                    </h2>
                    {currentExhibitor.headline && (
                      <p className="text-purple-300 text-sm">{currentExhibitor.headline}</p>
                    )}
                  </div>

                  {/* Mensaje de éxito */}
                  {submitted ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-emerald-900/50 rounded-2xl p-8 border border-emerald-500/30 text-center"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        ¡Gracias por tu calificación!
                      </h3>
                      <p className="text-emerald-300">
                        Tu opinión es muy valiosa
                      </p>
                    </motion.div>
                  ) : (
                    /* Formulario de calificación */
                    <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-700/50 space-y-6">
                      {/* Estrellas */}
                      <div>
                        <p className="text-white font-medium mb-3 text-center">
                          ¿Cómo calificarías su presentación?
                        </p>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                              key={star}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(star)}
                              className="p-1"
                            >
                              <Star
                                className={`w-10 h-10 transition-colors ${
                                  star <= (hoverRating || rating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-slate-600'
                                }`}
                              />
                            </motion.button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-yellow-400 text-sm mt-2"
                          >
                            {rating === 1 && '😐 Necesita mejorar'}
                            {rating === 2 && '🙂 Regular'}
                            {rating === 3 && '👍 Bueno'}
                            {rating === 4 && '🌟 Muy bueno'}
                            {rating === 5 && '🔥 ¡Excelente!'}
                          </motion.p>
                        )}
                      </div>

                      {/* Intención de contratar */}
                      <div>
                        <p className="text-white font-medium mb-3 text-center">
                          ¿Te interesaría contratar sus servicios?
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setHiringIntent('YES')}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              hiringIntent === 'YES'
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500/50'
                            }`}
                          >
                            <ThumbsUp className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-medium">¡Sí!</p>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setHiringIntent('MAYBE')}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              hiringIntent === 'MAYBE'
                                ? 'bg-yellow-600 border-yellow-400 text-white'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-yellow-500/50'
                            }`}
                          >
                            <HelpCircle className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-medium">Tal vez</p>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setHiringIntent('NO')}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              hiringIntent === 'NO'
                                ? 'bg-slate-600 border-slate-400 text-white'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500/50'
                            }`}
                          >
                            <ThumbsDown className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-medium">No</p>
                          </motion.button>
                        </div>
                      </div>

                      {/* Comentario opcional */}
                      <div>
                        <label className="text-white font-medium mb-2 block flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                          Comentario (opcional)
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Deja un mensaje para el expositor..."
                          rows={3}
                          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Error */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}

                      {/* Botón enviar */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={submitRating}
                        disabled={submitting || rating === 0 || !hiringIntent}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Enviar Calificación
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal del Escáner QR */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80">
              <h2 className="text-white font-bold text-lg">Escanear Código QR</h2>
              <button
                onClick={stopScanner}
                className="p-2 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500/30"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Área del escáner */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden" />
              
              {scannerError && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
                  <p className="text-red-400">{scannerError}</p>
                  <button
                    onClick={() => {
                      setScannerError(null);
                      startScanner();
                    }}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <p className="text-purple-300 text-sm mt-4 text-center">
                Apunta la cámara al código QR del gafete del expositor
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/80">
              <button
                onClick={stopScanner}
                className="w-full py-3 bg-slate-700 text-white rounded-xl font-medium"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-purple-500/30 px-4 py-3">
        <div className="max-w-md mx-auto text-center">
          <p className="text-slate-600 text-xs">
            Powered by <span className="text-purple-400">Quantum AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CalificarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-purple-300">Cargando...</p>
        </div>
      </div>
    }>
      <CalificarContent />
    </Suspense>
  );
}
