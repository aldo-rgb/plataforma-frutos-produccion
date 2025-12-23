'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Target, Calendar, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface Mentorado {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  fechaRegistro: string;
  carta: {
    id: number;
    estado: string;
    submittedAt: string | null;
    approvedAt: string | null;
  } | null;
  enrollment: {
    cycleType: string;
    cycleEndDate: string;
    status: string;
    vision: {
      name: string;
      endDate: string;
    } | null;
  } | null;
  vision: {
    name: string;
    endDate: string;
  } | null;
  stats: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    progressPercentage: number;
  };
}

interface MentoradosData {
  mentor: {
    nombre: string;
    totalMentorados: number;
  };
  mentorados: Mentorado[];
}

export default function MentoradosListPanel() {
  const [data, setData] = useState<MentoradosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMentorados();
    
    // Auto-refresh cada 30 segundos para detectar cambios de estado en cartas
    const interval = setInterval(() => {
      loadMentorados();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const loadMentorados = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/mentor/my-mentorados');
      
      if (!response.ok) {
        throw new Error('Error al cargar mentorados');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error loading mentorados:', err);
      setError(err.message || 'Error al cargar mentorados');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      BORRADOR: { label: '📝 Borrador', color: 'bg-gray-900/30 border-gray-600 text-gray-300' },
      PENDIENTE_MENTOR: { label: '⏳ Pendiente', color: 'bg-yellow-900/30 border-yellow-600 text-yellow-300' },
      EN_REVISION: { label: '👀 En revisión', color: 'bg-blue-900/30 border-blue-600 text-blue-300' },
      CAMBIOS_REQUERIDOS: { label: '✏️ Cambios requeridos', color: 'bg-orange-900/30 border-orange-600 text-orange-300' },
      APROBADA: { label: '✅ Aprobada', color: 'bg-green-900/30 border-green-600 text-green-300' },
      RECHAZADA: { label: '❌ Rechazada', color: 'bg-red-900/30 border-red-600 text-red-300' }
    };
    const badge = badges[estado] || { label: estado, color: 'bg-slate-800 border-slate-600 text-slate-300' };
    return (
      <span className={`px-2 py-1 border rounded text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getEnrollmentBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      ACTIVE: { label: '🔥 Activo', color: 'bg-green-900/30 border-green-600 text-green-300' },
      COMPLETED: { label: '🎉 Completado', color: 'bg-blue-900/30 border-blue-600 text-blue-300' },
      DESERTER: { label: '🚪 Desertó', color: 'bg-orange-900/30 border-orange-600 text-orange-300' },
      DROPPED: { label: '⛔ Dado de baja', color: 'bg-red-900/30 border-red-600 text-red-300' }
    };
    const badge = badges[status] || { label: status, color: 'bg-slate-800 border-slate-600 text-slate-300' };
    return (
      <span className={`px-2 py-1 border rounded text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 p-6 rounded-2xl border border-blue-700/30">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-blue-300">Cargando mentorados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 p-6 rounded-2xl border border-red-700/30">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-300 font-bold">Error al cargar mentorados</h3>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 p-6 rounded-2xl border border-blue-700/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/50 text-blue-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Mis Mentorados</h3>
            <p className="text-slate-400 text-sm">Progreso de ciclos F.R.U.T.O.S. • Auto-actualiza</p>
          </div>
        </div>
        
        <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-2 rounded-full text-sm font-bold">
          {data.mentor.totalMentorados} {data.mentor.totalMentorados === 1 ? 'mentorado' : 'mentorados'}
        </div>
      </div>

      {/* Content */}
      {data.mentorados.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 text-lg font-semibold">Sin mentorados asignados</p>
          <p className="text-slate-500 text-sm mt-2">Aún no tienes estudiantes asignados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.mentorados.slice(0, 5).map((mentorado) => (
            <div 
              key={mentorado.id}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all"
            >
              {/* User Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-bold">{mentorado.nombre}</h4>
                  <p className="text-slate-400 text-sm">{mentorado.email}</p>
                  {mentorado.vision && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-900/30 border border-purple-600 text-purple-300 text-xs rounded">
                      🌟 {mentorado.vision.name}
                    </span>
                  )}
                </div>
                
                {/* Progress Circle */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    mentorado.stats.progressPercentage >= 70 
                      ? 'text-green-400'
                      : mentorado.stats.progressPercentage >= 40
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}>
                    {mentorado.stats.progressPercentage}%
                  </div>
                  <div className="text-xs text-slate-500">Progreso</div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Tareas: {mentorado.stats.completed}/{mentorado.stats.total}</span>
                  {mentorado.enrollment && (
                    <span className="text-slate-500">
                      {mentorado.enrollment.cycleType === 'SOLO' ? '🐺 Solo' : '🌟 Visión'}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      mentorado.stats.progressPercentage >= 70 
                        ? 'bg-green-500'
                        : mentorado.stats.progressPercentage >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${mentorado.stats.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {mentorado.carta && getEstadoBadge(mentorado.carta.estado)}
                {mentorado.enrollment && getEnrollmentBadge(mentorado.enrollment.status)}
                {mentorado.enrollment && (
                  <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(mentorado.enrollment.cycleEndDate).toLocaleDateString('es-MX', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Link 
                href={
                  mentorado.carta && (mentorado.carta.estado === 'EN_REVISION' || mentorado.carta.estado === 'CAMBIOS_REQUERIDOS')
                    ? `/dashboard/mentor/cartas/${mentorado.carta.id}/review`
                    : `/dashboard/mentor/mentorados/${mentorado.id}`
                }
                className={`block w-full ${
                  mentorado.carta && (mentorado.carta.estado === 'EN_REVISION' || mentorado.carta.estado === 'CAMBIOS_REQUERIDOS')
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                } text-white font-bold py-2 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2`}
              >
                <Eye className="w-4 h-4" />
                {mentorado.carta && (mentorado.carta.estado === 'EN_REVISION' || mentorado.carta.estado === 'CAMBIOS_REQUERIDOS') ? 'Revisar Carta' : 'Ver Detalle'}
              </Link>
            </div>
          ))}

          {/* View All Link */}
          {data.mentorados.length > 5 && (
            <Link 
              href="/dashboard/mentor/mentorados"
              className="block text-center text-blue-400 hover:text-blue-300 text-sm font-semibold mt-4"
            >
              Ver todos los mentorados ({data.mentorados.length}) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
