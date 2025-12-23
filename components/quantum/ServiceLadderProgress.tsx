"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface ServiceLadderData {
  nivel1Count: number;
  nivel2Count: number;
  finDeSemanaCount: number;
  staffNivel1Count: number;
  staffNivel2Count: number;
  staffNivel3Count: number;
  superNovaUnlocked: boolean;
  superNovaUnlockedAt: string | null;
  totalServiceContributions: number;
  visitedLocations: number[];
  explorerBadgeUnlocked: boolean;
  ambassadorBadgeUnlocked: boolean;
  xpMultiplier: number;
}

export default function ServiceLadderProgress() {
  const [ladder, setLadder] = useState<ServiceLadderData | null>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quantum/service-contribution");
      const data = await res.json();
      
      if (res.ok) {
        setLadder(data.serviceLadder);
        setContributions(data.contributions || []);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al cargar progreso");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ladderLevels = [
    { 
      key: 'nivel1Count' as keyof ServiceLadderData, 
      label: 'Contribución Nivel 1', 
      icon: '🌱', 
      color: 'from-blue-500 to-cyan-500',
      pc: 200
    },
    { 
      key: 'nivel2Count' as keyof ServiceLadderData, 
      label: 'Contribución Nivel 2', 
      icon: '🌿', 
      color: 'from-purple-500 to-blue-500',
      pc: 500
    },
    { 
      key: 'finDeSemanaCount' as keyof ServiceLadderData, 
      label: 'Servicio Fin de Semana', 
      icon: '🔥', 
      color: 'from-indigo-500 to-purple-500',
      pc: 800
    },
    { 
      key: 'staffNivel1Count' as keyof ServiceLadderData, 
      label: 'Staff Nivel 1', 
      icon: '⭐', 
      color: 'from-yellow-500 to-orange-500',
      pc: 1000
    },
    { 
      key: 'staffNivel2Count' as keyof ServiceLadderData, 
      label: 'Staff Nivel 2', 
      icon: '🌟', 
      color: 'from-orange-500 to-red-500',
      pc: 1500
    },
    { 
      key: 'staffNivel3Count' as keyof ServiceLadderData, 
      label: 'Staff Nivel 3 (Game Changer)', 
      icon: '💫', 
      color: 'from-red-500 to-pink-500',
      pc: 2500
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando progreso...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">
            🛡️ The Service Ladder
          </h1>
          <p className="text-gray-300">
            Tu trayectoria de contribución y servicio
          </p>
          {ladder && ladder.xpMultiplier > 1 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <span className="text-yellow-400 font-bold">
                ⚡ Multiplicador de XP: {ladder.xpMultiplier}x
              </span>
            </div>
          )}
        </div>

        {/* Super Nova Badge */}
        {ladder?.superNovaUnlocked && (
          <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/30 text-center">
            <div className="text-7xl mb-4">🌟</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-2">
              SUPER NOVA
            </h2>
            <p className="text-gray-300 text-lg">
              Status Legendario Desbloqueado
            </p>
            {ladder.superNovaUnlockedAt && (
              <p className="text-gray-400 text-sm mt-2">
                Logrado el {new Date(ladder.superNovaUnlockedAt).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
        )}

        {/* Explorer & Ambassador Badges */}
        <div className="grid md:grid-cols-2 gap-4">
          {ladder?.explorerBadgeUnlocked && (
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-6 border border-green-500/30 text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-2xl font-bold text-green-400 mb-1">
                EXPLORADOR SUPREMO
              </h3>
              <p className="text-gray-300 text-sm">
                Visitaste todas las sucursales
              </p>
            </div>
          )}
          
          {ladder?.ambassadorBadgeUnlocked && (
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-5xl mb-3">✨</div>
              <h3 className="text-2xl font-bold text-purple-400 mb-1">
                EMBAJADOR DE LUZ
              </h3>
              <p className="text-gray-300 text-sm">
                Serviste en todas las ubicaciones
              </p>
            </div>
          )}
        </div>

        {/* Service Ladder Levels */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">
            Escalera de Servicio
          </h2>
          <div className="space-y-4">
            {ladderLevels.map((level) => {
              const count = ladder ? (ladder[level.key] as number) : 0;
              const isCompleted = count > 0;
              
              return (
                <div
                  key={level.key}
                  className={`relative bg-white/5 border-2 rounded-xl p-4 transition-all ${
                    isCompleted 
                      ? 'border-white/30 shadow-lg' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl ${isCompleted ? '' : 'grayscale opacity-50'}`}>
                        {level.icon}
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg">
                          {level.label}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {level.pc} PC por contribución
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        isCompleted ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {count}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {count === 1 ? 'vez' : 'veces'}
                      </div>
                    </div>
                  </div>
                  
                  {isCompleted && (
                    <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${level.color} rounded-full`}
                         style={{ width: '100%' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress to Super Nova */}
          {ladder && !ladder.superNovaUnlocked && (
            <div className="mt-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">
                🎯 Camino a Super Nova
              </h3>
              <p className="text-gray-300 mb-4 text-sm">
                Completa al menos 1 evidencia aprobada de cada nivel para desbloquear el status legendario
              </p>
              <div className="grid grid-cols-6 gap-2">
                {ladderLevels.map((level) => {
                  const count = ladder[level.key] as number;
                  const isCompleted = count > 0;
                  
                  return (
                    <div
                      key={level.key}
                      className={`aspect-square rounded-lg flex items-center justify-center text-2xl transition-all ${
                        isCompleted 
                          ? 'bg-green-500/30 border-2 border-green-500' 
                          : 'bg-gray-700/30 border-2 border-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓' : level.icon}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {ladder && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl p-6 border border-blue-500/30 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {ladder.totalServiceContributions}
              </div>
              <div className="text-gray-300">
                Contribuciones totales
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-6 border border-green-500/30 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {ladder.visitedLocations?.length || 0}
              </div>
              <div className="text-gray-300">
                Ubicaciones visitadas
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {contributions.filter(c => c.status === 'APPROVED').length}
              </div>
              <div className="text-gray-300">
                Evidencias aprobadas
              </div>
            </div>
          </div>
        )}

        {/* Recent Contributions */}
        {contributions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              📋 Mis Contribuciones Recientes
            </h2>
            <div className="space-y-3">
              {contributions.slice(0, 5).map((contribution) => (
                <div
                  key={contribution.id}
                  className="bg-white/5 p-4 rounded-lg border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">
                        {contribution.Location.name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {contribution.serviceLevel.replace(/_/g, ' ')}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(contribution.submittedAt).toLocaleString('es-MX')}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      contribution.status === 'APPROVED' 
                        ? 'bg-green-500/20 text-green-400'
                        : contribution.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {contribution.status === 'APPROVED' 
                        ? `✓ ${contribution.pcGranted} PC`
                        : contribution.status === 'REJECTED'
                        ? 'Rechazada'
                        : 'Pendiente'}
                    </div>
                  </div>
                  {contribution.feedbackMentor && (
                    <div className="mt-2 text-gray-300 text-sm italic">
                      💬 {contribution.feedbackMentor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
