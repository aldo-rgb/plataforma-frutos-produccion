'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, Trophy, Users, ShieldCheck, Target, Clock, CheckCircle, XCircle, Loader2, AlertTriangle 
} from 'lucide-react';

interface Meta {
  categoria: string;
  progreso: number;
  objetivo: string;
  avance: number;
  meta: number;
}

interface Evidencia {
  id: number;
  meta: string;
  categoria: string;
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  mentor: string;
  puntos: number;
  fecha: string;
  feedback: string | null;
  imagenUrl: string | null;
}

interface LiderData {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  puntosCuanticos: number;
  ranking: number;
  profileImage: string | null;
  estadoCarta: string;
  metas: Meta[];
  historialEvidencias: Evidencia[];
  miembroDesde: string;
}

const Card = ({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) => (
  <div className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-lg">
    <div className="flex items-center gap-2 text-slate-400 mb-3">
      {icon}
      <h3 className="text-sm font-bold uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

export default function LiderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [lider, setLider] = useState<LiderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liderId, setLiderId] = useState<string>('');

  useEffect(() => {
    params.then(p => setLiderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!liderId) return;

    const cargarDatos = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/lideres/${liderId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar datos');
        }

        const data = await response.json();
        setLider(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [liderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !lider) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-2">Error al cargar perfil</h2>
          <p className="text-slate-400 text-center">{error || 'No se pudo cargar la información'}</p>
        </div>
      </div>
    );
  }

  const getRolDisplay = (rol: string) => {
    const roles: { [key: string]: string } = {
      'PARTICIPANTE': 'Participante',
      'LIDER': 'Líder Cuántico',
      'MENTOR': 'Mentor',
      'COORDINADOR': 'Coordinador',
      'ADMIN': 'Administrador'
    };
    return roles[rol] || rol;
  };

  const getEstadoCartaColor = (estado: string) => {
    const colores: { [key: string]: string } = {
      'ACTIVA': 'text-green-400',
      'EN_REVISION': 'text-yellow-400',
      'PENDIENTE': 'text-orange-400',
      'SIN_CARTA': 'text-slate-500'
    };
    return colores[estado] || 'text-slate-400';
  };

  const getEstadoCartaTexto = (estado: string) => {
    const textos: { [key: string]: string } = {
      'ACTIVA': 'Activa',
      'EN_REVISION': 'En Revisión',
      'PENDIENTE': 'Pendiente',
      'SIN_CARTA': 'Sin Carta'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <p className="text-sm text-slate-500">Perfil de {getRolDisplay(lider.rol)} / ID: {lider.id}</p>
        <h1 className="text-4xl font-black text-white italic tracking-tighter mt-1">
          {lider.nombre}
        </h1>
        <p className="text-slate-400 mt-2 flex items-center gap-2">
          <Users size={18} className='text-cyan-400' />
          {getRolDisplay(lider.rol)} | Miembro desde {new Date(lider.miembroDesde).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* MÉTRICAS CLAVE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Puntos Cuánticos" icon={<Zap size={18} className='text-yellow-400' />}>
          <p className="text-4xl font-black text-yellow-400">{lider.puntosCuanticos.toLocaleString()}</p>
        </Card>
        <Card title="Ranking Actual" icon={<Trophy size={18} className='text-sky-400' />}>
          <p className="text-4xl font-black text-sky-400">#{lider.ranking}</p>
        </Card>
        <Card title="Estado de Carta" icon={<ShieldCheck size={18} className='text-green-400' />}>
          <p className={`text-4xl font-black ${getEstadoCartaColor(lider.estadoCarta)}`}>
            {getEstadoCartaTexto(lider.estadoCarta)}
          </p>
        </Card>
      </div>

      {/* PROGRESO DE METAS FRUTOS */}
      {lider.metas.length > 0 && (
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
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${meta.progreso}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Avance: {meta.avance} / {meta.meta}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {lider.metas.length === 0 && (
        <Card title="Progreso de Metas FRUTOS" icon={<Target size={18} className='text-pink-400' />}>
          <div className="text-center py-8 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Este participante aún no tiene metas definidas</p>
          </div>
        </Card>
      )}

      {/* HISTORIAL DE EVIDENCIAS */}
      <Card title="Historial de Revisión de Evidencias" icon={<Clock size={18} className='text-slate-400' />}>
        {lider.historialEvidencias.length > 0 ? (
          <div className="space-y-3">
            {lider.historialEvidencias.map((ev) => {
              const isApproved = ev.estado === 'APROBADO';
              const isPending = ev.estado === 'PENDIENTE';
              const isRejected = ev.estado === 'RECHAZADO';
              
              return (
                <div 
                  key={ev.id} 
                  className={`flex justify-between items-start p-3 rounded-lg transition-colors ${
                    isApproved ? 'bg-green-500/10 hover:bg-green-500/20' : 
                    isRejected ? 'bg-red-500/10 hover:bg-red-500/20' : 
                    'bg-yellow-500/10 hover:bg-yellow-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isApproved && <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />}
                    {isRejected && <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />}
                    {isPending && <Clock size={20} className="text-yellow-500 mt-0.5 flex-shrink-0 animate-pulse" />}
                    
                    <div className="flex-1">
                      <p className="text-white font-medium">{ev.meta}</p>
                      {ev.categoria && (
                        <span className="inline-block text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full mt-1">
                          {ev.categoria}
                        </span>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Revisado por: {ev.mentor} • {ev.fecha}
                      </p>
                      {ev.feedback && (
                        <p className="text-xs text-red-300 mt-2 italic bg-red-500/10 p-2 rounded">
                          <strong>Feedback:</strong> {ev.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-bold ${
                      isApproved ? 'text-green-400' : 
                      isRejected ? 'text-red-400' : 
                      'text-yellow-400'
                    }`}>
                      {ev.estado}
                    </span>
                    {ev.puntos > 0 && (
                      <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <Zap size={12} fill="currentColor" /> +{ev.puntos} PC
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay evidencias registradas todavía</p>
          </div>
        )}
      </Card>
      
    </div>
  );
}