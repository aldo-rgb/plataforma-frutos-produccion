'use client';

import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface CartaPendiente {
  id: number;
  estado: string;
  submittedAt: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    vision: {
      id: number;
      name: string;
      endDate: string;
    } | null;
  };
  areas: Array<{
    type: string;
    identity: string;
    meta: string;
    hasActions: boolean;
  }>;
  completeness: number;
}

interface CartaStats {
  cartas: CartaPendiente[];
  total: number;
}

export default function CartaReviewPanel() {
  const [stats, setStats] = useState<CartaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingCartas();
    
    // Auto-refresh cada 30 segundos para detectar nuevas cartas enviadas
    const interval = setInterval(() => {
      loadPendingCartas();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const loadPendingCartas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/mentor/pending-cartas');
      
      if (!response.ok) {
        throw new Error('Error al cargar cartas pendientes');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading cartas:', err);
      setError(err.message || 'Error al cargar cartas');
    } finally {
      setLoading(false);
    }
  };

  const getAreaLabel = (type: string) => {
    const labels: Record<string, string> = {
      FINANZAS: '💰 Finanzas',
      RELACIONES: '❤️ Relaciones',
      TALENTOS: '🎯 Talentos',
      SALUD: '💪 Salud',
      PAZ_MENTAL: '🧘 Paz Mental',
      OCIO: '🎮 Ocio',
      SERVICIO_TRANS: '🌟 Servicio Trans.',
      SERVICIO_COMUN: '🤝 Servicio Com.'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-6 rounded-2xl border border-purple-700/30">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-purple-300">Cargando cartas pendientes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 p-6 rounded-2xl border border-red-700/30">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-300 font-bold">Error al cargar cartas</h3>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-6 rounded-2xl border border-purple-700/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/50 text-purple-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Cartas F.R.U.T.O.S. Pendientes</h3>
            <p className="text-slate-400 text-sm">Revisiones de metas y declaraciones • Auto-actualiza</p>
          </div>
        </div>
        
        {stats && stats.total > 0 && (
          <div className="bg-purple-500/20 border border-purple-500 text-purple-300 px-4 py-2 rounded-full text-sm font-bold">
            {stats.total} {stats.total === 1 ? 'pendiente' : 'pendientes'}
          </div>
        )}
      </div>

      {/* Content */}
      {!stats || stats.total === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-slate-300 text-lg font-semibold">¡Todo al día!</p>
          <p className="text-slate-500 text-sm mt-2">No hay cartas pendientes de revisión</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.cartas.map((carta) => (
            <div 
              key={carta.id}
              className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-purple-500 transition-all"
            >
              {/* User Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{carta.usuario.nombre}</h4>
                    <p className="text-slate-400 text-sm">{carta.usuario.email}</p>
                    {carta.usuario.vision && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-purple-900/30 border border-purple-600 text-purple-300 text-xs rounded">
                        🌟 {carta.usuario.vision.name}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Completeness Badge */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  carta.completeness >= 80 
                    ? 'bg-green-900/30 border border-green-600 text-green-300'
                    : carta.completeness >= 50
                    ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-300'
                    : 'bg-red-900/30 border border-red-600 text-red-300'
                }`}>
                  {carta.completeness}% completo
                </div>
              </div>

              {/* Submission Date */}
              {carta.submittedAt && (
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>Enviada: {new Date(carta.submittedAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</span>
                </div>
              )}

              {/* Areas Preview */}
              <div className="flex flex-wrap gap-2 mb-4">
                {carta.areas
                  .filter(area => area.identity || area.meta)
                  .slice(0, 4)
                  .map((area, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded"
                    >
                      {getAreaLabel(area.type)}
                      {area.hasActions && <span className="ml-1 text-green-400">✓</span>}
                    </span>
                  ))}
                {carta.areas.filter(a => a.identity || a.meta).length > 4 && (
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">
                    +{carta.areas.filter(a => a.identity || a.meta).length - 4} más
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Link 
                href={`/dashboard/mentor/cartas/${carta.id}/review`}
                className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Revisar Carta
              </Link>
            </div>
          ))}

          {/* View All Link */}
          {stats.total > 3 && (
            <Link 
              href="/dashboard/mentor/cartas"
              className="block text-center text-purple-400 hover:text-purple-300 text-sm font-semibold mt-4"
            >
              Ver todas las cartas pendientes →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
