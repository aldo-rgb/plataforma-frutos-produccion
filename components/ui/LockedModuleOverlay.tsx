'use client';

import { Lock, ArrowUpRight } from 'lucide-react';
import { useVisionAccess } from '@/contexts/VisionAccessContext';
import { ReactNode } from 'react';

type ModuleKey = 'carta' | 'metas' | 'tareas' | 'evidencias' | 'quantum' | 'llamadasMentor' | 'disciplina' | 'ranking';

interface LockedModuleOverlayProps {
  module: ModuleKey;
  children: ReactNode;
  className?: string;
  showUpgradeButton?: boolean;
  upgradeHref?: string;
}

// Traducciones
const translations = {
  es: {
    locked: 'Módulo Bloqueado',
    upgrade: 'Desbloquear',
    basicRequired: 'Completa BÁSICO para acceder',
    advancedRequired: 'Regístrate en AVANZADO para acceder',
    plRequired: 'Regístrate en PL para acceder',
  },
  en: {
    locked: 'Module Locked',
    upgrade: 'Unlock',
    basicRequired: 'Complete BASIC to access',
    advancedRequired: 'Register for ADVANCED to access',
    plRequired: 'Register for PL to access',
  }
};

export default function LockedModuleOverlay({
  module,
  children,
  className = '',
  showUpgradeButton = true,
  upgradeHref = '/dashboard/upgrade'
}: LockedModuleOverlayProps) {
  const { canAccess, getLockedMessage, isLoading, currentLevel, isLoboSolitario } = useVisionAccess();
  const t = translations.es; // TODO: usar contexto de idioma

  // Si está cargando, mostrar el contenido normal (evitar flash)
  if (isLoading) {
    return <>{children}</>;
  }

  // Si es lobo solitario o tiene acceso, mostrar contenido normal
  if (isLoboSolitario || canAccess(module)) {
    return <>{children}</>;
  }

  // Determinar el mensaje según el módulo
  const lockedMessage = getLockedMessage(module);

  return (
    <div className={`relative ${className}`}>
      {/* Contenido desenfocado/bloqueado */}
      <div className="filter blur-[2px] opacity-50 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay de bloqueo */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-2xl z-10">
        <div className="text-center px-6 py-8 max-w-sm">
          {/* Icono de candado animado */}
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          {/* Título */}
          <h3 className="text-lg font-bold text-white mb-2">
            {t.locked}
          </h3>

          {/* Mensaje de bloqueo */}
          <p className="text-amber-300 text-sm mb-4">
            {lockedMessage}
          </p>

          {/* Nivel actual */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full text-xs text-slate-400 mb-4">
            <span>Tu nivel actual:</span>
            <span className={`font-bold ${
              currentLevel === 'BASIC' ? 'text-blue-400' :
              currentLevel === 'ADVANCED' ? 'text-purple-400' :
              currentLevel === 'PL' ? 'text-amber-400' : 'text-green-400'
            }`}>
              {currentLevel === 'BASIC' ? '🟦 BÁSICO' :
               currentLevel === 'ADVANCED' ? '🟪 AVANZADO' :
               currentLevel === 'PL' ? '🟡 PL' : '✅ COMPLETO'}
            </span>
          </div>

          {/* Botón de upgrade */}
          {showUpgradeButton && (
            <a
              href={upgradeHref}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-amber-500/25"
            >
              {t.upgrade}
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente simplificado para envolver widgets/cards
interface LockedCardProps {
  module: ModuleKey;
  children: ReactNode;
}

export function LockedCard({ module, children }: LockedCardProps) {
  const { canAccess, isLoading, isLoboSolitario } = useVisionAccess();

  if (isLoading || isLoboSolitario || canAccess(module)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="filter blur-[1px] opacity-40 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 rounded-full border border-amber-500/30">
          <Lock className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 text-sm font-medium">Bloqueado</span>
        </div>
      </div>
    </div>
  );
}

// HOC para proteger rutas/páginas completas
interface ProtectedModulePageProps {
  module: ModuleKey;
  children: ReactNode;
  fallbackHref?: string;
}

export function ProtectedModulePage({ module, children, fallbackHref = '/dashboard' }: ProtectedModulePageProps) {
  const { canAccess, isLoading, isLoboSolitario, getLockedMessage, currentLevel } = useVisionAccess();
  const t = translations.es;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isLoboSolitario || canAccess(module)) {
    return <>{children}</>;
  }

  // Página de acceso denegado
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icono grande */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full animate-pulse"></div>
          <div className="absolute inset-3 bg-slate-900 rounded-full flex items-center justify-center border-2 border-amber-500/30">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          🔒 Acceso Restringido
        </h1>

        <p className="text-amber-300 mb-2">
          {getLockedMessage(module)}
        </p>

        <p className="text-slate-400 text-sm mb-6">
          Tu nivel actual es <span className="font-bold text-white">{currentLevel}</span>.
          <br />
          Contacta a tu coordinador para desbloquear este módulo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={fallbackHref}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            ← Volver al Dashboard
          </a>
          <a
            href="/dashboard/upgrade"
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all"
          >
            Ver Opciones de Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
