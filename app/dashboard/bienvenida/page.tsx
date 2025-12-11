'use client';

import React from 'react';
import { Bot, ShieldCheck, Zap, Trophy, Heart, Pencil } from 'lucide-react';
import Link from 'next/link';
import MetasExtraordinariasWidget from '@/components/MetasExtraordinariasWidget';

export default function BienvenidaPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      
      {/* HEADER PRINCIPAL */}
      <div className="text-center pt-8 pb-6 border-b border-white/10">
        <h1 className="text-5xl font-black text-white italic tracking-tighter">
          ¡Bienvenido al <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Quantum!</span>
        </h1>
        <p className="text-xl text-slate-400 mt-2">Tu entrenamiento de Alto Rendimiento ha comenzado.</p>
      </div>

      {/* WIDGET DE METAS EXTRAORDINARIAS */}
      <MetasExtraordinariasWidget />

      {/* SECCIÓN DE PASOS */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-8">
        <h2 className="text-2xl font-black text-cyan-400 flex items-center gap-2">
            <ShieldCheck size={28} /> TUS PRIMEROS 3 PASOS IMPORTANTES
        </h2>
        
        {/* RECUADRO SMART (NUEVO) */}
        <div className="bg-slate-800/70 border border-cyan-500/50 rounded-xl p-5 shadow-lg">
            <h3 className="text-xl font-extrabold text-cyan-400 mb-2">Protocolo S.M.A.R.T.</h3>
            <p className="text-slate-400 text-sm mb-3">
                Tu compromiso debe ser irrompible. Cada meta debe cumplir con este estándar:
            </p>
            <ul className="text-xs text-white space-y-1 ml-4 list-disc">
                <li><strong className="text-pink-400">S</strong>pecífic (Específico): ¿Qué voy a hacer exactamente?</li>
                <li><strong className="text-pink-400">M</strong>edible: ¿Cuánto o cuántas veces? (¡Con números!)</li>
                <li><strong className="text-pink-400">A</strong>lcanzable: ¿Es realista para mí?</li>
                <li><strong className="text-pink-400">R</strong>elevante: ¿Por qué es importante para mi visión?</li>
                <li><strong className="text-pink-400">T</strong>iempo: ¿Para cuándo lo haré? (Fecha Límite)</li>
            </ul>
        </div>
        
        {/* PASO 1: DEFINIR LA CARTA (Opción IA y Manual) */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/10 rounded-full flex-shrink-0 border border-purple-500/50">
            <Bot size={24} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">1. Crea tu Carta de F.R.U.T.O.S.</h3>
            <p className="text-slate-400 mt-1">
              Define tus 8 metas cuantificables. Tienes dos caminos:
            </p>
            <div className='flex gap-4 mt-3'>
                {/* Botón 1: Mentor IA */}
                <Link href="/dashboard/mentor-ia">
                  <button className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg flex items-center gap-1 transition-colors">
                    <Bot size={16} /> USAR MENTOR IA
                  </button>
                </Link>
                
                {/* Botón 2: Edición Manual */}
                <Link href="/dashboard/carta">
                  <button className="text-sm font-bold text-cyan-400 bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded-lg flex items-center gap-1 transition-colors">
                    <Pencil size={16} /> LLENADO MANUAL
                  </button>
                </Link>
            </div>
          </div>
        </div>

        {/* Separadores y Pasos 2 y 3 (sin cambios) */}
        <div className="border-t border-dashed border-slate-800 ml-16"></div>

        {/* PASO 2: OBTENER AUTORIZACIÓN */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/10 rounded-full flex-shrink-0 border border-green-500/50">
            <Heart size={24} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">2. Espera la Validación del Mentor</h3>
            <p className="text-slate-400 mt-1">
              Una vez que guardes tu Carta, un Mentor y un Coordinador deben revisarla y Autorizarla. Tu cuenta se activará para subir evidencias y sumar puntos solo después de este paso.
            </p>
          </div>
        </div>
        
        {/* Separador */}
        <div className="border-t border-dashed border-slate-800 ml-16"></div>

        {/* PASO 3: JUGAR Y GANAR */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full flex-shrink-0 border border-amber-500/50">
            <Trophy size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">3. Ejecuta y Sube Evidencia</h3>
            <p className="text-slate-400 mt-1">
              Completa tus tareas diarias, sube la **evidencia fotográfica** en la sección "Carta", y revisa tu posición en el **Ranking Global**.
            </p>
            <Link href="/dashboard/ranking">
              <button className="mt-3 text-sm font-bold text-amber-400 hover:text-white transition-colors flex items-center gap-1">
                VER RANKING <Trophy size={16} />
              </button>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}