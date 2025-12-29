'use client';

import { Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MisParticipantesWidget() {
  return (
    <Link 
      href="/dashboard/gamechanger/participantes"
      className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all group relative overflow-hidden block"
    >
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
          <Users className="w-6 h-6 text-purple-500" />
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Gestión</span>
          <span className="text-xs text-purple-400 cursor-pointer hover:underline">Ver Todos</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-xl mb-2">
          Mis Participantes
          <ArrowRight className="w-5 h-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
        </div>
        <p className="text-sm text-slate-400">
          Gestiona y da seguimiento a tus participantes asignados
        </p>
      </div>
      
      {/* Decoración de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
