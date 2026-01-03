'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileAlertProps {
  user: {
    nombre: string;
    rol: string;
    isActive: boolean;
    profileImage: string | null;
    jobTitle: string | null;
    skills: string[];
    PerfilMentor?: {
      biografiaCorta: string | null;
      especialidad: string | null;
    } | null;
  };
}

export default function ProfileAlert({ user }: ProfileAlertProps) {
  // Calcular campos faltantes (SIN incluir isActive en la validación inicial)
  const camposFaltantes: string[] = [];
  
  if (!user.profileImage) camposFaltantes.push('Foto de perfil');
  if (!user.jobTitle) camposFaltantes.push('Puesto de trabajo');
  if (!user.PerfilMentor?.biografiaCorta) camposFaltantes.push('Biografía corta');
  if (!user.PerfilMentor?.especialidad) camposFaltantes.push('Especialidad');
  if (!user.skills || user.skills.length === 0) camposFaltantes.push('Habilidades');

  // Determinar la URL del perfil según el rol del usuario
  const perfilUrl = user.rol === 'LIDER' ? '/dashboard/lider/perfil' : '/dashboard/mentor/perfil';

  // CASO 1: Perfil completo Y activo = NO MOSTRAR NADA ✅
  if (camposFaltantes.length === 0 && user.isActive) {
    return null;
  }

  // CASO 2: Perfil completo PERO inactivo = ESPERANDO APROBACIÓN 🔵
  if (camposFaltantes.length === 0 && !user.isActive) {
    return (
      <div className="bg-blue-950/40 border-2 border-blue-600/60 rounded-xl p-5 flex items-start gap-4 shadow-2xl shadow-blue-900/30">
        <AlertCircle className="w-7 h-7 text-blue-400 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <h3 className="text-blue-200 font-bold text-lg mb-2">
            🎯 ¡Perfil Completo! Esperando Activación
          </h3>
          
          <p className="text-blue-100/90 text-sm mb-3 leading-relaxed">
            Has completado toda la información de tu perfil. Un administrador revisará y activará tu cuenta pronto.
          </p>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
            <p className="text-blue-200 font-semibold text-xs uppercase tracking-wide mb-2">
              ¿Qué sigue?
            </p>
            <ul className="space-y-1.5">
              <li className="text-blue-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Un administrador revisará tu perfil
              </li>
              <li className="text-blue-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Recibirás una notificación cuando seas activado
              </li>
              <li className="text-blue-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Podrás comenzar a recibir estudiantes
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // CASO 3: Faltan campos = ALERTA NARANJA 🟠
  return (
    <div className="bg-orange-950/40 border-2 border-orange-600/60 rounded-xl p-5 flex items-start gap-4 shadow-2xl shadow-orange-900/30 animate-pulse-slow">
      <AlertCircle className="w-7 h-7 text-orange-400 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1">
        <h3 className="text-orange-200 font-bold text-lg mb-2">
          ⚠️ Completa tu Perfil de Mentor
        </h3>
        
        <p className="text-orange-100/90 text-sm mb-3 leading-relaxed">
          Tu perfil está <span className="font-bold text-orange-300">incompleto</span>. 
          Los estudiantes no podrán verte en el catálogo hasta que completes toda la información.
        </p>

        {/* Lista de campos faltantes */}
        <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-3 mb-4">
          <p className="text-orange-200 font-semibold text-xs uppercase tracking-wide mb-2">
            Campos Faltantes:
          </p>
          <ul className="space-y-1.5">
            {camposFaltantes.map((campo, index) => (
              <li key={index} className="text-orange-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                {campo}
              </li>
            ))}
          </ul>
        </div>

        {/* Botón de acción */}
        <Link 
          href={perfilUrl}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
        >
          <span>Completar Perfil Ahora</span>
          <span className="text-lg">→</span>
        </Link>
      </div>
    </div>
  );
}
