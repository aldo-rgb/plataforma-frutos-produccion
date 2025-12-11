'use client';

import React, { useState } from 'react';
import { 
  Users, CheckCircle, XCircle, Phone, AlertTriangle, 
  Search, Filter, Eye, MessageSquare 
} from 'lucide-react';

// DATOS MOCK: LÍDERES ASIGNADOS A ESTE MENTOR
const MIS_LIDERES = [
  { id: 1, nombre: 'Ana García', avance: 45, llamadas: [true, false], riesgo: 'bajo', avatar: 'bg-yellow-500' },
  { id: 2, nombre: 'Carlos Ruiz', avance: 80, llamadas: [true, true], riesgo: 'bajo', avatar: 'bg-blue-500' },
  { id: 3, nombre: 'Pedro K.', avance: 15, llamadas: [false, false], riesgo: 'alto', avatar: 'bg-red-500' }, // Riesgo alto
];

// DATOS MOCK: EVIDENCIAS PENDIENTES DE REVISIÓN
const EVIDENCIAS_PENDIENTES = [
  { id: 101, lider: 'Ana García', categoria: 'Salud', img: 'Gym', fecha: 'Hace 2h', estado: 'pendiente' },
  { id: 102, lider: 'Pedro K.', categoria: 'Finanzas', img: 'Ventas', fecha: 'Hace 5h', estado: 'pendiente' },
];

export default function MentorDashboard() {
  const [activeTab, setActiveTab] = useState('revision'); // revision | seguimiento

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* HEADER DEL MENTOR */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Centro de <span className="text-cyan-400">Mentoría</span>
          </h1>
          <p className="text-slate-400 mt-2">Gestiona el progreso y valida la integridad de tu equipo.</p>
        </div>
        
        {/* Estadísticas Rápidas */}
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Líderes</p>
            <p className="text-xl font-black text-white">{MIS_LIDERES.length}</p>
          </div>
          <div className="bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] uppercase text-yellow-500 font-bold">Pendientes</p>
            <p className="text-xl font-black text-white">{EVIDENCIAS_PENDIENTES.length}</p>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('revision')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'revision' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-white'}`}
        >
          Revisión de Evidencias
        </button>
        <button 
          onClick={() => setActiveTab('seguimiento')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'seguimiento' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-white'}`}
        >
          Seguimiento y Llamadas
        </button>
      </div>

      {/* VISTA 1: REVISIÓN DE EVIDENCIAS (Inbox) */}
      {activeTab === 'revision' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVIDENCIAS_PENDIENTES.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              <CheckCircle size={48} className="mx-auto mb-4 text-slate-700" />
              <p>¡Todo al día! No hay evidencias pendientes.</p>
            </div>
          ) : (
            EVIDENCIAS_PENDIENTES.map((evidencia) => (
              <div key={evidencia.id} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all">
                
                {/* Header de la Tarjeta */}
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    {evidencia.lider.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{evidencia.lider}</h3>
                    <p className="text-xs text-slate-500">{evidencia.fecha} • {evidencia.categoria}</p>
                  </div>
                </div>

                {/* Imagen (Placeholder) */}
                <div className="h-48 bg-slate-950 relative group cursor-pointer">
                  {/* Aquí iría la <img src={...} /> real */}
                  <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                    [FOTO EVIDENCIA]
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="text-white" />
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-4 grid grid-cols-2 gap-3 mt-auto">
                  <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-bold">
                    <XCircle size={16} /> Rechazar
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-bold">
                    <CheckCircle size={16} /> Aprobar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 2: SEGUIMIENTO Y LLAMADAS */}
      {activeTab === 'seguimiento' && (
        <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 border-b border-white/5 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar líder..." 
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><Filter size={18} /></button>
          </div>

          {/* Tabla de Líderes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Líder</th>
                  <th className="px-6 py-4">Avance Global</th>
                  <th className="px-6 py-4">Llamadas Semana</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MIS_LIDERES.map((lider) => (
                  <tr key={lider.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${lider.avatar} flex items-center justify-center text-white font-bold text-xs`}>
                          {lider.nombre.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm">{lider.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${lider.avance < 30 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${lider.avance}%` }}></div>
                        </div>
                        <span className="text-xs text-slate-400">{lider.avance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {[0, 1].map((i) => (
                          <button 
                            key={i} 
                            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all
                              ${lider.llamadas[i] 
                                ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-600 hover:border-white/30'}
                            `}
                          >
                            <Phone size={14} fill={lider.llamadas[i] ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lider.riesgo === 'alto' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-bold uppercase">
                          <AlertTriangle size={12} /> Riesgo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">
                          <CheckCircle size={12} /> Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-cyan-400 transition-colors">
                        <MessageSquare size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}