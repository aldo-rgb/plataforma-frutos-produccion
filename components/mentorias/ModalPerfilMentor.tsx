'use client';

import { useState, useEffect } from 'react';
import { 
  Star, Users, Award, Calendar, Clock, 
  Mail, X, Sparkles, 
  CheckCircle2, Target
} from 'lucide-react';

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

interface ModalPerfilMentorProps {
  mentorId: number;
  isOpen: boolean;
  onClose: () => void;
  onAgendarSesion?: (mentor: PerfilMentor) => void;
}

export default function ModalPerfilMentor({ mentorId, isOpen, onClose, onAgendarSesion }: ModalPerfilMentorProps) {
  const [perfil, setPerfil] = useState<PerfilMentor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && mentorId) {
      cargarPerfil();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mentorId]);

  const cargarPerfil = async () => {
    setLoading(true);
    setError('');
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

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-2xl max-w-5xl w-full my-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">Perfil del Mentor</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Cargando perfil del mentor...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-red-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Error al cargar el perfil</h3>
              <p className="text-slate-400 mb-6">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {!loading && !error && perfil && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <img
                    src={perfil.usuario?.imagen || '/default-avatar.png'}
                    alt={perfil.usuario?.nombre || 'Mentor'}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-purple-500/30"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{perfil.usuario?.nombre}</h1>
                        {perfil.titulo && (
                          <p className="text-lg text-purple-400 font-medium mb-2">{perfil.titulo}</p>
                        )}
                        {perfil.tagline && (
                          <p className="text-slate-400 italic">"{perfil.tagline}"</p>
                        )}
                      </div>
                      {perfil.nivel && NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR] && (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR].bg} ${NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR].color} ${NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR].border}`}>
                          {NIVELES_MENTOR[perfil.nivel as keyof typeof NIVELES_MENTOR].label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Star size={20} className="fill-amber-400" />
                        <span className="font-bold">{perfil.calificacionPromedio?.toFixed(1) || '0.0'}</span>
                        <span className="text-slate-400 text-sm">({perfil.totalResenas || 0} reseñas)</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Users size={20} />
                        <span className="font-bold">{perfil.totalSesiones || 0}</span>
                        <span className="text-slate-400 text-sm">sesiones</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-400">
                        <Award size={20} />
                        <span className="font-bold">{perfil.experienciaAnios || 0}</span>
                        <span className="text-slate-400 text-sm">años de experiencia</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-lg font-bold">
                      <span className="text-purple-400">${perfil.precioBase?.toLocaleString('es-MX') || '0'}</span>
                      <span className="text-slate-500 text-sm">por sesión</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {(perfil.biografiaCompleta || perfil.biografia) && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="text-purple-400" size={20} />
                        Sobre {perfil.usuario?.nombre?.split(' ')[0] || 'el Mentor'}
                      </h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {perfil.biografiaCompleta || perfil.biografia}
                      </p>
                    </div>
                  )}

                  {perfil.especialidad && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Especialidad Principal</h3>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <Target className="text-purple-400" size={20} />
                        <span className="text-purple-300 font-semibold">{perfil.especialidad}</span>
                      </div>
                    </div>
                  )}

                  {perfil.especialidadesSecundarias && perfil.especialidadesSecundarias.length > 0 && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Otras Áreas de Expertise</h3>
                      <div className="flex flex-wrap gap-2">
                        {perfil.especialidadesSecundarias.map((esp, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm"
                          >
                            {esp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perfil.logros && perfil.logros.length > 0 && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Award className="text-yellow-400" size={20} />
                        Logros y Certificaciones
                      </h3>
                      <ul className="space-y-3">
                        {perfil.logros.map((logro, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={20} />
                            <span className="text-slate-300">{logro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perfil.expertiseTags && perfil.expertiseTags.length > 0 && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Habilidades Clave</h3>
                      <div className="flex flex-wrap gap-2">
                        {perfil.expertiseTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Disponibilidad</h3>
                    
                    <div className="space-y-4">
                      {(perfil.horarioInicio && perfil.horarioFin) && (
                        <div className="flex items-center gap-3 text-slate-300">
                          <Clock size={18} className="text-slate-400" />
                          <span className="text-sm">
                            {perfil.horarioInicio} - {perfil.horarioFin}
                          </span>
                        </div>
                      )}

                      {perfil.diasDisponibles && perfil.diasDisponibles.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Días disponibles</p>
                          <div className="flex flex-wrap gap-2">
                            {perfil.diasDisponibles.map((dia) => (
                              <span
                                key={dia}
                                className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium"
                              >
                                {DIAS_SEMANA[dia]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {perfil.precioBase && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Precios</h3>
                      
                      <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Sesión Individual</p>
                        <p className="text-2xl font-bold text-purple-400">
                          ${perfil.precioBase.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Contacto</h3>
                    
                    <div className="space-y-3">
                      {perfil.usuario?.email && (
                        <div className="flex items-center gap-3 text-slate-300">
                          <Mail size={18} className="text-slate-400" />
                          <a href={`mailto:${perfil.usuario.email}`} className="hover:text-purple-400 transition-colors text-sm">
                            {perfil.usuario.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {onAgendarSesion && (
                    <button
                      onClick={() => {
                        onAgendarSesion(perfil);
                        onClose();
                      }}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                      <Calendar size={20} />
                      Agendar Sesión
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
