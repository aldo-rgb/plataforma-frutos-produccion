'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

interface UserLevel {
  nivel: number;
  rango: string;
  icono: string;
  xpActual: number;
  xpTotal: number;
  xpParaSiguiente: number;
  progreso: number;
  pc: number;
}

interface UserLevelBadgeProps {
  user?: UserLevel;
  compact?: boolean;
  mode?: 'full' | 'compact';
}

export default function UserLevelBadge({ user: userProp, compact = false, mode }: UserLevelBadgeProps) {
  const [user, setUser] = useState<UserLevel | null>(userProp || null);
  const [loading, setLoading] = useState(!userProp);

  useEffect(() => {
    if (!userProp) {
      // Fetch user data if not provided
      fetch('/api/user/level')
        .then(res => res.json())
        .then(data => {
          if (data.nivel) {
            setUser({
              nivel: data.nivel.nivel,
              rango: data.nivel.rango,
              icono: data.nivel.icono,
              xpActual: data.nivel.xpActual,
              xpTotal: data.nivel.xpTotal,
              xpParaSiguiente: data.nivel.xpParaSiguiente,
              progreso: data.nivel.progreso,
              pc: data.usuario.pc || 0,
            });
          }
        })
        .catch(error => console.error('Error fetching user level:', error))
        .finally(() => setLoading(false));
    }
  }, [userProp]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-gray-800/50 rounded-lg"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isCompact = compact || mode === 'compact';

  if (isCompact) {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-lg px-4 py-2">
        <div className="text-2xl">{user.icono}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-purple-300">Nivel {user.nivel}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">{user.xpActual}/{user.xpParaSiguiente} XP</span>
          </div>
          <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${user.progreso}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
      {/* Efecto de brillo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{user.icono}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Nivel {user.nivel}</h3>
                <Sparkles size={16} className="text-yellow-400" />
              </div>
              <p className="text-sm text-purple-300 font-semibold">{user.rango}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Puntos Cuánticos</p>
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              {user.pc.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {user.xpActual} / {user.xpParaSiguiente} XP
            </span>
            <span className="text-purple-400 font-bold flex items-center gap-1">
              <TrendingUp size={14} />
              {user.progreso}%
            </span>
          </div>
          
          <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 transition-all duration-700 ease-out"
              style={{ width: `${user.progreso}%` }}
            />
            {/* Brillo animado */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ width: `${user.progreso}%` }}
            />
          </div>

          {user.progreso < 100 && (
            <p className="text-xs text-gray-500 text-center">
              Faltan {user.xpParaSiguiente - user.xpActual} XP para el siguiente nivel
            </p>
          )}
        </div>

        {/* Indicador de rareza */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full" />
              <span>COMÚN: 10 XP</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>RARO: 25 XP</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>ÉPICO: 100 XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar notificación de nivel subido
export function LevelUpNotification({ 
  nivelNuevo, 
  rangoNuevo, 
  iconoNuevo 
}: { 
  nivelNuevo: number; 
  rangoNuevo: string; 
  iconoNuevo: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-3xl p-10 max-w-md border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50 animate-in zoom-in duration-500">
        <div className="text-center space-y-6">
          {/* Icono animado */}
          <div className="relative inline-block">
            <div className="text-8xl animate-bounce">{iconoNuevo}</div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-yellow-300 animate-pulse" />
          </div>

          {/* Título */}
          <div>
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-2">
              ¡NIVEL {nivelNuevo}!
            </h2>
            <p className="text-2xl font-bold text-white">{rangoNuevo}</p>
          </div>

          {/* Mensaje */}
          <p className="text-lg text-gray-200">
            Has ascendido a un nuevo rango. ¡Tu dedicación está dando frutos!
          </p>

          {/* Botón de cerrar (opcional, se puede cerrar automáticamente) */}
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 text-sm text-yellow-300">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span>Continuando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
