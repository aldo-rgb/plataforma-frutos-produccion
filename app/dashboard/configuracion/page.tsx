'use client';

import { useState } from 'react';
import { User, Shield, Bell, GraduationCap } from 'lucide-react';
import { PrivacySettings } from '@/components/social/PrivacySettings';
import Link from 'next/link';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'profile' | 'notifications'>('privacy');

  const tabs = [
    { id: 'privacy' as const, label: 'Privacidad Social', icon: Shield },
    { id: 'profile' as const, label: 'Perfil Completo', icon: User, href: '/dashboard/perfil-completo' },
    { id: 'notifications' as const, label: 'Notificaciones', icon: Bell }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Configuración</h1>
          <p className="text-slate-400">Personaliza tu experiencia en F.R.U.T.O.S.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-all bg-slate-900 text-slate-400 hover:bg-slate-800"
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </Link>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
          {activeTab === 'privacy' && (
            <div>
              <PrivacySettings />
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Configuración de notificaciones próximamente</p>
            </div>
          )}
        </div>

        {/* Configuración Avanzada */}
        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">Configuración Avanzada</h3>
              <p className="text-sm text-slate-400 mb-4">Solo para mentores y entrenadores</p>
              <p className="text-slate-300 mb-4">
                ¿Tienes certificado de entrenador en transformacion cuántica y te gustaría convertirte en mentor para guiar a otros en su camino de transformación? 
                Aplica ahora y comparte tu experiencia con la comunidad.
              </p>
              <Link
                href="/dashboard/solicitar-mentor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/20"
              >
                <GraduationCap className="w-5 h-5" />
                Solicitar ser Mentor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
