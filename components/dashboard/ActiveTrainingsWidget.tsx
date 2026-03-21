'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, ExternalLink, Sparkles, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface ActiveTraining {
  id: number;
  name: string;
  levelType: string;
  type: string;
  trainingStatus: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  visionId: number | null;
  visionName: string | null;
  enrollmentStatus: string;
}

export default function ActiveTrainingsWidget() {
  const [trainings, setTrainings] = useState<ActiveTraining[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTrainings();
  }, []);

  const fetchActiveTrainings = async () => {
    try {
      const res = await fetch('/api/me/active-trainings');
      const data = await res.json();
      if (data.success) {
        setTrainings(data.trainings);
      }
    } catch (error) {
      console.error('Error fetching active trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (levelType: string) => {
    switch (levelType) {
      case 'BASIC':
        return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', label: 'Básico' };
      case 'ADVANCED':
        return { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Avanzado' };
      case 'PL':
      case 'LEADERSHIP':
        return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', label: 'PL' };
      default:
        return { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', label: levelType };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: 'bg-green-500/20 text-green-400', label: 'Activo' };
      case 'ATTENDED':
        return { color: 'bg-blue-500/20 text-blue-400', label: 'Asistido' };
      case 'COMPLETED':
        return { color: 'bg-cyan-500/20 text-cyan-400', label: 'Completado' };
      default:
        return { color: 'bg-slate-500/20 text-slate-400', label: status };
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Por confirmar';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl animate-pulse" />
          <div className="h-6 w-48 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (trainings.length === 0) {
    return null; // No mostrar el widget si no hay entrenamientos activos
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 hover:border-cyan-500/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Entrenamientos Activos</h3>
            <p className="text-xs text-slate-400">Tus inscripciones actuales</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400">{trainings.length}</span>
        </div>
      </div>

      {/* Lista de entrenamientos */}
      <div className="space-y-3">
        {trainings.map((training) => {
          const levelBadge = getLevelBadge(training.levelType);
          const statusBadge = getStatusBadge(training.enrollmentStatus);

          return (
            <div
              key={training.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    {training.visionName || training.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${levelBadge.color}`}>
                    {levelBadge.label}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-400">
                {training.startDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{formatDate(training.startDate)}</span>
                  </div>
                )}
                {training.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate max-w-[150px]">{training.location}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
