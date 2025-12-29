'use client';

import { useEffect, useState } from 'react';
import { AlertOctagon, Heart, Shield, TrendingDown, Clock } from 'lucide-react';

interface MentorStrikesData {
  success: boolean;
  strikes: {
    current: number;
    limit: number;
    remaining: number;
    status: string;
    lastStrike: string | null;
    isAcceptingNewStudents: boolean;
  };
  reliability: {
    level: string;
    icon: string;
    color: string;
    label: string;
    percentage: number;
  };
  reports: Array<{
    id: number;
    reportedAt: string;
    reason: string | null;
    Student: {
      id: number;
      nombre: string;
      email: string;
    };
  }>;
}

export default function MentorAccountabilityWidget() {
  const [data, setData] = useState<MentorStrikesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentorStrikes();
  }, []);

  const fetchMentorStrikes = async () => {
    try {
      const res = await fetch('/api/mentor/strikes');
      const response = await res.json();
      
      if (response.success) {
        setData(response);
      }
    } catch (error) {
      console.error('Error cargando strikes del mentor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 animate-pulse">
        <div className="h-24 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const vidasRestantes = data.strikes.remaining;
  const isSuspended = data.strikes.current >= data.strikes.limit;
  const isWarning = data.strikes.current >= 3;
  const isRisk = data.strikes.current === 4;

  return (
    <div className={`bg-gradient-to-br p-6 rounded-2xl border shadow-lg ${
      isSuspended 
        ? 'from-red-950/30 to-slate-900 border-red-900/50'
        : isWarning
        ? 'from-orange-950/30 to-slate-900 border-orange-900/50'
        : 'from-slate-900 to-slate-800 border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`p-2 rounded-lg ${
          isSuspended
            ? 'bg-red-900/30 text-red-400'
            : isWarning
            ? 'bg-orange-900/30 text-orange-400'
            : 'bg-blue-900/30 text-blue-400'
        }`}>
          <AlertOctagon className="w-5 h-5" />
        </span>
        <div>
          <h4 className="text-white font-bold">Mi Confiabilidad</h4>
          <p className="text-xs text-slate-400">Llamadas perdidas reportadas</p>
        </div>
      </div>

      {/* Sistema de Vidas */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-300 font-semibold">Vidas Restantes</span>
          <span className={`text-2xl font-bold ${
            isSuspended ? 'text-red-400' :
            isRisk ? 'text-orange-400' :
            isWarning ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {vidasRestantes}/{data.strikes.limit}
          </span>
        </div>
        
        {/* Corazones */}
        <div className="flex items-center gap-1 justify-center">
          {[...Array(data.strikes.limit)].map((_, i) => (
            <Heart 
              key={i} 
              size={20}
              className={i < vidasRestantes 
                ? 'text-red-500 fill-red-500' 
                : 'text-slate-600'
              } 
            />
          ))}
        </div>

        {/* Contador de Strikes */}
        <div className="mt-3 text-center">
          <span className={`text-xs font-bold ${
            isSuspended ? 'text-red-400' :
            isWarning ? 'text-orange-400' :
            'text-slate-400'
          }`}>
            {data.strikes.current} de {data.strikes.limit} strikes
          </span>
        </div>
      </div>

      {/* Nivel de Confiabilidad */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${data.reliability.color}`} />
            <span className="text-sm text-slate-300 font-semibold">Confiabilidad</span>
          </div>
          <span className={`text-lg font-bold ${data.reliability.color}`}>
            {data.reliability.icon} {data.reliability.label}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              data.reliability.percentage >= 75 ? 'bg-green-400' :
              data.reliability.percentage >= 50 ? 'bg-yellow-400' :
              data.reliability.percentage >= 25 ? 'bg-orange-400' :
              'bg-red-400'
            }`}
            style={{ width: `${data.reliability.percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-center">
          {data.reliability.percentage}% de confiabilidad
        </p>
      </div>

      {/* Alertas por Estado */}
      {isSuspended && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-red-400 mb-1">🚫 CUENTA SUSPENDIDA</h5>
              <p className="text-xs text-red-300">
                Has alcanzado el límite de 5 llamadas perdidas. No puedes aceptar nuevos estudiantes hasta resolver esto con tu coordinador.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRisk && !isSuspended && (
        <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-orange-400 mb-1">⚠️ ÚLTIMA OPORTUNIDAD</h5>
              <p className="text-xs text-orange-300">
                Estás a 1 falta de la suspensión. Por favor, confirma todas tus llamadas programadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {isWarning && !isRisk && !isSuspended && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-yellow-400 mb-1">⚠️ ADVERTENCIA</h5>
              <p className="text-xs text-yellow-300">
                Ten cuidado. {data.strikes.remaining} llamadas perdidas más resultarán en suspensión.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reportes Recientes */}
      {data.reports && data.reports.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-slate-400" />
            <h5 className="text-xs font-bold text-slate-400">Reportes Recientes</h5>
          </div>
          <div className="space-y-2">
            {data.reports.slice(0, 3).map((report) => (
              <div key={report.id} className="text-xs text-slate-400 border-l-2 border-slate-700 pl-2">
                <p className="text-slate-300 font-medium">{report.Student.nombre}</p>
                <p className="text-slate-500">
                  {new Date(report.reportedAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short'
                  })}
                  {report.reason && ` - ${report.reason}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Última Falta */}
      {data.strikes.lastStrike && (
        <div className="mt-3 text-center">
          <p className="text-xs text-slate-500">
            Última falta: {new Date(data.strikes.lastStrike).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      )}

      {/* Estado Óptimo */}
      {data.strikes.current === 0 && (
        <div className="bg-green-900/10 border border-green-800/50 rounded-lg p-3 text-center mt-3">
          <p className="text-xs text-green-400">
            ✓ Excelente historial. Mantén tu confiabilidad al 100%
          </p>
        </div>
      )}
    </div>
  );
}
