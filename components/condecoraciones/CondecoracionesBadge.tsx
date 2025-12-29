'use client';

import { Award } from 'lucide-react';

interface CondecoracionesBadgeProps {
  condecoraciones?: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  maxDisplay?: number;
  className?: string;
}

const CONDECORACIONES_CONFIG: Record<string, { nombre: string; icono: string; color: string }> = {
  // Reconocimientos Generales
  'excelencia': { nombre: 'Excelencia', icono: '🏆', color: 'bg-yellow-500/20 border-yellow-500' },
  'liderazgo': { nombre: 'Liderazgo', icono: '👑', color: 'bg-purple-500/20 border-purple-500' },
  'perseverancia': { nombre: 'Perseverancia', icono: '💪', color: 'bg-orange-500/20 border-orange-500' },
  'innovacion': { nombre: 'Innovación', icono: '💡', color: 'bg-blue-500/20 border-blue-500' },
  'trabajo-equipo': { nombre: 'Trabajo en Equipo', icono: '🤝', color: 'bg-green-500/20 border-green-500' },
  'compromiso': { nombre: 'Compromiso', icono: '⭐', color: 'bg-cyan-500/20 border-cyan-500' },
  'mejora-continua': { nombre: 'Mejora Continua', icono: '📈', color: 'bg-indigo-500/20 border-indigo-500' },
  'mentor': { nombre: 'Mentor Destacado', icono: '🎓', color: 'bg-pink-500/20 border-pink-500' },
  'valor': { nombre: 'Valor', icono: '🦁', color: 'bg-red-500/20 border-red-500' },
  'impacto': { nombre: 'Alto Impacto', icono: '🚀', color: 'bg-violet-500/20 border-violet-500' },
  
  // Roles de Staff
  'staff-basico': { nombre: 'Staff Básico', icono: '⚡', color: 'bg-blue-500/20 border-blue-500' },
  'staff-avanzado': { nombre: 'Staff Avanzado', icono: '🔥', color: 'bg-red-500/20 border-red-500' },
  'game-changer': { nombre: 'Game Changer', icono: '🎯', color: 'bg-purple-500/20 border-purple-500' },
  'servicio': { nombre: 'Servicio', icono: '🙏', color: 'bg-green-500/20 border-green-500' },
  'super-nova': { nombre: 'Super Nova', icono: '🌟', color: 'bg-yellow-500/20 border-yellow-500 ring-2 ring-yellow-400' }
};

export default function CondecoracionesBadge({ 
  condecoraciones = [], 
  size = 'md', 
  showLabel = false,
  maxDisplay = 3,
  className = ''
}: CondecoracionesBadgeProps) {
  if (!condecoraciones || condecoraciones.length === 0) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const displayedCondecoraciones = condecoraciones.slice(0, maxDisplay);
  const remaining = condecoraciones.length - maxDisplay;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayedCondecoraciones.map((condId) => {
        const cond = CONDECORACIONES_CONFIG[condId];
        if (!cond) return null;

        return (
          <div
            key={condId}
            className={`
              ${sizeClasses[size]}
              ${cond.color}
              rounded-full
              border-2
              flex items-center justify-center
              transition-all
              hover:scale-110
              cursor-help
              shadow-lg
            `}
            title={cond.nombre}
          >
            <span className="text-base">{cond.icono}</span>
          </div>
        );
      })}
      
      {remaining > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            bg-slate-700/50
            border-2 border-slate-600
            rounded-full
            flex items-center justify-center
            text-slate-300
            font-bold
            text-xs
          `}
          title={`+${remaining} más`}
        >
          +{remaining}
        </div>
      )}
      
      {showLabel && condecoraciones.length > 0 && (
        <span className="text-xs text-slate-400 font-medium ml-1">
          {condecoraciones.length} {condecoraciones.length === 1 ? 'medalla' : 'medallas'}
        </span>
      )}
    </div>
  );
}

// Componente para mostrar todas las condecoraciones en un grid
export function CondecoracionesGrid({ condecoraciones = [] }: { condecoraciones?: string[] }) {
  if (!condecoraciones || condecoraciones.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Sin condecoraciones aún</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {condecoraciones.map((condId) => {
        const cond = CONDECORACIONES_CONFIG[condId];
        if (!cond) return null;

        return (
          <div
            key={condId}
            className={`
              ${cond.color}
              rounded-xl
              border-2
              p-3
              flex flex-col items-center justify-center
              gap-2
              transition-all
              hover:scale-105
              hover:shadow-lg
            `}
          >
            <span className="text-3xl">{cond.icono}</span>
            <span className="text-xs font-bold text-white text-center">
              {cond.nombre}
            </span>
          </div>
        );
      })}
    </div>
  );
}
