'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Star, Users, Award, Calendar, Clock, MapPin, 
  Video, Mail, Phone, ArrowLeft, Sparkles, 
  CheckCircle2, TrendingUp, Target, Zap
} from 'lucide-react';
import Image from 'next/image';

interface PerfilMentor {
  id: number;
  usuarioId: number;
  nivel: string;
  especialidad: string;
  biografia: string;
  biografiaCompleta: string;
  biografiaCorta: string;
  titulo: string;
  tagline: string;
  experienciaAnios: number;
  calificacionPromedio: number;
  totalResenas: number;
  totalSesiones: number;
  disponible: boolean;
  logros: string[];
  especialidadesSecundarias: string[];
  expertiseTags: string[];
  precioBase: number;
  precioDisciplina: number;
  horarioInicio: string;
  horarioFin: string;
  diasDisponibles: number[];
  heroJourneyBio: string;
  promiseStatement: string;
  videoIntroUrl: string;
  usuario: {
    nombre: string;
    email: string;
    imagen: string;
  };
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const NIVELES_MENTOR = {
  JUNIOR: { label: 'Junior', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  SENIOR: { label: 'Senior', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  MASTER: { label: 'Master', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  ELITE: { label: 'Elite', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
};

export default function PerfilPublicoMentorPage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.id as string;

  const [perfil, setPerfil] = useState<PerfilMentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarPerfil();
  }, [mentorId]);

  const cargarPerfil = async () => {
    try {
      const res = await fetch(`/api/mentores/${mentorId}/perfil-publico`);
      const data = await res.json();

      if (res.ok && data.perfil) {
        setPerfil(data.perfil);
      } else {
        setError(data.error || 'No se pudo cargar el perfil del mentor');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      setError('Error de conexión al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando perfil del mentor...</p>
        </div>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Perfil no encontrado</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const nivelInfo = NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR] || NIVELES_MENTOR.JUNIOR;
  const diasDisponiblesTexto = perfil.diasDisponibles?.map(d => DIAS_SEMANA[d]).join(', ') || 'No especificado';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header con imagen de fondo */}
      <div className="relative bg-gradient-to-br from-purple-900/30 via-slate-900 to-pink-900/30 border-b border-white/10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Foto grande del mentor */}
            <div className="relative">
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-4 border-purple-500/30 shadow-2xl shadow-purple-500/20">
                {perfil.usuario.imagen ? (
                  <Image
                    src={perfil.usuario.imagen}
                    alt={perfil.usuario.nombre}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <span className="text-8xl text-white font-bold">
                      {perfil.usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Badge de nivel */}
              <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full ${nivelInfo.bg} ${nivelInfo.border} border-2 backdrop-blur-sm`}>
                <span className={`text-sm font-bold uppercase ${nivelInfo.color}`}>
                  {nivelInfo.label}
                </span>
              </div>
            </div>

            {/* Información principal */}
            <div className="flex-1 pt-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                    {perfil.usuario.nombre}
                  </h1>
                  {perfil.titulo && (
                    <p className="text-xl text-purple-400 font-semibold mb-2">
                      {perfil.titulo}
                    </p>
                  )}
                  {perfil.tagline && (
                    <p className="text-slate-300 text-lg italic">
                      "{perfil.tagline}"
                    </p>
                  )}
                </div>

                {perfil.disponible && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-bold">Disponible</span>
                  </div>
                )}
              </div>

              {/* Estadísticas principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="text-yellow-500" size={20} />
                    <span className="text-xs text-slate-400 uppercase">Rating</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {perfil.calificacionPromedio?.toFixed(1) || '5.0'}
                  </p>
                  <p className="text-xs text-slate-500">{perfil.totalResenas} reseñas</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="text-cyan-400" size={20} />
                    <span className="text-xs text-slate-400 uppercase">Sesiones</span>
                  </div>
                  <p className="text-2xl font-black text-white">{perfil.totalSesiones}</p>
                  <p className="text-xs text-slate-500">completadas</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-green-400" size={20} />
                    <span className="text-xs text-slate-400 uppercase">Experiencia</span>
                  </div>
                  <p className="text-2xl font-black text-white">{perfil.experienciaAnios}</p>
                  <p className="text-xs text-slate-500">años</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-purple-400" size={20} />
                    <span className="text-xs text-slate-400 uppercase">Logros</span>
                  </div>
                  <p className="text-2xl font-black text-white">{perfil.logros?.length || 0}</p>
                  <p className="text-xs text-slate-500">certificaciones</p>
                </div>
              </div>

              {/* Especialidades */}
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-semibold flex items-center gap-2">
                  <Target size={14} />
                  {perfil.especialidad}
                </span>
                {perfil.especialidadesSecundarias?.map((esp, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-800 border border-white/10 rounded-full text-slate-300 text-sm"
                  >
                    {esp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Información detallada */}
          <div className="lg:col-span-2 space-y-8">
            {/* Promesa del Mentor */}
            {perfil.promiseStatement && (
              <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="text-yellow-400" size={24} />
                  <h2 className="text-2xl font-bold text-white">Mi Compromiso Contigo</h2>
                </div>
                <p className="text-slate-200 text-lg leading-relaxed">
                  {perfil.promiseStatement}
                </p>
              </div>
            )}

            {/* Biografía completa */}
            {(perfil.biografiaCompleta || perfil.biografia) && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users size={24} className="text-purple-400" />
                  Sobre Mí
                </h2>
                <div className="prose prose-invert prose-slate max-w-none">
                  <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                    {perfil.biografiaCompleta || perfil.biografia}
                  </p>
                </div>
              </div>
            )}

            {/* Historia del Héroe */}
            {perfil.heroJourneyBio && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap size={24} className="text-cyan-400" />
                  Mi Historia de Transformación
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                  {perfil.heroJourneyBio}
                </p>
              </div>
            )}

            {/* Video de introducción */}
            {perfil.videoIntroUrl && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Video size={24} className="text-purple-400" />
                  Video de Presentación
                </h2>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-950">
                  <iframe
                    src={perfil.videoIntroUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Logros y certificaciones */}
            {perfil.logros && perfil.logros.length > 0 && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Award size={24} className="text-yellow-400" />
                  Logros y Certificaciones
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {perfil.logros.map((logro, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-slate-950 border border-white/5 rounded-xl hover:border-purple-500/30 transition-all"
                    >
                      <CheckCircle2 className="text-green-400 flex-shrink-0 mt-1" size={20} />
                      <span className="text-slate-300">{logro}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Áreas de expertise */}
            {perfil.expertiseTags && perfil.expertiseTags.length > 0 && (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Target size={24} className="text-cyan-400" />
                  Áreas de Expertise
                </h2>
                <div className="flex flex-wrap gap-3">
                  {perfil.expertiseTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-300 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Información de contacto y disponibilidad */}
          <div className="space-y-6">
            {/* Precios */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-white mb-4">Inversión</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-xl p-6">
                  <p className="text-xs text-slate-400 uppercase mb-2">Sesión Individual</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black text-white">${perfil.precioBase}</span>
                    <span className="text-slate-400">/sesión</span>
                  </div>
                  <p className="text-xs text-slate-500">Mentoría personalizada 1:1</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-xl p-6">
                  <p className="text-xs text-slate-400 uppercase mb-2">Programa Disciplina</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black text-white">${perfil.precioDisciplina}</span>
                    <span className="text-slate-400">/sesión</span>
                  </div>
                  <p className="text-xs text-slate-500">Sesiones semanales programadas</p>
                </div>
              </div>
            </div>

            {/* Disponibilidad */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-purple-400" />
                Disponibilidad
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-2">Días</p>
                  <p className="text-white font-medium">{diasDisponiblesTexto}</p>
                </div>

                {perfil.horarioInicio && perfil.horarioFin && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-2">Horario</p>
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Clock size={16} className="text-slate-400" />
                      {perfil.horarioInicio} - {perfil.horarioFin}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Contacto</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail size={18} className="text-slate-400" />
                  <a href={`mailto:${perfil.usuario.email}`} className="hover:text-purple-400 transition-colors">
                    {perfil.usuario.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
