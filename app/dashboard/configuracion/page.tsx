'use client';

import { useState } from 'react';
import { User, Shield, Bell, Palette } from 'lucide-react';
import { PrivacySettings } from '@/components/social/PrivacySettings';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'profile' | 'notifications'>('privacy');

  const tabs = [
    { id: 'privacy' as const, label: 'Privacidad Social', icon: Shield },
    { id: 'profile' as const, label: 'Perfil', icon: User },
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
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          {activeTab === 'privacy' && (
            <div>
              <PrivacySettings />
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Configuración de perfil próximamente</p>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Configuración de notificaciones próximamente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
