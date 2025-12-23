'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GlobalProgressHeroProps {
  percent: number;
  label?: string;
  totalMetas?: number;
  completedMetas?: number;
}

export default function GlobalProgressHero({ 
  percent, 
  label = "Estado total de avance de tus metas",
  totalMetas = 6,
  completedMetas = 3
}: GlobalProgressHeroProps) {
  const router = useRouter();

  return (
    <div 
      onClick={() => router.push('/dashboard/carta')}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-8 shadow-2xl cursor-pointer group hover:border-purple-500/50 transition-all duration-300"
    >
      {/* Decoración de fondo animada */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-purple-500/5 to-transparent blur-3xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">
              Nivel de Maestría F.R.U.T.O.S.
            </h2>
            <p className="text-slate-400 text-sm md:text-base">
              {label}
            </p>
          </div>
          <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
            <span className="text-sm font-medium hidden md:inline">Ver Detalles</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Barra de Progreso Gigante */}
        <div className="space-y-4">
          {/* Porcentaje y Metas */}
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                {percent}%
              </span>
              <span className="text-slate-500 text-lg mb-2">Completado</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-300">
                {completedMetas}/{totalMetas}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">
                Áreas Maestradas
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="relative h-6 w-full bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
            {/* Brillo interno */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            
            {/* Progreso */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-purple-500/50"
              style={{ width: `${percent}%` }}
            >
              {/* Animación de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>

            {/* Marcadores cada 20% */}
            {[20, 40, 60, 80].map((marker) => (
              <div
                key={marker}
                className="absolute top-0 bottom-0 w-px bg-slate-700/50"
                style={{ left: `${marker}%` }}
              />
            ))}
          </div>

          {/* Etiquetas de las 6 áreas */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800">
            {['Finanzas', 'Relaciones', 'Talentos', 'Paz Mental', 'Ocio', 'Salud'].map((area, idx) => (
              <div key={area} className="text-center">
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                  idx < completedMetas 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-purple-500/50' 
                    : 'bg-slate-700'
                }`} />
                <span className={`text-xs ${
                  idx < completedMetas ? 'text-slate-300 font-medium' : 'text-slate-600'
                }`}>
                  {area}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Efecto hover de energía */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
      </div>
    </div>
  );
}
