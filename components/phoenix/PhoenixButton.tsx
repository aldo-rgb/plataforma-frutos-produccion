'use client';

import { useState } from 'react';
import { usePhoenix } from '@/contexts/PhoenixContext';
import { Flame, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function PhoenixButton() {
  const { data: session } = useSession();
  const { activatePhoenix, isLoading } = usePhoenix();
  const [showTooltip, setShowTooltip] = useState(false);

  // Solo mostrar para PARTICIPANTE y GAMECHANGER
  const userRole = session?.user?.rol;
  if (userRole !== 'PARTICIPANTE' && userRole !== 'GAMECHANGER') {
    return null;
  }

  const handleClick = async () => {
    await activatePhoenix('Me siento bloqueado');
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isLoading}
        className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-orange-500/50"
        title="Protocolo Fénix"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Flame className="w-5 h-5 group-hover:animate-pulse" />
        )}
        <span className="hidden sm:inline">SOS</span>
      </button>

      {/* Tooltip */}
      {showTooltip && !isLoading && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border border-orange-500/50 rounded-lg p-3 shadow-xl z-50 animate-fadeIn">
          <div className="text-sm text-white font-semibold mb-1">
            ¿Te sientes abrumado?
          </div>
          <div className="text-xs text-slate-300">
            Activa el Protocolo Fénix para reiniciar tu día sin culpa
          </div>
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 border-r border-b border-orange-500/50 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}
