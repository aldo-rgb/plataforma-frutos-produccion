'use client';

import { useState } from 'react';
import { Smartphone, Download, X, Share, Plus, ChevronRight } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallAppButtonProps {
  variant?: 'sidebar' | 'card' | 'compact';
  className?: string;
}

export default function InstallAppButton({ variant = 'sidebar', className = '' }: InstallAppButtonProps) {
  const { 
    isInstalled, 
    isIOS, 
    isMobile,
    promptInstall,
    showIOSInstructions,
    setShowIOSInstructions,
    showDesktopInstructions,
    setShowDesktopInstructions
  } = usePWAInstall();

  const [installing, setInstalling] = useState(false);

  // No mostrar si ya está instalada
  if (isInstalled) {
    return null;
  }

  // SIEMPRE mostrar el botón - en móviles y desktop
  // En iOS mostrará instrucciones de Safari
  // En Android/Desktop Chrome mostrará el prompt o instrucciones

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  // Variante Sidebar (la principal)
  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleInstall}
          disabled={installing}
          className={`
            w-full flex items-center gap-3 px-4 py-3 
            bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20
            hover:from-cyan-500/30 hover:via-purple-500/30 hover:to-pink-500/30
            border border-cyan-500/30 hover:border-cyan-500/50
            rounded-xl transition-all duration-300 group
            ${installing ? 'opacity-50 cursor-wait' : ''}
            ${className}
          `}
        >
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
            <Smartphone className="text-white" size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {installing ? 'Instalando...' : 'Instalar App'}
            </p>
            <p className="text-xs text-slate-400">
              {isMobile ? 'Acceso directo en tu celular' : 'Acceso directo en tu dispositivo'}
            </p>
          </div>
          <Download className="text-cyan-400 group-hover:text-cyan-300 group-hover:animate-bounce" size={18} />
        </button>

        {/* Modal de instrucciones iOS */}
        <IOSInstructionsModal 
          isOpen={showIOSInstructions} 
          onClose={() => setShowIOSInstructions(false)} 
        />
        
        {/* Modal de instrucciones Desktop/Chrome */}
        <DesktopInstructionsModal 
          isOpen={showDesktopInstructions} 
          onClose={() => setShowDesktopInstructions(false)} 
        />
      </>
    );
  }

  // Variante Card (para destacar en dashboard)
  if (variant === 'card') {
    return (
      <>
        <div className={`
          bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80
          border-2 border-cyan-500/30 hover:border-cyan-500/50
          rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer
          ${className}
        `}
          onClick={handleInstall}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl">
              <Smartphone className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">
                📲 Instalar Quantum App
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Accede más rápido desde tu pantalla de inicio
              </p>
            </div>
            <ChevronRight className="text-cyan-400" size={24} />
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
              ✓ Gratis
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full">
              ✓ Sin App Store
            </span>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">
              ✓ 1 Click
            </span>
          </div>
        </div>

        <IOSInstructionsModal 
          isOpen={showIOSInstructions} 
          onClose={() => setShowIOSInstructions(false)} 
        />
      </>
    );
  }

  // Variante Compact (solo icono)
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstall}
          disabled={installing}
          title="Instalar App"
          className={`
            p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20
            hover:from-cyan-500/30 hover:to-purple-500/30
            border border-cyan-500/30 hover:border-cyan-500/50
            rounded-lg transition-all
            ${installing ? 'opacity-50' : ''}
            ${className}
          `}
        >
          <Download className="text-cyan-400" size={20} />
        </button>

        <IOSInstructionsModal 
          isOpen={showIOSInstructions} 
          onClose={() => setShowIOSInstructions(false)} 
        />
      </>
    );
  }

  return null;
}

// Modal de instrucciones para iOS
function IOSInstructionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-sm w-full border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
                <Smartphone className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar en iPhone</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">
              1
            </div>
            <div>
              <p className="text-white font-semibold mb-2">
                Toca el botón Compartir
              </p>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="p-2 bg-slate-700 rounded-lg">
                  <Share className="text-blue-400" size={20} />
                </div>
                <span>El cuadrito con la flecha hacia arriba</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-purple-500"></div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">
              2
            </div>
            <div>
              <p className="text-white font-semibold mb-2">
                Selecciona "Agregar a Inicio"
              </p>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="p-2 bg-slate-700 rounded-lg">
                  <Plus className="text-green-400" size={20} />
                </div>
                <span>Add to Home Screen</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500"></div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 font-bold">
              3
            </div>
            <div>
              <p className="text-white font-semibold mb-2">
                Confirma "Agregar"
              </p>
              <p className="text-slate-400 text-sm">
                ¡Listo! Quantum aparecerá junto a tus apps
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de instrucciones para Desktop/Chrome/Android
function DesktopInstructionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-sm w-full border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
                <Download className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar App</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Chrome Instructions */}
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Para instalar la app en tu dispositivo:
            </p>
            
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-white font-medium">
                  En Chrome, busca el ícono <span className="text-cyan-400">⋮</span> (menú)
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-white font-medium">
                  Selecciona "Instalar app" o "Agregar a pantalla de inicio"
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-white font-medium">
                  Confirma la instalación
                </p>
              </div>
            </div>
          </div>

          {/* Alternative for Safari on Mac */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400 text-xs">
              💡 En Safari macOS: File → Add to Dock
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
