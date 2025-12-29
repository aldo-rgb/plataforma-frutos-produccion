'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Calendar, CheckCircle, FileText, Target } from 'lucide-react';
import Link from 'next/link';

interface Vision {
  id: number;
  nombre: string;
  forceTransformationArea: boolean;
  forceCommunityServiceArea: boolean;
}

interface MetaDetalle {
  id: number;
  descripcion: string;
  declaracion: string | null;
  avance: number;
}

interface CartaDetalle {
  id: number;
  usuario: {
    nombre: string;
    email: string;
  };
  mentor: {
    nombre: string;
    email: string;
  } | null;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  vision: Vision | null;
  metasPorCategoria: Record<string, MetaDetalle[]>;
  
  // Áreas (legacy)
  finanzasMeta: string | null;
  relacionesMeta: string | null;
  talentosMeta: string | null;
  saludMeta: string | null;
  pazMentalMeta: string | null;
  ocioMeta: string | null;
  servicioTransMeta: string | null;
  servicioComunMeta: string | null;
  enrolamientoMeta: string | null;
}

export default function CartaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [carta, setCarta] = useState<CartaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setUserId(p.id));
  }, [params]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else if (userId) {
      fetchCarta();
    }
  }, [status, session, userId]);

  const fetchCarta = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/coordinador/carta/${userId}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setCarta(result.carta);
      }
    } catch (error) {
      console.error('Error fetching carta:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!carta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <FileText size={64} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Carta no encontrada</h2>
          <Link href="/dashboard/coordinador/cartas-pendientes" className="text-yellow-400 hover:text-yellow-300">
            Volver a cartas pendientes
          </Link>
        </div>
      </div>
    );
  }

  // Configuración de todas las áreas
  const todasLasAreas = [
    { id: 'finanzas', nombre: 'Finanzas', icon: '💰', metaLegacy: carta.finanzasMeta },
    { id: 'relaciones', nombre: 'Relaciones', icon: '❤️', metaLegacy: carta.relacionesMeta },
    { id: 'talentos', nombre: 'Talentos', icon: '🎯', metaLegacy: carta.talentosMeta },
    { id: 'salud', nombre: 'Salud', icon: '💪', metaLegacy: carta.saludMeta },
    { id: 'pazmental', nombre: 'Paz Mental', icon: '🧘', metaLegacy: carta.pazMentalMeta },
    { id: 'ocio', nombre: 'Ocio', icon: '🎮', metaLegacy: carta.ocioMeta },
    { id: 'serviciotrans', nombre: 'Servicio Transformacional', icon: '🌟', metaLegacy: carta.servicioTransMeta },
    { id: 'serviciocomun', nombre: 'Servicio Comunitario', icon: '🤝', metaLegacy: carta.servicioComunMeta },
  ];

  // Filtrar áreas según la visión - solo mostrar áreas que tienen metas o están en metasPorCategoria
  const areas = todasLasAreas.filter(area => {
    // Para áreas de servicio, verificar primero si están habilitadas en la visión
    if (area.id === 'serviciotrans' && carta.vision?.forceTransformationArea !== true) {
      return false;
    }
    if (area.id === 'serviciocomun' && carta.vision?.forceCommunityServiceArea !== true) {
      return false;
    }
    
    // Verificar si el área tiene metas en metasPorCategoria
    const tieneMetas = carta.metasPorCategoria[area.id]?.length > 0;
    // Verificar si tiene meta legacy
    const tieneMetaLegacy = area.metaLegacy && area.metaLegacy.trim() !== '';
    
    // Mostrar si tiene contenido
    return tieneMetas || tieneMetaLegacy;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/coordinador/cartas-pendientes"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a cartas pendientes
          </Link>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-yellow-500/20 rounded-xl">
                  <FileText size={32} className="text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Carta de Objetivos</h1>
                  <p className="text-slate-400">Vista previa de solo lectura</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold ${
                carta.estado === 'BORRADOR'
                  ? 'bg-slate-700 text-slate-300'
                  : carta.estado === 'EN_REVISION'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}>
                {carta.estado === 'BORRADOR' ? 'Borrador' : 
                 carta.estado === 'EN_REVISION' ? 'En Revisión' : carta.estado}
              </div>
            </div>

            {/* Info del Participante */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
                <User className="text-yellow-400" size={24} />
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Participante</p>
                  <p className="text-white font-bold">{carta.usuario.nombre}</p>
                  <p className="text-sm text-slate-400">{carta.usuario.email}</p>
                </div>
              </div>

              {carta.mentor && (
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
                  <User className="text-purple-400" size={24} />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Mentor Asignado</p>
                    <p className="text-white font-bold">{carta.mentor.nombre}</p>
                    <p className="text-sm text-slate-400">{carta.mentor.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
                <Calendar className="text-blue-400" size={24} />
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Fecha Creación</p>
                  <p className="text-white font-bold">
                    {new Date(carta.fechaCreacion).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
                <Calendar className="text-emerald-400" size={24} />
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Última Actualización</p>
                  <p className="text-white font-bold">
                    {new Date(carta.fechaActualizacion).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info de Visión */}
        {carta.vision && (
          <div className="mb-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Target className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-semibold">Visión Activa</p>
                <p className="text-white font-bold">{carta.vision.nombre}</p>
              </div>
              <div className="ml-auto flex gap-2">
                {carta.vision.forceTransformationArea && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-full border border-yellow-500/30">
                    Servicio Trans.
                  </span>
                )}
                {carta.vision.forceCommunityServiceArea && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/30">
                    Servicio Com.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metas por Área */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Target className="text-yellow-400" size={28} />
            Metas Declaradas
          </h2>

          <div className="grid gap-4">
            {areas.map((area, index) => {
              const metasCategoria = carta.metasPorCategoria[area.id] || [];
              const tieneMetas = metasCategoria.length > 0 || area.metaLegacy;
              
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-yellow-500/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{area.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-3">{area.nombre}</h3>
                      
                      {/* Meta declarada (legacy) */}
                      {area.metaLegacy && (
                        <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Declaración</p>
                          <p className="text-slate-300 leading-relaxed">{area.metaLegacy}</p>
                        </div>
                      )}
                      
                      {/* Metas desde el wizard */}
                      {metasCategoria.length > 0 ? (
                        <div className="space-y-3">
                          {metasCategoria.map((meta, metaIndex) => (
                            <div key={metaIndex} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                              <div className="flex items-start gap-2 mb-2">
                                <Target className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                                <div className="flex-1">
                                  <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Meta Principal</p>
                                  <p className="text-white font-medium">{meta.descripcion}</p>
                                </div>
                              </div>
                              {meta.declaracion && (
                                <div className="ml-6 mt-2">
                                  <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Declaración de Poder</p>
                                  <p className="text-slate-300 text-sm italic">"{meta.declaracion}"</p>
                                </div>
                              )}
                              <div className="ml-6 mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                                    <div 
                                      className="bg-yellow-500 h-2 rounded-full transition-all"
                                      style={{ width: `${meta.avance}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-400 font-semibold">{meta.avance}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !area.metaLegacy && (
                        <p className="text-slate-500 italic">No se ha definido una meta para esta área</p>
                      )}
                    </div>
                    {tieneMetas && (
                      <CheckCircle className="text-emerald-400 flex-shrink-0" size={24} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón de retorno */}
        <div className="flex justify-center">
          <Link
            href="/dashboard/coordinador/cartas-pendientes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
          >
            <ArrowLeft size={20} />
            Volver a Cartas Pendientes
          </Link>
        </div>

      </div>
    </div>
  );
}
