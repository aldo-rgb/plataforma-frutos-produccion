'use client';

import { useEffect, useState } from 'react';
import { Award, Star, TrendingUp, Target, Loader2 } from 'lucide-react';

interface ProgresoPromocionProps {
  perfilMentorId: number;
}

export default function ProgresoPromocion({ perfilMentorId }: ProgresoPromocionProps) {
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, [perfilMentorId]);

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch(`/api/mentorias/estadisticas/${perfilMentorId}`);
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  if (!estadisticas) return null;

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'MASTER':
        return 'text-purple-400 bg-purple-900/20 border-purple-500/30';
      case 'SENIOR':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      case 'JUNIOR':
        return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="text-yellow-500" size={28} />
            <div>
              <h3 className="text-xl font-bold text-white">Nivel Actual</h3>
              <p className="text-slate-400 text-sm">Progreso de carrera</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${getNivelColor(estadisticas.nivel)}`}>
            {estadisticas.nivel}
          </span>
        </div>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        
        {/* Rating Promedio */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-yellow-500" size={18} />
            <span className="text-xs text-slate-400 uppercase font-bold">Rating</span>
          </div>
          <p className="text-2xl font-bold text-white">{estadisticas.ratingPromedio}</p>
          <p className="text-xs text-slate-500">{estadisticas.totalResenas} reseñas</p>
        </div>

        {/* Sesiones Completadas */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-500" size={18} />
            <span className="text-xs text-slate-400 uppercase font-bold">Sesiones</span>
          </div>
          <p className="text-2xl font-bold text-white">{estadisticas.sesionesCompletadas}</p>
          <p className="text-xs text-slate-500">completadas</p>
        </div>

        {/* Total Sesiones */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-500" size={18} />
            <span className="text-xs text-slate-400 uppercase font-bold">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{estadisticas.totalSesiones}</p>
          <p className="text-xs text-slate-500">sesiones</p>
        </div>

        {/* Próximo Nivel */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-purple-500" size={18} />
            <span className="text-xs text-slate-400 uppercase font-bold">Progreso</span>
          </div>
          <p className="text-2xl font-bold text-white">{estadisticas.progresoPorcentaje}%</p>
          <p className="text-xs text-slate-500">
            {estadisticas.proximoNivel ? `hacia ${estadisticas.proximoNivel}` : 'Nivel máximo'}
          </p>
        </div>
      </div>

      {/* Barra de Progreso hacia Próximo Nivel */}
      {estadisticas.proximoNivel && (
        <div className="px-6 pb-6">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-slate-300">
                Progreso hacia {estadisticas.proximoNivel}
              </span>
              <span className="text-sm font-bold text-purple-400">
                {estadisticas.progresoPorcentaje}%
              </span>
            </div>
            
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${estadisticas.progresoPorcentaje}%` }}
              />
            </div>

            {/* Requisitos */}
            {estadisticas.umbralesProximoNivel && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase font-bold mb-2">Requisitos para {estadisticas.proximoNivel}:</p>
                
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sesiones completadas:</span>
                  <span className={estadisticas.sesionesCompletadas >= estadisticas.umbralesProximoNivel.sesionesMinimas ? 'text-emerald-400' : 'text-slate-400'}>
                    {estadisticas.sesionesCompletadas} / {estadisticas.umbralesProximoNivel.sesionesMinimas}
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Rating mínimo:</span>
                  <span className={parseFloat(estadisticas.ratingPromedio) >= estadisticas.umbralesProximoNivel.ratingMinimo ? 'text-emerald-400' : 'text-slate-400'}>
                    {estadisticas.ratingPromedio} / {estadisticas.umbralesProximoNivel.ratingMinimo}
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Reseñas mínimas:</span>
                  <span className={estadisticas.totalResenas >= estadisticas.umbralesProximoNivel.resenasMinimas ? 'text-emerald-400' : 'text-slate-400'}>
                    {estadisticas.totalResenas} / {estadisticas.umbralesProximoNivel.resenasMinimas}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensaje Nivel Máximo */}
      {!estadisticas.proximoNivel && (
        <div className="px-6 pb-6">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Award className="text-purple-400" size={24} />
              <div>
                <p className="text-purple-300 font-bold">¡Nivel Máximo Alcanzado!</p>
                <p className="text-purple-400 text-sm">Has alcanzado el nivel MASTER</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Últimas Reseñas */}
      {estadisticas.resenas && estadisticas.resenas.length > 0 && (
        <div className="border-t border-slate-800 p-6">
          <h4 className="text-sm font-bold text-slate-300 uppercase mb-4">Últimas Reseñas</h4>
          <div className="space-y-3">
            {estadisticas.resenas.slice(0, 3).map((resena: any) => (
              <div key={resena.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={resena.cliente.imagen || '/default-avatar.png'} 
                      alt={resena.cliente.nombre}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-white font-bold">{resena.cliente.nombre}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(resena.calificacion)].map((_, i) => (
                      <Star key={i} size={14} className="fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                </div>
                {resena.comentario && (
                  <p className="text-xs text-slate-400 line-clamp-2">{resena.comentario}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
