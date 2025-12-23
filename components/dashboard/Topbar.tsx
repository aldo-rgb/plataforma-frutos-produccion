'use client';

import { Zap, Globe } from 'lucide-react';

interface TopbarProps {
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    suscripcion: string | null;
    puntosCuanticos: number;
    timezone?: string;
  };
}

export function Topbar({ usuario }: TopbarProps) {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex-1" />
      
      <div className="flex items-center gap-6">
        {/* Zona Horaria */}
        <div className="hidden md:block text-right">
          <p className="text-xs text-slate-500 uppercase font-bold">Tu Zona Horaria</p>
          <div className="flex items-center gap-1 text-slate-300 text-sm">
            <Globe size={12} />
            <span className="font-mono text-xs">{usuario.timezone || 'America/Mexico_City'}</span>
          </div>
        </div>

        {/* Puntos Cuánticos */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
          <Zap size={18} className="text-yellow-400" />
          <span className="font-bold text-white">{usuario.puntosCuanticos.toLocaleString()}</span>
          <span className="text-xs text-slate-400">Puntos</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h2 className="text-sm font-bold text-white">{usuario.nombre}</h2>
            <p className="text-[10px] text-slate-400 uppercase">{usuario.rol}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
            {usuario.nombre?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
