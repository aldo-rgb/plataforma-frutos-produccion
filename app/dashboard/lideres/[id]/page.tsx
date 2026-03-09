'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, Trophy, Users, ShieldCheck, Target, Clock, CheckCircle, XCircle, Loader2, AlertTriangle,
  Award, TrendingUp, Calendar, Phone, Mail, MapPin, School, UserCircle, Flame, Star,
  BookOpen, Activity, BarChart3, Eye, AlertCircle, Image as ImageIcon, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface Meta {
  categoria: string;
  progreso: number;
  objetivo: string;
  avance: number;
  meta: number;
  estado?: 'completada' | 'en_progreso' | 'retrasada';
  fechaLimite?: string;
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

interface CallHistory {
  fecha: string;
  estado: 'asistio' | 'falto' | 'justificada';
  tipo: string;
}

interface TareaRetrasada {
  id: number;
  texto: string;
  area: string;
  dueDate: string;
  diasRetraso: number;
}

interface TareasRetrasadasPorArea {
  [area: string]: {
    count: number;
    tasks: TareaRetrasada[];
  };
}

interface LiderData {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  puntosCuanticos: number;
  experienciaXP: number;
  nivelActual: number;
  rangoActual: string;
  ranking: number;
  profileImage: string | null;
  estadoCarta: string;
  tier: string;
  completionStreak: number;
  badges: string[];
  
  // Información organizacional
  escuela: string | null;
  vision: string | null;
  coordinador: string | null;
  director: string | null;
  mentor: string | null;
  
  // Metas y progreso
  metas: Meta[];
  metasProximas: Meta[];
  metasRetrasadas: Meta[];
  
  // Llamadas
  totalLlamadas: number;
  llamadasAsistidas: number;
  llamadasPerdidas: number;
  tasaAsistencia: number;
  historialLlamadas: CallHistory[];
  
  // Evidencias
  historialEvidencias: Evidencia[];
  evidenciasAprobadas: number;
  evidenciasRechazadas: number;
  evidenciasPendientes: number;
  
  // Tareas retrasadas
  totalTareasRetrasadas: number;
  tareasRetrasadasPorArea: TareasRetrasadasPorArea;
  tareasRetrasadasDetalle: TareaRetrasada[];
  
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
  const [showTareasModal, setShowTareasModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* BOTÓN VOLVER */}
        <Link 
          href="/dashboard/mentor/participantes"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Volver a Participantes</span>
        </Link>

        {/* ===== HEADER CON FOTO Y DATOS PRINCIPALES ===== */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            
            {/* Avatar */}
            <div className="relative">
              {lider.profileImage ? (
                <img 
                  src={lider.profileImage} 
                  alt={lider.nombre}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-purple-500 shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center border-4 border-purple-500 shadow-xl">
                  <UserCircle size={64} className="text-white" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-purple-600 rounded-full p-2 border-4 border-slate-900">
                <Trophy className="text-yellow-400" size={20} />
              </div>
            </div>

            {/* Info Principal */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-4xl font-black text-white mb-2">{lider.nombre}</h1>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold border border-purple-500/30">
                    <ShieldCheck size={16} />
                    {getRolDisplay(lider.rol)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm font-semibold border border-amber-500/30">
                    <Star size={16} />
                    {lider.tier || 'FREE'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold border border-green-500/30">
                    <Flame size={16} />
                    {lider.completionStreak || 0} días racha
                  </span>
                </div>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail size={16} className="text-blue-400" />
                  <span>{lider.email}</span>
                </div>
                {lider.telefono && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone size={16} className="text-green-400" />
                    <span>{lider.telefono}</span>
                  </div>
                )}
                {lider.escuela && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <School size={16} className="text-purple-400" />
                    <span>{lider.escuela}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={16} className="text-cyan-400" />
                  <span>Miembro desde {new Date(lider.miembroDesde).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MÉTRICAS CLAVE ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card title="Nivel" icon={<Award size={18} className='text-purple-400' />}>
            <p className="text-3xl font-black text-purple-400">{lider.nivelActual || 1}</p>
            <p className="text-xs text-slate-400 mt-1">{lider.rangoActual || 'Sin rango'}</p>
          </Card>
          
          <Card title="Puntos Cuánticos" icon={<Zap size={18} className='text-yellow-400' />}>
            <p className="text-3xl font-black text-yellow-400">{(lider.puntosCuanticos || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">PC</p>
          </Card>
          
          <Card title="Experiencia" icon={<TrendingUp size={18} className='text-blue-400' />}>
            <p className="text-3xl font-black text-blue-400">{(lider.experienciaXP || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">XP</p>
          </Card>
          
          <Card title="Ranking" icon={<Trophy size={18} className='text-amber-400' />}>
            <p className="text-3xl font-black text-amber-400">#{lider.ranking || '--'}</p>
            <p className="text-xs text-slate-400 mt-1">Global</p>
          </Card>
          
          <Card title="Estado" icon={<Activity size={18} className='text-green-400' />}>
            <p className={`text-2xl font-black ${getEstadoCartaColor(lider.estadoCarta)}`}>
              {getEstadoCartaTexto(lider.estadoCarta)}
            </p>
          </Card>
        </div>

        {/* ===== INFORMACIÓN ORGANIZACIONAL ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Tareas Retrasadas" icon={<AlertTriangle size={18} className='text-red-400' />}>
            <div className="space-y-3">
              {/* Contador principal */}
              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-red-400">{lider.totalTareasRetrasadas || 0}</p>
                    <p className="text-xs text-slate-400">tareas pendientes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTareasModal(true)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <Calendar size={16} />
                  Ver Detalle
                </button>
              </div>

              {/* Distribución por área */}
              {lider.tareasRetrasadasPorArea && Object.keys(lider.tareasRetrasadasPorArea).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lider.tareasRetrasadasPorArea).slice(0, 6).map(([area, data]) => (
                    <button
                      key={area}
                      onClick={() => {
                        setSelectedArea(area);
                        setShowTareasModal(true);
                      }}
                      className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 truncate">{area}</span>
                        <span className="text-lg font-bold text-red-400 group-hover:text-red-300">{data.count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="text-green-400 mx-auto mb-2" size={32} />
                  <p className="text-green-400 font-semibold">¡Sin tareas retrasadas!</p>
                  <p className="text-xs text-slate-500">Todas las tareas están al día</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Historial de Llamadas" icon={<Phone size={18} className='text-green-400' />}>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-green-500/10 rounded-lg">
                  <p className="text-2xl font-black text-green-400">{lider.llamadasAsistidas || 0}</p>
                  <p className="text-xs text-slate-400">Asistidas</p>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded-lg">
                  <p className="text-2xl font-black text-red-400">{lider.llamadasPerdidas || 0}</p>
                  <p className="text-xs text-slate-400">Perdidas</p>
                </div>
                <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-black text-blue-400">{lider.tasaAsistencia || 0}%</p>
                  <p className="text-xs text-slate-400">Asistencia</p>
                </div>
              </div>
              
              {lider.historialLlamadas && lider.historialLlamadas.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {lider.historialLlamadas.slice(0, 5).map((llamada, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-800/30 rounded">
                      <span className="text-slate-400">{llamada.fecha}</span>
                      <span className={`font-semibold ${
                        llamada.estado === 'asistio' ? 'text-green-400' :
                        llamada.estado === 'justificada' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {llamada.estado === 'asistio' ? '✓ Asistió' :
                         llamada.estado === 'justificada' ? '⚠ Justificada' :
                         '✗ Faltó'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ===== LOGROS Y BADGES ===== */}
        {lider.badges && lider.badges.length > 0 && (
          <Card title="Logros Desbloqueados" icon={<Award size={18} className='text-amber-400' />}>
            <div className="flex flex-wrap gap-3">
              {lider.badges.map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full">
                  <Star className="text-amber-400" size={16} />
                  <span className="text-amber-200 font-semibold text-sm">{badge}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ===== METAS PRÓXIMAS ===== */}
        {lider.metasProximas && lider.metasProximas.length > 0 && (
          <Card title="Metas Próximas" icon={<Target size={18} className='text-green-400' />}>
            <div className="space-y-3">
              {lider.metasProximas.map((meta, index) => (
                <div key={index} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">{meta.categoria}: {meta.objetivo}</p>
                      {meta.fechaLimite && (
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          Límite: {meta.fechaLimite}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-green-400">{meta.progreso}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${meta.progreso}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Avance: {meta.avance} / {meta.meta}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ===== METAS RETRASADAS ===== */}
        {lider.metasRetrasadas && lider.metasRetrasadas.length > 0 && (
          <Card title="Metas Retrasadas" icon={<AlertCircle size={18} className='text-red-400' />}>
            <div className="space-y-3">
              {lider.metasRetrasadas.map((meta, index) => (
                <div key={index} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">{meta.categoria}: {meta.objetivo}</p>
                      {meta.fechaLimite && (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} />
                          Venció: {meta.fechaLimite}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-red-400">{meta.progreso}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500" 
                      style={{ width: `${meta.progreso}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Avance: {meta.avance} / {meta.meta}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ===== PROGRESO DE METAS FRUTOS GENERAL ===== */}
        {lider.metas && lider.metas.length > 0 && (
          <Card title="Todas las Metas FRUTOS" icon={<Target size={18} className='text-pink-400' />}>
            <div className="space-y-3">
              {lider.metas.map((meta, index) => (
                <div key={index} className="p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
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

        {/* ===== ESTADÍSTICAS DE EVIDENCIAS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Evidencias Aprobadas" icon={<CheckCircle size={18} className='text-green-400' />}>
            <p className="text-4xl font-black text-green-400">{lider.evidenciasAprobadas || 0}</p>
          </Card>
          <Card title="Evidencias Pendientes" icon={<Clock size={18} className='text-yellow-400' />}>
            <p className="text-4xl font-black text-yellow-400">{lider.evidenciasPendientes || 0}</p>
          </Card>
          <Card title="Evidencias Rechazadas" icon={<XCircle size={18} className='text-red-400' />}>
            <p className="text-4xl font-black text-red-400">{lider.evidenciasRechazadas || 0}</p>
          </Card>
        </div>

        {/* ===== HISTORIAL DE EVIDENCIAS ===== */}
        <Card title="Historial Completo de Evidencias" icon={<ImageIcon size={18} className='text-purple-400' />}>
          {lider.historialEvidencias && lider.historialEvidencias.length > 0 ? (
            <div className="space-y-2">
              {lider.historialEvidencias.map((ev) => {
                const isApproved = ev.estado === 'APROBADO';
                const isPending = ev.estado === 'PENDIENTE';
                const isRejected = ev.estado === 'RECHAZADO';
                
                return (
                  <div 
                    key={ev.id} 
                    className={`flex justify-between items-start p-3 rounded-lg transition-all hover:scale-[1.01] ${
                      isApproved ? 'bg-green-500/10 border border-green-500/20' : 
                      isRejected ? 'bg-red-500/10 border border-red-500/20' : 
                      'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {isApproved && <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />}
                      {isRejected && <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      {isPending && <Clock size={20} className="text-yellow-500 mt-0.5 flex-shrink-0 animate-pulse" />}
                      
                      <div className="flex-1">
                        <p className="text-white font-semibold">{ev.meta}</p>
                        {ev.categoria && (
                          <span className="inline-block text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full mt-1">
                            {ev.categoria}
                          </span>
                        )}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <UserCircle size={12} />
                          {ev.mentor} • {ev.fecha}
                        </p>
                        {ev.feedback && (
                          <div className="mt-2 p-2 bg-slate-900/50 rounded border-l-2 border-red-500">
                            <p className="text-xs text-slate-300">
                              <strong className="text-red-400">Feedback:</strong> {ev.feedback}
                            </p>
                          </div>
                        )}
                        {ev.imagenUrl && (
                          <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <Eye size={12} />
                            Ver imagen
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        isApproved ? 'bg-green-500/20 text-green-400' : 
                        isRejected ? 'bg-red-500/20 text-red-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ev.estado}
                      </span>
                      {ev.puntos > 0 && (
                        <span className="text-xs text-yellow-500 flex items-center gap-1 font-semibold">
                          <Zap size={12} fill="currentColor" /> +{ev.puntos} PC
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-semibold">No hay evidencias registradas</p>
              <p className="text-sm mt-1">Este participante aún no ha subido evidencias</p>
            </div>
          )}
        </Card>
      </div>

      {/* ===== MODAL DE TAREAS RETRASADAS ===== */}
      {showTareasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            {/* Header del modal */}
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-red-900/30 to-orange-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Análisis de Tareas Retrasadas</h2>
                    <p className="text-sm text-slate-400">{lider.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTareasModal(false);
                    setSelectedArea(null);
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XCircle className="text-slate-400" size={24} />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Filtros por área */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedArea(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    !selectedArea 
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Todas ({lider.totalTareasRetrasadas || 0})
                </button>
                {lider.tareasRetrasadasPorArea && Object.entries(lider.tareasRetrasadasPorArea).map(([area, data]) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedArea === area 
                        ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {area} ({data.count})
                  </button>
                ))}
              </div>

              {/* Lista de tareas */}
              <div className="space-y-3">
                {lider.tareasRetrasadasDetalle && lider.tareasRetrasadasDetalle.length > 0 ? (
                  lider.tareasRetrasadasDetalle
                    .filter(t => !selectedArea || t.area === selectedArea)
                    .map((tarea) => (
                      <div 
                        key={tarea.id}
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-red-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{tarea.texto}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                                {tarea.area}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(tarea.dueDate).toLocaleDateString('es-MX', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${
                              tarea.diasRetraso > 7 ? 'text-red-500' :
                              tarea.diasRetraso > 3 ? 'text-orange-400' :
                              'text-yellow-400'
                            }`}>
                              {tarea.diasRetraso} días
                            </span>
                            <p className="text-xs text-slate-500">de retraso</p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
                    <p className="text-green-400 font-bold text-lg">¡Excelente!</p>
                    <p className="text-slate-500">No hay tareas retrasadas en esta área</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-slate-700 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  <span className="text-red-400 font-bold">{lider.totalTareasRetrasadas || 0}</span> tareas pendientes de completar
                </div>
                <button
                  onClick={() => {
                    setShowTareasModal(false);
                    setSelectedArea(null);
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}