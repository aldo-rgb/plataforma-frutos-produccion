'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Star,
  MapPin,
  MessageCircle,
  Mail,
  Globe,
  Phone,
  ArrowLeft,
  Gift,
  User,
  Award,
  Shield,
  Calendar,
  Loader2,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Author {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  didHireService: boolean;
  createdAt: string;
  author: Author;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface Vision {
  id: number;
  nombre: string;
}

interface Organization {
  id: number;
  name: string;
}

interface ProfileUser {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface BusinessProfile {
  id: number;
  headline: string;
  description: string;
  discountOffer: string;
  city: string;
  state: string;
  coverageZone: string | null;
  whatsappPhone: string;
  email: string | null;
  website: string | null;
  avgRating: number;
  totalReviews: number;
  galleryImages: string[];
  logoUrl: string | null;
  isVerified: boolean;
  isPLGraduate: boolean;
  createdAt: string;
  user: ProfileUser;
  category: Category;
  vision: Vision | null;
  organization: Organization;
  reviews: Review[];
  _count: { reviews: number };
}

export default function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  
  // Galería
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Formulario de reseña
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHired, setReviewHired] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/talent-directory/profiles/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setCanReview(data.canReview);
        setHasReviewed(data.hasReviewed);
      } else {
        router.push('/dashboard/mercado');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/dashboard/mercado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [resolvedParams.id]);

  const openWhatsApp = () => {
    if (!profile) return;
    const message = encodeURIComponent(`Hola ${profile.user.nombre}, te contacto desde el Directorio de Talentos. Me interesa conocer más sobre tus servicios.`);
    window.open(`https://wa.me/52${profile.whatsappPhone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      alert('Selecciona una calificación');
      return;
    }
    if (reviewComment.trim().length < 10) {
      alert('El comentario debe tener al menos 10 caracteres');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/talent-directory/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile?.id,
          rating: reviewRating,
          comment: reviewComment,
          didHireService: reviewHired,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.profileUpdated.wasBanned) {
          alert('⚠️ Este perfil ha sido suspendido por múltiples reseñas negativas.');
        }
        
        // Refrescar perfil
        await fetchProfile();
        setShowReviewForm(false);
        setReviewRating(0);
        setReviewComment('');
        setReviewHired(false);
        setHasReviewed(true);
        setCanReview(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al enviar reseña');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error al enviar reseña');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm', interactive = false) => {
    const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            onClick={() => interactive && setReviewRating(star)}
            className={`${sizeClass} ${interactive ? 'cursor-pointer' : ''} ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            } ${interactive ? 'hover:text-yellow-300' : ''}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Perfil no encontrado</p>
      </div>
    );
  }

  const allImages = [
    ...(profile.logoUrl ? [profile.logoUrl] : []),
    ...profile.galleryImages
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al directorio
        </button>

        {/* Header Card */}
        <div className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl overflow-hidden mb-6 ${
          profile.isPLGraduate ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-gray-700'
        }`}>
          {/* Galería */}
          {allImages.length > 0 && (
            <div className="relative h-64 md:h-80 bg-gray-900">
              <Image
                src={allImages[currentImageIndex]}
                alt={profile.headline}
                fill
                className="object-contain"
              />
              
              {/* Navegación de galería */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(i => i === 0 ? allImages.length - 1 : i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(i => i === allImages.length - 1 ? 0 : i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {profile.isPLGraduate && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-bold rounded-full flex items-center gap-1.5 shadow-lg">
                    <Award className="w-4 h-4" />
                    Graduado PL
                  </span>
                )}
                {profile.isVerified && (
                  <span className="px-3 py-1.5 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center gap-1.5 shadow-lg">
                    <Shield className="w-4 h-4" />
                    Verificado
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Avatar */}
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 border-4 border-gray-800 -mt-14 md:mt-0">
                {profile.user.imagen ? (
                  <Image
                    src={profile.user.imagen}
                    alt={profile.user.nombre}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Texto */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {profile.headline}
                </h1>
                <p className="text-lg text-gray-300 mb-2">{profile.user.nombre}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-blue-400">
                    {profile.category.icon} {profile.category.name}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.city}, {profile.state}
                  </span>
                  {profile.vision && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-purple-400">{profile.vision.nombre}</span>
                    </>
                  )}
                </div>

                {/* Rating */}
                {profile.totalReviews > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {renderStars(profile.avgRating, 'sm')}
                    <span className="text-white font-bold text-lg">{profile.avgRating.toFixed(1)}</span>
                    <span className="text-gray-400">({profile.totalReviews} reseñas)</span>
                  </div>
                )}
              </div>

              {/* Botón WhatsApp */}
              <button
                onClick={openWhatsApp}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar por WhatsApp
              </button>
            </div>

            {/* Beneficio */}
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <Gift className="w-5 h-5" />
                Beneficio para la Comunidad
              </div>
              <p className="text-green-300">{profile.discountOffer}</p>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Acerca del Servicio</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{profile.description}</p>
          
          {profile.coverageZone && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400">
                <strong className="text-gray-300">Zona de cobertura:</strong> {profile.coverageZone}
              </p>
            </div>
          )}
        </div>

        {/* Contacto */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Información de Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href={`https://wa.me/52${profile.whatsappPhone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 transition-colors"
            >
              <Phone className="w-5 h-5" />
              {profile.whatsappPhone}
            </a>
            
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-3 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 transition-colors"
              >
                <Mail className="w-5 h-5" />
                {profile.email}
              </a>
            )}
            
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 transition-colors"
              >
                <Globe className="w-5 h-5" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700 text-gray-500 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Miembro desde {formatDate(profile.createdAt)}
          </div>
        </div>

        {/* Reseñas */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Reseñas ({profile._count.reviews})
            </h2>
            
            {canReview && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Star className="w-5 h-5" />
                Escribir Reseña
              </button>
            )}

            {hasReviewed && (
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Ya dejaste una reseña
              </span>
            )}
          </div>

          {/* Formulario de reseña */}
          {showReviewForm && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">Tu Reseña</h3>
              
              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Calificación *</label>
                {renderStars(reviewRating, 'lg', true)}
              </div>

              {/* Comentario */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Comentario * (mínimo 10 caracteres)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Comparte tu experiencia con este servicio..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">{reviewComment.length} caracteres</span>
              </div>

              {/* Checkbox contratación */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewHired}
                    onChange={(e) => setReviewHired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Declaro bajo honor que contraté este servicio</span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || reviewRating === 0 || reviewComment.length < 10}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Publicar Reseña
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de reseñas */}
          {profile.reviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aún no hay reseñas</p>
              <p className="text-gray-500 text-sm">Sé el primero en compartir tu experiencia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-700 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {review.author.imagen ? (
                        <Image
                          src={review.author.imagen}
                          alt={review.author.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{review.author.nombre}</span>
                        {review.didHireService && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Contrató
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {renderStars(review.rating)}
                        <span className="text-gray-500 text-sm">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-300">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
