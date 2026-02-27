'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Rocket, Calendar, Clock } from 'lucide-react';

interface ZonaEjecucionData {
  totalHoy: number;
  totalRetrasadas: number;
  isDropped?: boolean;
}

export default function ZonaEjecucionDiaria() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ZonaEjecucionData | null>(null);

  useEffect(() => {
    loadTareas();
  }, []);

  const loadTareas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tareas/zona-ejecucion');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-6 p-6 cursor-pointer hover:border-indigo-500/50 transition-all"
        onClick={() => router.push('/dashboard/hoy')}
      >
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-3 text-slate-400">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si el usuario está marcado como DROP
  if (data?.isDropped) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 border border-red-900/50 shadow-2xl mb-6 overflow-hidden p-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Acceso Suspendido</p>
        </div>
      </div>
    );
  }

  const totalHoy = data?.totalHoy || 0;
  const totalRetrasadas = data?.totalRetrasadas || 0;
  const todoListo = totalHoy === 0 && totalRetrasadas === 0;

  return (
    <div 
      onClick={() => router.push('/dashboard/hoy')}
      className="w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-6 overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all group"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Rocket className="w-5 h-5 text-indigo-400" />
          Zona de Ejecución
        </h3>
        <p className="text-slate-400 text-xs mt-1">Hoy es día de ganar</p>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {todoListo ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold">🎉 ¡Todo listo!</p>
            <p className="text-slate-500 text-sm mt-1">No tienes tareas pendientes</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {/* Tareas Hoy */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-400 text-sm font-medium">HOY</span>
              </div>
              <div className={`text-4xl sm:text-5xl font-bold ${totalHoy > 0 ? 'text-indigo-400' : 'text-green-400'}`}>
                {totalHoy}
              </div>
              <p className="text-slate-500 text-xs mt-1">tareas</p>
            </div>

            {/* Divider */}
            <div className="h-16 w-px bg-slate-700"></div>

            {/* Tareas Retrasadas */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-red-400" />
                <span className="text-slate-400 text-sm font-medium">RETRASADAS</span>
              </div>
              <div className={`text-4xl sm:text-5xl font-bold ${totalRetrasadas > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {totalRetrasadas}
              </div>
              <p className="text-slate-500 text-xs mt-1">tareas</p>
            </div>
          </div>
        )}

        {/* Click hint */}
        <div className="mt-4 text-center">
          <span className="text-xs text-slate-600 group-hover:text-indigo-400 transition-colors">
            Click para ver detalles →
          </span>
        </div>
      </div>
    </div>
  );
}
