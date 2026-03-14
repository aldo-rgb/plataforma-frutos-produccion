'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Calendar, MapPin, Users, ChevronLeft, ChevronRight,
  Sparkles, Clock, Ticket, ExternalLink, Share2, MessageCircle, UserPlus, Check, Copy
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import PersonalQRWidget from '../../PersonalQRWidget';

interface Product {
  id: number;
  name: string;
  description?: string;
  levelType: string;
  type: string;
  trainingStatus: string;
  startDate: string | null;
  endDate: string | null;
  registrationOpenDate: string | null;
  basePrice: number | null;
  promoPrice: number | null;
  promoDeadline: string | null;
  maxCapacity: number | null;
  currentEnrollment: number | null;
  availableSpots: number | null;
  imageUrl: string | null;
  location: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  visionId: number | null;
  visionName: string | null;
}

// Un slide puede ser una visión completa o un taller individual
interface Slide {
  type: 'vision' | 'workshop';
  visionName?: string;
  visionId?: number;
  products?: Product[]; // Para visión: BASIC, ADVANCED, PL
  workshop?: Product;   // Para taller individual
}

export default function TrainingsCarouselWidget() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchUserReferralCode();
  }, []);

  // Obtener el referralCode del usuario actual
  const fetchUserReferralCode = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      console.log('🔍 ReferralCode del usuario:', data.user?.referralCode);
      if (data.user?.referralCode) {
        setUserReferralCode(data.user.referralCode);
      }
    } catch (error) {
      console.error('Error fetching user referral code:', error);
    }
  };

  // Función para compartir taller usando Web Share API nativo
  const handleShareWorkshop = async (workshop: Product) => {
    // Usar URL fija de producción con referral code
    const baseUrl = 'https://www.impactocuantico.com';
    const referralParam = userReferralCode ? `?ref=${userReferralCode}` : '';
    const shareUrl = `${baseUrl}/evento/${workshop.id}${referralParam}`;
    
    // Mensaje especial para Samurai Game
    const isSamuraiGame = workshop.name.toLowerCase().includes('samurai');
    
    let shareTitle: string;
    let shareText: string;
    
    if (isSamuraiGame) {
      shareTitle = 'Samurai Game';
      shareText = `Te hago una pregunta...

Si durante 48 horas pusieras a prueba tu disciplina, tu palabra y tu liderazgo…

¿Descubrirías a un ser comprometido o a tus excusas?

Abrimos lugares para Samurai Game.

📅 ${formatDate(workshop.startDate)}
📍 ${workshop.location || 'Por confirmar'}

Si quieres ver de qué se trata: ${shareUrl}`;
    } else {
      shareTitle = `¡Te invito a "${workshop.name}"!`;
      shareText = `¡Te invito a "${workshop.name}"!

Un espacio para abrir posibilidades a tu vida.

📅 ${formatDate(workshop.startDate)}
📍 ${workshop.location || 'Por confirmar'}

👉 Regístrate aquí: ${shareUrl}`;
    }

    // Intentar usar Web Share API nativo (funciona en móviles)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return; // Éxito, no hacer nada más
      } catch (error) {
        // Usuario canceló o error - continuar con fallback
        console.log('Share cancelled or failed, using fallback');
      }
    }
    
    // Fallback: Copiar al portapapeles y mostrar mensaje
    try {
      await navigator.clipboard.writeText(shareText);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 3000);
    } catch (error) {
      // Último recurso: abrir WhatsApp web
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // Autoplay del carrusel
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000); // Cambiar cada 5 segundos

    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  useEffect(() => {
    // Procesar productos en slides
    if (products.length === 0) return;

    const newSlides: Slide[] = [];
    
    // Agrupar CORE_TRAINING por visionId
    const coreTrainings = products.filter(p => p.type === 'CORE_TRAINING');
    const workshops = products.filter(p => p.type === 'EXTRA_WORKSHOP');
    
    // PRIMERO: Agregar talleres como slides individuales (ordenados por fecha)
    const sortedWorkshops = [...workshops].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return dateA - dateB;
    });
    
    sortedWorkshops.forEach(workshop => {
      newSlides.push({
        type: 'workshop',
        workshop,
      });
    });

    // DESPUÉS: Agrupar visiones por visionId
    const visionMap = new Map<number, Product[]>();
    coreTrainings.forEach(p => {
      if (p.visionId) {
        if (!visionMap.has(p.visionId)) {
          visionMap.set(p.visionId, []);
        }
        visionMap.get(p.visionId)!.push(p);
      }
    });

    // Ordenar visiones por fecha de inicio del básico
    const sortedVisions = Array.from(visionMap.entries()).sort((a, b) => {
      const basicA = a[1].find(p => p.levelType === 'BASIC');
      const basicB = b[1].find(p => p.levelType === 'BASIC');
      const dateA = basicA?.startDate ? new Date(basicA.startDate).getTime() : Infinity;
      const dateB = basicB?.startDate ? new Date(basicB.startDate).getTime() : Infinity;
      return dateA - dateB;
    });

    // Solo agregar la primera visión (la más próxima)
    if (sortedVisions.length > 0) {
      const [visionId, visionProducts] = sortedVisions[0];
      // Ordenar: BASIC, ADVANCED, PL
      const levelOrder = { 'BASIC': 0, 'ADVANCED': 1, 'PL': 2 };
      visionProducts.sort((a, b) => 
        (levelOrder[a.levelType as keyof typeof levelOrder] || 3) - 
        (levelOrder[b.levelType as keyof typeof levelOrder] || 3)
      );
      
      newSlides.push({
        type: 'vision',
        visionId,
        visionName: visionProducts[0]?.visionName || `Visión ${visionId}`,
        products: visionProducts,
      });
    }

    setSlides(newSlides);
  }, [products]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/me/organization-products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (slides.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }
  };

  const prevSlide = () => {
    if (slides.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const getLevelColor = (levelType: string) => {
    switch (levelType) {
      case 'BASIC':
        return 'from-emerald-500 to-teal-600';
      case 'ADVANCED':
        return 'from-violet-500 to-purple-600';
      case 'PL':
        return 'from-amber-500 to-orange-600';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  const getLevelLabel = (levelType: string) => {
    switch (levelType) {
      case 'BASIC':
        return 'Básico';
      case 'ADVANCED':
        return 'Avanzado';
      case 'PL':
        return 'Liderato';
      default:
        return levelType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return { label: 'Abierto', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'IN_PROGRESS':
        return { label: 'En Curso', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'PENDING':
        return { label: 'Próximamente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'FINISHED':
        return { label: 'Finalizado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
      default:
        return { label: status, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Por definir';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-700/50 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-700 rounded-xl" />
          <div className="h-5 w-40 bg-slate-700 rounded" />
        </div>
        <div className="h-32 bg-slate-700/50 rounded-xl" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">Entrenamientos</h3>
            <p className="text-xs text-slate-400">Próximos programas</p>
          </div>
        </div>
        <div className="text-center py-6 text-slate-400 text-sm">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p>No hay entrenamientos programados</p>
          <p className="text-xs mt-1">Pronto habrá nuevas fechas</p>
        </div>
      </motion.div>
    );
  }

  const currentSlide = slides[currentIndex];

  // Renderizar slide de visión completa
  const renderVisionSlide = (slide: Slide) => {
    const basicProduct = slide.products?.find(p => p.levelType === 'BASIC');
    
    // Ordenar productos: BASIC primero, luego ADVANCED, luego PL
    const levelOrder = { 'BASIC': 0, 'ADVANCED': 1, 'PL': 2 };
    const sortedProducts = [...(slide.products || [])].sort((a, b) => 
      (levelOrder[a.levelType as keyof typeof levelOrder] ?? 3) - 
      (levelOrder[b.levelType as keyof typeof levelOrder] ?? 3)
    );
    
    return (
      <div className="bg-gradient-to-br from-blue-600/20 to-slate-800/20 p-0.5 rounded-xl">
        <div className="bg-slate-900/95 rounded-xl overflow-hidden relative h-64 sm:h-80 md:h-96">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/CORO2.png"
              alt="Vision Background"
              fill
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-blue-900/30" />
          </div>
          
          <div className="relative p-3 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                🎯 Próxima Visión
              </span>
              {basicProduct && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(basicProduct.trainingStatus).color}`}>
                  {getStatusBadge(basicProduct.trainingStatus).label}
                </span>
              )}
            </div>

            {/* Vision Name */}
            <h4 className="font-bold text-white text-sm mb-2 line-clamp-1">
              {slide.visionName}
            </h4>

            {/* Levels Timeline - Ordenado: Básico, Avanzado, Liderato */}
            <div className="space-y-1.5 flex-1 overflow-hidden">
              {sortedProducts.map((product) => (
                <div 
                  key={product.id} 
                  className={`flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r ${getLevelColor(product.levelType)}/10 border border-${product.levelType === 'BASIC' ? 'emerald' : product.levelType === 'ADVANCED' ? 'violet' : 'amber'}-500/20 backdrop-blur-sm`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded bg-gradient-to-r ${getLevelColor(product.levelType)} text-white`}>
                      {getLevelLabel(product.levelType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(product.startDate)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Location and Share Button */}
            <div className="flex items-center justify-between mt-1.5">
              {basicProduct?.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{basicProduct.location}</span>
                </div>
              )}
              {/* Botón Invitar */}
              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-medium rounded-lg transition-all"
              >
                <UserPlus className="w-3 h-3" />
                <span>Invitar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar slide de taller con imagen
  const renderWorkshopSlide = (workshop: Product) => {
    const statusBadge = getStatusBadge(workshop.trainingStatus || 'PENDING');
    
    return (
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 p-0.5 rounded-xl">
        <div className="bg-slate-900/95 rounded-xl overflow-hidden">
          {/* Workshop Image with all content inside */}
          <div className="relative h-64 sm:h-80 md:h-96 w-full">
            {workshop.imageUrl ? (
              <Image
                src={workshop.imageUrl}
                alt={workshop.name}
                fill
                className="object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            
            {/* Top badges */}
            <div className="absolute top-2 left-2">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
                🎪 Taller
              </span>
            </div>
            <div className="absolute top-2 right-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            
            {/* Content at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h4 className="font-bold text-white text-sm mb-2 line-clamp-1">
                {workshop.name}
              </h4>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(workshop.startDate)}</span>
                </div>
                
                {workshop.location && (
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{workshop.location.split(',')[0]}</span>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = `/evento/${workshop.id}`}
                  className="flex-1 py-1.5 px-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-all"
                >
                  <span>Ver detalles</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                
                {/* Share Button */}
                <button
                  onClick={() => handleShareWorkshop(workshop)}
                  className="py-1.5 px-3 bg-green-500 hover:bg-green-400 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-all"
                  title="Compartir por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Invitar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-700/50 relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">Entrenamientos</h3>
            <p className="text-xs text-slate-400">
              {slides.length} programa{slides.length !== 1 ? 's' : ''} disponible{slides.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Navigation arrows */}
        {slides.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={prevSlide}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={nextSlide}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Content */}
      <div ref={carouselRef} className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentSlide.type === 'vision' 
              ? renderVisionSlide(currentSlide)
              : renderWorkshopSlide(currentSlide.workshop!)
            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex 
                  ? slide.type === 'vision' ? 'bg-violet-400 w-4' : 'bg-orange-400 w-4'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Modal de QR para invitar */}
      {showQRModal && session?.user && (
        <PersonalQRWidget
          userName={session.user.name || 'Usuario'}
          userId={parseInt(session.user.id || '0')}
          userEmail={session.user.email || ''}
          referralCode={userReferralCode || undefined}
          organizationId={session.user.organizationId ? parseInt(session.user.organizationId) : null}
          autoOpen={true}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Toast de mensaje copiado */}
      <AnimatePresence>
        {showCopiedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30">
              <div className="bg-white/20 rounded-full p-2">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">¡Mensaje copiado!</p>
                <p className="text-sm text-emerald-100">Pégalo en WhatsApp o cualquier app</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
