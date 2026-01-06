'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';

interface DashboardBreakthroughProps {
  visionId: number;
  locale?: 'es' | 'en';
}

export default function DashboardBreakthrough({ visionId, locale = 'es' }: DashboardBreakthroughProps) {
  const t = useMultiLevelTranslations(locale).dashboards.advanced;
  
  const [activeTab, setActiveTab] = useState<'dynamics' | 'staff' | 'teams'>('dynamics');
  const [staff, setStaff] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    captains: 0,
    teams: 0,
    participants: 0,
  });

  useEffect(() => {
    loadStats();
    loadStaff();
    loadTeams();
  }, [visionId]);

  const loadStats = async () => {
    // TODO: Cargar estadísticas desde la API
  };

  const loadStaff = async () => {
    // TODO: Cargar staff desde la API
  };

  const loadTeams = async () => {
    // TODO: Cargar equipos desde la API
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          🟪 {t.title}
        </h1>
        <p className="text-gray-400">
          Gestión de Dinámicas, Staff y Equipos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-purple-700"
        >
          <div className="text-purple-400 text-sm font-semibold mb-2">PARTICIPANTES</div>
          <div className="text-3xl font-bold text-white">{stats.participants}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-purple-700"
        >
          <div className="text-cyan-400 text-sm font-semibold mb-2">STAFF TOTAL</div>
          <div className="text-3xl font-bold text-white">{stats.totalStaff}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-purple-700"
        >
          <div className="text-yellow-400 text-sm font-semibold mb-2">{t.captains.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">{stats.captains}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800 rounded-xl p-6 border border-purple-700"
        >
          <div className="text-green-400 text-sm font-semibold mb-2">{t.teams.toUpperCase()}</div>
          <div className="text-3xl font-bold text-white">{stats.teams}</div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('dynamics')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'dynamics'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          🎯 {t.dynamics}
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'staff'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          👥 {t.staff}
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'teams'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
        >
          🤝 {t.teams}
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-800 rounded-xl p-6 border border-purple-700">
        {activeTab === 'dynamics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Dinámicas Programadas</h3>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                + Nueva Dinámica
              </button>
            </div>

            <div className="grid gap-4">
              {/* Ejemplo de dinámica */}
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Rompehielos - Presentación
                    </h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Actividad inicial para que los participantes se conozcan
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-cyan-400">📅 Sábado 9:00 AM</span>
                      <span className="text-yellow-400">⏱️ 45 minutos</span>
                      <span className="text-green-400">👥 Todos los participantes</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white">⚙️</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Gestión de Staff</h3>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                + Agregar Staff
              </button>
            </div>

            <div className="grid gap-4">
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                <div className="text-gray-400 text-center py-8">
                  No hay staff asignado aún
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">{t.assignTeams}</h3>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                + Crear Equipo
              </button>
            </div>

            <div className="grid gap-4">
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
                <div className="text-gray-400 text-center py-8">
                  No hay equipos creados aún
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
