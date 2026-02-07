import React from 'react';
import Link from 'next/link';
import { Target, Users, UserCheck, Clock, ChevronRight, QrCode } from 'lucide-react';

interface ActiveProduct {
  id: number;
  name: string;
  visionId: number;
  levelType: string;
  trainingStatus: string;
}

interface Vision {
  id: number;
  nombre: string;
  descripcion?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  plWeekend3EndDate?: string; // Fecha real de fin de toda la visión (después de PL)
  activeProducts?: ActiveProduct[];
  _count: {
    VisionParticipante: number;
    VisionGameChanger: number;
  };
}

interface VisionesWidgetProps {
  visiones: Vision[];
  userRole: 'SCHOOL_ADMIN' | 'COORDINADOR' | 'COORDINATOR_BASIC' | 'COORDINATOR_ADVANCED' | 'TRAINER';
  loading?: boolean;
}

export default function VisionesWidget({ visiones, userRole, loading }: VisionesWidgetProps) {
  // COORDINADOR usa la ruta de school-admin, los demás coordinadores usan su ruta específica
  const baseUrl = userRole === 'SCHOOL_ADMIN' 
    ? '/dashboard/director/visiones' 
    : userRole === 'COORDINADOR'
      ? '/dashboard/school-admin/visiones'
      : '/dashboard/coordinador/visiones';
  
  // Debug log
  console.log('🔍 VisionesWidget - visiones recibidas:', visiones);
  console.log('📊 VisionesWidget - Total visiones:', visiones.length);
  console.log('🎯 VisionesWidget - Visiones detalle:', visiones.map(v => ({ 
    id: v.id, 
    nombre: v.nombre, 
    isActive: v.isActive,
    participantes: v._count?.VisionParticipante,
    gamechangers: v._count?.VisionGameChanger,
    activeProducts: v.activeProducts || 'NO HAY'
  })));
  
  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-3xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-800 rounded-xl"></div>
            <div className="h-20 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeVisiones = visiones.filter(v => v.isActive);
  const inactiveVisiones = visiones.filter(v => !v.isActive);
  
  console.log('✅ VisionesWidget - Visiones activas:', activeVisiones.length);
  console.log('❌ VisionesWidget - Visiones inactivas:', inactiveVisiones.length);

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
          <Target className="text-cyan-400" size={24} />
          Visiones Activas
        </h2>
        <Link
          href={baseUrl}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          Ver todas
          <ChevronRight size={16} />
        </Link>
      </div>

      {activeVisiones.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
          <Target className="mx-auto text-slate-600 mb-3" size={48} />
          <p className="text-slate-400 mb-4">No hay visiones activas</p>
          {userRole === 'COORDINADOR' && (
            <p className="text-sm text-slate-500">
              Las visiones son asignadas por tu director de organización
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeVisiones.slice(0, 6).map((vision) => {
            const startDate = vision.startDate ? new Date(vision.startDate) : null;
            // Usar plWeekend3EndDate como fecha de fin real si existe, sino endDate del básico
            const realEndDate = vision.plWeekend3EndDate 
              ? new Date(vision.plWeekend3EndDate) 
              : (vision.endDate ? new Date(vision.endDate) : null);
            const now = new Date();
            const daysRemaining = realEndDate ? Math.ceil((realEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <Link
                key={vision.id}
                href={`${baseUrl}/${vision.id}`}
                className="block group"
              >
                <div className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 hover:from-cyan-900/30 hover:to-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">
                        {vision.nombre}
                      </h3>
                      {vision.descripcion && (
                        <p className="text-slate-400 text-sm line-clamp-1">
                          {vision.descripcion}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      vision.isActive
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-slate-600/20 text-slate-400 border border-slate-600/50'
                    }`}>
                      {vision.isActive ? 'ACTIVA' : 'INACTIVA'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-blue-500/20 p-1.5 rounded-lg">
                        <Users size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Participantes</p>
                        <p className="text-white font-bold">{vision._count.VisionParticipante}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-purple-500/20 p-1.5 rounded-lg">
                        <UserCheck size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Mentores</p>
                        <p className="text-white font-bold">{vision._count.VisionGameChanger}</p>
                      </div>
                    </div>
                  </div>

                  {realEndDate && daysRemaining !== null && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className={daysRemaining <= 7 && daysRemaining > 0 ? 'text-red-400' : 'text-slate-400'} />
                        <span className={`text-xs font-medium ${daysRemaining <= 7 && daysRemaining > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {daysRemaining > 0 
                            ? `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`
                            : 'Finalizada'
                          }
                        </span>
                        {daysRemaining <= 7 && daysRemaining > 0 && (
                          <span className="ml-auto text-xs font-semibold text-red-400 animate-pulse">
                            ⚠️ Próxima a finalizar
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botón de Check-In para productos activos */}
                  {vision.activeProducts && vision.activeProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-500/30">
                      {vision.activeProducts.map((product) => (
                        <Link
                          key={product.id}
                          href={`/staff/check-in/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-amber-500/20"
                        >
                          <QrCode size={16} />
                          Check-In {product.levelType === 'BASIC' ? 'Básico' : product.levelType === 'ADVANCED' ? 'Avanzado' : 'Liderato'}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {inactiveVisiones.length > 0 && (
            <Link
              href={baseUrl}
              className="block text-center py-3 text-slate-400 hover:text-cyan-400 text-sm font-medium transition-colors"
            >
              + {inactiveVisiones.length} visión{inactiveVisiones.length !== 1 ? 'es' : ''} inactiva{inactiveVisiones.length !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
