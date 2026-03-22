'use client';

import { Rocket, ArrowRight, Star, Users, Store } from 'lucide-react';
import Link from 'next/link';

interface ExpoFuturosImposiblesWidgetProps {
  className?: string;
}

export default function ExpoFuturosImposiblesWidget({ className = '' }: ExpoFuturosImposiblesWidgetProps) {
  return (
    <Link href="/dashboard/coordinador/expo-futuros-imposibles">
      <div className={`group bg-gradient-to-br from-purple-900/60 via-indigo-900/50 to-slate-900 border-2 border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer h-full ${className}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
            <Rocket className="text-white" size={28} />
          </div>
          <ArrowRight className="text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-all" size={24} />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
          Expo de Futuros Imposibles
        </h3>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          Gestiona y califica los negocios de tus participantes en la expo.
        </p>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Users size={14} className="text-blue-400" />
            <span>Ver participantes por visión</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Store size={14} className="text-purple-400" />
            <span>Información de negocios</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Star size={14} className="text-yellow-400" />
            <span>Calificaciones y registros</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 pt-4 border-t border-purple-500/20">
          <span className="text-purple-300 text-sm font-medium group-hover:text-purple-200 flex items-center gap-2">
            Acceder a la Expo
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
