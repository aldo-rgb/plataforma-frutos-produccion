import Link from 'next/link';
import { FileText, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

interface CartaWizardWidgetProps {
  hasCompletedCarta: boolean;
  cartaStatus?: 'BORRADOR' | 'EN_REVISION' | 'CAMBIOS_REQUERIDOS' | 'APROBADA';
}

export default function CartaWizardWidget({ hasCompletedCarta, cartaStatus }: CartaWizardWidgetProps) {
  // Si ya completó la carta y está aprobada, no mostrar el widget
  if (hasCompletedCarta && cartaStatus === 'APROBADA') {
    return null;
  }

  // Determinar el enlace según el estado
  const getLink = () => {
    // Si está en revisión o cambios requeridos, llevar al resumen
    if (cartaStatus === 'EN_REVISION' || cartaStatus === 'CAMBIOS_REQUERIDOS') {
      return '/dashboard/carta/resumen';
    }
    // En cualquier otro caso, llevar al wizard
    return '/dashboard/carta/wizard-v2';
  };

  // Definir mensaje según estado
  const getMessage = () => {
    if (!hasCompletedCarta) {
      return {
        title: '🎯 Define tus Objetivos',
        description: 'Construye tu visión y establece las metas que transformarán tu vida. El Wizard te guiará paso a paso.',
        action: 'Definir mis Objetivos',
        color: 'from-purple-600 to-pink-600',
        icon: <Sparkles className="w-6 h-6" />
      };
    }

    if (cartaStatus === 'BORRADOR') {
      return {
        title: '📝 Completa tu Carta',
        description: 'Tu carta está en borrador. Termina de llenarla y envíala para revisión de tu mentor.',
        action: 'Continuar Editando',
        color: 'from-blue-600 to-cyan-600',
        icon: <FileText className="w-6 h-6" />
      };
    }

    if (cartaStatus === 'CAMBIOS_REQUERIDOS') {
      return {
        title: '🔧 Correcciones Necesarias',
        description: 'Tu mentor ha solicitado algunos cambios en tu carta. Revisa los comentarios y actualiza.',
        action: 'Ver Comentarios',
        color: 'from-orange-600 to-red-600',
        icon: <FileText className="w-6 h-6" />
      };
    }

    if (cartaStatus === 'EN_REVISION') {
      return {
        title: '⏳ Carta en Revisión',
        description: 'Tu mentor está revisando tu carta. Te notificaremos cuando esté lista.',
        action: 'Ver mi Carta',
        color: 'from-yellow-600 to-amber-600',
        icon: <CheckCircle className="w-6 h-6" />
      };
    }

    return {
      title: '🎯 Define tus Objetivos',
      description: 'Construye tu visión y establece las metas que transformarán tu vida.',
      action: 'Definir mis Objetivos',
      color: 'from-purple-600 to-pink-600',
      icon: <Sparkles className="w-6 h-6" />
    };
  };

  const { title, description, action, color, icon } = getMessage();
  const link = getLink();

  return (
    <Link href={link}>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${color} p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer`}>
        
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 blur-xl" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              {icon}
            </div>
            <ArrowRight className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {title}
          </h3>
          
          <p className="text-white/90 text-sm mb-6 leading-relaxed">
            {description}
          </p>

          <div className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg">
            <span>{action}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
