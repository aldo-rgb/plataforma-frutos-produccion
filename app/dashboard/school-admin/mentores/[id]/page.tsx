'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, User, Award, Star, MapPin, 
  BookOpen, Target, Calendar, Briefcase, Mail, Phone,
  Shield, Clock, CheckCircle
} from 'lucide-react';

interface Mentor {
  id: number;
  usuarioId: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
    profileImage: string | null;
    jobTitle: string | null;
    isActive: boolean;
    accumulatedMissedCalls: number;
  };
  nivel: 'JUNIOR' | 'SENIOR' | 'MASTER';
  titulo: string | null;
  especialidad: string;
  especialidadesSecundarias: string[];
  biografiaCorta: string | null;
  biografiaCompleta: string | null;
  biografia: string | null;
  logros: string[];
  experienciaAnios: number;
  totalSesiones: number;
  calificacionPromedio: number;
  totalResenas: number;
  disponible: boolean;
  destacado: boolean;
  comisionMentor: number;
  comisionPlataforma: number;
  precioBase: number;
  precioDisciplina: number;
  sede: string | null;
  vision: string | null;
  createdAt: string;
}

export default function VerPerfilMentorSchoolAdminPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorId = params.id as string;
  const searchType = searchParams.get('type');

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMentor();
  }, [mentorId, searchType]);

  const cargarMentor = async () => {
    try {
      setLoading(true);
      // Pasar el parámetro type si viene en la URL
      const url = searchType 
        ? `/api/school-admin/mentores/${mentorId}?type=${searchType}`
        : `/api/school-admin/mentores/${mentorId}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setMentor(data.mentor);
      } else {
        setError(data.error || 'Error al cargar mentor');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'MASTER':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'SENIOR':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'JUNIOR':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfiabilidadColor = (strikes: number) => {
    if (strikes === 0) return 'bg-green-500';
    if (strikes <= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfiabilidadPercentage = (strikes: number) => {
    const maxStrikes = 5;
    return Math.max(0, ((maxStrikes - strikes) / maxStrikes) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Mentor no encontrado'}</div>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const biografia = mentor.biografiaCompleta || mentor.biografia || mentor.biografiaCorta || 'Sin biografía';
  const profileImage = mentor.usuario.profileImage || mentor.usuario.imagen || '/default-avatar.png';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Información del mentor */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de perfil */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img
                    src={profileImage}
                    alt={mentor.usuario.nombre}
                    className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
                  />
                  {mentor.usuario.isActive && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-800"></div>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">
                  {mentor.usuario.nombre}
                </h1>

                {mentor.usuario.jobTitle && (
                  <p className="text-purple-400 mb-4">{mentor.usuario.jobTitle}</p>
                )}

                <div className={`inline-block px-4 py-2 rounded-full text-white font-bold mb-4 ${getBadgeColor(mentor.nivel)}`}>
                  {mentor.nivel}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.floor(mentor.calificacionPromedio)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white font-bold">
                    {mentor.calificacionPromedio.toFixed(1)}
                  </span>
                  <span className="text-slate-400 text-sm">
                    ({mentor.totalResenas} reseñas)
                  </span>
                </div>

                {/* Confiabilidad */}
                <div className="w-full mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-slate-400">Confiabilidad</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {mentor.usuario.accumulatedMissedCalls}/5 faltas
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${getConfiabilidadColor(mentor.usuario.accumulatedMissedCalls)} transition-all duration-500`}
                      style={{ width: `${getConfiabilidadPercentage(mentor.usuario.accumulatedMissedCalls)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-400">
                      {mentor.totalSesiones}
                    </div>
                    <div className="text-xs text-slate-400">Sesiones</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-cyan-400">
                      {mentor.experienciaAnios}+
                    </div>
                    <div className="text-xs text-slate-400">Años Exp.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                Contacto
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span className="text-slate-300 break-all">{mentor.usuario.email}</span>
                </div>
                {mentor.sede && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-300">{mentor.sede}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Precios */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Tarifas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Precio Base</span>
                  <span className="text-white font-bold">${mentor.precioBase}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Disciplina (5am)</span>
                  <span className="text-green-400 font-bold">${mentor.precioDisciplina}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Detalles */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biografía */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-400" />
                Acerca de
              </h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {biografia}
              </p>
            </div>

            {/* Especialidades */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-purple-400" />
                Especialidades
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-purple-400 font-semibold">Principal:</span>
                  <div className="mt-2">
                    <span className="inline-block bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30">
                      {mentor.especialidad}
                    </span>
                  </div>
                </div>
                
                {mentor.especialidadesSecundarias && mentor.especialidadesSecundarias.length > 0 && (
                  <div>
                    <span className="text-cyan-400 font-semibold">Secundarias:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {mentor.especialidadesSecundarias.map((esp, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm border border-cyan-500/30"
                        >
                          {esp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Logros */}
            {mentor.logros && mentor.logros.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  Logros y Certificaciones
                </h2>
                <ul className="space-y-3">
                  {mentor.logros.map((logro, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{logro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-4">Información Adicional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-xs text-slate-400">Miembro desde</div>
                    <div className="font-semibold">
                      {new Date(mentor.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  </div>
                </div>
                
                {mentor.vision && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-xs text-slate-400">Visión</div>
                      <div className="font-semibold">{mentor.vision}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
