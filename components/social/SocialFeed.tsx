'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Flame, Brain, Hand, Sparkles, Share2, Clock, Award } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface FeedItem {
  id: number;
  fotoUrl: string;
  descripcion: string | null;
  qualityScore: number;
  rarityBonus: boolean;
  sharedCount: number;
  fechaSubida: string;
  Usuario: {
    id: number;
    nombre: string;
    profileImage: string | null;
    rangoActual: string;
    nivelActual: number;
  };
  Accion: {
    texto: string;
    Meta: {
      categoria: string;
      metaPrincipal: string;
    } | null;
  };
  userReaction: string | null;
  reactionCounts: {
    FIRE: number;
    STRONG: number;
    GENIUS: number;
    APPLAUSE: number;
  };
  _count: {
    SocialReactions: number;
  };
}

const REACTION_ICONS = {
  FIRE: { icon: Flame, label: 'Fuego', color: 'text-orange-500' },
  STRONG: { icon: Trophy, label: 'Fuerza', color: 'text-yellow-500' },
  GENIUS: { icon: Brain, label: 'Genio', color: 'text-purple-500' },
  APPLAUSE: { icon: Hand, label: 'Aplauso', color: 'text-blue-500' }
};

const AREA_EMOJI: Record<string, string> = {
  finanzas: '💰',
  relaciones: '❤️',
  talentos: '🎯',
  pazMental: '🧘',
  ocio: '🎮',
  salud: '💪',
  servicioTrans: '🌟',
  servicioComun: '🤝',
  enrolamiento: '📢'
};

export function SocialFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Cargar feed inicial
  const loadFeed = async () => {
    try {
      const response = await fetch('/api/social/feed');
      const data = await response.json();

      if (data.success) {
        setFeed(data.feed);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      toast.error('Error al cargar el muro');
    } finally {
      setLoading(false);
    }
  };

  // Cargar más items (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    try {
      const response = await fetch(`/api/social/feed?cursor=${cursor}`);
      const data = await response.json();

      if (data.success) {
        setFeed(prev => [...prev, ...data.feed]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  // Intersection Observer para infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore]);

  useEffect(() => {
    loadFeed();
  }, []);

  // Manejar reacción
  const handleReaction = async (evidenceId: number, type: string) => {
    try {
      const response = await fetch('/api/social/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, type })
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar feed localmente
        setFeed(prev => prev.map(item => {
          if (item.id === evidenceId) {
            const newReactionCounts = { ...item.reactionCounts };
            
            // Si se eliminó
            if (data.action === 'removed') {
              newReactionCounts[type as keyof typeof newReactionCounts]--;
              return {
                ...item,
                userReaction: null,
                reactionCounts: newReactionCounts,
                _count: {
                  ...item._count,
                  SocialReactions: item._count.SocialReactions - 1
                }
              };
            }
            
            // Si se actualizó o creó
            const oldReaction = item.userReaction;
            if (oldReaction && oldReaction !== type) {
              newReactionCounts[oldReaction as keyof typeof newReactionCounts]--;
            }
            if (data.action === 'created') {
              newReactionCounts[type as keyof typeof newReactionCounts]++;
            } else {
              newReactionCounts[type as keyof typeof newReactionCounts]++;
            }

            return {
              ...item,
              userReaction: type,
              reactionCounts: newReactionCounts,
              _count: {
                ...item._count,
                SocialReactions: data.action === 'created' 
                  ? item._count.SocialReactions + 1
                  : item._count.SocialReactions
              }
            };
          }
          return item;
        }));

        toast.success(data.message);
      }
    } catch (error) {
      console.error('Error reacting:', error);
      toast.error('Error al reaccionar');
    }
  };

  // Compartir logro
  const handleShare = async (item: FeedItem) => {
    const shareData = {
      title: `¡Logro Desbloqueado! 💎`,
      text: `${item.Usuario.nombre} completó: ${item.Accion.texto}\n\nValidado por IA como Alta Calidad 🚀\n\n¿Puedes superar este reto?`,
      url: typeof window !== 'undefined' ? `${window.location.origin}/reto/${item.id}` : ''
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        
        // Registrar share en backend
        await fetch('/api/social/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidenceId: item.id })
        });

        toast.success('¡+5 XP por inspirar a la comunidad!');
      } else {
        // Fallback: copiar al portapapeles
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('es-MX');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando el Muro de la Excelencia...</p>
        </div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <Sparkles className="w-16 h-16 text-purple-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Muro en Construcción</h2>
        <p className="text-slate-400 text-center max-w-md">
          Sé el primero en inspirar a la comunidad. Completa tareas de alta calidad para aparecer aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Muro de la Excelencia</h1>
              <p className="text-sm text-slate-400">Contenido épico curado por IA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {feed.map((item) => (
          <div 
            key={item.id}
            className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all"
          >
            {/* Header de la Card */}
            <div className="p-4 flex items-center gap-3">
              <div className="relative w-12 h-12">
                {item.Usuario.profileImage ? (
                  <Image
                    src={item.Usuario.profileImage}
                    alt={item.Usuario.nombre}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {item.Usuario.nombre.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                  <Award className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white">{item.Usuario.nombre}</h3>
                <p className="text-sm text-slate-400">
                  {item.Usuario.rangoActual.replace(/_/g, ' ')} · Nivel {item.Usuario.nivelActual}
                </p>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-sm">
                <Clock className="w-4 h-4" />
                {formatTimeAgo(item.fechaSubida)}
              </div>
            </div>

            {/* Imagen de la Evidencia */}
            <div className="relative aspect-square">
              <Image
                src={item.fotoUrl}
                alt={item.descripcion || 'Evidencia'}
                fill
                className="object-cover"
              />
              {/* Badge IA */}
              <div className="absolute top-3 right-3">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-xs font-bold text-white">SELECCIÓN QUANTUM</span>
                </div>
              </div>
              {/* Bonus Rareza */}
              {item.rarityBonus && (
                <div className="absolute top-3 left-3">
                  <div className="bg-yellow-500 px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-slate-900">⭐ ÉPICO</span>
                  </div>
                </div>
              )}
            </div>

            {/* Contexto */}
            <div className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{AREA_EMOJI[item.Accion.Meta?.categoria || ''] || '🎯'}</span>
                <div>
                  <h4 className="font-semibold text-white">{item.Accion.texto}</h4>
                  <p className="text-sm text-slate-400">{item.Accion.Meta?.categoria || 'Desafío'}</p>
                </div>
              </div>
              {item.descripcion && (
                <p className="text-slate-300 text-sm">{item.descripcion}</p>
              )}
            </div>

            {/* Barra de Reacciones */}
            <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                {Object.entries(REACTION_ICONS).map(([type, { icon: Icon, label, color }]) => {
                  const count = item.reactionCounts[type as keyof typeof item.reactionCounts];
                  const isActive = item.userReaction === type;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(item.id, type)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-slate-800 scale-110'
                          : 'hover:bg-slate-800'
                      }`}
                      title={label}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? color : 'text-slate-400'}`} />
                      {count > 0 && (
                        <span className={`text-sm font-bold ${isActive ? color : 'text-slate-400'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleShare(item)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Compartir</span>
              </button>
            </div>
          </div>
        ))}

        {/* Loading More */}
        {hasMore && (
          <div ref={observerTarget} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
