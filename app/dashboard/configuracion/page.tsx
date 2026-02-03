'use client';

import { useState } from 'react';
import { User, Shield, Bell, GraduationCap, Dumbbell } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">⚙️ Configuración</h1>
          <p className="text-sm md:text-base text-slate-400">Personaliza tu experiencia en F.R.U.T.O.S.</p>
        </div>

        {/* Tabs - Stack vertical en móvil, horizontal en desktop */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="flex items-center justify-center md:justify-start gap-3 px-5 py-4 rounded-xl font-semibold transition-all bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 shadow-lg w-full"
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="text-base">{tab.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center md:justify-start gap-3 px-5 py-4 rounded-xl font-semibold transition-all w-full shadow-lg ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border border-blue-400'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                <span className="text-base">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 mb-6 shadow-xl">
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
        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/30 p-4 md:p-6 shadow-xl mb-6">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg mx-auto md:mx-0">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg md:text-xl font-bold text-white mb-1">Solicitar ser Mentor</h3>
              <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">Para guiar a otros en su camino de transformación</p>
              <p className="text-sm md:text-base text-slate-300 mb-4 leading-relaxed">
                ¿Tienes certificado de entrenador en transformación cuántica y te gustaría convertirte en mentor para guiar a otros en su camino de transformación? 
                Aplica ahora y comparte tu experiencia con la comunidad.
              </p>
              <Link
                href="/dashboard/solicitar-mentor"
                className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 w-full md:w-auto text-base"
              >
                <GraduationCap className="w-5 h-5" />
                Solicitar ser Mentor
              </Link>
            </div>
          </div>
        </div>

        {/* Soy Entrenador */}
        <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 rounded-xl border border-orange-500/30 p-4 md:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg mx-auto md:mx-0">
              <Dumbbell className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg md:text-xl font-bold text-white mb-1"></h3>
              <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">Para facilitar entrenamientos Quantum Leap</p>
              <p className="text-sm md:text-base text-slate-300 mb-4 leading-relaxed">
                ¿Te gustaría facilitar entrenamientos de transformación cuántica y ser parte del equipo de entrenadores? 
                Aplica ahora para obtener acceso a las herramientas de Quantum Leap.
              </p>
              <Link
                href="/dashboard/solicitar-trainer"
                className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 w-full md:w-auto text-base"
              >
                <Dumbbell className="w-5 h-5" />
                Soy Entrenador
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
