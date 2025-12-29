'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Heart, Shield, TrendingUp } from 'lucide-react';

interface StrikeStats {
  totalParticipantes: number;
  participantesEnRiesgo: number; // 2 strikes
  participantesSuspendidos: number;
  tasaAsistencia: number;
  detalles: {
    id: number;
    nombre: string;
    strikes: number;
    maxStrikes: number;
    status: string;
  }[];
}

export default function MentorStrikesWidget() {
  const [stats, setStats] = useState<StrikeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrikeStats();
  }, []);

  const fetchStrikeStats = async () => {
    try {
      const res = await fetch('/api/mentor/strikes/stats');
      const data = await res.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas de strikes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 animate-pulse">
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const participantesEnRiesgo = stats.detalles.filter(p => p.strikes === 2 && p.status === 'ACTIVE');
  const participantesSuspendidos = stats.detalles.filter(p => p.status === 'SUSPENDED');

  return (
    <div className="bg-gradient-to-br from-red-950/30 to-slate-900 p-6 rounded-2xl border border-red-900/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="p-2 bg-red-900/30 text-red-400 rounded-lg">
          <Shield className="w-5 h-5" />
        </span>
        <div>
          <h4 className="text-white font-bold">Sistema de Strikes</h4>
          <p className="text-xs text-slate-400">Llamadas perdidas notificadas</p>
        </div>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Total Participantes */}
        <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-800">
          <div className="text-2xl font-bold text-white">{stats.totalParticipantes}</div>
          <div className="text-xs text-slate-500 mt-1">Total</div>
        </div>

        {/* En Riesgo */}
        <div className="bg-amber-900/20 p-3 rounded-lg text-center border border-amber-800/50">
          <div className="text-2xl font-bold text-amber-400">{stats.participantesEnRiesgo}</div>
          <div className="text-xs text-amber-500 mt-1">En Riesgo</div>
        </div>

        {/* Suspendidos */}
        <div className="bg-red-900/20 p-3 rounded-lg text-center border border-red-800/50">
          <div className="text-2xl font-bold text-red-400">{stats.participantesSuspendidos}</div>
          <div className="text-xs text-red-500 mt-1">Suspendidos</div>
        </div>
      </div>

      {/* Tasa de Asistencia */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300 font-semibold">Tasa de Asistencia</span>
          </div>
          <span className={`text-xl font-bold ${
            stats.tasaAsistencia >= 90 ? 'text-green-400' :
            stats.tasaAsistencia >= 75 ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {stats.tasaAsistencia.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              stats.tasaAsistencia >= 90 ? 'bg-green-400' :
              stats.tasaAsistencia >= 75 ? 'bg-amber-400' :
              'bg-red-400'
            }`}
            style={{ width: `${stats.tasaAsistencia}%` }}
          />
        </div>
      </div>

      {/* Alertas de Participantes en Riesgo */}
      {participantesEnRiesgo.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-amber-400 mb-2">⚠️ Atención Requerida</h5>
              <div className="space-y-2">
                {participantesEnRiesgo.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 truncate">{p.nombre}</span>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {[...Array(p.maxStrikes)].map((_, i) => (
                        <Heart 
                          key={i} 
                          size={12}
                          className={i < (p.maxStrikes - p.strikes) 
                            ? 'text-red-500 fill-red-500' 
                            : 'text-slate-600'
                          } 
                        />
                      ))}
                      <span className="text-amber-400 font-bold ml-1">{p.strikes}/3</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Suspendidos */}
      {participantesSuspendidos.length > 0 && (
        <div className="bg-red-900/10 border border-red-800/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-red-400 mb-2">🚫 Suspendidos</h5>
              <div className="space-y-1">
                {participantesSuspendidos.map((p) => (
                  <div key={p.id} className="text-xs text-red-300 truncate">
                    • {p.nombre} ({p.strikes}/3 strikes)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de Estado Óptimo */}
      {participantesEnRiesgo.length === 0 && participantesSuspendidos.length === 0 && (
        <div className="bg-green-900/10 border border-green-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-green-400">
            ✓ Todos tus participantes están en buen estado
          </p>
        </div>
      )}
    </div>
  );
}
