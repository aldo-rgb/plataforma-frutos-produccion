'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import VisionWizard, { VisionWizardData } from '@/src/components/multi-level/VisionWizard';
import FinancialPanel from '@/src/components/multi-level/FinancialPanel';
import DashboardDiscovery from '@/src/components/dashboards/DashboardDiscovery';
import DashboardBreakthrough from '@/src/components/dashboards/DashboardBreakthrough';

export default function MultiLevelManagementPage() {
  const { data: session, status } = useSession();
  const [showWizard, setShowWizard] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'finances' | 'basic' | 'advanced' | 'pl'>('overview');
  const [visions, setVisions] = useState<any[]>([]);
  const [selectedVision, setSelectedVision] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      loadVisions();
      loadOrganization();
    }
  }, [status]);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const loadOrganization = async () => {
    try {
      const response = await fetch('/api/organization/me');
      if (response.ok) {
        const data = await response.json();
        setOrganizationId(data.id);
      }
    } catch (error) {
      console.error('Error cargando organización:', error);
    }
  };

  const loadVisions = async () => {
    try {
      const response = await fetch('/api/visiones/my-visions');
      if (response.ok) {
        const data = await response.json();
        setVisions(data.visions || []);
      }
    } catch (error) {
      console.error('Error cargando visiones:', error);
    }
  };

  const handleCreateVision = async (data: VisionWizardData) => {
    try {
      const response = await fetch('/api/visiones/create-multilevel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setShowWizard(false);
        loadVisions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creando visión:', error);
      alert('Error al crear visión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <div className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              🎓 Sistema Multi-Nivel
            </h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeView === 'overview'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                📊 Resumen
              </button>
              <button
                onClick={() => setActiveView('finances')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeView === 'finances'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                💰 Finanzas
              </button>
              <button
                onClick={() => setActiveView('basic')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeView === 'basic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                🟦 Discovery
              </button>
              <button
                onClick={() => setActiveView('advanced')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeView === 'advanced'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                🟪 Breakthrough
              </button>
              <button
                onClick={() => setActiveView('pl')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeView === 'pl'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                🟨 Quantum Leap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Mis Visiones</h2>
                <p className="text-gray-400">Gestiona tus programas multi-nivel</p>
              </div>
              <button
                onClick={() => setShowWizard(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span>✨</span>
                <span>Nueva Visión Multi-Nivel</span>
              </button>
            </div>

            {visions.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No hay visiones creadas
                </h3>
                <p className="text-gray-400 mb-6">
                  Crea tu primera visión multi-nivel para comenzar
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Crear Primera Visión
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visions.map((vision) => (
                  <div
                    key={vision.id}
                    className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer"
                    onClick={() => setSelectedVision(vision)}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {vision.nombre}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {vision.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex gap-2">
                      {vision.enabledLevels?.map((level: string) => (
                        <span
                          key={level}
                          className="px-3 py-1 bg-slate-700 rounded-full text-xs text-white"
                        >
                          {level === 'BASIC' && '🟦 Discovery'}
                          {level === 'ADVANCED' && '🟪 Breakthrough'}
                          {level === 'PL' && '🟨 Quantum Leap'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'finances' && organizationId && (
          <FinancialPanel organizationId={organizationId} />
        )}

        {activeView === 'basic' && selectedVision && (
          <DashboardDiscovery visionId={selectedVision.id} />
        )}

        {activeView === 'advanced' && selectedVision && (
          <DashboardBreakthrough visionId={selectedVision.id} />
        )}

        {activeView === 'pl' && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
              <div className="text-6xl mb-4">🟨</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Dashboard Quantum Leap
              </h3>
              <p className="text-gray-400">
                Sistema actual completo con mentores, cartas F.R.U.T.O.S. y gamificación
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Vision Wizard Modal */}
      {showWizard && (
        <VisionWizard
          onComplete={handleCreateVision}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
