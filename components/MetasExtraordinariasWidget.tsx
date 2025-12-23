'use client';

import React, { useState, useEffect } from 'react';
import { Target, Award, Calendar, Sparkles } from 'lucide-react';

interface MetaExtraordinaria {
  id: number;
  titulo: string;
  descripcion: string;
  puntosReward: number;
  tipoAsignacion: 'VISION' | 'INDIVIDUAL';
  fechaInicio: string;
  fechaFin: string;
}

export default function MetasExtraordinariasWidget() {
  const [metas, setMetas] = useState<MetaExtraordinaria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetas();
  }, []);

  const fetchMetas = async () => {
    try {
      const res = await fetch('/api/mis-metas-extraordinarias');
      if (res.ok) {
        const data = await res.json();
        setMetas(data);
      }
    } catch (error) {
      console.error('Error al cargar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (metas.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/50 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Sparkles className="text-purple-400" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Target size={20} className="text-pink-400" />
            Metas Extraordinarias Activas
          </h3>
          <p className="text-purple-300 text-sm">Retos especiales con recompensas extra</p>
        </div>
      </div>

      <div className="space-y-3">
        {metas.map((meta) => (
          <div
            key={meta.id}
            className="bg-slate-900/60 border border-purple-500/30 rounded-xl p-4 hover:border-purple-400/60 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-lg">{meta.titulo}</h4>
              <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                <Award size={14} />
                {meta.puntosReward} pts
              </span>
            </div>
            
            <p className="text-slate-300 text-sm mb-3">{meta.descripcion}</p>
            
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Calendar size={14} />
              <span>
                {new Date(meta.fechaInicio).toLocaleDateString()} - {new Date(meta.fechaFin).toLocaleDateString()}
              </span>
              {meta.tipoAsignacion === 'VISION' && (
                <span className="ml-auto px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                  🎯 Meta de Visión
                </span>
              )}
              {meta.tipoAsignacion === 'INDIVIDUAL' && (
                <span className="ml-auto px-2 py-1 rounded-full bg-pink-500/20 text-pink-300 font-medium">
                  ⭐ Meta Personal
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-purple-500/30">
        <p className="text-purple-300 text-xs text-center">
          💡 Completa estas metas para ganar puntos cuánticos adicionales
        </p>
      </div>
    </div>
  );
}
