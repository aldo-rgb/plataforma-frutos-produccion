'use client';

import React from 'react';
import { 
  BarChart3, Users, PhoneOff, Zap, AlertTriangle, 
  Clock, TrendingUp, ShieldCheck, UserPlus, Gamepad2 
} from 'lucide-react';

// DATOS MOCK: RENDIMIENTO DE MENTORES
const PERFORMANCE_MENTORES = [
  { 
    id: 1, 
    nombre: 'Sarah Quantum', 
    rol: 'Mentor',
    asignados: 12,
    tglp: 5, 
    tiempoRevision: '1.5h', 
    rating: 4.9,
    status: 'elite' 
  },
  { 
    id: 2, 
    nombre: 'Carlos Iron', 
    rol: 'Mentor',
    asignados: 10,
    tglp: 15, 
    tiempoRevision: '4h',
    rating: 4.5,
    status: 'normal'
  },
  { 
    id: 3, 
    nombre: 'Javier B.', 
    rol: 'Mentor',
    asignados: 8,
    tglp: 45, 
    tiempoRevision: '24h+',
    rating: 3.2,
    status: 'riesgo'
  },
];

// DATOS MOCK: RENDIMIENTO DE GAME CHANGERS (Antes Seniors)
const PERFORMANCE_GAMECHANGERS = [
  {
    id: 10,
    nombre: 'Jorge Perez',
    metaEnrolamiento: 10,
    logrados: 8,
    cartaFrutos: 92, 
  },
  {
    id: 11,
    nombre: 'Lucia M.',
    metaEnrolamiento: 10,
    logrados: 3, 
    cartaFrutos: 70,
  }
];

export default function AdminPerformancePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase flex items-center gap-3">
            Comando <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Central</span>
          </h1>
          <p className="text-slate-400 mt-2">Monitoreo de rendimiento de Mentores y Game Changers.</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          icon={<Users className="text-cyan-400" />} 
          label="Líderes Activos" 
          value="142" 
          trend="+12 esta semana" 
          color="cyan"
        />
        <KpiCard 
          icon={<PhoneOff className="text-red-400" />} 
          label="Tasa de Faltas (Global)" 
          value="12%" 
          trend="⚠️ Subió 2%" 
          color="red"
        />
        <KpiCard 
          icon={<Clock className="text-yellow-400" />} 
          label="Tiempo Prom. Revisión" 
          value="3.5h" 
          trend="⚡ Muy rápido" 
          color="yellow"
        />
        <KpiCard 
          icon={<UserPlus className="text-green-400" />} 
          label="Enrolamiento Staff" 
          value="11/20" 
          trend="55% de Meta Global" 
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: EVALUACIÓN DE MENTORES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" /> Rendimiento de Mentores
            </h2>
            <button className="text-xs font-bold text-slate-500 hover:text-white uppercase">Ver Reporte Completo</button>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mentor</th>
                  <th className="px-6 py-4">Integridad (Faltas)</th>
                  <th className="px-6 py-4">Velocidad</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {PERFORMANCE_MENTORES.map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{mentor.nombre}</span>
                        <span className="text-[10px] text-slate-500">{mentor.asignados} Líderes</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${mentor.tglp > 20 ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${mentor.tglp}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold ${mentor.tglp > 20 ? 'text-red-400' : 'text-slate-400'}`}>
                          {mentor.tglp}% Perdidas
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-300">
                        <Clock size={14} className="text-slate-500" />
                        {mentor.tiempoRevision}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {mentor.status === 'elite' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase border border-cyan-500/20">
                          <Zap size={10} /> Elite
                        </span>
                      )}
                      {mentor.status === 'normal' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                          Normal
                        </span>
                      )}
                      {mentor.status === 'riesgo' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20 animate-pulse">
                          <AlertTriangle size={10} /> Riesgo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: GAME CHANGERS (1/3 del ancho) */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
            <Gamepad2 className="text-green-400" /> Metas Game Changers
          </h2>

          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6">
            {PERFORMANCE_GAMECHANGERS.map((gc) => {
              const porcentaje = (gc.logrados / gc.metaEnrolamiento) * 100;
              return (
                <div key={gc.id} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{gc.nombre}</h4>
                      <p className="text-[10px] text-slate-400">Carta Personal: <span className="text-cyan-400">{gc.cartaFrutos}%</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white">{gc.logrados}</span>
                      <span className="text-xs text-slate-500 font-bold"> / {gc.metaEnrolamiento}</span>
                    </div>
                  </div>
                  
                  {/* Barra de Progreso */}
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${porcentaje >= 100 ? 'bg-yellow-400' : porcentaje < 50 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  {porcentaje < 40 && (
                    <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                      <TrendingUp size={10} className="rotate-180" /> Bajo Rendimiento
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="bg-gradient-to-br from-red-900/50 to-slate-900 border border-red-500/30 rounded-3xl p-6 text-center">
             <AlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
             <h3 className="font-bold text-white text-sm uppercase">Atención Requerida</h3>
             <p className="text-xs text-slate-400 mt-1 mb-4">Hay 1 Mentor con TGLP crítico (45%).</p>
             <button className="w-full py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-500/30">
               INTERVENIR AHORA
             </button>
          </div>

        </div>

      </div>

    </div>
  );
}

function KpiCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    red: "border-red-500/20 bg-red-500/5",
    yellow: "border-yellow-500/20 bg-yellow-500/5",
    green: "border-green-500/20 bg-green-500/5",
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">KPI</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-1">{label}</p>
      <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-slate-500">
        {trend}
      </div>
    </div>
  );
}