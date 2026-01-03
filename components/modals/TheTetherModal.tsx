'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Zap, Shield, TrendingUp, Users, CheckCircle2, XCircle } from 'lucide-react';

interface TheTetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFree: () => void;
  onUpgradeStandard: () => void;
}

export default function TheTetherModal({ 
  isOpen, 
  onClose, 
  onConfirmFree, 
  onUpgradeStandard 
}: TheTetherModalProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reproducir sonido de desconexión
      try {
        const audio = new Audio('/sounds/disconnect.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio no disponible'));
      } catch (e) {
        console.log('Audio no disponible');
      }

      // Animación de entrada
      setTimeout(() => setShowWarning(true), 100);
    } else {
      setShowWarning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      {/* Backdrop oscuro */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl border-2 border-red-900/30 shadow-2xl shadow-red-900/20 overflow-y-auto transition-all duration-500 my-8 ${showWarning ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 z-10 float-right p-2 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Header - System Alert */}
        <div className="bg-red-950/30 border-b border-red-900/30 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/20 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-400 font-mono tracking-wider">
                ⚠️ ADVERTENCIA DE NAVEGACIÓN
              </h2>
              <p className="text-red-300/70 text-sm mt-1 font-mono">
                Protocolo de Lobo Solitario Detectado
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-8 space-y-8">
          
          {/* Visual: Astronaut Floating Away */}
          <div className="relative h-48 bg-gradient-to-b from-slate-900 to-black rounded-2xl overflow-hidden border border-slate-800">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Nave alejándose */}
              <div className="absolute right-10 top-10 animate-float">
                <div className="w-20 h-20 relative">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="absolute inset-4 border-4 border-cyan-500 rounded-lg rotate-45" />
                  <div className="absolute inset-6 border-2 border-cyan-400 rounded-lg rotate-45" />
                </div>
              </div>
              
              {/* Astronauta flotando solo */}
              <div className="absolute left-10 bottom-10 animate-drift">
                <div className="text-6xl filter grayscale opacity-50">🧑‍🚀</div>
              </div>

              {/* Partículas flotantes */}
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full animate-twinkle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="text-center space-y-4">
            <p className="text-xl text-white leading-relaxed">
              Has elegido explorar <span className="text-red-400 font-bold">sin asistencia</span>. 
              En el modo Básico, tu progreso es <span className="text-slate-500 line-through">invisible</span>.
            </p>
            <p className="text-lg text-slate-300">
              Sin Mentor, sin Validación de Evidencias y sin Puntos Cuánticos, 
              estás navegando <span className="text-red-400 font-bold">a ciegas</span>.
            </p>
            <p className="text-base text-slate-400 italic">
              "La realidad tiende a disolverse si nadie la observa. 
              <br />¿Seguro que quieres renunciar a tu Copiloto?"
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left Card - What They're Choosing (NEGATIVE) */}
            <div className="relative bg-slate-900/50 border-2 border-slate-800 rounded-2xl p-6 opacity-60">
              <div className="absolute -top-3 left-6 bg-red-900 px-4 py-1 rounded-full">
                <span className="text-xs font-bold text-white">LO QUE ELIGES</span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-400">Sin Evidencia Verificada</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Sin mentor dedicado</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Sin validación de evidencias</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Sin feedback personalizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Sin sistema de recompensas</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-red-950/30 rounded-lg border border-red-900/30">
                <p className="text-xs text-red-400 font-bold">Riesgo de abandono: 85%</p>
                <p className="text-xs text-red-300/70 mt-1">Sin soporte, la mayoría abandona en 2 semanas</p>
              </div>
            </div>

            {/* Right Card - Plan Standard (POSITIVE) */}
            <div className="relative bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border-2 border-cyan-500 rounded-2xl p-6 shadow-lg shadow-cyan-900/30 animate-glow">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 rounded-full">
                <span className="text-xs font-bold text-white">RECOMENDADO</span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Mentor Dedicado + Revisión</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Mentor personal asignado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Validación de todas tus evidencias</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Feedback semanal personalizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Sistema de puntos cuánticos activo</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-cyan-950/50 rounded-lg border border-cyan-500/30">
                <p className="text-xs text-cyan-300 font-bold">Probabilidad de Éxito: Aumentada 10x</p>
                <p className="text-xs text-cyan-200/70 mt-1">Con mentor, el 92% completa sus metas</p>
              </div>
            </div>
          </div>

          {/* The Math Offer */}
          <div className="bg-gradient-to-r from-amber-950/30 via-yellow-950/30 to-amber-950/30 border border-amber-700/30 rounded-xl p-6 text-center">
            <p className="text-lg text-amber-200">
              Por solo <span className="text-2xl font-bold text-amber-400">$3.30 al día</span> 
              <span className="text-slate-400"> (menos que un café)</span>
            </p>
            <p className="text-sm text-amber-300/70 mt-2">
              Activas el Sistema de Soporte Vital Completo
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary Button - UPGRADE */}
            <button
              onClick={onUpgradeStandard}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:via-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-cyan-900/50 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 group"
            >
              <Zap className="w-6 h-6 group-hover:animate-pulse" />
              ACTIVAR SOPORTE STANDARD
              <span className="text-sm opacity-90">(No quiero ir solo)</span>
            </button>

            {/* Secondary Button - CONFIRM FREE */}
            <button
              onClick={onConfirmFree}
              className="w-full py-4 text-base text-slate-400 hover:text-slate-300 transition-colors border border-slate-700 hover:border-slate-600 rounded-lg font-medium"
            >
              Confirmar aislamiento. Continuar con riesgo →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes drift {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          50% { transform: translateY(10px) translateX(-5px) rotate(-5deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.5); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-drift { animation: drift 4s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
