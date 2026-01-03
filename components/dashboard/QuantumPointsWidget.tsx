'use client';

import { useEffect, useState } from 'react';
import { Zap, Bot, User } from 'lucide-react';
import Link from 'next/link';

interface QuantumPointsWidgetProps {
  puntosCuanticos: number;
  usuario?: {
    nombre: string;
    profileImage?: string | null;
  };
}

export default function QuantumPointsWidget({ puntosCuanticos, usuario }: QuantumPointsWidgetProps) {
  const [iaRecommendation, setIaRecommendation] = useState<{
    message: string;
    emoji: string;
  }>({
    message: 'Completa tus tareas de hoy para ganar más puntos 🚀',
    emoji: '💡'
  });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchIARecommendation = async () => {
      try {
        const response = await fetch('/api/quantum-ia/recommendation');
        if (response.ok) {
          const data = await response.json();
          setIaRecommendation({
            message: data.message,
            emoji: data.emoji || '💡'
          });
        }
      } catch (error) {
        console.error('Error fetching IA recommendation:', error);
      }
    };

    fetchIARecommendation();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      {/* Header con Puntos */}
      <div className="relative px-6 pt-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-orange-500/5"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar del Usuario */}
              <div className="relative w-10 h-10 flex-shrink-0">
                {usuario?.profileImage && !imageError ? (
                  <img
                    src={usuario.profileImage}
                    alt={usuario.nombre}
                    onError={() => setImageError(true)}
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-500" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Puntos Cuánticos</span>
          </div>
          <div className="text-4xl font-black text-white tracking-tight mb-1">
            {puntosCuanticos.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">PC</p>
        </div>
      </div>

      {/* Separador */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

      {/* Recomendación de Quantum IA */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-3 border border-purple-500/20">
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
                Quantum IA te recomienda
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {iaRecommendation.message}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/quantum-detector"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg group"
          >
            <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Hablar con Quantum IA
          </Link>
        </div>
      </div>
    </div>
  );
}
