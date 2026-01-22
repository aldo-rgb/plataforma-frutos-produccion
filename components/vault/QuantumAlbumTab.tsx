'use client';

import { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Sparkles,
  ChevronRight,
  Filter,
  Award,
  Lock,
  Info,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';

// Colores por categoría
const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  TRIBU: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-400', icon: '👥' },
  ARTEFACTOS: { bg: 'bg-amber-900/30', border: 'border-amber-500', text: 'text-amber-400', icon: '🎭' },
  MOMENTOS: { bg: 'bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-400', icon: '✨' },
  REFLEJOS: { bg: 'bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-400', icon: '🪞' },
  ENTORNO: { bg: 'bg-green-900/30', border: 'border-green-500', text: 'text-green-400', icon: '🏛️' },
};

interface AlbumPhoto {
  slot: number;
  templateId: number;
  title: string;
  description: string;
  category: string;
  emoji: string;
  points: number;
  requiredLevel: string;
  hint: string;
  userPhoto: {
    id: number;
    photoUrl: string;
    thumbnailUrl: string;
    status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED';
    caption: string | null;
    pointsEarned: number;
    capturedAt: string;
    validatedAt: string | null;
  } | null;
  isUnlocked: boolean;
  isCompleted: boolean;
}

interface AlbumStats {
  totalSlots: number;
  completed: number;
  pending: number;
  rejected: number;
  empty: number;
  totalPointsEarned: number;
  maxPossiblePoints: number;
}

interface AlbumData {
  userId: number;
  highestLevel: string;
  album: AlbumPhoto[];
  stats: AlbumStats;
  byCategory: Record<string, { total: number; completed: number }>;
  categories: string[];
}

export default function QuantumAlbumTab() {
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');

  useEffect(() => {
    fetchAlbum();
  }, []);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quantum-album');
      const data = await res.json();

      if (res.ok) {
        setAlbumData(data);
      }
    } catch (error) {
      console.error('Error fetching album:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    photo: AlbumPhoto
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 1. Subir imagen a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'album');
      formData.append('slot', photo.slot.toString());

      const uploadRes = await fetch('/api/quantum-album/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadResult.error || 'Error al subir imagen');
      }

      // 2. Guardar en el álbum
      const saveRes = await fetch('/api/quantum-album', {
        method: photo.userPhoto ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(photo.userPhoto && { photoId: photo.userPhoto.id }),
          templateId: photo.templateId,
          photoUrl: uploadResult.photoUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          caption: uploadCaption || null,
        }),
      });

      const saveResult = await saveRes.json();

      if (saveRes.ok) {
        setShowUploadModal(false);
        setSelectedPhoto(null);
        setUploadCaption('');
        fetchAlbum(); // Refresh
      } else {
        alert(saveResult.error || 'Error al guardar');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al procesar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = (photo: AlbumPhoto) => {
    setSelectedPhoto(photo);
    setUploadCaption('');
    setShowUploadModal(true);
  };

  const filteredPhotos =
    albumData?.album.filter(
      (p) => selectedCategory === 'ALL' || p.category === selectedCategory
    ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="text-center py-20">
        <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No se pudo cargar el álbum</p>
      </div>
    );
  }

  const progressPercentage = Math.round(
    (albumData.stats.completed / albumData.stats.totalSlots) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header del Álbum */}
      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/30 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Álbum Cuántico
            </h2>
            <p className="text-purple-300">50 momentos para inmortalizar</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progreso del álbum</span>
            <span className="text-purple-400 font-bold">
              {albumData.stats.completed}/{albumData.stats.totalSlots} ({progressPercentage}%)
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Validadas</span>
            </div>
            <p className="text-xl font-bold text-white">{albumData.stats.completed}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Pendientes</span>
            </div>
            <p className="text-xl font-bold text-white">{albumData.stats.pending}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Camera className="w-4 h-4" />
              <span className="text-xs">Vacías</span>
            </div>
            <p className="text-xl font-bold text-white">{albumData.stats.empty}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-xs">PC Ganados</span>
            </div>
            <p className="text-xl font-bold text-purple-400">
              {albumData.stats.totalPointsEarned}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Todas ({albumData.stats.totalSlots})
        </button>
        {albumData.categories.map((cat) => {
          const catData = albumData.byCategory[cat];
          const colors = categoryColors[cat] || categoryColors.TRIBU;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat
                  ? `${colors.bg} ${colors.border} border ${colors.text}`
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{colors.icon}</span>
              <span>{cat}</span>
              <span className="opacity-70">
                ({catData?.completed || 0}/{catData?.total || 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredPhotos.map((photo) => {
          const colors = categoryColors[photo.category] || categoryColors.TRIBU;
          const hasPhoto = !!photo.userPhoto;
          const isValidated = photo.userPhoto?.status === 'VALIDATED';
          const isPending = photo.userPhoto?.status === 'PENDING_VALIDATION';
          const isRejected = photo.userPhoto?.status === 'REJECTED';

          return (
            <div
              key={photo.slot}
              onClick={() => openUploadModal(photo)}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-105 border-2 ${
                isValidated
                  ? `${colors.border} ${colors.bg}`
                  : isPending
                  ? 'border-yellow-500/50 bg-yellow-900/20'
                  : isRejected
                  ? 'border-red-500/50 bg-red-900/20'
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
              }`}
            >
              {hasPhoto ? (
                <>
                  <Image
                    src={photo.userPhoto!.thumbnailUrl || photo.userPhoto!.photoUrl}
                    alt={photo.title}
                    fill
                    className="object-cover"
                  />
                  {/* Overlay con status */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white truncate">
                          {photo.emoji} {photo.title}
                        </span>
                        {isValidated && (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                        {isPending && (
                          <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        )}
                        {isRejected && (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      {isValidated && (
                        <div className="flex items-center gap-1 text-purple-400 text-xs mt-1">
                          <Award className="w-3 h-3" />
                          <span>+{photo.userPhoto!.pointsEarned} PC</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Empty slot */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-3xl mb-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      {photo.emoji}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
                      {photo.title}
                    </span>
                    <span className="text-[10px] text-purple-400 mt-1">
                      +{photo.points} PC
                    </span>
                  </div>
                  {/* Upload icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </>
              )}

              {/* Slot number */}
              <div className="absolute top-1 left-1 bg-black/60 text-[10px] text-gray-400 px-1.5 py-0.5 rounded">
                #{photo.slot}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Upload/Detalle */}
      {showUploadModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-purple-500/30">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedPhoto.emoji}</span>
                <div>
                  <h3 className="font-bold text-white">{selectedPhoto.title}</h3>
                  <p className="text-sm text-gray-400">Slot #{selectedPhoto.slot}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedPhoto(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Descripción y hint */}
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-gray-300 text-sm mb-2">{selectedPhoto.description}</p>
                {selectedPhoto.hint && (
                  <div className="flex items-start gap-2 text-xs text-purple-400">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{selectedPhoto.hint}</span>
                  </div>
                )}
              </div>

              {/* Puntos */}
              <div className="flex items-center justify-center gap-2 py-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-bold">
                  +{selectedPhoto.points} Puntos Cuánticos
                </span>
              </div>

              {/* Foto actual si existe */}
              {selectedPhoto.userPhoto && (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={selectedPhoto.userPhoto.photoUrl}
                    alt={selectedPhoto.title}
                    fill
                    className="object-cover"
                  />
                  {/* Status badge */}
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPhoto.userPhoto.status === 'VALIDATED'
                        ? 'bg-green-500/90 text-white'
                        : selectedPhoto.userPhoto.status === 'PENDING_VALIDATION'
                        ? 'bg-yellow-500/90 text-black'
                        : 'bg-red-500/90 text-white'
                    }`}
                  >
                    {selectedPhoto.userPhoto.status === 'VALIDATED'
                      ? '✓ Validada'
                      : selectedPhoto.userPhoto.status === 'PENDING_VALIDATION'
                      ? '⏳ Pendiente'
                      : '✗ Rechazada'}
                  </div>
                </div>
              )}

              {/* Upload section */}
              {(!selectedPhoto.userPhoto ||
                selectedPhoto.userPhoto.status !== 'VALIDATED') && (
                <>
                  {/* Caption input */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Descripción (opcional)
                    </label>
                    <input
                      type="text"
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      placeholder="Añade un comentario a tu foto..."
                      className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Upload button */}
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, selectedPhoto)}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div
                      className={`flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        uploading
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 hover:border-purple-500 hover:bg-purple-900/20'
                      }`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                          <span className="text-purple-400">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-gray-400">
                            {selectedPhoto.userPhoto
                              ? 'Subir nueva foto'
                              : 'Selecciona una foto'}
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </>
              )}

              {/* Info de validación */}
              {selectedPhoto.userPhoto?.status === 'VALIDATED' && (
                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">
                    ¡Foto validada! +{selectedPhoto.userPhoto.pointsEarned} PC
                  </p>
                </div>
              )}

              {selectedPhoto.userPhoto?.status === 'PENDING_VALIDATION' && (
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-center">
                  <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-400 font-medium">
                    Esperando validación del staff
                  </p>
                  <p className="text-yellow-600 text-xs mt-1">
                    Recibirás tus puntos cuando sea aprobada
                  </p>
                </div>
              )}

              {selectedPhoto.userPhoto?.status === 'REJECTED' && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                  <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 font-medium">Foto rechazada</p>
                  <p className="text-red-600 text-xs mt-1">
                    Puedes subir una nueva foto que cumpla los requisitos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
