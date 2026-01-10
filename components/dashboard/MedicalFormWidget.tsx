'use client';

import { HeartPulse, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MedicalFormWidgetProps {
  hasForm: boolean; // Si ya llenó el formulario
}

export default function MedicalFormWidget({ hasForm }: MedicalFormWidgetProps) {
  // Si ya tiene formulario completado, no mostrar el widget
  if (hasForm) {
    return null;
  }

  // Necesita llenar el formulario
  return (
    <div className="bg-gradient-to-br from-red-900/30 to-rose-900/20 border border-red-500/50 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 bg-red-500/20 rounded-xl">
          <HeartPulse className="w-6 h-6 text-red-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Acción Requerida</span>
          </div>
          
          <h3 className="text-lg font-bold text-white mb-2">
            Completa tu Formulario Médico
          </h3>
          
          <p className="text-sm text-gray-300 mb-4">
            Para participar en eventos presenciales, necesitamos tu información médica. 
            Este formulario es confidencial y requerido para tu seguridad.
          </p>
          
          <Link 
            href="/dashboard/medical-form"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all hover:scale-105"
          >
            Llenar Formulario
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
