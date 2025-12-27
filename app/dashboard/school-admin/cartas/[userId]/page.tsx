'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, User, Mail, Calendar, Award } from 'lucide-react';
import Link from 'next/link';

const AREAS_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  finanzas: { name: 'FINANZAS', emoji: '💰', color: 'emerald' },
  relaciones: { name: 'RELACIONES', emoji: '❤️', color: 'rose' },
  talentos: { name: 'TALENTOS', emoji: '🎨', color: 'purple' },
  salud: { name: 'SALUD', emoji: '💪', color: 'green' },
  pazMental: { name: 'PAZ MENTAL', emoji: '🧘', color: 'blue' },
  ocio: { name: 'OCIO', emoji: '🎮', color: 'pink' },
  servicioTrans: { name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟', color: 'yellow' },
  servicioComun: { name: 'SERVICIO COMUNITARIO', emoji: '🤝', color: 'cyan' }
};

export default function CartaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCartaDetail();
  }, [userId]);

  const fetchCartaDetail = async () => {
    try {
      const res = await fetch(`/api/school-admin/cartas-tracking/${userId}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Error al cargar la carta');
        setLoading(false);
        return;
      }

      setData(data);
    } catch (error) {
      console.error('Error fetching carta:', error);
      setError('Error al cargar la carta');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      PENDIENTE: { color: 'yellow', text: 'Pendiente', icon: Clock },
      APROBADO: { color: 'green', text: 'Aprobado', icon: CheckCircle },
      RECHAZADO: { color: 'red', text: 'Rechazado', icon: XCircle }
    };
    const badge = badges[status] || badges.PENDIENTE;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${badge.color}-500/20 text-${badge.color}-300 border border-${badge.color}-500/30`}>
        <Icon size={12} />
        {badge.text}
      </span>
    );
  };

  const getEstadoCartaBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      BORRADOR: { color: 'blue', text: 'Borrador' },
      EN_REVISION: { color: 'purple', text: 'En Revisión' },
      CAMBIOS_REQUERIDOS: { color: 'orange', text: 'Cambios Requeridos' },
      APROBADA: { color: 'green', text: 'Aprobada' }
    };
    const badge = badges[estado] || { color: 'gray', text: estado };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-${badge.color}-500/20 text-${badge.color}-300 border border-${badge.color}-500/30`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando carta...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <Link
              href="/dashboard/school-admin/cartas"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <ArrowLeft size={16} />
              Volver al listado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { usuario, carta } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/school-admin/cartas"
            className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-4 transition"
          >
            <ArrowLeft size={20} />
            Volver al listado
          </Link>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{usuario.nombre}</h1>
                  <p className="text-slate-300 flex items-center gap-2 mt-1">
                    <Mail size={16} />
                    {usuario.email}
                  </p>
                </div>
              </div>
              {getEstadoCartaBadge(carta.estado)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div>
                <div className="text-slate-400 text-sm mb-1">Fecha Creación</div>
                <div className="text-white font-medium">
                  {new Date(carta.fechaCreacion).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Última Actualización</div>
                <div className="text-white font-medium">
                  {new Date(carta.fechaActualizacion).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Fecha Envío</div>
                <div className="text-white font-medium">
                  {carta.fechaEnvio 
                    ? new Date(carta.fechaEnvio).toLocaleDateString('es-MX')
                    : 'No enviada'
                  }
                </div>
              </div>
              {usuario.vision && (
                <div>
                  <div className="text-slate-400 text-sm mb-1">Visión</div>
                  <div className="text-purple-300 font-medium">{usuario.vision.nombre}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Total Metas</div>
            <div className="text-3xl font-bold text-white">{carta.estadisticas.metas.total}</div>
          </div>
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="text-green-300 text-sm mb-1">Aprobadas</div>
            <div className="text-3xl font-bold text-green-400">{carta.estadisticas.metas.aprobadas}</div>
          </div>
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <div className="text-red-300 text-sm mb-1">Rechazadas</div>
            <div className="text-3xl font-bold text-red-400">{carta.estadisticas.metas.rechazadas}</div>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-yellow-300 text-sm mb-1">Pendientes</div>
            <div className="text-3xl font-bold text-yellow-400">{carta.estadisticas.metas.pendientes}</div>
          </div>
        </div>

        {/* Metas por Área */}
        <div className="space-y-6">
          {Object.entries(carta.metasPorArea).map(([areaKey, metas]: [string, any]) => {
            if (!metas || metas.length === 0) return null;

            const areaInfo = AREAS_INFO[areaKey];
            if (!areaInfo) return null;

            return (
              <div key={areaKey} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
                <div className={`bg-gradient-to-r from-${areaInfo.color}-500/20 to-${areaInfo.color}-600/20 border-b border-slate-700 px-6 py-4`}>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">{areaInfo.emoji}</span>
                    {areaInfo.name}
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {metas.map((meta: any) => (
                    <div key={meta.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      {/* Declaración SER */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-purple-300">Yo Soy</h3>
                          {getStatusBadge(meta.reviewStatus)}
                        </div>
                        <p className="text-white bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          {meta.declaracionSer}
                        </p>
                      </div>

                      {/* Objetivo */}
                      {meta.objetivo && (
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-slate-300 mb-2">Objetivo / Visualización</h3>
                          <p className="text-slate-200 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            {meta.objetivo}
                          </p>
                        </div>
                      )}

                      {/* Meta HACER */}
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-300 mb-2">Meta (HACER)</h3>
                        <p className="text-slate-200 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          {meta.descripcion}
                        </p>
                      </div>

                      {/* Feedback del mentor */}
                      {meta.mentorFeedback && (
                        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <h3 className="text-sm font-bold text-blue-300 mb-1">💬 Feedback del Mentor</h3>
                          <p className="text-blue-200 text-sm">{meta.mentorFeedback}</p>
                        </div>
                      )}

                      {/* Acciones */}
                      {meta.acciones && meta.acciones.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-slate-300 mb-3">Plan de Acción ({meta.acciones.length})</h3>
                          <div className="space-y-2">
                            {meta.acciones.map((accion: any) => (
                              <div key={accion.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-white flex-1">{accion.descripcion}</p>
                                  {getStatusBadge(accion.reviewStatus)}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                  <span>📅 {accion.frecuencia}</span>
                                  <span>✅ {accion.cantidadVecesCompletada || 0} / {accion.cantidadVecesTotal}</span>
                                </div>
                                {accion.mentorFeedback && (
                                  <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded p-2">
                                    <p className="text-blue-200 text-xs">{accion.mentorFeedback}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
