'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { 
  Play, ChevronDown, Sparkles, Target, Users, Trophy, 
  Brain, Zap, Shield, Star, ArrowRight, Mail, Lock, 
  Eye, EyeOff, LogIn, AlertCircle, Calendar, MapPin,
  Clock, ChevronLeft, ChevronRight, Quote, ExternalLink
} from 'lucide-react';

interface OrgData {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  loginBackgroundUrl: string | null;
  loginWelcomeMessage: string | null;
  showPoweredBy: boolean;
  stats: {
    comunidadQuantumMatter: number;
    graduadosMundo: string;
    habitantesMundo: string;
    añosExperiencia: number;
  };
}

interface TrainingLevel {
  level: string;
  name: string;
  startDate: string;
  endDate: string | null;
}

interface TrainingOrganization {
  id: number;
  name: string;
  slug: string;
}

interface Training {
  id: number;
  nombre: string;
  descripcion: string | null;
  levels: TrainingLevel[];
  spotsAvailable: number | null;
  participantsCount: number;
  organization?: TrainingOrganization;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  videoUrl: string | null;
  quote: string;
  avatarUrl: string | null;
}

// Particle Animation Component
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${particle.alpha})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 * (1 - distance / 150)})`;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

// Hero Section
function HeroSection({ organization, scrollToLogin }: { organization: OrgData; scrollToLogin: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Video Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/70 to-slate-950/90 z-10" />
      
      {/* Particle Animation */}
      <ParticleField />

      {/* Animated Background Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        {/* Logo */}
        {organization.logoUrl && (
          <div className="mb-8 animate-fade-in">
            <img 
              src={organization.logoUrl} 
              alt={organization.name}
              className="h-20 w-auto mx-auto object-contain filter drop-shadow-2xl"
            />
          </div>
        )}

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-6 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-300">TRANSFORMACION CUANTICA</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight">
          <span className="block bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
            NO ES UN CURSO.
          </span>
          <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            ES UN SALTO CUÁNTICO.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          Transforma tu vida, tus relaciones y tu negocio en <span className="text-cyan-400 font-semibold">10 semanas de entrenamiento intensivo</span> con metodología probada por más de 25 años.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={scrollToLogin}
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-lg rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/30"
          >
            <span className="relative z-10 flex items-center gap-2">
              COMENZAR MI TRANSFORMACIÓN
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button className="px-8 py-4 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:bg-slate-800/50 hover:border-cyan-500/50 transition-all flex items-center gap-2">
            <Play className="w-5 h-5" />
            Ver Historias de Éxito
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              {organization.stats.comunidadQuantumMatter.toLocaleString()}+
            </div>
            <div className="text-slate-400 text-sm mt-1">Comunidad Quantum Matter</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent">
              {organization.stats.graduadosMundo}
            </div>
            <div className="text-slate-400 text-sm mt-1">Graduados en el Mundo</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {organization.stats.habitantesMundo}
            </div>
            <div className="text-slate-400 text-sm mt-1">Habitantes en el Mundo</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {organization.stats.añosExperiencia}+
            </div>
            <div className="text-slate-400 text-sm mt-1">Años de Experiencia</div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-cyan-400/60" />
        </div>
      </div>
    </section>
  );
}

// Origin Section (El Origen)
function OriginSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-100 to-white overflow-hidden">
      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 border border-violet-200 mb-6">
              <Shield className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">EL ORIGEN</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              25 Años Transformando
              <span className="block text-violet-600">Vidas y Negocios</span>
            </h2>

            <div className="space-y-6 text-lg text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Nuestro programa</span> nació de una premisa revolucionaria: 
                el éxito verdadero no se logra solo con conocimiento técnico, sino con una 
                <span className="text-violet-600 font-semibold"> transformación profunda del ser</span>.
              </p>
              
              <p>
                Combinando neurociencia, programación neurolingüística, y principios de liderazgo 
                empresarial de élite, hemos desarrollado un sistema que ha graduado a miles de 
                profesionales en México, Estados Unidos y Latinoamérica.
              </p>

              <p>
                No enseñamos teoría. <span className="font-bold text-slate-800">Entrenamos seres</span> que 
                conquistan sus miedos, rompen sus límites y construyen legados que trascienden generaciones.
              </p>
            </div>

            {/* Authority indicators */}
            <div className="mt-10 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">Certificación Internacional</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Users className="w-5 h-5 text-cyan-500" />
                <span className="text-sm font-medium text-slate-700">+50 Trainers Certificados</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Target className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-medium text-slate-700">Metodología Comprobada</span>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-square bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 p-8 flex items-center justify-center">
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-20 h-20 border border-cyan-500/30 rounded-full" />
                <div className="absolute bottom-4 left-4 w-32 h-32 border border-violet-500/30 rounded-full" />
                
                {/* Central content */}
                <div className="text-center relative z-10">
                  <div className="text-8xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Entrenamiento</h3>
                  <p className="text-cyan-400 font-medium">De Alto Impacto</p>
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white px-6 py-3 rounded-xl shadow-xl">
              <div className="text-2xl font-black">25+</div>
              <div className="text-xs opacity-80">Años de Experiencia</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Hero Path Section (El Camino del Héroe)
function HeroPathSection() {
  const levels = [
    {
      level: 'BÁSICO',
      duration: '3 días intensivos',
      icon: '🌱',
      gradient: 'from-emerald-500 to-cyan-500',
      bgGradient: 'from-emerald-500/20 to-cyan-500/20',
      borderColor: 'border-emerald-500/30',
      description: 'Despierta tu potencial dormido. Rompe las cadenas mentales que te mantienen en tu zona de confort.',
      includes: [
        'Descubre metas y sueños ocultos con Quantum AI',
        'Acceso al Directorio de Talentos para networking',
        'Reprogramación de creencias limitantes',
        'Definición de visión personal asistida por IA'
      ]
    },
    {
      level: 'AVANZADO',
      duration: '3 días + 4 semanas',
      icon: '🔥',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/20 to-red-500/20',
      borderColor: 'border-orange-500/30',
      description: 'Domina tus emociones y relaciones. Conviértete en un líder que inspira con el ejemplo.',
      includes: [
        'IA que profundiza en tus metas y te guía',
        'Perfil destacado en Directorio de Talentos',
        'Sistema de metas en 8 áreas de vida',
        'Staff asignado con llamadas semanales',
        'Inteligencia emocional y liderazgo'
      ]
    },
    {
      level: 'PROGRAMA DE LIDERAZGO',
      duration: '3 fines de semana + 10 semanas',
      icon: '👑',
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/20 to-purple-600/20',
      borderColor: 'border-violet-500/30',
      description: 'La cumbre del entrenamiento. Certifícate como líder y construye tu legado que trasciende.',
      includes: [
        'Certificado de participación',
        'Proyecto de impacto comunitario (Legado)',
        'Networking exclusivo con líderes certificados',
        'Mentoría ejecutiva 1:1 personalizada',
        'Acceso al Directorio de Talentos',
        'Crea tu página web de negocio en el 1er fin de semana',
        'Mentor asignado con llamadas semanales',
      ]
    }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-6">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">EL CAMINO DEL HÉROE</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            3 Niveles de
            <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Transformación
            </span>
          </h2>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Cada nivel está diseñado para llevarte al siguiente escalón de tu evolución personal y profesional.
          </p>
        </div>

        {/* Level Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {levels.map((level, index) => (
            <div
              key={level.level}
              className={`group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border ${level.borderColor} p-8 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10`}
            >
              {/* Level number */}
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold">
                {index + 1}
              </div>

              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${level.bgGradient} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}>
                {level.icon}
              </div>

              {/* Content */}
              <h3 className={`text-xl font-bold bg-gradient-to-r ${level.gradient} bg-clip-text text-transparent mb-2`}>
                {level.level}
              </h3>
              
              <p className="text-sm text-slate-400 mb-4 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {level.duration}
              </p>

              <p className="text-slate-300 mb-6">{level.description}</p>

              {/* Includes */}
              <ul className="space-y-2">
                {level.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <Star className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Featured Benefit: Business Creation */}
        <div className="mt-16 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 rounded-3xl border border-cyan-500/30 p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">INCLUIDO EN LIDERATO BÁSICO</span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
                Crea tu Negocio Online
                <span className="block text-cyan-400">en el Primer Fin de Semana</span>
              </h3>
              
              <p className="text-lg text-slate-300 mb-6">
                No solo transformamos tu mentalidad. <span className="text-cyan-400 font-semibold">Te ayudamos a monetizar tus talentos</span> desde 
                el día uno. Con nuestra IA generarás tu idea de negocio y tendrás tu página web lista antes de terminar el entrenamiento básico.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span><strong className="text-white">Quantum AI</strong> te ayuda a descubrir tu idea de negocio ideal</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <span><strong className="text-white">Página web profesional</strong> generada automáticamente</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Directorio de Talentos</strong> para conseguir tus primeros clientes</span>
                </li>
              </ul>
            </div>
            
            <div className="relative">
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-slate-500 text-xs">tunegocio.quantummatter.com</span>
                </div>
                
                <div className="space-y-4">
                  <div className="h-32 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🚀</div>
                      <p className="text-white font-bold">Tu Logo Aquí</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                    <div className="h-4 bg-slate-700 rounded w-full" />
                    <div className="h-4 bg-slate-700 rounded w-2/3" />
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      Contáctame
                    </div>
                    <div className="flex-1 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-white text-sm">
                      Ver Servicios
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative badge */}
              <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-bold">
                ✨ Lista en unas horas
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Platform Features Section (Tu Ventaja Injusta)
function PlatformFeaturesSection() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">QUANTUM MATTER™</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Tu Sistema de
            <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Transformación Asistida
            </span>
          </h2>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Una plataforma revolucionaria que combina <span className="text-cyan-400 font-semibold">Inteligencia Artificial</span>, 
            <span className="text-violet-400 font-semibold"> mentoría personalizada</span> y un sistema de metas diseñado para 
            garantizar tu éxito.
          </p>
        </div>

        {/* Main Feature: Quantum AI */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl border border-cyan-500/30 p-8 md:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 mb-4">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400">QUANTUM AI™</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-white mb-6">
                  Inteligencia Artificial que
                  <span className="block text-cyan-400">Entiende tu Camino</span>
                </h3>
                
                <p className="text-lg text-slate-300 mb-6">
                  Nuestro sistema de IA analiza tu perfil, tus metas y tu progreso para crear un 
                  <span className="text-cyan-400 font-semibold"> plan de acción personalizado</span> que 
                  se adapta en tiempo real a tu evolución.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Recomendaciones Diarias</span>
                      <p className="text-slate-400 text-sm">Misiones y tareas personalizadas basadas en tu progreso</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Seguimiento Inteligente</span>
                      <p className="text-slate-400 text-sm">Alertas y recordatorios cuando te desvías de tus objetivos</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Análisis Predictivo</span>
                      <p className="text-slate-400 text-sm">Identifica patrones y sugiere correcciones antes de que tropieces</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-cyan-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold">Quantum AI</p>
                      <p className="text-cyan-400 text-xs">Tu asistente personal</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <p className="text-slate-400 text-sm mb-2">📊 Análisis de hoy</p>
                      <p className="text-white">"Completaste 3 de 5 misiones. Tu enfoque está mejorando un 23% esta semana."</p>
                    </div>
                    <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30">
                      <p className="text-cyan-400 text-sm mb-2">🎯 Recomendación</p>
                      <p className="text-white">"Agenda una llamada con tu mentor para revisar tu meta financiera. Tienes 2 slots disponibles mañana."</p>
                    </div>
                    <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/30">
                      <p className="text-violet-400 text-sm mb-2">⚡ Acción sugerida</p>
                      <p className="text-white">"Tu compañero de accountability no ha reportado en 3 días. ¿Quieres enviarle un mensaje?"</p>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 border border-cyan-500/30 rounded-full animate-pulse" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 border border-violet-500/30 rounded-full animate-pulse delay-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Mentor System Feature */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 backdrop-blur-sm rounded-3xl border border-violet-500/30 p-8 md:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-white font-bold">Sistema de Metas</h4>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold">EN PROGRESO</span>
                  </div>
                  
                  {/* Progress bars */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">💰 Meta Financiera</span>
                        <span className="text-violet-400 font-bold">75%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">❤️ Relaciones</span>
                        <span className="text-cyan-400 font-bold">60%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-3/5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">🏃 Salud</span>
                        <span className="text-emerald-400 font-bold">90%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-[90%] bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">🧠 Desarrollo Personal</span>
                        <span className="text-amber-400 font-bold">45%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-[45%] bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-lg">
                        👨‍🏫
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Próxima sesión con tu Mentor</p>
                        <p className="text-violet-400 text-xs">Mañana 10:00 AM • Carlos Mentor</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 mb-4">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-violet-400">SISTEMA DE METAS + MENTOR</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-white mb-6">
                  Nunca Estarás
                  <span className="block text-violet-400">Solo en el Camino</span>
                </h3>
                
                <p className="text-lg text-slate-300 mb-6">
                  Cada participante tiene asignado un <span className="text-violet-400 font-semibold">mentor certificado</span> que 
                  supervisa su progreso, agenda llamadas de seguimiento y te ayuda a superar los obstáculos que 
                  aparecen en tu transformación.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3 text-violet-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Llamadas Semanales</span>
                      <p className="text-slate-400 text-sm">Sesiones 1:1 para revisar avances y ajustar estrategias</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-3 h-3 text-violet-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Metas en 8 Áreas de Vida</span>
                      <p className="text-slate-400 text-sm">Finanzas, salud, relaciones, desarrollo y más</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="w-3 h-3 text-violet-400" />
                    </div>
                    <div>
                      <span className="text-white font-semibold">Accountability Real</span>
                      <p className="text-slate-400 text-sm">Tu mentor te mantiene comprometido y responsable</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Misiones Diarias</h3>
            <p className="text-slate-400 text-sm">Sistema gamificado que te mantiene enfocado con micro-acciones de alto impacto cada día.</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-violet-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Comunidad Privada</h3>
            <p className="text-slate-400 text-sm">Acceso a una red de profesionales que comparten tu visión y te impulsan a crecer.</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Certificaciones</h3>
            <p className="text-slate-400 text-sm">Obtén reconocimientos oficiales que validan tu nivel de transformación y expertise.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/5 to-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 mb-6">
            <Quote className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">TESTIMONIOS</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Historias de
            <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Transformación Real
            </span>
          </h2>
        </div>

        {/* Testimonial Card */}
        <div className="relative">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 md:p-12">
            <Quote className="w-12 h-12 text-cyan-500/30 mb-6" />
            
            <blockquote className="text-2xl md:text-3xl text-white font-medium mb-8 leading-relaxed">
              "{testimonials[currentIndex]?.quote}"
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                {testimonials[currentIndex]?.name.charAt(0)}
              </div>
              <div>
                <div className="text-white font-semibold">{testimonials[currentIndex]?.name}</div>
                <div className="text-slate-400">{testimonials[currentIndex]?.role}</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={prevTestimonial}
              className="p-3 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-cyan-400 w-6' 
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={nextTestimonial}
              className="p-3 rounded-full bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Upcoming Trainings Section
function UpcomingTrainingsSection({ trainings }: { trainings: Training[] }) {
  if (trainings.length === 0) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BASICO': return 'from-emerald-500 to-cyan-500';
      case 'AVANZADO': return 'from-orange-500 to-red-500';
      case 'PL': return 'from-violet-500 to-purple-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-white to-slate-100 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 border border-violet-200 mb-6">
            <Calendar className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-700">PRÓXIMOS ENTRENAMIENTOS</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Fechas
            <span className="block text-transparent bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text">
              Disponibles
            </span>
          </h2>
        </div>

        {/* Training Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trainings.map((training) => (
            <div 
              key={training.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                {/* Sede Badge */}
                {training.organization && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-xs font-medium text-cyan-700 mb-3">
                    <MapPin className="w-3 h-3" />
                    {training.organization.name}
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-slate-900 mb-2">{training.nombre}</h3>
                {training.descripcion && training.descripcion !== 'Visión completa generada con Vision Builder' && (
                  <p className="text-slate-600 text-sm mb-4">{training.descripcion}</p>
                )}

                {/* Levels */}
                <div className="space-y-3">
                  {training.levels.map((level) => (
                    <div 
                      key={level.level}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getLevelColor(level.level)}`} />
                        <span className="font-medium text-slate-800">{level.name}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {formatDate(level.startDate)}
                      </span>
                    </div>
                  ))}
                </div>


              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer Section with Login
function FooterSection({ 
  organization, 
  loginRef,
  slug 
}: { 
  organization: OrgData;
  loginRef: React.RefObject<HTMLDivElement | null>;
  slug: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setLoginError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // If already logged in, show dashboard button
  if (status === 'authenticated' && session?.user) {
    const firstName = session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || '';
    return (
      <footer className="relative py-24 bg-gradient-to-b from-slate-950 to-black overflow-hidden" ref={loginRef}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Hola, {firstName}
          </h2>
          <p className="text-slate-400 mb-8">Ya tienes una sesión activa.</p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform"
            >
              Ir al Dashboard
            </button>
            <button
              onClick={() => signOut({ callbackUrl: `/org/${slug}` })}
              className="text-slate-400 hover:text-white text-sm underline underline-offset-4 transition-colors"
            >
              No soy yo
            </button>
          </div>
        </div>
      </footer>
    );
  }

  const primaryColor = organization.brandColor || '#6366f1';

  return (
    <footer className="relative py-24 bg-gradient-to-b from-slate-950 to-black overflow-hidden" ref={loginRef}>
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: CTA */}
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              ¿Listo para tu
              <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Salto Cuántico?
              </span>
            </h2>
            
            <p className="text-xl text-slate-400 mb-8">
              Inicia sesión para continuar tu transformación o registra tu interés para nuestro próximo entrenamiento.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`/auth/signup?org=${organization.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-cyan-500 text-cyan-400 font-semibold rounded-xl hover:bg-cyan-500/10 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Quiero Registrarme
              </a>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8">
            <div className="text-center mb-6">
              {organization.logoUrl && (
                <img 
                  src={organization.logoUrl} 
                  alt={organization.name}
                  className="h-12 w-auto mx-auto mb-4 object-contain"
                />
              )}
              <h3 className="text-xl font-bold text-white">Iniciar Sesión</h3>
              <p className="text-slate-400 text-sm mt-1">Accede a tu cuenta de entrenamiento</p>
            </div>

            {/* Login Error */}
            {loginError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@correo.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password */}
            <div className="mt-6 text-center">
              <a
                href="/auth/forgot-password"
                className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Powered By */}
            {organization.showPoweredBy && (
              <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                <p className="text-slate-500 text-xs">
                  Powered by{' '}
                  <span className="text-cyan-400">APPSync</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {organization.name}. Todos los derechos reservados.
          </p>
          
          <div className="flex gap-6">
            <a href="/privacy" className="text-slate-400 text-sm hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="/terms" className="text-slate-400 text-sm hover:text-white transition-colors">
              Términos
            </a>
            <a href="/contact" className="text-slate-400 text-sm hover:text-white transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component
export default function OrgLandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const loginRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrgData | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchLandingData();
    }
  }, [slug]);

  const fetchLandingData = async () => {
    try {
      const res = await fetch(`/api/org/${slug}/landing`);
      const data = await res.json();

      if (data.success) {
        setOrganization(data.organization);
        setTrainings(data.upcomingTrainings);
        setTestimonials(data.testimonials);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching landing:', err);
      setError('Error al cargar la página');
    } finally {
      setLoading(false);
    }
  };

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Organización no encontrada</h1>
          <p className="text-slate-400 mb-6">
            {error || 'Esta organización no está disponible.'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium rounded-lg hover:scale-105 transition-transform"
          >
            Ir al Inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="overflow-x-hidden">
      <HeroSection organization={organization} scrollToLogin={scrollToLogin} />
      <OriginSection />
      <HeroPathSection />
      <PlatformFeaturesSection />
      {testimonials.length > 0 && <TestimonialsSection testimonials={testimonials} />}
      {trainings.length > 0 && <UpcomingTrainingsSection trainings={trainings} />}
      <FooterSection organization={organization} loginRef={loginRef} slug={slug} />
    </main>
  );
}
