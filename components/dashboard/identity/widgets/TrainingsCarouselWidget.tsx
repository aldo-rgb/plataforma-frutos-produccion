'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Calendar, MapPin, Users, ChevronLeft, ChevronRight,
  Sparkles, Clock, Ticket, ExternalLink
} from 'lucide-react';

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

export default function TrainingsCarouselWidget() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

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
    if (products.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }
  };

  const prevSlide = () => {
    if (products.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
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
        return 'Potencial de Líderes';
      default:
        return levelType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return { label: 'Inscripciones Abiertas', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
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

  if (products.length === 0) {
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

  const currentProduct = products[currentIndex];
  const statusBadge = getStatusBadge(currentProduct.trainingStatus || 'PENDING');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-700/50 relative overflow-hidden"
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
              {products.length} programa{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Navigation arrows */}
        {products.length > 1 && (
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
            className="space-y-3"
          >
            {/* Product Card */}
            <div className={`bg-gradient-to-br ${getLevelColor(currentProduct.levelType)} p-0.5 rounded-xl`}>
              <div className="bg-slate-900/95 rounded-xl p-3">
                {/* Level badge & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${getLevelColor(currentProduct.levelType)} text-white`}>
                    {getLevelLabel(currentProduct.levelType)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Product Name */}
                <h4 className="font-bold text-white text-base mb-1 line-clamp-1">
                  {currentProduct.name}
                </h4>

                {/* Vision Name if exists */}
                {currentProduct.visionName && (
                  <p className="text-xs text-violet-400 mb-2">
                    Visión: {currentProduct.visionName}
                  </p>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatDate(currentProduct.startDate)}</span>
                  </div>
                  
                  {currentProduct.location && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{currentProduct.location}</span>
                    </div>
                  )}
                  
                  {currentProduct.availableSpots !== null && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{currentProduct.availableSpots} lugares</span>
                    </div>
                  )}
                  
                  {currentProduct.basePrice !== null && currentProduct.basePrice > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>${(currentProduct.promoPrice || currentProduct.basePrice).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                {currentProduct.trainingStatus === 'REGISTRATION_OPEN' && (
                  <button
                    onClick={() => window.location.href = `/dashboard/entrenamientos/${currentProduct.id}`}
                    className="w-full mt-3 py-2 px-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Más información</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {products.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'bg-violet-400 w-4' 
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
