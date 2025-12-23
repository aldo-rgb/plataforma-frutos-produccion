"use client";

import { ShieldCheck, Bot, PenLine, Heart, Trophy, Sparkles, Play } from 'lucide-react';
import Link from 'next/link';

export default function GuiaInicioPage() {
  return (
  <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
    {/* HEADER TÍTULO */}
    <div className="mb-8">
    <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 flex items-center gap-3">
      <ShieldCheck size={36} />
      GUÍA DE INICIO RÁPIDO
    </h1>
    <p className="text-slate-400 mt-2 text-sm md:text-base">
      Sigue estos pasos para configurar tu transformación correctamente.
    </p>
    </div>

    {/* --- NUEVO: VIDEO DE BIENVENIDA --- */}
    <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-12 shadow-2xl group cursor-pointer">
    {/* Fondo (Simulado) */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"></div>
        
    {/* Botón Play */}
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
      <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-colors">
        <Play size={32} className="text-white fill-white ml-2" />
      </div>
      <h3 className="text-white font-bold text-lg tracking-wider uppercase">Ver Mensaje de Bienvenida</h3>
      <p className="text-slate-400 text-xs mt-1">Duración: 2 min</p>
    </div>
    </div>

    {/* --- TARJETA PROTOCOLO S.M.A.R.T. --- */}
    <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-6 md:p-8 mb-12 shadow-lg shadow-cyan-900/10">
    <h2 className="text-xl font-bold text-cyan-400 mb-2">Protocolo S.M.A.R.T.</h2>
    <p className="text-slate-400 text-sm mb-6">
      Tu compromiso debe ser irrompible. Cada meta debe cumplir con este estándar:
    </p>
        
    <ul className="space-y-2 text-sm text-slate-300">
      <li className="flex items-start gap-2">
        <span className="text-pink-500 font-bold">•</span> 
        <span><strong className="text-white">S</strong>pecific (Específico): ¿Qué voy a hacer exactamente?</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-pink-500 font-bold">•</span> 
        <span><strong className="text-white">M</strong>edible: ¿Cuánto o cuántas veces? (¡Con números!)</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-pink-500 font-bold">•</span> 
        <span><strong className="text-white">A</strong>lcanzable: ¿Es realista para mí?</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-pink-500 font-bold">•</span> 
        <span><strong className="text-white">R</strong>elevante: ¿Por qué es importante para mi visión?</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-pink-500 font-bold">•</span> 
        <span><strong className="text-white">T</strong>iempo: ¿Para cuándo lo haré? (Fecha Límite)</span>
      </li>
    </ul>
    </div>

    {/* --- LOS 3 PASOS --- */}
    <div className="space-y-12 relative">
    <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-slate-800 -z-10 hidden md:block"></div>

    {/* PASO 1 */}
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/20">
        <Bot size={32} className="text-purple-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-white mb-2">1. Crea tu Carta de F.R.U.T.O.S.</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-2xl leading-relaxed">
          Define tus 8 metas cuantificables. Tienes dos caminos: usa la Inteligencia Artificial para inspirarte o llénala manualmente.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/mentor-ia" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors text-sm">
            <Sparkles size={18} /> USAR MENTOR IA
          </Link>
          <Link href="/dashboard/carta" className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all text-sm">
            <PenLine size={18} /> LLENADO MANUAL
          </Link>
        </div>
      </div>
    </div>

    {/* PASO 2 */}
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/20">
        <Heart size={32} className="text-emerald-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-white mb-2">2. Espera la Validación del Mentor</h3>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Una vez que guardes tu Carta, un Mentor y un Coordinador deben revisarla y Autorizarla. 
          Tu cuenta se activará para subir evidencias <strong className="text-emerald-400">solo después de este paso.</strong>
        </p>
      </div>
    </div>

    {/* PASO 3 */}
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-16 h-16 rounded-full border-2 border-yellow-500/30 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-900/20">
        <Trophy size={32} className="text-yellow-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-white mb-2">3. Ejecuta y Sube Evidencia</h3>
        <p className="text-slate-400 text-sm mb-4 max-w-2xl leading-relaxed">
          Completa tus tareas diarias, sube la <strong className="text-white">**evidencia fotográfica**</strong> en la sección "Carta", y revisa tu posición en el <strong className="text-white">**Ranking Global**</strong>.
        </p>
        <Link href="/dashboard/ranking" className="inline-flex items-center gap-2 text-yellow-500 font-bold text-sm hover:text-yellow-400 transition-colors uppercase tracking-wider">
          Ver Ranking <Trophy size={16} />
        </Link>
      </div>
    </div>

    </div>

  </div>
  );
}
