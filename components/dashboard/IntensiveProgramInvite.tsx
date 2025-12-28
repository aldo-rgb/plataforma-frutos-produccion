'use client';

import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface IntensiveProgramInviteProps {
  totalWeeks?: number;
  totalCalls?: number;
}

export default function IntensiveProgramInvite({ 
  totalWeeks = 17, 
  totalCalls = 34 
}: IntensiveProgramInviteProps) {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 p-6 rounded-2xl hover:border-purple-400 transition-all group relative overflow-hidden">
      {/* Efecto de brillo animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30">
            EXCLUSIVO
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          🚀 Únete al Programa Intensivo
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          Acelera tu transformación con llamadas semanales de disciplina y mentoría grupal.
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span>{totalCalls} llamadas de disciplina ({totalWeeks} semanas)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Acompañamiento directo de tu mentor</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Comunidad de alto rendimiento</span>
          </div>
        </div>
        
        <button
          onClick={() => router.push('/dashboard/program/enroll')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
        >
          Comenzar Ahora →
        </button>
      </div>
    </div>
  );
}
