'use client';

import { useState } from 'react';
import { usePhoenix } from '@/contexts/PhoenixContext';
import { Flame, Loader2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function PhoenixButton() {
  const { data: session } = useSession();
  const { isPhoenixMode, activatePhoenix, exitPhoenix, isLoading } = usePhoenix();
  const [showTooltip, setShowTooltip] = useState(false);

  // Solo mostrar para PARTICIPANTE y GAMECHANGER
  const userRole = session?.user?.rol;
  if (userRole !== 'PARTICIPANTE' && userRole !== 'GAMECHANGER') {
    return null;
  }

  const handleClick = async () => {
    // Botón suspendido temporalmente
    return;
    
    /* if (isPhoenixMode) {
      // Desactivar Protocolo Fénix
      await exitPhoenix();
    } else {
      // Activar Protocolo Fénix
      await activatePhoenix('Me siento bloqueado');
    } */
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={true}
        className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-400 font-semibold rounded-lg transition-all duration-300 opacity-50 cursor-not-allowed shadow-lg"
        title="Protocolo Fénix - Temporalmente suspendido"
      >
        <Flame className="w-5 h-5" />
        <span className="hidden sm:inline">SOS</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl z-50 animate-fadeIn">
          <div className="text-sm text-slate-300 font-semibold mb-1">
            ⏸️ Función Temporalmente Suspendida
          </div>
          <div className="text-xs text-slate-400">
            El Protocolo Fénix está en mantenimiento. Pronto estará disponible nuevamente.
          </div>
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 border-r border-b border-slate-600 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}
