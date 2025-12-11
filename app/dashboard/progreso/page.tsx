'use client';

import { BarChart3, TrendingUp, Zap, Trophy, Target, ArrowLeft, Crown, Medal, Bot, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ProgresoPage() {
  
  const areas = [
    { nombre: 'Finanzas', progreso: 80, color: 'bg-emerald-500' },
    { nombre: 'Relaciones', progreso: 45, color: 'bg-pink-500' },
    { nombre: 'Talentos', progreso: 60, color: 'bg-blue-500' },
    { nombre: 'Paz Mental', progreso: 90, color: 'bg-purple-500' },
    { nombre: 'Salud', progreso: 30, color: 'bg-red-500' },
    { nombre: 'Ocio', progreso: 50, color: 'bg-yellow-500' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="text-blue-500" size={32} />
          Análisis de Progreso
        </h1>
        <p className="text-slate-400">Detalle granular de tu evolución F.R.U.T.O.S.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="group relative bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-yellow-500/50 transition-all cursor-help overflow-hidden">
          <div className="relative z-10 group-hover:opacity-10 transition-opacity duration-300">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                    <Zap size={24} />
                </div>
                <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider">Acumulado</h3>
             </div>
             <p className="text-4xl font-bold text-white">4,850 <span className="text-lg text-slate-500 font-normal">PC</span></p>
          </div>
          
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 backdrop-blur-md">
            <p className="text-yellow-500 font-bold text-xs uppercase tracking-[0.2em] mb-2 text-center">
                Sistema de Recompensas
            </p>
            <div className="space-y-2 w-full text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-300">Tarea Diaria</span>
                    <span className="text-yellow-400 font-bold">+10</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-300">Evidencia</span>
                    <span className="text-yellow-400 font-bold">+50</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-300">Asistencia</span>
                    <span className="text-yellow-400 font-bold">+100</span>
                </div>
                <div className="flex justify-between text-orange-400 font-bold">
                    <span>Racha 7 días</span>
                    <span>+200</span>
                </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all cursor-help overflow-hidden">
          <div className="relative z-10 group-hover:opacity-10 transition-opacity duration-300">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Trophy size={24} />
                </div>
                <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider">Tu Posición</h3>
            </div>
            <p className="text-4xl font-bold text-white">#12 <span className="text-lg text-slate-500 font-normal">Actual</span></p>
          </div>

          <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 backdrop-blur-md">
            <div className="text-center mb-3">
              <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">Top 3 - Visión</p>
            </div>
            <div className="space-y-2 w-full">
                <div className="flex items-center justify-between p-2 rounded bg-gradient-to-r from-yellow-900/20 to-slate-900 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                        <Crown size={14} className="text-yellow-400" />
                        <span className="text-white text-xs font-bold">1. Ana Sofía</span>
                    </div>
                    <span className="text-yellow-500 text-xs font-bold">5,200</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                        <Medal size={14} className="text-slate-300" />
                        <span className="text-slate-300 text-xs">2. Roberto M.</span>
                    </div>
                    <span className="text-slate-400 text-xs">5,150</span>
                </div>
                 <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                        <Medal size={14} className="text-amber-700" />
                        <span className="text-slate-300 text-xs">3. Carlos R.</span>
                    </div>
                    <span className="text-slate-400 text-xs">4,980</span>
                </div>
            </div>
          </div>
        </div>

        <Link href="/dashboard/carta" className="block group">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:bg-slate-800/80 hover:border-purple-500/50 transition-all cursor-pointer h-full relative overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <Target size={24} />
                    </div>
                    <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider">Siguiente Nivel</h3>
                </div>
                <div className="mt-3">
                    <p className="text-white font-bold text-lg mb-1">Nivel: Transformador</p>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[75%]"></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 group-hover:text-purple-400 transition-colors">
                        Haz clic para ver requisitos →
                    </p>
                </div>
            </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-full">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500"/>
                Desempeño por Área
            </h3>
            <div className="space-y-5">
                {areas.map((area) => (
                    <div key={area.nombre}>
                        <div className="flex justify-between mb-1">
                            <span className="text-slate-300 text-sm font-medium">{area.nombre}</span>
                            <span className="text-white text-sm font-bold">{area.progreso}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${area.color} transition-all duration-1000 relative`} 
                                style={{ width: `${area.progreso}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between">
            
            <div className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-indigo-950/50 p-6 shadow-2xl">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                    <div className="rounded-lg bg-indigo-500/20 p-3 text-indigo-400 shadow-inner shadow-indigo-500/10">
                        <Bot size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white">Mentor IA</h3>
                            <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                                <Sparkles size={10} /> ACTIVO
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300">
                            Tu área de <strong className="text-emerald-400 font-medium">Finanzas</strong> está impecable (80%), pero <strong className="text-red-400 font-medium">Salud</strong> requiere atención inmediata. Te he agendado una sugerencia de actividad para hoy a las 6 PM.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex-1 flex flex-col justify-center">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 font-bold text-white mb-1">
                            <Flame className="text-orange-500" fill="currentColor" size={20} />
                            Racha de Poder
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Enfoque:</span>
                            <span className="flex items-center gap-1 rounded bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                <Target size={10} /> Finanzas
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="block text-3xl font-bold text-white leading-none">4</span>
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Días</span>
                    </div>
                </div>

                <div className="relative flex justify-between items-center px-2 mt-2">
                    <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-800 rounded-full"></div>
                    
                    {[1, 2, 3, 4, 5].map((dia) => {
                        const completado = dia <= 4; 
                        return (
                            <div key={dia} className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer">
                                <div 
                                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                        completado 
                                        ? 'border-orange-500 bg-orange-600 text-white shadow-lg shadow-orange-500/30 scale-110' 
                                        : 'border-slate-700 bg-slate-900 text-slate-600'
                                    }`}
                                >
                                    {completado ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-bold">{dia}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 rounded-lg bg-gradient-to-r from-orange-900/20 to-slate-900 border border-orange-500/10 p-3 text-center">
                    <p className="text-xs text-orange-200">
                        🔥 Faltan <strong className="text-white">3 días</strong> para la Medalla de Constancia.
                    </p>
                </div>
            </div>

        </div>
      </div>

    </div>
  );
}
