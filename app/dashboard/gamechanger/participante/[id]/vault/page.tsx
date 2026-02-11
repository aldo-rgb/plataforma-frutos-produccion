'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, Filter, Sparkles, Award, TrendingUp, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Evidencia {
  id: number | string;
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

interface Stats {
  total: number;
  legendary: number;
  epic: number;
  rare: number;
  uncommon: number;
  common: number;
  thisWeek: number;
}

interface Participante {
  id: number;
  nombre: string;
  email: string;
}

export default function ParticipanteVaultPage() {
  const params = useParams();
  const router = useRouter();
  const participanteId = params?.id as string;
  
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtroArea, setFiltroArea] = useState<string>('TODAS');
  const [filtroRareza, setFiltroRareza] = useState<string>('TODAS');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Evidencia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (participanteId) {
      fetchVault();
    }
  }, [participanteId]);

  const fetchVault = async () => {
    try {
      const response = await fetch(`/api/gamechanger/participante/${participanteId}/vault`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Error al cargar el vault');
        return;
      }

      setParticipante(data.participante);
      setEvidencias(data.evidencias || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error al cargar vault:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'from-yellow-500 to-orange-500';
      case 'EPIC': return 'from-purple-500 to-pink-500';
      case 'RARE': return 'from-blue-500 to-cyan-500';
      case 'UNCOMMON': return 'from-green-500 to-emerald-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return '🌟 Legendario';
      case 'EPIC': return '💎 Épico';
      case 'RARE': return '💠 Raro';
      case 'UNCOMMON': return '🔹 Poco Común';
      default: return '⚪ Común';
    }
  };

  const areas = ['TODAS', 'FINANZAS', 'RELACIONES', 'TALENTOS', 'PAZ_MENTAL', 'OCIO', 'SALUD', 'EXTRAORDINARIA'];
  const rarezas = ['TODAS', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

  const evidenciasFiltradas = evidencias.filter(ev => {
    const cumpleArea = filtroArea === 'TODAS' || ev.area === filtroArea;
    const cumpleRareza = filtroRareza === 'TODAS' || ev.rarity === filtroRareza;
    return cumpleArea && cumpleRareza;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Link
            href="/dashboard/gamechanger/participantes"
            className="text-purple-400 hover:text-purple-300 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Volver a participantes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/gamechanger/participantes"
            className="text-slate-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={20} />
            Volver a participantes
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Camera size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                The Vault de {participante?.nombre}
              </h1>
              <p className="text-slate-400">Bóveda de Artefactos de Verdad</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon size={16} className="text-purple-400" />
                <span className="text-xs text-slate-400">Total Artefactos</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-yellow-400" />
                <span className="text-xs text-slate-400">Legendarios</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.legendary}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award size={16} className="text-purple-400" />
                <span className="text-xs text-slate-400">Épicos</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.epic}</p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-400" />
                <span className="text-xs text-slate-400">Esta Semana</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.thisWeek}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-slate-400 text-sm">Filtros:</span>
          </div>
          
          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm"
          >
            {areas.map(area => (
              <option key={area} value={area}>
                {area === 'TODAS' ? 'Todas las Áreas' : area.replace('_', ' ')}
              </option>
            ))}
          </select>
          
          <select
            value={filtroRareza}
            onChange={(e) => setFiltroRareza(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm"
          >
            {rarezas.map(rareza => (
              <option key={rareza} value={rareza}>
                {rareza === 'TODAS' ? 'Todas las Rarezas' : getRarityLabel(rareza)}
              </option>
            ))}
          </select>
        </div>

        {/* Grid de Evidencias */}
        {evidenciasFiltradas.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <ImageIcon size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">
              {evidencias.length === 0 ? 'La Bóveda está vacía' : 'No hay resultados'}
            </h3>
            <p className="text-slate-500">
              {evidencias.length === 0 
                ? 'Este participante aún no tiene artefactos aprobados'
                : 'Prueba con otros filtros'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {evidenciasFiltradas.map((evidencia) => (
              <div
                key={evidencia.id}
                onClick={() => setSelectedImage(evidencia)}
                className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 bg-gradient-to-br ${getRarityColor(evidencia.rarity)} p-0.5`}
              >
                <div className="bg-slate-900 rounded-lg overflow-hidden">
                  <div className="relative aspect-square">
                    <Image
                      src={evidencia.fotoUrl}
                      alt={evidencia.descripcion}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    
                    {/* Overlay con info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium line-clamp-2">
                          {evidencia.descripcion}
                        </p>
                        <p className="text-slate-300 text-xs mt-1">
                          {evidencia.areaIcon} {evidencia.area}
                        </p>
                      </div>
                    </div>
                    
                    {/* Badge de rareza */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(evidencia.rarity)} text-white shadow-lg`}>
                      {getRarityLabel(evidencia.rarity).split(' ')[0]}
                    </div>
                    
                    {/* High Quality badge */}
                    {evidencia.highQuality && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black">
                        ⭐ HQ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de imagen */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 rounded-full text-white hover:bg-slate-700"
            >
              <X size={24} />
            </button>
            
            <div className="relative aspect-video">
              <Image
                src={selectedImage.fotoUrl}
                alt={selectedImage.descripcion}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getRarityColor(selectedImage.rarity)} text-white`}>
                  {getRarityLabel(selectedImage.rarity)}
                </span>
                <span className="text-slate-400">
                  {selectedImage.areaIcon} {selectedImage.area}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedImage.descripcion}
              </h3>
              
              <p className="text-slate-400 text-sm">
                {new Date(selectedImage.fecha).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              {selectedImage.qualityScore && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Calidad:</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${selectedImage.qualityScore}%` }}
                    />
                  </div>
                  <span className="text-purple-400 font-bold">{selectedImage.qualityScore}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
