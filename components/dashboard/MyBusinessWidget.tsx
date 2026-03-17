'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Store, Star, ExternalLink, ArrowRight, Loader2, 
  Plus, Eye, MessageSquare, TrendingUp, Sparkles,
  MapPin, Phone, Globe, CheckCircle, Award
} from 'lucide-react';

interface BusinessData {
  hasWebsite: boolean;
  website?: {
    id: number;
    slug: string;
    businessName: string;
    logoUrl: string | null;
    isPublished: boolean;
    viewCount: number;
  };
  hasProfile: boolean;
  profile?: {
    id: number;
    headline: string;
    description: string;
    logoUrl: string | null;
    galleryImages: string[];
    avgRating: number;
    totalReviews: number;
    status: string;
    city: string;
    state: string;
    whatsappPhone: string;
    website: string | null;
    isVerified: boolean;
    isPLGraduate: boolean;
    BusinessCategory: {
      id: number;
      name: string;
      icon: string | null;
    };
  };
}

export default function MyBusinessWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BusinessData | null>(null);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const res = await fetch('/api/me/business-info');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 shadow-lg h-full">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
    );
  }

  // Si no tiene negocio, mostrar CTA para crear
  if (!data?.hasWebsite && !data?.hasProfile) {
    return (
      <Link href="/dashboard/mi-negocio">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer h-full">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 blur-xl" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <Store className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              🏪 Crea Tu Negocio
            </h3>
            
            <p className="text-white/90 text-sm mb-6 leading-relaxed">
              Publica tu negocio en el Directorio de Servicios y crea tu página web profesional con IA.
            </p>

            <div className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg">
              <Plus className="w-4 h-4" />
              <span>Crear Mi Negocio</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Si tiene negocio, mostrar info y acceso
  const website = data?.website;
  const profile = data?.profile;
  
  // Determinar el logo a mostrar (prioridad: website > profile)
  const logoUrl = website?.logoUrl || profile?.logoUrl;
  const businessName = website?.businessName || profile?.headline || 'Tu Negocio';
  // Primera imagen de galería como fallback
  const galleryImage = profile?.galleryImages?.[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-lg h-full">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 blur-xl" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 ring-2 ring-white/30">
                <Image 
                  src={logoUrl} 
                  alt={businessName}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : galleryImage ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 ring-2 ring-white/30">
                <Image 
                  src={galleryImage} 
                  alt={businessName}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="p-3 bg-white/20 rounded-xl ring-2 ring-white/30">
                <Store className="w-7 h-7 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg line-clamp-1">
                  {businessName}
                </h3>
                {profile?.isVerified && (
                  <CheckCircle className="w-4 h-4 text-blue-300 flex-shrink-0" />
                )}
                {profile?.isPLGraduate && (
                  <Award className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                )}
              </div>
              {profile && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${star <= Math.round(profile.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-white/80 text-xs">
                    {profile.avgRating.toFixed(1)} ({profile.totalReviews})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category & Location */}
        {profile && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {profile.BusinessCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 rounded-full text-xs text-white/90">
                {profile.BusinessCategory.icon && <span>{profile.BusinessCategory.icon}</span>}
                {profile.BusinessCategory.name}
              </span>
            )}
            {profile.city && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 rounded-full text-xs text-white/90">
                <MapPin className="w-3 h-3" />
                {profile.city}, {profile.state}
              </span>
            )}
          </div>
        )}

        {/* Description preview */}
        {profile?.description && (
          <p className="text-white/80 text-xs line-clamp-2 mb-3">
            {profile.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {website && (
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{website.viewCount} visitas</span>
            </div>
          )}
          {profile && profile.totalReviews > 0 && (
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{profile.totalReviews} reseñas</span>
            </div>
          )}
          {profile?.website && (
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{profile.website.replace(/https?:\/\//, '')}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-3 flex flex-wrap gap-2">
          {website?.isPublished ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-200 text-xs font-medium rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Página Publicada
            </span>
          ) : website ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-200 text-xs font-medium rounded-full">
              Página en Borrador
            </span>
          ) : null}
          
          {profile?.status === 'APPROVED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-200 text-xs font-medium rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Directorio Activo
            </span>
          ) : profile?.status === 'PENDING' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-200 text-xs font-medium rounded-full">
              Pendiente Aprobación
            </span>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Ver página web */}
          {website?.isPublished && (
            <Link 
              href={`/site/${website.slug}`}
              target="_blank"
              className="flex items-center justify-center gap-2 bg-white text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-white/90 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Mi Página Web
            </Link>
          )}
          
          {/* Editar/Administrar */}
          <Link 
            href="/dashboard/mi-negocio"
            className="flex items-center justify-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            {website || profile ? 'Editar Mi Negocio' : 'Completar Perfil'}
          </Link>
        </div>
      </div>
    </div>
  );
}
