'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar, Video, Heart, HeartCrack } from 'lucide-react';

// Tipos para las props (simulado)
interface CallTrackerProps {
  nextCall?: { date: string; link?: string }; // Si tiene llamada agendada
  missedCalls: number; // Cantidad de faltas (0, 1, 2, 3)
  completedThisWeek: number; // 0, 1 o 2
}

export default function CallTrackerWidget({ nextCall, missedCalls, completedThisWeek }: CallTrackerProps) {
  const maxLives = 3;
  const livesLeft = maxLives - missedCalls;
  const weeklyGoal = 2;

  // Renderizar corazones (Vidas)
  const renderLives = () => {
    return (
      <div className="flex gap-1">
        {[...Array(maxLives)].map((_, i) => (
          <span key={i} className="transform transition-all hover:scale-110">
            {i < livesLeft ? (
              <Heart className="w-6 h-6 text-red-500 fill-red-500 drop-shadow-lg" />
            ) : (
              <HeartCrack className="w-6 h-6 text-slate-600" />
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden relative">
      {/* Barra superior de estado */}
      <div className="bg-slate-950/50 p-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Video className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Control de Mentoría</h3>
            <p className="text-xs text-slate-400">Objetivo Semanal: {completedThisWeek}/{weeklyGoal}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-1">Vidas Restantes</p>
          {renderLives()}
        </div>
      </div>

      <div className="p-6">
        {nextCall ? (
          // ESTADO 1: TIENE LLAMADA AGENDADA
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
              ✅ Llamada Programada
            </div>
            <h2 className="text-2xl font-bold text-white">
              {new Date(nextCall.date).toLocaleDateString('es-MX', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-slate-400 text-sm">Prepara tus dudas antes de entrar.</p>
            
            <a 
              href={nextCall.link || "#"} 
              target="_blank"
              className="block w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              Unirse a la Llamada
            </a>
          </div>
        ) : (
          // ESTADO 2: NO TIENE LLAMADA (Urge agendar)
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 animate-pulse">
              ⚠️ Acción Requerida
            </div>
            <h2 className="text-xl font-bold text-white">No tienes llamada activa</h2>
            <p className="text-slate-400 text-sm">
              Recuerda cumplir tus 2 llamadas semanales para no perder vidas.
            </p>
            
            <Link 
              href="/dashboard/student/reservar"
              className="block w-full py-3 bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <Calendar className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
              Agendar Ahora
            </Link>
          </div>
        )}
      </div>

      {/* Aviso de Peligro si le queda 1 vida */}
      {livesLeft === 1 && (
        <div className="bg-red-900/30 p-2 text-center text-xs text-red-300 border-t border-red-900/50">
          🚨 ¡Cuidado! Estás a una falta de ser eliminado.
        </div>
      )}
    </div>
  );
}
