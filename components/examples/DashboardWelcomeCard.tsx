'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle, Target, TrendingUp } from 'lucide-react';

/**
 * Componente de ejemplo que muestra cómo usar traducciones con next-intl
 * 
 * Para usar traducciones en tus componentes:
 * 
 * 1. Importa useTranslations:
 *    import { useTranslations } from 'next-intl';
 * 
 * 2. Inicializa el hook con el namespace (sección del JSON):
 *    const t = useTranslations('dashboard'); // usa messages/[locale].json -> dashboard
 * 
 * 3. Usa t() para acceder a las traducciones:
 *    t('title') // "Panel de Control" en ES, "Dashboard" en EN
 * 
 * 4. Para traducciones anidadas, usa punto (.):
 *    const tCommon = useTranslations('common');
 *    tCommon('welcome') // "Bienvenido" / "Welcome"
 */
export default function DashboardWelcomeCard() {
  // Obtener traducciones de diferentes namespaces
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tCarta = useTranslations('carta');

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
      {/* Título con traducción */}
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <span className="text-4xl">👋</span>
        {tCommon('welcome')}
      </h1>
      
      <p className="text-slate-400 mb-6">
        {t('title')} - {t('recentActivity')}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              {tCarta('goals')}
            </h3>
          </div>
          <p className="text-2xl font-bold text-white">12</p>
          <p className="text-xs text-slate-500">{t('progress')}: 75%</p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              {tCarta('actions')}
            </h3>
          </div>
          <p className="text-2xl font-bold text-white">48</p>
          <p className="text-xs text-slate-500">{tCommon('success')}</p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              {t('stats')}
            </h3>
          </div>
          <p className="text-2xl font-bold text-white">+23%</p>
          <p className="text-xs text-slate-500">{tCommon('info')}</p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
          {tCarta('create')}
        </button>
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
          {tCommon('search')}
        </button>
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
          {tCommon('filter')}
        </button>
      </div>
    </div>
  );
}
