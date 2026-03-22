'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, Star, Store, Building2, Phone, Mail, 
  UserPlus, ClipboardList, Calendar, MessageSquare,
  ExternalLink, Copy, Check
} from 'lucide-react';
import Link from 'next/link';

interface ParticipantDetail {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  profileImage?: string;
  businessName?: string;
  businessCategory?: string;
  businessBio?: string;
  expoRegistrations: number;
  referredVisitors: number;
  avgRating: number | null;
  totalRatings: number;
  reviews: {
    id: number;
    ratingStars: number;
    feedbackText: string;
    visitorName: string;
    createdAt: string;
  }[];
  visitors: {
    id: string;
    name: string;
    registeredAt: string;
  }[];
}

export default function ParticipantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const participantId = params.id as string;

  const [participant, setParticipant] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (participantId) {
      fetchParticipantDetail();
    }
  }, [participantId]);

  const fetchParticipantDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/coordinador/expo-futuros-imposibles/${participantId}`);
      if (!res.ok) {
        throw new Error('Error al cargar los datos del participante');
      }
      const data = await res.json();
      setParticipant(data.participant);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyVoteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
    const link = `${baseUrl}/expo/votar/${participantId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'text-slate-500';
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 3.5) return 'text-yellow-400';
    if (rating >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">❌ {error || 'Participante no encontrado'}</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
  const voteLink = `${baseUrl}/expo/votar/${participantId}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-white">Detalle del Participante</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                {participant.profileImage ? (
                  <img src={participant.profileImage} alt={participant.nombre} className="w-full h-full object-cover" />
                ) : (
                  participant.nombre.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{participant.nombre}</h2>
              
              <div className="flex flex-wrap gap-4 text-slate-400 mb-4">
                {participant.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{participant.email}</span>
                  </div>
                )}
                {participant.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span>{participant.telefono}</span>
                  </div>
                )}
              </div>

              {/* Business Info */}
              {participant.businessName && (
                <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="text-purple-400" size={20} />
                    <span className="text-white font-semibold">{participant.businessName}</span>
                  </div>
                  {participant.businessCategory && (
                    <span className="inline-block bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                      {participant.businessCategory}
                    </span>
                  )}
                  {participant.businessBio && (
                    <p className="text-slate-400 mt-2 text-sm">{participant.businessBio}</p>
                  )}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      size={24} 
                      className={star <= (participant.avgRating || 0) ? 'text-yellow-400' : 'text-slate-600'} 
                      fill={star <= (participant.avgRating || 0) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <span className={`text-2xl font-bold ${getRatingColor(participant.avgRating)}`}>
                  {participant.avgRating ? participant.avgRating.toFixed(1) : 'Sin calificar'}
                </span>
                <span className="text-slate-500">({participant.totalRatings} calificaciones)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 rounded-xl p-4 text-center">
            <ClipboardList className="text-cyan-400 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-white">{participant.expoRegistrations}</p>
            <p className="text-slate-400 text-sm">Registros</p>
          </div>
          <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 rounded-xl p-4 text-center">
            <UserPlus className="text-orange-400 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-white">{participant.referredVisitors}</p>
            <p className="text-slate-400 text-sm">Invitados</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/40 to-slate-900 border border-yellow-500/30 rounded-xl p-4 text-center">
            <Star className="text-yellow-400 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-white">{participant.totalRatings}</p>
            <p className="text-slate-400 text-sm">Calificaciones</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-xl p-4 text-center">
            <Star className="text-green-400 mx-auto mb-2" size={24} fill="currentColor" />
            <p className={`text-2xl font-bold ${getRatingColor(participant.avgRating)}`}>
              {participant.avgRating ? participant.avgRating.toFixed(1) : '-'}
            </p>
            <p className="text-slate-400 text-sm">Promedio</p>
          </div>
        </div>

        {/* Vote Link */}
        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <ExternalLink size={18} className="text-purple-400" />
            Link de Votación
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={voteLink}
              readOnly
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 text-sm"
            />
            <button
              onClick={copyVoteLink}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-purple-500 hover:bg-purple-400 text-white'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-yellow-400" />
            Calificaciones Recientes ({participant.reviews?.length || 0})
          </h3>
          
          {participant.reviews && participant.reviews.length > 0 ? (
            <div className="space-y-4">
              {participant.reviews.map((review) => (
                <div key={review.id} className="bg-slate-900/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          size={16} 
                          className={star <= review.ratingStars ? 'text-yellow-400' : 'text-slate-600'} 
                          fill={star <= review.ratingStars ? 'currentColor' : 'none'}
                        />
                      ))}
                      <span className="text-yellow-400 font-bold">{review.ratingStars}.0</span>
                    </div>
                    <span className="text-slate-500 text-sm">
                      {new Date(review.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">"{review.feedbackText || 'Sin comentario'}"</p>
                  <p className="text-slate-500 text-xs">— {review.visitorName || 'Visitante anónimo'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No hay calificaciones aún</p>
          )}
        </div>

        {/* Visitors */}
        {participant.visitors && participant.visitors.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-orange-400" />
              Visitantes Registrados ({participant.visitors.length})
            </h3>
            
            <div className="space-y-2">
              {participant.visitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                  <span className="text-white">{visitor.name}</span>
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(visitor.registeredAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
