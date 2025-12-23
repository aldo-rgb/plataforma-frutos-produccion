'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import Link from 'next/link';

export default function AlertaReagendamiento() {
  const [requiereReagendar, setRequiereReagendar] = useState(false);
  const [programasPendientes, setProgramasPendientes] = useState(0);
  const [cerrado, setCerrado] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    verificarProgramasPendientes();
  }, []);

  const verificarProgramasPendientes = async () => {
    try {
      const response = await fetch('/api/program/pendiente-reagendar');
      if (!response.ok) return;
      
      const data = await response.json();
      setRequiereReagendar(data.requiereReagendar || false);
      setProgramasPendientes(data.programas?.length || 0);
    } catch (error) {
      console.error('Error al verificar programas pendientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !requiereReagendar || cerrado) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="text-yellow-400" size={24} />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-300 mb-2 flex items-center gap-2">
            <Calendar size={20} />
            Acción Requerida: Re-agendar Sesiones
          </h3>
          <p className="text-yellow-200 text-sm mb-4">
            Tu coordinador ha cambiado a tu mentor. Debes seleccionar nuevos horarios para las semanas restantes de tu programa intensivo.
          </p>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/programa/reagendar"
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded-lg transition-all"
            >
              <Calendar size={18} />
              Re-agendar Ahora
            </Link>
            
            <div className="text-xs text-yellow-300">
              {programasPendientes} {programasPendientes === 1 ? 'programa pendiente' : 'programas pendientes'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setCerrado(true)}
          className="flex-shrink-0 text-yellow-400 hover:text-yellow-300 transition-colors"
          title="Cerrar (recordatorio permanece activo)"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
