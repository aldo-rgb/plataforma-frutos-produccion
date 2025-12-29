'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Ban, Clock } from 'lucide-react';

interface Strike {
  current: number;
  limit: number;
  remaining: number;
  status: string;
  lastStrike: string | null;
  isAcceptingNewStudents: boolean;
}

interface Reliability {
  level: string;
  icon: string;
  color: string;
  label: string;
  percentage: number;
}

export default function MentorStrikesWidget() {
  const [strikes, setStrikes] = useState<Strike | null>(null);
  const [reliability, setReliability] = useState<Reliability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrikes();
  }, []);

  const fetchStrikes = async () => {
    try {
      const res = await fetch('/api/mentor/strikes');
      const data = await res.json();

      if (res.ok && data.success) {
        setStrikes(data.strikes);
        setReliability(data.reliability);
      }
    } catch (error) {
      console.error('Error fetching strikes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/2"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!strikes || !reliability) {
    return null;
  }

  const getStatusColor = () => {
    if (strikes.current >= 5) return 'text-red-500';
    if (strikes.current >= 3) return 'text-yellow-500';
    if (strikes.current >= 1) return 'text-blue-400';
    return 'text-emerald-400';
  };

  const getStatusBg = () => {
    if (strikes.current >= 5) return 'bg-red-500/20 border-red-500/30';
    if (strikes.current >= 3) return 'bg-yellow-500/20 border-yellow-500/30';
    if (strikes.current >= 1) return 'bg-blue-500/20 border-blue-500/30';
    return 'bg-emerald-500/20 border-emerald-500/30';
  };

  const getIcon = () => {
    if (strikes.current >= 5) return <Ban className="text-red-500" size={32} />;
    if (strikes.current >= 3) return <AlertTriangle className="text-yellow-500" size={32} />;
    return <Shield className="text-emerald-400" size={32} />;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Confiabilidad</h3>
          <p className="text-sm text-slate-400">Sistema de strikes</p>
        </div>
        <div className={`p-3 rounded-xl ${getStatusBg()} border`}>
          {getIcon()}
        </div>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border mb-6 ${getStatusBg()}`}>
        <span className="text-2xl">{reliability.icon}</span>
        <div>
          <p className={`font-bold ${reliability.color}`}>{reliability.label}</p>
          <p className="text-xs text-slate-400">{reliability.percentage}% Confiabilidad</p>
        </div>
      </div>

      {/* Strikes Counter */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Faltas Acumuladas</span>
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {strikes.current} / {strikes.limit}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              strikes.current >= 5
                ? 'bg-red-500'
                : strikes.current >= 3
                ? 'bg-yellow-500'
                : strikes.current >= 1
                ? 'bg-blue-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${(strikes.current / strikes.limit) * 100}%` }}
          />
        </div>

        {/* Remaining */}
        <div className="mt-2 text-center">
          <p className="text-xs text-slate-400">
            {strikes.remaining === 0 ? (
              <span className="text-red-400 font-bold">⚠️ Límite alcanzado</span>
            ) : (
              <>Te quedan <span className="text-white font-bold">{strikes.remaining}</span> faltas permitidas</>
            )}
          </p>
        </div>
      </div>

      {/* Last Strike */}
      {strikes.lastStrike && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={14} />
          <span>
            Última falta: {new Date(strikes.lastStrike).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      )}

      {/* Warning Messages */}
      {strikes.current >= 5 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400 font-bold">
            🚫 Tu cuenta está suspendida. No puedes aceptar nuevos estudiantes hasta que un coordinador revise tu caso.
          </p>
        </div>
      )}

      {strikes.current >= 3 && strikes.current < 5 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-400 font-bold">
            ⚠️ Estás en periodo de prueba. Evita más faltas para no ser suspendido.
          </p>
        </div>
      )}

      {strikes.current === 0 && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-xs text-emerald-400 font-bold">
            ✨ ¡Excelente! Mantén tu récord impecable.
          </p>
        </div>
      )}
    </div>
  );
}
