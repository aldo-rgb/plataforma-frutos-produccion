'use client';

import { useState, useEffect } from 'react';
import { Camera, Filter, Sparkles, Award, TrendingUp, Image as ImageIcon, Info, X, Video, User, Trash2, BookOpen, Zap, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import TimeCapsuleVideoModal from '@/components/vault/TimeCapsuleVideoModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import QuantumAlbumTab from '@/components/vault/QuantumAlbumTab';

interface Evidencia {
  id: number;
  fotoUrl: string;
  descripcion: string;
  fecha: string;
  area: string;
  areaIcon: string;
  status: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  tipo: 'CARTA' | 'EXTRAORDINARIA';
  highQuality?: boolean;
  qualityScore?: number;
}

interface Avatar {
  id: number;
  generatedUrl: string;
  vibe: string;
  gender: string;
  createdAt: string;
  sourceImage: string;
}

interface CheckInPhoto {
  id: number;
  generatedUrl: string;
  vibe: string; // Etiqueta: "📸 Check-in Básico", etc.
  createdAt: string;
}

interface BusinessLogo {
  id: number;
  generatedUrl: string;
  vibe: string; // Etiqueta: "🎨 Logo: NombreNegocio"
  createdAt: string;
}

export default function TheVaultPage() {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [avatares, setAvatares] = useState<Avatar[]>([]);
  const [checkInPhotos, setCheckInPhotos] = useState<CheckInPhoto[]>([]);
  const [businessLogos, setBusinessLogos] = useState<BusinessLogo[]>([]);
  const [filtroArea, setFiltroArea] = useState<string>('TODAS');
  const [filtroRareza, setFiltroRareza] = useState<string>('TODAS');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Evidencia | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInPhoto | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<BusinessLogo | null>(null);
  const [showRarityGuide, setShowRarityGuide] = useState(false);
  const [showTimeCapsule, setShowTimeCapsule] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidencias' | 'avatares' | 'album' | 'checkin'>('evidencias');

  useEffect(() => {
    fetchEvidencias();
    fetchAvatares();
  }, []);

  const fetchEvidencias = async () => {
    try {
      const response = await fetch('/api/evidencias/vault');
      const data = await response.json();
      
      if (data.evidencias) {
        setEvidencias(data.evidencias);
      }
    } catch (error) {
      console.error('Error al cargar evidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatares = async () => {
    try {
      const response = await fetch('/api/avatars/vault');
      const data = await response.json();
      
      if (data.success && data.avatares) {
        // Separar avatares, fotos de check-in y logos de negocio
        const regularAvatars = data.avatares.filter((a: Avatar) => 
          a.sourceImage !== 'check-in-photo' && a.sourceImage !== 'business-logo'
        );
        const checkIns = data.avatares.filter((a: Avatar) => a.sourceImage === 'check-in-photo');
        const logos = data.avatares.filter((a: Avatar) => a.sourceImage === 'business-logo');
        
        setAvatares(regularAvatars);
        setCheckInPhotos(checkIns);
        setBusinessLogos(logos);
      }
    } catch (error) {
      console.error('Error al cargar avatares:', error);
    }
  };

  const deleteAvatar = async (avatarId: number) => {
    if (!confirm('¿Estás seguro de eliminar este avatar?')) return;

    try {
      const response = await fetch(`/api/avatars/vault?id=${avatarId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAvatares(prev => prev.filter(a => a.id !== avatarId));
        setSelectedAvatar(null);
      }
    } catch (error) {
      console.error('Error eliminando avatar:', error);
    }
  };

  const rarityColors = {
    COMMON: 'border-gray-500 bg-gray-900/50',
    UNCOMMON: 'border-blue-500 bg-blue-900/30',
    RARE: 'border-purple-500 bg-purple-900/30',
    EPIC: 'border-pink-500 bg-pink-900/30',
    LEGENDARY: 'border-yellow-500 bg-yellow-900/30 animate-pulse'
  };

  const rarityLabels = {
    COMMON: '⚪ Común',
    UNCOMMON: '🔵 Poco Común',
    RARE: '🟣 Raro',
    EPIC: '🟣 Épico',
    LEGENDARY: '🔶 Legendario'
  };

  const evidenciasFiltradas = evidencias.filter(ev => {
    const matchArea = filtroArea === 'TODAS' || ev.area === filtroArea;
    const matchRareza = filtroRareza === 'TODAS' || ev.rarity === filtroRareza;
    return matchArea && matchRareza;
  });

  const areasUnicas = [...new Set(evidencias.map(ev => ev.area))];

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white pb-20">
      
      {/* HEADER CON LORE */}
      <div className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                The Quantum Archive
              </h1>
              <p className="text-purple-300 text-lg">Tu Bóveda de Artefactos de Verdad</p>
            </div>
          </div>
          
          <div className="bg-black/30 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-gray-300 italic">
              "La realidad es volátil. Tus sueños solo existen en tu mente hasta que los traes al mundo físico. 
              Una evidencia no es una foto; es un <span className="text-purple-400 font-bold">Artefacto de Verdad</span>. 
              Es la prueba irrefutable de que ganaste la batalla contra la pereza hoy."
            </p>
            <p className="text-purple-400 font-bold mt-2 text-center">
              — Lema del Quantum: "Lo que no se captura, se desvanece."
            </p>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* TABS */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('evidencias')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'evidencias'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-black/30 border border-purple-500/30 text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Artefactos ({evidencias.length + businessLogos.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('avatares')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'avatares'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                : 'bg-black/30 border border-purple-500/30 text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Avatares ({avatares.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('album')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'album'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                : 'bg-black/30 border border-purple-500/30 text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Álbum Cuántico</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'checkin'
                ? 'bg-gradient-to-r from-green-600 to-cyan-600 text-white'
                : 'bg-black/30 border border-purple-500/30 text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span>Materialización ({checkInPhotos.length})</span>
          </button>

          {/* Muro de la Excelencia - Link externo */}
          <Link
            href="/dashboard/muro"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/50 text-pink-300 hover:from-pink-600 hover:to-purple-600 hover:text-white hover:border-pink-400"
          >
            <Star className="w-5 h-5 text-yellow-400" />
            <span>Muro de Excelencia</span>
            <Sparkles className="w-4 h-4 text-pink-400" />
          </Link>
        </div>

        {activeTab === 'evidencias' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Total Artefactos</span>
            </div>
            <p className="text-3xl font-bold">{evidencias.length + businessLogos.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Legendarios</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {evidencias.filter(e => e.rarity === 'LEGENDARY').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-pink-900/50 to-pink-800/30 border border-pink-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-pink-400" />
              <span className="text-gray-400 text-sm">Épicos</span>
            </div>
            <p className="text-3xl font-bold text-pink-400">
              {evidencias.filter(e => e.rarity === 'EPIC').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Esta Semana</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {evidencias.filter(e => {
                const date = new Date(e.fecha);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
              }).length}
            </p>
          </div>
        </div>
        )}
      </div>

      {/* FILTROS */}
      {activeTab === 'evidencias' && (
        <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400">Filtros:</span>
            </div>
            
            {/* Filtro por Área */}
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="bg-black/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="TODAS">Todas las Áreas</option>
              {areasUnicas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            
            {/* Filtro por Rareza */}
            <select
              value={filtroRareza}
              onChange={(e) => setFiltroRareza(e.target.value)}
              className="bg-black/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="TODAS">Todas las Rarezas</option>
              <option value="LEGENDARY">🔶 Legendario</option>
              <option value="EPIC">🟣 Épico</option>
              <option value="RARE">🟣 Raro</option>
              <option value="UNCOMMON">🔵 Poco Común</option>
              <option value="COMMON">⚪ Común</option>
            </select>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap gap-3">
            {/* Botón Time Capsule */}
            <button
              onClick={() => setShowTimeCapsule(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-lg transition-all shadow-lg shadow-purple-500/30 font-semibold"
            >
              <Video className="w-5 h-5" />
              <span>Time Capsule 🎬</span>
            </button>

            {/* Botón Guía de Rarezas */}
            <button
              onClick={() => setShowRarityGuide(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all font-semibold"
            >
              <Info className="w-5 h-5" />
              <span>Guía de Rarezas</span>
            </button>
          </div>
        </div>
        </div>
      )}

      {/* GRID DE EVIDENCIAS */}
      {activeTab === 'evidencias' && (
        <>
          {loading ? (
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
              <LoadingSpinner message="Cargando tu Bóveda..." size="lg" />
            </div>
          ) : evidenciasFiltradas.length === 0 && businessLogos.length === 0 ? (
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
              <ImageIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">Tu Bóveda está vacía</p>
              <p className="text-gray-500">Comienza a capturar Artefactos de Verdad para llenar tu archivo.</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-6">
              {/* GRID DE EVIDENCIAS */}
              {evidenciasFiltradas.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {evidenciasFiltradas.map((evidencia) => (
                    <div
                      key={evidencia.id}
                      onClick={() => setSelectedImage(evidencia)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${rarityColors[evidencia.rarity]}`}
                    >
                      <Image
                        src={evidencia.fotoUrl}
                        alt={evidencia.descripcion}
                        fill
                        className="object-cover"
                      />
                      
                      {/* Overlay con info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs text-gray-300 mb-1">{evidencia.area}</p>
                          <p className="text-sm font-bold">{rarityLabels[evidencia.rarity]}</p>
                        </div>
                      </div>
                      
                      {/* Badge de rareza en esquina */}
                      {evidencia.rarity !== 'COMMON' && (
                        <div className="absolute top-2 right-2 backdrop-blur-sm bg-black/50 rounded-full px-2 py-1">
                          <span className="text-xs">{rarityLabels[evidencia.rarity].split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* SECCIÓN DE LOGOS DE NEGOCIO */}
              {businessLogos.length > 0 && (
                <>
                  <div className="mt-10 mb-4">
                    <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                      <span>🎨</span> Logos de Mi Negocio ({businessLogos.length})
                    </h3>
                    <p className="text-gray-400 text-sm">Logos generados para tu Idea Millonaria</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {businessLogos.map((logo) => (
                      <div
                        key={logo.id}
                        onClick={() => setSelectedLogo(logo)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-orange-500/50 cursor-pointer transition-all hover:scale-105 hover:border-orange-400 bg-gradient-to-br from-orange-900/20 to-purple-900/20"
                      >
                        <Image
                          src={logo.generatedUrl}
                          alt={logo.vibe}
                          fill
                          className="object-cover"
                        />
                        
                        {/* Overlay con info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-sm font-bold text-orange-300">{logo.vibe}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(logo.createdAt).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Badge de tipo */}
                        <div className="absolute top-2 right-2 backdrop-blur-sm bg-orange-500/80 rounded-full px-2 py-1">
                          <span className="text-xs">🎨 Logo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* GRID DE AVATARES */}
      {activeTab === 'avatares' && (
        <>
          {loading ? (
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
              <LoadingSpinner message="Cargando tus avatares..." size="lg" />
            </div>
          ) : avatares.length === 0 ? (
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
              <User className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">No tienes avatares guardados</p>
              <p className="text-gray-500 mb-6">Crea tu primer avatar con IA desde tu perfil</p>
              <a
                href="/dashboard/mentor/perfil"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all font-semibold"
              >
                <User className="w-5 h-5" />
                <span>Crear Avatar</span>
              </a>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {avatares.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="relative group"
                  >
                    <div
                      onClick={() => setSelectedAvatar(avatar)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-500/30 cursor-pointer transition-all hover:scale-105 hover:border-purple-500"
                    >
                      <Image
                        src={avatar.generatedUrl}
                        alt={`Avatar ${avatar.vibe}`}
                        fill
                        className="object-cover"
                      />
                      
                      {/* Overlay con info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs text-gray-300 mb-1">
                            {new Date(avatar.createdAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-purple-500/50 rounded">
                              {avatar.vibe}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botón eliminar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAvatar(avatar.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar avatar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB DE ÁLBUM CUÁNTICO */}
      {activeTab === 'album' && (
        <div className="max-w-7xl mx-auto px-6">
          <QuantumAlbumTab />
        </div>
      )}

      {/* TAB DE MATERIALIZACIÓN (Fotos de Check-in) */}
      {activeTab === 'checkin' && (
        <>
          {/* Stats de Check-in */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Total Fotos</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{checkInPhotos.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">Básico</span>
                </div>
                <p className="text-3xl font-bold text-blue-400">
                  {checkInPhotos.filter(p => p.vibe.includes('Básico')).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-400 text-sm">Avanzado</span>
                </div>
                <p className="text-3xl font-bold text-purple-400">
                  {checkInPhotos.filter(p => p.vibe.includes('Avanzado')).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Liderato</span>
                </div>
                <p className="text-3xl font-bold text-yellow-400">
                  {checkInPhotos.filter(p => p.vibe.includes('Liderato')).length}
                </p>
              </div>
            </div>

            {/* Descripción de la sección */}
            <div className="bg-black/30 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-gray-300 italic">
                "La <span className="text-green-400 font-bold">Materialización</span> es el momento donde tu compromiso 
                se vuelve tangible. Cada foto de check-in es evidencia de tu presencia física en el entrenamiento, 
                una prueba de que elegiste estar ahí cuando pudiste no haberlo hecho."
              </p>
            </div>
          </div>

          {/* Grid de fotos de check-in */}
          {checkInPhotos.length === 0 ? (
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
              <Zap className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">Aún no hay fotos de Materialización</p>
              <p className="text-gray-500">Las fotos de check-in de tus entrenamientos aparecerán aquí.</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {checkInPhotos.map((photo) => {
                  // Determinar color según tipo
                  let borderColor = 'border-green-500/30';
                  if (photo.vibe.includes('Avanzado')) borderColor = 'border-purple-500/30 hover:border-purple-500';
                  else if (photo.vibe.includes('Liderato')) borderColor = 'border-yellow-500/30 hover:border-yellow-500';
                  else if (photo.vibe.includes('Básico')) borderColor = 'border-blue-500/30 hover:border-blue-500';
                  
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedCheckIn(photo)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 bg-black/50 ${borderColor}`}
                    >
                      <Image
                        src={photo.generatedUrl}
                        alt={photo.vibe}
                        fill
                        className="object-cover"
                      />
                      
                      {/* Overlay con info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs text-gray-300 mb-1">
                            {new Date(photo.createdAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm font-bold">{photo.vibe.replace('📸 ', '')}</p>
                        </div>
                      </div>
                      
                      {/* Badge en esquina */}
                      <div className="absolute top-2 right-2 backdrop-blur-sm bg-black/50 rounded-full px-2 py-1">
                        <span className="text-xs">📸</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DE CHECK-IN AMPLIADO */}
      {selectedCheckIn && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCheckIn(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedCheckIn(null)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-green-400"
            >
              ✕ Cerrar
            </button>
            
            <div className="rounded-lg overflow-hidden border-4 border-green-500">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <Image
                  src={selectedCheckIn.generatedUrl}
                  alt={selectedCheckIn.vibe}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="bg-black/80 p-6">
                <h3 className="text-2xl font-bold mb-4 text-green-400">{selectedCheckIn.vibe}</h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <span className="text-gray-400">Fecha:</span>{' '}
                    {new Date(selectedCheckIn.createdAt).toLocaleDateString('es-ES', { 
                      weekday: 'long',
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-4 italic">
                    "Esta foto es prueba de tu presencia y compromiso con tu transformación."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOGO DE NEGOCIO AMPLIADO */}
      {selectedLogo && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLogo(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedLogo(null)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-orange-400"
            >
              ✕ Cerrar
            </button>
            
            <div className="rounded-lg overflow-hidden border-4 border-orange-500">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <Image
                  src={selectedLogo.generatedUrl}
                  alt={selectedLogo.vibe}
                  fill
                  className="object-contain bg-gradient-to-br from-gray-900 to-black"
                />
              </div>
              
              <div className="bg-black/80 p-6">
                <h3 className="text-2xl font-bold mb-4 text-orange-400">{selectedLogo.vibe}</h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <span className="text-gray-400">Creado:</span>{' '}
                    {new Date(selectedLogo.createdAt).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-4 italic">
                    "Este logo representa tu Idea Millonaria materializada."
                  </p>
                  <a
                    href={selectedLogo.generatedUrl}
                    download={`logo-${Date.now()}.png`}
                    target="_blank"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                  >
                    📥 Descargar Logo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVATAR AMPLIADO */}
      {selectedAvatar && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAvatar(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedAvatar(null)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-purple-400"
            >
              ✕ Cerrar
            </button>
            
            <div className="rounded-lg overflow-hidden border-4 border-purple-500">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <Image
                  src={selectedAvatar.generatedUrl}
                  alt={`Avatar ${selectedAvatar.vibe}`}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="bg-black/80 p-6">
                <h3 className="text-2xl font-bold mb-4">Avatar {selectedAvatar.vibe}</h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <span className="text-gray-400">Creado:</span>{' '}
                    {new Date(selectedAvatar.createdAt).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p>
                    <span className="text-gray-400">Estilo:</span>{' '}
                    <span className="px-3 py-1 bg-purple-500/50 rounded text-sm">{selectedAvatar.vibe}</span>
                  </p>
                  {selectedAvatar.gender && (
                    <p>
                      <span className="text-gray-400">Género:</span> {selectedAvatar.gender}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMAGEN AMPLIADA */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-purple-400"
            >
              ✕ Cerrar
            </button>
            
            <div className={`rounded-lg overflow-hidden border-4 ${rarityColors[selectedImage.rarity]}`}>
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <Image
                  src={selectedImage.fotoUrl}
                  alt={selectedImage.descripcion}
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="bg-black/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{rarityLabels[selectedImage.rarity]}</h3>
                  <span className="text-gray-400">{new Date(selectedImage.fecha).toLocaleDateString('es-ES')}</span>
                </div>
                
                <p className="text-gray-300 mb-2">{selectedImage.descripcion}</p>
                <p className="text-purple-400 flex items-center gap-2">
                  <span>{selectedImage.areaIcon}</span>
                  <span>{selectedImage.area}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GUÍA DE RAREZAS */}
      {showRarityGuide && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowRarityGuide(false)}
        >
          <div className="relative max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowRarityGuide(false)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-purple-400 flex items-center gap-2"
            >
              <X className="w-6 h-6" />
              Cerrar
            </button>
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-500/50 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Sistema de Rarezas</h2>
                    <p className="text-purple-100">Clasificación de Artefactos de Verdad</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-gray-300 text-lg mb-6">
                  En <span className="text-purple-400 font-bold">The Quantum Archive</span>, cada evidencia que capturas 
                  es clasificada según su <span className="text-yellow-400 font-bold">rareza</span>, determinando 
                  las recompensas que recibes y su valor en tu colección.
                </p>

                {/* Rareza LEGENDARY */}
                <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-2 border-yellow-500 rounded-lg p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">🔶</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-yellow-400">LEGENDARIO</h3>
                        <div className="text-right">
                          <p className="text-yellow-400 font-bold">+200 XP / +500 PC</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold text-yellow-400">Misiones Extraordinarias y Eventos Presenciales.</span> Los Artefactos más raros y valiosos del Archivo.
                      </p>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Tareas especiales asignadas por mentores</li>
                        <li>Eventos y retos de equipo completados</li>
                        <li>Logros mayores (Ej: Bajar 10kg, Cerrar un negocio)</li>
                        <li>Desafíos únicos que ocurren una sola vez</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rareza EPIC */}
                <div className="bg-gradient-to-br from-pink-900/50 to-pink-800/30 border-2 border-pink-500 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">🟣</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-pink-400">ÉPICO</h3>
                        <div className="text-right">
                          <p className="text-pink-400 font-bold">+100 XP / +300 PC</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold text-pink-400">Logros Mayores y Desafíos Únicos.</span> Evidencias que demuestran esfuerzo excepcional.
                      </p>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Tareas que se realizan una sola vez</li>
                        <li>Proyectos grandes completados</li>
                        <li>Hitos importantes alcanzados</li>
                        <li>Retos personales superados</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rareza RARE */}
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-2 border-purple-500 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">🟣</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-purple-400">RARO</h3>
                        <div className="text-right">
                          <p className="text-purple-400 font-bold">+50 XP / +100 PC</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold text-purple-400">Esfuerzo Físico Notable o Tareas Mensuales.</span> Evidencias que requieren dedicación significativa.
                      </p>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Entrenamientos intensos de gimnasio</li>
                        <li>Tareas mensuales completadas</li>
                        <li>Proyectos quinceales</li>
                        <li>Actividades que demandan esfuerzo sostenido</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rareza UNCOMMON */}
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-2 border-blue-500 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">🔵</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-blue-400">POCO COMÚN</h3>
                        <div className="text-right">
                          <p className="text-blue-400 font-bold">+25 XP / +20 PC</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold text-blue-400">Tareas Semanales.</span> Evidencias que requieren disciplina semanal consistente.
                      </p>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Hábitos programados cada semana</li>
                        <li>Reuniones semanales de planificación</li>
                        <li>Revisiones periódicas de progreso</li>
                        <li>Check-ins con mentor o equipo</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rareza COMMON */}
                <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 border-2 border-gray-500 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">⚪</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-gray-300">COMÚN</h3>
                        <div className="text-right">
                          <p className="text-gray-300 font-bold">+10 XP / +5 PC</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold text-gray-400">Hábitos Diarios Rutinarios.</span> La base de tu transformación, tareas del día a día.
                      </p>
                      <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Rutinas matutinas y nocturnas</li>
                        <li>Ejercicio diario (cardio, yoga, etc.)</li>
                        <li>Lectura y estudio diario</li>
                        <li>Meditación y journaling</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bonus Section */}
                <div className="mt-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-500 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">✨</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-green-400 mb-2">Bonus Día Perfecto</h3>
                      <p className="text-gray-300 mb-2">
                        ¿Completaste el <span className="text-green-400 font-bold">100% de tus tareas del día</span>? 
                        Recibirás un bonus especial de <span className="text-yellow-400 font-bold">+100 PC</span>, 
                        sin importar la rareza de tus tareas.
                      </p>
                      <p className="text-green-300 italic">
                        "La consistencia es más poderosa que la rareza. Un día perfecto es un Artefacto Legendario por sí mismo."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                  <p className="text-center text-purple-300 italic">
                    💡 <span className="font-bold">Recuerda:</span> No se trata solo de acumular Artefactos Legendarios. 
                    Un Recolector consistente con tareas comunes vale más que un cazador esporádico de épicos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIME CAPSULE VIDEO MODAL */}
      <TimeCapsuleVideoModal
        isOpen={showTimeCapsule}
        onClose={() => setShowTimeCapsule(false)}
        evidencias={evidenciasFiltradas.map(ev => ({
          id: ev.id,
          fotoUrl: ev.fotoUrl,
          descripcion: ev.descripcion,
          fecha: new Date(ev.fecha),
          rarity: ev.rarity,
          highQuality: ev.highQuality
        }))}
      />
    </div>
  );
}
