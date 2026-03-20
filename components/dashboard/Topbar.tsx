'use client';

import { Zap, Globe, Menu, Bug } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import { useState } from 'react';
import Image from 'next/image';
import BugReportModal from './BugReportModal';

interface TopbarProps {
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    suscripcion: string | null;
    puntosCuanticos: number;
    timezone?: string;
    imagen?: string | null;
    profileImage?: string | null;
    esMentor?: boolean;
    esEntrenador?: boolean;
    esCoordinador?: boolean;
    esLider?: boolean;
    esCoordinadorBasico?: boolean;
    esCoordinadorAvanzado?: boolean;
    organization?: {
      id: number;
      name: string;
      logoUrl: string | null;
      brandColor: string | null;
    } | null;
  };
  onMenuClick?: () => void;
}

export function Topbar({ usuario, onMenuClick }: TopbarProps) {
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  
  return (
    <>
    <header className="sticky top-0 z-[9999] h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/95 backdrop-blur-sm">
      {/* Botón de menú móvil (solo visible cuando el sidebar está oculto) */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={24} className="text-slate-300" />
        </button>
      )}

      {/* Badge BETA */}
      <div className="hidden md:flex items-center gap-2 ml-2">
        <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full uppercase tracking-wider animate-pulse">
          BETA
        </span>
        <span className="text-xs text-slate-500 hidden lg:inline">v1.0.0</span>
      </div>

      <div className="flex-1 lg:flex-initial" />
      
      <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
        {/* Botón Reportar Error */}
        <button
          onClick={() => setShowBugReportModal(true)}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-amber-500/50 transition-all duration-200 group"
          title="Reportar un error"
        >
          <Bug size={14} className="text-amber-400 group-hover:animate-wiggle" />
          <span className="hidden sm:inline">Reportar Error</span>
        </button>
        
        {/* Role Switcher - Para usuarios con múltiples roles */}
        <RoleSwitcher usuario={usuario} />
        
        {/* Zona Horaria - solo en pantallas grandes */}
        <div className="hidden lg:block text-right">
          <p className="text-xs text-slate-500 uppercase font-bold">Tu Zona Horaria</p>
          <div className="flex items-center gap-1 text-slate-300 text-sm">
            <Globe size={12} />
            <span className="font-mono text-xs">{usuario.timezone || 'America/Mexico_City'}</span>
          </div>
        </div>

        {/* Puntos Cuánticos - compacto en móvil */}
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
          <Zap size={16} className="text-yellow-400 sm:w-[18px] sm:h-[18px]" />
          <span className="font-bold text-white text-sm sm:text-base">{usuario.puntosCuanticos.toLocaleString()}</span>
          <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">Puntos</span>
        </div>

        {/* User Info - solo avatar en móvil */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <h2 className="text-sm font-bold text-white">{usuario.nombre}</h2>
            <p className="text-[10px] text-slate-400 uppercase">{usuario.rol}</p>
          </div>
          {(usuario.imagen || usuario.profileImage) ? (
            <Image
              src={usuario.imagen || usuario.profileImage || ''}
              alt={usuario.nombre}
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-base">
              {usuario.nombre?.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </header>
    
    {/* Modal de Reporte de Error */}
    <BugReportModal 
      isOpen={showBugReportModal}
      onClose={() => setShowBugReportModal(false)}
      userName={usuario.nombre}
      userEmail={usuario.email}
      userId={usuario.id.toString()}
    />
    </>
  );
}
