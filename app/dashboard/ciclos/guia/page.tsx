"use client";

import { useState } from 'react';
import { 
  ShieldCheck, Bot, PenLine, Heart, Trophy, Sparkles, Play, 
  GraduationCap, Calendar, DollarSign, Clock, Settings, User,
  ChevronDown, ChevronRight, CheckCircle, Phone, Users, Star,
  FileText, Video, CreditCard, Percent, Target, Award, Zap,
  Rocket, Camera, MessageSquare, CalendarCheck, Upload, Eye
} from 'lucide-react';
import Link from 'next/link';

type GuideSection = 'inicio' | 'mentor' | 'alumno' | 'disciplina';
type AlumnoSubSection = 'carta' | 'futuro' | 'hoy' | 'misiones' | 'llamadas';

export default function GuiaInicioPage() {
  const [activeSection, setActiveSection] = useState<GuideSection>('inicio');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [alumnoSubSection, setAlumnoSubSection] = useState<AlumnoSubSection>('carta');

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      {/* HEADER TÍTULO */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 flex items-center gap-3">
          <ShieldCheck size={36} />
          CENTRO DE AYUDA - GUÍAS AVANZADAS
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">
          Explora todas las guías disponibles para aprovechar al máximo la plataforma Quantum Matter.
        </p>
      </div>

      {/* MENÚ DE NAVEGACIÓN DE GUÍAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => setActiveSection('inicio')}
          className={`p-4 rounded-xl border transition-all ${
            activeSection === 'inicio'
              ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <ShieldCheck className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Inicio Rápido</span>
        </button>
        
        <button
          onClick={() => setActiveSection('mentor')}
          className={`p-4 rounded-xl border transition-all ${
            activeSection === 'mentor'
              ? 'bg-purple-600/20 border-purple-500 text-purple-400'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <GraduationCap className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Ser Mentor</span>
        </button>
        
        <button
          onClick={() => setActiveSection('alumno')}
          className={`p-4 rounded-xl border transition-all ${
            activeSection === 'alumno'
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <Users className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Ser Alumno</span>
        </button>
        
        <button
          onClick={() => setActiveSection('disciplina')}
          className={`p-4 rounded-xl border transition-all ${
            activeSection === 'disciplina'
              ? 'bg-amber-600/20 border-amber-500 text-amber-400'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}
        >
          <Clock className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Club 5 AM</span>
        </button>
      </div>

      {/* ============================================= */}
      {/* SECCIÓN: INICIO RÁPIDO (Original) */}
      {/* ============================================= */}
      {activeSection === 'inicio' && (
        <div className="animate-in fade-in duration-300">
          {/* VIDEO DE BIENVENIDA */}
          <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-12 shadow-2xl group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-colors">
                <Play size={32} className="text-white fill-white ml-2" />
              </div>
              <h3 className="text-white font-bold text-lg tracking-wider uppercase">Ver Mensaje de Bienvenida</h3>
              <p className="text-slate-400 text-xs mt-1">Duración: 2 min</p>
            </div>
          </div>

          {/* PROTOCOLO S.M.A.R.T. */}
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

          {/* LOS 3 PASOS */}
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
              <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/20">
                <Trophy size={32} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">3. ¡Ejecuta y Sube Evidencias!</h3>
                <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                  Cada día podrás subir hasta 8 evidencias (una por cada área). Tu progreso se irá registrando 
                  y al final del ciclo verás tu evolución completa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* SECCIÓN: GUÍA COMPLETA PARA SER MENTOR */}
      {/* ============================================= */}
      {activeSection === 'mentor' && (
        <div className="animate-in fade-in duration-300 space-y-6">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Guía Completa: Cómo Ser Mentor</h2>
                <p className="text-purple-300">Todo lo que necesitas saber para convertirte en Mentor de Quantum Matter</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Como mentor certificado tendrás acceso a herramientas exclusivas para gestionar tus mentorados, 
              agendar llamadas, recibir ingresos por tus servicios y mucho más.
            </p>
          </div>

          {/* PASO 1: Solicitar ser Mentor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(1)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Solicitar Ser Mentor</h3>
                  <p className="text-sm text-slate-400">Dónde encontrar el formulario y cómo llenarlo</p>
                </div>
              </div>
              {expandedStep === 1 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 1 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> ¿Dónde encontrar la opción?
                  </h4>
                  <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-900 p-3 rounded-lg font-mono">
                    <span className="text-purple-400">Configuración</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-400">Solicitar Ser Mentor</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-3">
                    En el menú lateral, ve a <strong className="text-white">Configuración</strong> y haz clic en <strong className="text-white">"Solicitar Ser Mentor"</strong>.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> El Wizard de 3 Pasos
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">1</div>
                      <div>
                        <p className="text-white font-medium">Información Básica</p>
                        <p className="text-slate-400 text-sm">Título profesional, especialidad, años de experiencia y biografía (mín. 200 caracteres)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">2</div>
                      <div>
                        <p className="text-white font-medium">Experiencia y Portafolio</p>
                        <p className="text-slate-400 text-sm">Logros, certificaciones, habilidades, documentos de soporte (PDF/imágenes) y video de presentación opcional</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">3</div>
                      <div>
                        <p className="text-white font-medium">Revisión y Pago</p>
                        <p className="text-slate-400 text-sm">Verifica tu información y procede al pago de membresía</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link 
                  href="/dashboard/solicitar-mentor"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  <GraduationCap className="w-5 h-5" />
                  Ir a Solicitar Ser Mentor
                </Link>
              </div>
            )}
          </div>

          {/* PASO 2: Pago de Membresía */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(2)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Pago de Membresía Anual</h3>
                  <p className="text-sm text-slate-400">Costo, beneficios y opciones de pago</p>
                </div>
              </div>
              {expandedStep === 2 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 2 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-green-400 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" /> Membresía de Mentor
                    </h4>
                    <span className="text-3xl font-bold text-white">$999 <span className="text-sm text-slate-400 font-normal">MXN/año</span></span>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Para obtener <strong className="text-white">todos los beneficios de agenda y clientes</strong>, deberás realizar un pago anual de membresía.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Revisión completa de tu perfil con soporte de Quantum AI
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Acceso completo a la plataforma de mentoría
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Capacitación inicial incluida
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Soporte técnico continuo
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Opciones de Pago
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                      <p className="font-bold text-white mb-1">Stripe</p>
                      <p className="text-slate-400 text-sm">Tarjeta de crédito/débito (Visa, Mastercard, Amex). Procesamiento instantáneo.</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                      <p className="font-bold text-white mb-1">Código de Licencia</p>
                      <p className="text-slate-400 text-sm">Código promocional o licencia corporativa para acceso inmediato.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Proceso de Aprobación</p>
                      <p>Una vez realizado el pago, tu solicitud será revisada en <strong>24-48 horas</strong>. Recibirás notificación por correo.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 3: Configurar Perfil de Mentor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(3)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Configurar tu Perfil de Mentor</h3>
                  <p className="text-sm text-slate-400">Completa tu perfil público y define tus precios</p>
                </div>
              </div>
              {expandedStep === 3 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 3 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" /> ¿Dónde configurar?
                  </h4>
                  <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-900 p-3 rounded-lg font-mono">
                    <span className="text-purple-400">Panel Mentor</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-400">Mi Perfil</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3">Campos Obligatorios del Perfil</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Foto de perfil profesional
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Nombre completo
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Título profesional (Job Title)
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Especialidad principal
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Biografía corta y completa
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Tu visión como mentor
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Sede/Ubicación
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Habilidades y logros
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Años de experiencia
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Enlace de videollamada (Zoom/Meet)
                    </div>
                  </div>
                </div>

                <Link 
                  href="/dashboard/mentor/perfil"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  Ir a Mi Perfil de Mentor
                </Link>
              </div>
            )}
          </div>

          {/* PASO 4: Configurar Horarios */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(4)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Configurar tus Horarios</h3>
                  <p className="text-sm text-slate-400">Horarios de mentoría y llamadas de disciplina</p>
                </div>
              </div>
              {expandedStep === 4 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 4 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> ¿Dónde configurar?
                  </h4>
                  <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-900 p-3 rounded-lg font-mono">
                    <span className="text-purple-400">Panel Mentor</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-400">Mi Perfil</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <span className="text-cyan-400">Sección de Horarios</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Horario de Disciplina
                    </h4>
                    <p className="text-slate-300 text-sm mb-3">
                      Para las llamadas del Club de las 5 AM
                    </p>
                    <div className="bg-slate-900 p-3 rounded-lg text-sm">
                      <p className="text-amber-300 font-mono">Rango permitido: 05:00 - 08:00 hrs</p>
                      <p className="text-slate-400 mt-2">Configura qué días y a qué hora estarás disponible para llamadas de disciplina matutinas.</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Horario de Mentoría
                    </h4>
                    <p className="text-slate-300 text-sm mb-3">
                      Para sesiones de mentoría individual
                    </p>
                    <div className="bg-slate-900 p-3 rounded-lg text-sm">
                      <p className="text-purple-300 font-mono">Horario flexible según tu agenda</p>
                      <p className="text-slate-400 mt-2">Define los días y horarios en que estarás disponible para sesiones de mentoría personalizadas.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Importante</p>
                      <p>Debes configurar al menos un horario de disciplina para que los alumnos puedan seleccionarte como mentor.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 5: Sistema de Comisiones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(5)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                  5
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Sistema de Comisiones</h3>
                  <p className="text-sm text-slate-400">Cómo se calculan tus ganancias por mentoría</p>
                </div>
              </div>
              {expandedStep === 5 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 5 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-lg p-6">
                  <h4 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5" /> Comisión por Nivel de Mentor
                  </h4>
                  <p className="text-slate-300 text-sm mb-4">
                    Las mentorías se cobran a un <strong className="text-white">porcentaje que depende de tu nivel</strong> como mentor:
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
                      <div className="text-2xl mb-2">🥉</div>
                      <p className="font-bold text-white">Junior</p>
                      <p className="text-emerald-400 text-xl font-bold">70%</p>
                      <p className="text-slate-400 text-xs">Tú ganas</p>
                      <p className="text-slate-500 text-xs mt-1">30% plataforma</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-indigo-500/30 text-center">
                      <div className="text-2xl mb-2">🥈</div>
                      <p className="font-bold text-white">Senior</p>
                      <p className="text-emerald-400 text-xl font-bold">85%</p>
                      <p className="text-slate-400 text-xs">Tú ganas</p>
                      <p className="text-slate-500 text-xs mt-1">15% plataforma</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-amber-500/30 text-center">
                      <div className="text-2xl mb-2">🥇</div>
                      <p className="font-bold text-white">Master</p>
                      <p className="text-emerald-400 text-xl font-bold">90%</p>
                      <p className="text-slate-400 text-xs">Tú ganas</p>
                      <p className="text-slate-500 text-xs mt-1">10% plataforma</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> ¿Cómo funciona?
                  </h4>
                  <div className="space-y-3 text-sm text-slate-300">
                    <p><strong className="text-white">1. El alumno paga:</strong> El monto total que definiste en tu precio por sesión.</p>
                    <p><strong className="text-white">2. El pago se retiene:</strong> El dinero queda en custodia hasta que la sesión se complete.</p>
                    <p><strong className="text-white">3. Se libera tu ganancia:</strong> Una vez completada la mentoría, recibes tu porcentaje automáticamente.</p>
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="text-sm text-amber-200">
                      <p className="font-semibold mb-1">Sistema Level Up</p>
                      <p>Tu nivel de mentor puede aumentar conforme completes más sesiones y recibas mejores calificaciones, mejorando tu porcentaje de comisión.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 6: Paquetes de Llamadas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(6)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  6
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Paquetes de Llamadas</h3>
                  <p className="text-sm text-slate-400">Cómo se pagan las llamadas de mentoría</p>
                </div>
              </div>
              {expandedStep === 6 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedStep === 6 && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 border border-pink-500/30 rounded-lg p-6">
                  <h4 className="font-bold text-pink-400 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5" /> ¿Cómo funcionan los paquetes?
                  </h4>
                  <p className="text-slate-300 text-sm mb-4">
                    Los alumnos compran <strong className="text-white">paquetes de llamadas</strong> que les dan derecho a un número determinado de sesiones de mentoría:
                  </p>
                  <div className="bg-slate-900 p-4 rounded-lg mb-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white font-medium">Plan Bimestral</p>
                        <p className="text-slate-400">18 llamadas de mentoría</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Plan Anual</p>
                        <p className="text-slate-400">108 llamadas de mentoría</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-bold text-cyan-400 mb-3">Pago por Llamada</h4>
                  <p className="text-slate-300 text-sm">
                    Los <strong className="text-white">paquetes de llamadas se pagan por llamada</strong>. Cada vez que un alumno usa una de sus llamadas contigo, se registra la transacción y se calcula tu comisión según tu nivel de mentor.
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Beneficio</p>
                      <p>Mientras más alumnos te seleccionen y más llamadas completes, mayores serán tus ingresos mensuales.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Final */}
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-6 mt-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" /> Checklist del Mentor
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Solicitar ser mentor en Configuración
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Completar el wizard de 3 pasos
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Pagar membresía anual ($999 MXN)
                </p>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Configurar perfil completo de mentor
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Definir horarios de disciplina (5-8 AM)
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">□</span> Definir horarios de mentoría
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* SECCIÓN: GUÍA PARA ALUMNOS */}
      {/* ============================================= */}
      {activeSection === 'alumno' && (
        <div className="animate-in fade-in duration-300 space-y-6">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border border-emerald-500/30 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Guía para Alumnos</h2>
                <p className="text-emerald-300">Tu camino de transformación personal paso a paso</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Como alumno, tienes acceso a poderosas herramientas para tu transformación. 
              Explora cada sección para dominar el sistema completo.
            </p>
          </div>

          {/* MENÚ INTERIOR DE ALUMNO */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => { setAlumnoSubSection('carta'); setExpandedStep(null); }}
              className={`p-4 rounded-xl border transition-all ${
                alumnoSubSection === 'carta'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <FileText className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium block">Carta Objetivos</span>
            </button>
            
            <button
              onClick={() => { setAlumnoSubSection('futuro'); setExpandedStep(null); }}
              className={`p-4 rounded-xl border transition-all ${
                alumnoSubSection === 'futuro'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Rocket className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium block">Futuro Imposible</span>
            </button>
            
            <button
              onClick={() => { setAlumnoSubSection('hoy'); setExpandedStep(null); }}
              className={`p-4 rounded-xl border transition-all ${
                alumnoSubSection === 'hoy'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Zap className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium block">Zona /Hoy</span>
            </button>
            
            <button
              onClick={() => { setAlumnoSubSection('misiones'); setExpandedStep(null); }}
              className={`p-4 rounded-xl border transition-all ${
                alumnoSubSection === 'misiones'
                  ? 'bg-pink-600/20 border-pink-500 text-pink-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Star className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium block">Misiones Extra</span>
            </button>
            
            <button
              onClick={() => { setAlumnoSubSection('llamadas'); setExpandedStep(null); }}
              className={`p-4 rounded-xl border transition-all ${
                alumnoSubSection === 'llamadas'
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Phone className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium block">Llamadas Disciplina</span>
            </button>
          </div>

          {/* ================================================ */}
          {/* SUB-SECCIÓN: CARTA OBJETIVOS */}
          {/* ================================================ */}
          {alumnoSubSection === 'carta' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" /> Carta de F.R.U.T.O.S.
                </h3>
                <p className="text-slate-300 text-sm">
                  Tu carta es el mapa de tu transformación. Define quién quieres SER y qué vas a HACER para lograrlo.
                </p>
              </div>

              {/* Paso 1: Acceder */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(1)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Acceder a Mi Carta</h4>
                      <p className="text-xs text-slate-400">Dashboard → Mi Carta</p>
                    </div>
                  </div>
                  {expandedStep === 1 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 1 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-300 text-sm mb-3">En el menú lateral encontrarás <strong className="text-white">"Mi Carta"</strong>. Al entrar verás dos opciones:</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                          <p className="font-bold text-purple-400 flex items-center gap-2 text-sm"><Bot className="w-4 h-4" /> Con Mentor IA</p>
                          <p className="text-slate-400 text-xs mt-1">La IA te guía y sugiere objetivos personalizados</p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                          <p className="font-bold text-cyan-400 flex items-center gap-2 text-sm"><PenLine className="w-4 h-4" /> Llenado Manual</p>
                          <p className="text-slate-400 text-xs mt-1">Completas tú mismo cada sección del wizard</p>
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/carta" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                      <FileText className="w-4 h-4" /> Ir a Mi Carta
                    </Link>
                  </div>
                )}
              </div>

              {/* Paso 2: Declaración del SER */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(2)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Declaración del SER 🧘</h4>
                      <p className="text-xs text-slate-400">Define quién quieres ser en cada área</p>
                    </div>
                  </div>
                  {expandedStep === 2 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 2 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Escribe <strong className="text-white">"YO SOY..."</strong> para cada una de las 8 áreas de tu vida:</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">💰</span><p className="text-white mt-1">Finanzas</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">❤️</span><p className="text-white mt-1">Relaciones</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">🎨</span><p className="text-white mt-1">Talentos</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">💪</span><p className="text-white mt-1">Salud</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">🧘</span><p className="text-white mt-1">Paz Mental</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">🎮</span><p className="text-white mt-1">Ocio</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">🌟</span><p className="text-white mt-1">Serv. Trans.</p></div>
                      <div className="bg-slate-800 p-2 rounded-lg"><span className="text-xl">🤝</span><p className="text-white mt-1">Serv. Com.</p></div>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-200 text-xs italic">"Yo soy abundancia en crecimiento constante que atrae oportunidades financieras."</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 3: Objetivos */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(3)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Objetivos y Visualización ✨</h4>
                      <p className="text-xs text-slate-400">Metas específicas y medibles por área</p>
                    </div>
                  </div>
                  {expandedStep === 3 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 3 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Define <strong className="text-white">metas específicas y medibles</strong> para cada área. Puedes agregar varios objetivos por área.</p>
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-purple-300 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Usa el botón <strong>"Quantum Coach"</strong> para recibir sugerencias de IA</p>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-200 text-xs"><strong>Ejemplo:</strong> "Ahorrar $10,000 pesos mensuales durante los próximos 6 meses."</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 4: Acciones HACER */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(4)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Acciones - HACER 🎯</h4>
                      <p className="text-xs text-slate-400">Las tareas concretas que ejecutarás</p>
                    </div>
                  </div>
                  {expandedStep === 4 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 4 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Para cada objetivo, define las <strong className="text-white">acciones específicas</strong> que realizarás. Estas serán tus tareas diarias.</p>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-200 text-xs"><strong>Ejemplo:</strong> "Revisar mis gastos diarios en una app de finanzas por 10 minutos cada noche."</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 5: Frecuencia */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(5)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">5</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Configurar Frecuencia 🔥</h4>
                      <p className="text-xs text-slate-400">Cuándo y cuántas veces harás cada acción</p>
                    </div>
                  </div>
                  {expandedStep === 5 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 5 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> <strong className="text-white">Cantidad:</strong> Cuántas veces (ej: 3 veces)</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> <strong className="text-white">Frecuencia:</strong> Diaria, semanal o mensual</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> <strong className="text-white">Días:</strong> Qué días de la semana (si aplica)</p>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-amber-200 text-xs"><strong>Tip:</strong> Sé realista. Es mejor empezar con menos y aumentar gradualmente.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 6: Avatar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(6)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">6</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Avatar Cuántico ⚡</h4>
                      <p className="text-xs text-slate-400">Tu identidad visual generada por IA</p>
                    </div>
                  </div>
                  {expandedStep === 6 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 6 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Tu Avatar Cuántico es tu <strong className="text-white">identidad visual</strong> generada por IA basada en tus declaraciones del SER.</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 text-xs">1</span> Selecciona tu género (M/F/Neutro)</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 text-xs">2</span> La IA analiza tu carta</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 text-xs">3</span> Elige tu arquetipo (Director, Arquitecto, etc.)</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 text-xs">4</span> Opción de selfie para personalizar más</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 7: Enviar a Revisión */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(7)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">7</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Enviar a Revisión</h4>
                      <p className="text-xs text-slate-400">Tu mentor aprueba tu carta</p>
                    </div>
                  </div>
                  {expandedStep === 7 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 7 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                      <p className="text-green-200 text-sm mb-2"><strong>Estados de la Carta:</strong></p>
                      <ul className="space-y-1 text-xs">
                        <li><span className="text-yellow-400">● BORRADOR:</span> En proceso de creación</li>
                        <li><span className="text-blue-400">● EN REVISIÓN:</span> Enviada, esperando aprobación</li>
                        <li><span className="text-green-400">● APROBADA:</span> ¡Lista para ejecutar!</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* SUB-SECCIÓN: MI FUTURO IMPOSIBLE */}
          {/* ================================================ */}
          {alumnoSubSection === 'futuro' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2 mb-2">
                  <Rocket className="w-5 h-5" /> Mi Futuro Imposible
                </h3>
                <p className="text-slate-300 text-sm">
                  El Futuro Imposible es tu meta más ambiciosa. Es el resultado que, si lo lograras, haría que todo valiera la pena.
                </p>
              </div>

              {/* ¿Qué es? */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(10)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Qué es el Futuro Imposible?</h4>
                      <p className="text-xs text-slate-400">La meta que cambiará tu vida</p>
                    </div>
                  </div>
                  {expandedStep === 10 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 10 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">El Futuro Imposible responde a la pregunta:</p>
                    <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-purple-200 text-lg italic text-center">"¿Qué resultado, si lo lograras, haría que todo valiera la pena?"</p>
                    </div>
                    <p className="text-slate-400 text-sm">Es una visión tan grande que parece imposible desde tu perspectiva actual, pero que te inspira profundamente.</p>
                  </div>
                )}
              </div>

              {/* Cómo acceder */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(11)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Dónde encontrarlo?</h4>
                      <p className="text-xs text-slate-400">Acceso desde el menú lateral</p>
                    </div>
                  </div>
                  {expandedStep === 11 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 11 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-slate-300 text-sm bg-slate-800 p-3 rounded-lg font-mono">
                      <span className="text-emerald-400">Dashboard</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="text-purple-400">Mi Futuro Imposible</span>
                    </div>
                    <p className="text-slate-400 text-sm">En el menú lateral encontrarás la sección dedicada a tu Futuro Imposible.</p>
                  </div>
                )}
              </div>

              {/* Expo de Futuros */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(12)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Expo de Futuros Imposibles 🚀</h4>
                      <p className="text-xs text-slate-400">Presenta tu visión al mundo</p>
                    </div>
                  </div>
                  {expandedStep === 12 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 12 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">La <strong className="text-amber-400">Expo de Futuros Imposibles</strong> es un evento donde:</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> Presentas tu Futuro Imposible públicamente</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> Invitas a personas a conocer tu proyecto</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> Recibes votos y retroalimentación</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> Ganas visibilidad para tu emprendimiento</p>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-amber-200 text-xs"><strong>Tip:</strong> Puedes compartir tu invitación por WhatsApp desde "Mi Negocio".</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* SUB-SECCIÓN: ZONA DE EJECUCIÓN /HOY */}
          {/* ================================================ */}
          {alumnoSubSection === 'hoy' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5" /> Zona de Ejecución /Hoy
                </h3>
                <p className="text-slate-300 text-sm">
                  Tu centro de operaciones diario. Aquí ves todas las tareas del día, subes evidencias y sigues tu progreso.
                </p>
              </div>

              {/* Qué encontrarás */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(20)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Qué encontrarás en /Hoy?</h4>
                      <p className="text-xs text-slate-400">Tu vista diaria de tareas</p>
                    </div>
                  </div>
                  {expandedStep === 20 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 20 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <p className="font-bold text-amber-400 text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Tareas de tu Carta</p>
                        <p className="text-slate-400 text-xs mt-1">Las acciones que definiste para hoy</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <p className="font-bold text-pink-400 text-sm flex items-center gap-2"><Star className="w-4 h-4" /> Misiones Especiales</p>
                        <p className="text-slate-400 text-xs mt-1">Tareas extraordinarias y eventos</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <p className="font-bold text-cyan-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Próximas Llamadas</p>
                        <p className="text-slate-400 text-xs mt-1">Llamadas de disciplina programadas</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <p className="font-bold text-purple-400 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Calendario</p>
                        <p className="text-slate-400 text-xs mt-1">Vista por día con navegación</p>
                      </div>
                    </div>
                    <Link href="/dashboard/hoy" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                      <Zap className="w-4 h-4" /> Ir a /Hoy
                    </Link>
                  </div>
                )}
              </div>

              {/* Cómo subir evidencias */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(21)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Subir Evidencias 📷</h4>
                      <p className="text-xs text-slate-400">Demuestra que completaste tus tareas</p>
                    </div>
                  </div>
                  {expandedStep === 21 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 21 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Cada tarea requiere una <strong className="text-white">evidencia</strong> para marcarse como completada:</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">1</span> Haz clic en la tarea pendiente</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">2</span> Sube una foto o video como prueba</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">3</span> Tu mentor revisará y aprobará</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">4</span> ¡Ganas puntos al ser aprobada!</p>
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
                      <p className="text-emerald-200 text-xs"><strong>Estados de Evidencia:</strong> PENDIENTE → EN REVISIÓN → APROBADA / RECHAZADA</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tareas retrasadas */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(22)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Tareas Retrasadas ⚠️</h4>
                      <p className="text-xs text-slate-400">Qué pasa si no completas a tiempo</p>
                    </div>
                  </div>
                  {expandedStep === 22 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 22 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Las tareas no completadas aparecen como <strong className="text-red-400">RETRASADAS</strong>:</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-400" /> Aparecen destacadas en rojo/amarillo</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-400" /> Puedes completarlas aún, pero afectan tu racha</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-400" /> Tu mentor puede ver tu historial de cumplimiento</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-200 text-xs"><strong>Tip:</strong> La consistencia es más importante que la perfección. ¡No te rindas!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Estadísticas */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(23)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Tu Progreso y Estadísticas 📊</h4>
                      <p className="text-xs text-slate-400">Métricas de tu transformación</p>
                    </div>
                  </div>
                  {expandedStep === 23 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 23 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">En /Hoy puedes ver tus estadísticas del día:</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-800 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-400">✓</p>
                        <p className="text-white mt-1">Completadas</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-400">⏳</p>
                        <p className="text-white mt-1">Pendientes</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-400">%</p>
                        <p className="text-white mt-1">Tasa de Éxito</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* SUB-SECCIÓN: MISIONES EXTRAORDINARIAS */}
          {/* ================================================ */}
          {alumnoSubSection === 'misiones' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-pink-900/20 border border-pink-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5" /> Misiones Extraordinarias
                </h3>
                <p className="text-slate-300 text-sm">
                  Tareas especiales fuera de tu carta normal que te retan a ir más allá y ganar recompensas especiales.
                </p>
              </div>

              {/* Qué son */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(30)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Qué son las Misiones?</h4>
                      <p className="text-xs text-slate-400">Tareas especiales con recompensas</p>
                    </div>
                  </div>
                  {expandedStep === 30 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 30 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Las misiones extraordinarias son <strong className="text-white">retos especiales</strong> que:</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><Star className="w-4 h-4 text-pink-400" /> Son creadas por coordinadores y trainers</p>
                      <p className="flex items-center gap-2"><Star className="w-4 h-4 text-pink-400" /> Tienen puntos extra (RARE, EPIC, LEGENDARY)</p>
                      <p className="flex items-center gap-2"><Star className="w-4 h-4 text-pink-400" /> Suelen estar relacionadas a eventos presenciales</p>
                      <p className="flex items-center gap-2"><Star className="w-4 h-4 text-pink-400" /> Pueden desbloquear artefactos especiales</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipos de Misiones */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(31)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Tipos de Misiones</h4>
                      <p className="text-xs text-slate-400">Rarezas y recompensas</p>
                    </div>
                  </div>
                  {expandedStep === 31 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 31 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid gap-2">
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-blue-500">
                        <p className="font-bold text-blue-400 text-sm">RARE (Rara)</p>
                        <p className="text-slate-400 text-xs">Misiones con mayor dificultad - +50 puntos</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-purple-500">
                        <p className="font-bold text-purple-400 text-sm">EPIC (Épica)</p>
                        <p className="text-slate-400 text-xs">Retos significativos - +100 puntos</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-yellow-500">
                        <p className="font-bold text-yellow-400 text-sm">LEGENDARY (Legendaria)</p>
                        <p className="text-slate-400 text-xs">Misiones únicas de eventos - +200 puntos</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dónde verlas */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(32)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Dónde ver mis misiones?</h4>
                      <p className="text-xs text-slate-400">Ubicación en la plataforma</p>
                    </div>
                  </div>
                  {expandedStep === 32 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 32 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Las misiones aparecen en:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-800 p-3 rounded-lg">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-white">/Hoy</span>
                        <span className="text-slate-400">→ Sección "Misiones Especiales"</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-slate-800 p-3 rounded-lg">
                        <Star className="w-4 h-4 text-pink-400" />
                        <span className="text-white">Notificaciones</span>
                        <span className="text-slate-400">→ Cuando te asignan una nueva</span>
                      </div>
                    </div>
                    <Link href="/dashboard/hoy" className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                      <Star className="w-4 h-4" /> Ver Misiones en /Hoy
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* SUB-SECCIÓN: LLAMADAS DE DISCIPLINA */}
          {/* ================================================ */}
          {alumnoSubSection === 'llamadas' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5" /> Llamadas de Disciplina
                </h3>
                <p className="text-slate-300 text-sm">
                  Sesiones de seguimiento con tu mentor o líder para revisar tu progreso y mantenerte enfocado.
                </p>
              </div>

              {/* Qué son */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(40)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">¿Qué son las Llamadas?</h4>
                      <p className="text-xs text-slate-400">Sesiones de seguimiento personal</p>
                    </div>
                  </div>
                  {expandedStep === 40 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 40 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Las llamadas de disciplina son <strong className="text-white">sesiones de 15-30 minutos</strong> donde:</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> Revisas tu progreso semanal con tu mentor</p>
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> Identificas obstáculos y soluciones</p>
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> Ajustas tus acciones si es necesario</p>
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> Recibes motivación y accountability</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipos de mentores */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(41)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Tipos de Mentores</h4>
                      <p className="text-xs text-slate-400">Profesionales vs Líderes internos</p>
                    </div>
                  </div>
                  {expandedStep === 41 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 41 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-slate-800 p-4 rounded-lg border border-purple-500/30">
                        <p className="font-bold text-purple-400 text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Mentor Profesional</p>
                        <p className="text-slate-400 text-xs mt-2">Mentores certificados del marketplace. Precio: $999 MXN por sesión.</p>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-lg border border-emerald-500/30">
                        <p className="font-bold text-emerald-400 text-sm flex items-center gap-2"><User className="w-4 h-4" /> Líder Interno</p>
                        <p className="text-slate-400 text-xs mt-2">Mentores de tu organización. Incluido en tu programa de VISIÓN.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cómo agendar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(42)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Agendar una Llamada</h4>
                      <p className="text-xs text-slate-400">Proceso paso a paso</p>
                    </div>
                  </div>
                  {expandedStep === 42 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 42 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">1</span> Ve a <strong className="text-white">Mentores</strong> en el menú</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">2</span> Selecciona un mentor disponible</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">3</span> Elige fecha y hora en su calendario</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">4</span> Confirma y paga (si es profesional)</p>
                      <p className="flex items-center gap-2"><span className="w-5 h-5 bg-emerald-600/30 rounded-full flex items-center justify-center text-emerald-400 text-xs">5</span> Recibe link de videollamada por email</p>
                    </div>
                    <Link href="/dashboard/mentores" className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                      <Phone className="w-4 h-4" /> Ver Mentores
                    </Link>
                  </div>
                )}
              </div>

              {/* Horarios disponibles */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(43)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Horarios de Disciplina ⏰</h4>
                      <p className="text-xs text-slate-400">Ventana de 5:00 AM a 8:00 AM</p>
                    </div>
                  </div>
                  {expandedStep === 43 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 43 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-amber-200 text-sm mb-2"><strong>Las llamadas de disciplina están diseñadas para la mañana:</strong></p>
                      <p className="text-slate-300 text-sm">Horario disponible: <strong className="text-white">5:00 AM - 8:00 AM</strong></p>
                      <p className="text-slate-400 text-xs mt-2">Este horario promueve la disciplina matutina y el compromiso con tu transformación.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Ver próximas llamadas */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleStep(44)} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">5</div>
                    <div className="text-left">
                      <h4 className="font-bold text-white">Ver Próximas Llamadas</h4>
                      <p className="text-xs text-slate-400">Dónde encontrar tus citas</p>
                    </div>
                  </div>
                  {expandedStep === 44 ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedStep === 44 && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 text-sm">Tus llamadas programadas aparecen en:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-800 p-3 rounded-lg">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-white">/Hoy</span>
                        <span className="text-slate-400">→ Sección "Próximas Llamadas"</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-slate-800 p-3 rounded-lg">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-white">Dashboard</span>
                        <span className="text-slate-400">→ Widget de llamadas</span>
                      </div>
                    </div>
                    <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-200 text-xs"><strong>Tip:</strong> Recibirás recordatorios por email antes de cada llamada.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================= */}
      {/* SECCIÓN: CLUB DE LAS 5 AM */}
      {/* ============================================= */}
      {activeSection === 'disciplina' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Club de las 5 AM</h2>
                <p className="text-amber-300">El poder de la disciplina matutina</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Próximamente más contenido...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
