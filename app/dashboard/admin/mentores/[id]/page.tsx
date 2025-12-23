'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, User, Award, Star, DollarSign, MapPin, 
  BookOpen, Target, Calendar, Eye, EyeOff, CheckCircle, 
  XCircle, Edit, Briefcase, Mail, Phone
} from 'lucide-react';
import Link from 'next/link';

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
  sede: string | null;
  vision: string | null;
  createdAt: string;
}

export default function VerPerfilMentorPage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [mostrarModalActivar, setMostrarModalActivar] = useState(false);
  const [mostrarModalDestacado, setMostrarModalDestacado] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    cargarMentor();
  }, [mentorId]);

  const cargarMentor = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/mentores/${mentorId}`);
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

  const toggleDisponibilidad = async () => {
    if (!mentor) return;

    setMostrarModalActivar(false);

    try {
      setActualizando(true);
      setMensajeError('');
      setMensajeExito('');

      const res = await fetch(`/api/admin/mentores/${mentorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: !mentor.disponible }),
      });

      const data = await res.json();

      if (data.success) {
        await cargarMentor();
        setMensajeExito(`Mentor ${mentor.disponible ? 'desactivado' : 'activado'} correctamente`);
        setTimeout(() => setMensajeExito(''), 3000);
      } else {
        setMensajeError(data.error || 'Error al actualizar estado');
      }
    } catch (err) {
      setMensajeError('Error de conexión al actualizar');
      console.error(err);
    } finally {
      setActualizando(false);
    }
  };

  const toggleDestacado = async () => {
    if (!mentor) return;

    setMostrarModalDestacado(false);

    try {
      setActualizando(true);
      setMensajeError('');
      setMensajeExito('');

      const res = await fetch(`/api/admin/mentores/${mentorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destacado: !mentor.destacado }),
      });

      const data = await res.json();

      if (data.success) {
        await cargarMentor();
        setMensajeExito(`Mentor ${mentor.destacado ? 'removido de' : 'marcado como'} destacado`);
        setTimeout(() => setMensajeExito(''), 3000);
      } else {
        setMensajeError(data.error || 'Error al actualizar destacado');
      }
    } catch (err) {
      setMensajeError('Error de conexión al actualizar');
      console.error(err);
    } finally {
      setActualizando(false);
    }
  };

  const getBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'MASTER':
        return 'bg-purple-500';
      case 'SENIOR':
        return 'bg-blue-500';
      case 'JUNIOR':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando perfil del mentor...</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <XCircle className="text-red-400 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Error al cargar</h3>
            <p className="text-slate-300 mb-4">{error}</p>
            <Link
              href="/dashboard/admin/mentores"
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-all"
            >
              <ArrowLeft size={20} />
              Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imagen = mentor.usuario.profileImage || mentor.usuario.imagen || '/default-avatar.png';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header con botones de acción */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard/admin/mentores"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a la lista
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarModalDestacado(true)}
              disabled={actualizando}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                mentor.destacado
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              } disabled:opacity-50`}
            >
              <Award size={18} />
              {mentor.destacado ? 'Quitar Destacado' : 'Marcar Destacado'}
            </button>

            <button
              onClick={() => setMostrarModalActivar(true)}
              disabled={actualizando}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                mentor.disponible
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              } disabled:opacity-50`}
            >
              {mentor.disponible ? <EyeOff size={18} /> : <Eye size={18} />}
              {mentor.disponible ? 'Desactivar' : 'Activar'}
            </button>

            <Link
              href={`/dashboard/admin/mentores/${mentorId}/editar`}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>
        </div>

        {/* Tarjeta principal del perfil */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          {/* Banner de estado */}
          <div className={`p-4 ${mentor.disponible ? 'bg-green-500/10 border-b border-green-500/30' : 'bg-red-500/10 border-b border-red-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {mentor.disponible ? (
                  <>
                    <Eye className="text-green-400" size={24} />
                    <span className="text-green-400 font-semibold">Mentor Activo</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="text-red-400" size={24} />
                    <span className="text-red-400 font-semibold">Mentor Inactivo - Pendiente de Revisión</span>
                  </>
                )}
              </div>
              {mentor.destacado && (
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full">
                  <Award size={16} />
                  <span className="text-sm font-semibold">Destacado</span>
                </div>
              )}
            </div>
          </div>

          {/* Información principal */}
          <div className="p-8">
            <div className="flex items-start gap-6 mb-8">
              <img
                src={imagen}
                alt={mentor.usuario.nombre}
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{mentor.usuario.nombre}</h1>
                  <span className={`${getBadgeColor(mentor.nivel)} text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2`}>
                    <Award size={16} />
                    {mentor.nivel}
                  </span>
                </div>
                {mentor.titulo && (
                  <p className="text-xl text-slate-300 mb-3">{mentor.titulo}</p>
                )}
                {mentor.usuario.jobTitle && (
                  <p className="text-slate-400 mb-3 flex items-center gap-2">
                    <Briefcase size={16} />
                    {mentor.usuario.jobTitle}
                  </p>
                )}
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-2">
                    <Mail size={16} />
                    {mentor.usuario.email}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={16} />
                    {mentor.experienciaAnios} años de experiencia
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Especialidad */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-400 text-sm font-semibold mb-3 uppercase">Especialidad Principal</h3>
                <p className="text-white font-semibold text-lg">{mentor.especialidad}</p>
              </div>

              {/* Rating */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-400 text-sm font-semibold mb-3 uppercase">Calificación</h3>
                <div className="flex items-center gap-2">
                  <Star size={24} className="text-amber-500 fill-amber-500" />
                  <span className="text-white font-bold text-2xl">{mentor.calificacionPromedio.toFixed(1)}</span>
                  <span className="text-slate-400">({mentor.totalResenas} reseñas)</span>
                </div>
              </div>

              {/* Precio */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-400 text-sm font-semibold mb-3 uppercase">Tarifa por Sesión</h3>
                <p className="text-green-400 font-bold text-2xl">${mentor.precioBase.toLocaleString()} MXN</p>
              </div>

              {/* Sesiones */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-400 text-sm font-semibold mb-3 uppercase">Sesiones Realizadas</h3>
                <p className="text-white font-bold text-2xl">{mentor.totalSesiones}</p>
              </div>
            </div>

            {/* Comisiones */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-6">
              <h3 className="text-slate-400 text-sm font-semibold mb-3 uppercase">Estructura de Comisiones</h3>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Mentor</p>
                  <p className="text-white font-bold text-xl">{mentor.comisionMentor}%</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Plataforma</p>
                  <p className="text-blue-400 font-bold text-xl">{mentor.comisionPlataforma}%</p>
                </div>
              </div>
            </div>

            {/* Especialidades Secundarias */}
            {mentor.especialidadesSecundarias.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Target size={20} className="text-blue-400" />
                  Especialidades Adicionales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.especialidadesSecundarias.map((esp, index) => (
                    <span
                      key={index}
                      className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm"
                    >
                      {esp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Biografías */}
            <div className="space-y-6">
              {mentor.biografiaCorta && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-400" />
                    Biografía Corta
                  </h3>
                  <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    {mentor.biografiaCorta}
                  </p>
                </div>
              )}

              {mentor.biografiaCompleta && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-400" />
                    Biografía Completa
                  </h3>
                  <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700 whitespace-pre-wrap">
                    {mentor.biografiaCompleta}
                  </p>
                </div>
              )}

              {mentor.biografia && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-400" />
                    Biografía
                  </h3>
                  <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700 whitespace-pre-wrap">
                    {mentor.biografia}
                  </p>
                </div>
              )}

              {mentor.vision && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Target size={20} className="text-purple-400" />
                    Visión
                  </h3>
                  <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700 whitespace-pre-wrap">
                    {mentor.vision}
                  </p>
                </div>
              )}

              {mentor.sede && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <MapPin size={20} className="text-green-400" />
                    Ubicación
                  </h3>
                  <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    {mentor.sede}
                  </p>
                </div>
              )}
            </div>

            {/* Logros */}
            {mentor.logros.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Award size={20} className="text-amber-400" />
                  Logros y Reconocimientos
                </h3>
                <div className="space-y-2">
                  {mentor.logros.map((logro, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 flex items-center gap-3"
                    >
                      <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                      <p className="text-slate-300">{logro}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción finales */}
        <div className="mt-6 flex justify-between items-center">
          <Link
            href="/dashboard/admin/mentores"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Volver a la lista
          </Link>

          <div className="flex items-center gap-3">
            {!mentor.disponible && (
              <button
                onClick={() => setMostrarModalActivar(true)}
                disabled={actualizando}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg"
              >
                <CheckCircle size={20} />
                Aprobar y Activar Mentor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para activar/desactivar */}
      {mostrarModalActivar && mentor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              {mentor.disponible ? (
                <div className="mb-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <EyeOff className="text-red-400" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    ¿Desactivar Mentor?
                  </h3>
                  <p className="text-slate-300">
                    ¿Cambiar estado de <span className="font-bold text-white">{mentor.usuario.nombre}</span> a{' '}
                    <span className="text-red-400 font-semibold">INACTIVO</span>?
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    El mentor dejará de aparecer en la plataforma
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-400" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    ¿Activar Mentor?
                  </h3>
                  <p className="text-slate-300">
                    ¿Cambiar estado de <span className="font-bold text-white">{mentor.usuario.nombre}</span> a{' '}
                    <span className="text-green-400 font-semibold">ACTIVO</span>?
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-300 flex items-center gap-2">
                      <User size={16} />
                      <span>El usuario también será activado para que pueda iniciar sesión</span>
                    </p>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    El mentor aparecerá disponible en la plataforma
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalActivar(false)}
                disabled={actualizando}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={toggleDisponibilidad}
                disabled={actualizando}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  mentor.disponible
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {actualizando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Actualizando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para destacado */}
      {mostrarModalDestacado && mentor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-amber-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {mentor.destacado ? '¿Quitar Destacado?' : '¿Marcar como Destacado?'}
              </h3>
              <p className="text-slate-300">
                {mentor.destacado
                  ? `¿Remover el badge de destacado de ${mentor.usuario.nombre}?`
                  : `¿Marcar a ${mentor.usuario.nombre} como mentor destacado?`}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {mentor.destacado
                  ? 'Dejará de aparecer con el badge dorado'
                  : 'Aparecerá con un badge dorado especial'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalDestacado(false)}
                disabled={actualizando}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={toggleDestacado}
                disabled={actualizando}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actualizando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Actualizando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de éxito */}
      {mensajeExito && (
        <div className="fixed top-4 right-4 z-50 animate-slideDown">
          <div className="bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-green-400">
            <CheckCircle size={24} />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
        </div>
      )}

      {/* Notificación de error */}
      {mensajeError && (
        <div className="fixed top-4 right-4 z-50 animate-slideDown">
          <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-red-400">
            <XCircle size={24} />
            <div>
              <p className="font-semibold">{mensajeError}</p>
              <button
                onClick={() => setMensajeError('')}
                className="text-sm underline mt-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
