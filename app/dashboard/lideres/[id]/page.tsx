'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, Trophy, Users, ShieldCheck, Target, Clock, CheckCircle, XCircle 
} from 'lucide-react';

// DATOS MOCK
const LIDER_MOCK = {
  id: 123,
  nombre: 'Ana García (Líder Cuántico)',
  puntosCuanticos: 4850,
  ranking: 12,
  metas: [
    { categoria: 'FINANZAS', progreso: 80, objetivo: 'Ahorrar 20% del sueldo' },
    { categoria: 'RELACIONES', progreso: 50, objetivo: 'Una cena semanal con mi pareja' },
    { categoria: 'SALUD', progreso: 100, objetivo: 'Correr 5K tres veces por semana' },
  ],
  historialEvidencias: [
    { id: 301, meta: 'Correr 5K', estado: 'APROBADO', mentor: 'Carlos M.', puntos: 500, fecha: 'hace 1 día' },
    { id: 302, meta: 'Estudiar plan', estado: 'RECHAZADO', mentor: 'Carlos M.', puntos: 0, fecha: 'hace 2 días', feedback: 'La foto era borrosa y no legible.' },
    { id: 303, meta: 'Meditar 10m', estado: 'APROBADO', mentor: 'Carlos M.', puntos: 500, fecha: 'hace 3 días' },
    { id: 304, meta: 'Ahorro 20%', estado: 'PENDIENTE', mentor: null, puntos: 500, fecha: 'hace 3 horas' },
  ]
};

const Card = ({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) => (
  <div className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-lg">
    <div className="flex items-center gap-2 text-slate-400 mb-3">
      {icon}
      <h3 className="text-sm font-bold uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

export default async function LiderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // En un entorno real, usarías params.id para cargar los datos del líder
  const { id } = await params;
  const lider = LIDER_MOCK;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <p className="text-sm text-slate-500">Perfil de Lider / ID: {id || lider.id}</p>
        <h1 className="text-4xl font-black text-white italic tracking-tighter mt-1">
          {lider.nombre}
        </h1>
        <p className="text-slate-400 mt-2 flex items-center gap-2">
          <Users size={18} className='text-cyan-400' />
          Miembro Activo | Protocolo Cuántico Sellado
        </p>
      </div>

      {/* MÉTRICAS CLAVE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Puntos Cuánticos" icon={<Zap size={18} className='text-yellow-400' />}>
          <p className="text-4xl font-black text-yellow-400">{lider.puntosCuanticos}</p>
        </Card>
        <Card title="Ranking Actual" icon={<Trophy size={18} className='text-sky-400' />}>
          <p className="text-4xl font-black text-sky-400">#{lider.ranking}</p>
        </Card>
        <Card title="Estado de Carta" icon={<ShieldCheck size={18} className='text-green-400' />}>
          <p className="text-4xl font-black text-green-400">Activa</p>
        </Card>
      </div>

      {/* PROGRESO DE METAS FRUTOS */}
      <Card title="Progreso de Metas FRUTOS" icon={<Target size={18} className='text-pink-400' />}>
        <div className="space-y-4">
          {lider.metas.map((meta, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-medium">{meta.categoria}: {meta.objetivo}</span>
                <span className="text-sm font-bold text-slate-300">{meta.progreso}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500" 
                  style={{ width: `${meta.progreso}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* HISTORIAL DE EVIDENCIAS */}
      <Card title="Historial de Revisión de Evidencias" icon={<Clock size={18} className='text-slate-400' />}>
        <div className="space-y-3">
          {lider.historialEvidencias.map((ev, index) => {
            const isApproved = ev.estado === 'APROBADO';
            const isPending = ev.estado === 'PENDIENTE';
            const isRejected = ev.estado === 'RECHAZADO';
            
            return (
              <div 
                key={index} 
                className={`flex justify-between items-start p-3 rounded-lg ${isApproved ? 'bg-green-500/10' : isRejected ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}
              >
                <div className="flex items-start gap-3">
                  {isApproved && <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />}
                  {isRejected && <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />}
                  {isPending && <Clock size={20} className="text-yellow-500 mt-0.5 flex-shrink-0 animate-pulse" />}
                  
                  <div>
                    <p className="text-white font-medium">{ev.meta}</p>
                    <p className="text-xs text-slate-400">
                      Revisado por: {ev.mentor || 'N/A'} • {ev.fecha}
                    </p>
                    {ev.feedback && (
                        <p className="text-xs text-red-300 mt-1 italic">Feedback: {ev.feedback}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold ${isApproved ? 'text-green-400' : isRejected ? 'text-red-400' : 'text-yellow-400'}`}>
                        {ev.estado}
                    </span>
                    {ev.puntos > 0 && (
                        <span className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                            <Zap size={12} fill="currentColor" /> +{ev.puntos} PC
                        </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      
    </div>
  );
}