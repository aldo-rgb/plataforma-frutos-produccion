'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  User,
  Award,
  Briefcase,
  DollarSign,
  FileText,
  Star,
  Tag,
  Eye,
  Loader2,
} from 'lucide-react';

interface Mentor {
  id: number;
  usuarioId: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
  };
  nivel: string;
  titulo: string | null;
  especialidad: string;
  especialidadesSecundarias: string[];
  biografiaCorta: string | null;
  biografiaCompleta: string | null;
  logros: string[];
  experienciaAnios: number;
  totalSesiones: number;
  comisionMentor: number;
  comisionPlataforma: number;
  disponible: boolean;
  destacado: boolean;
}

export default function EditarMentorPage() {
  const router = useRouter();
  const params = useParams();
  const mentorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [logros, setLogros] = useState<string[]>(['']);
  const [especialidadesSecundarias, setEspecialidadesSecundarias] = useState<string[]>(['']);

  // Formulario
  const [formData, setFormData] = useState({
    nivel: 'JUNIOR',
    titulo: '',
    especialidad: '',
    biografiaCorta: '',
    biografiaCompleta: '',
    experienciaAnios: '0',
    totalSesiones: '0',
    comisionMentor: '85',
    comisionPlataforma: '15',
    disponible: true,
    destacado: false,
  });

  useEffect(() => {
    cargarMentor();
  }, [mentorId]);

  const cargarMentor = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/mentores/${mentorId}`);
      const data = await res.json();

      if (data.success && data.mentor) {
        const m = data.mentor;
        setMentor(m);

        // Cargar datos en formulario
        setFormData({
          nivel: m.nivel,
          titulo: m.titulo || '',
          especialidad: m.especialidad,
          biografiaCorta: m.biografiaCorta || '',
          biografiaCompleta: m.biografiaCompleta || '',
          experienciaAnios: m.experienciaAnios.toString(),
          totalSesiones: m.totalSesiones?.toString() || '0',
          comisionMentor: m.comisionMentor.toString(),
          comisionPlataforma: m.comisionPlataforma.toString(),
          disponible: m.disponible,
          destacado: m.destacado,
        });

        // Cargar arrays
        setLogros(m.logros && m.logros.length > 0 ? m.logros : ['']);
        setEspecialidadesSecundarias(
          m.especialidadesSecundarias && m.especialidadesSecundarias.length > 0
            ? m.especialidadesSecundarias
            : ['']
        );
      } else {
        alert('Mentor no encontrado');
        router.push('/dashboard/admin/mentores');
      }
    } catch (error) {
      console.error('Error al cargar mentor:', error);
      alert('Error al cargar mentor');
    } finally {
      setLoading(false);
    }
  };

  const agregarLogro = () => {
    setLogros([...logros, '']);
  };

  const actualizarLogro = (index: number, valor: string) => {
    const nuevosLogros = [...logros];
    nuevosLogros[index] = valor;
    setLogros(nuevosLogros);
  };

  const eliminarLogro = (index: number) => {
    setLogros(logros.filter((_, i) => i !== index));
  };

  const agregarEspecialidad = () => {
    setEspecialidadesSecundarias([...especialidadesSecundarias, '']);
  };

  const actualizarEspecialidad = (index: number, valor: string) => {
    const nuevas = [...especialidadesSecundarias];
    nuevas[index] = valor;
    setEspecialidadesSecundarias(nuevas);
  };

  const eliminarEspecialidad = (index: number) => {
    setEspecialidadesSecundarias(especialidadesSecundarias.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Filtrar logros y especialidades vacías
      const logrosLimpios = logros.filter((l) => l.trim() !== '');
      const especialidadesLimpias = especialidadesSecundarias.filter((e) => e.trim() !== '');

      const payload = {
        ...formData,
        experienciaAnios: parseInt(formData.experienciaAnios),
        totalSesiones: parseInt(formData.totalSesiones),
        comisionMentor: parseInt(formData.comisionMentor),
        comisionPlataforma: parseInt(formData.comisionPlataforma),
        logros: logrosLimpios,
        especialidadesSecundarias: especialidadesLimpias,
      };

      const res = await fetch(`/api/admin/mentores/${mentorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Mentor actualizado exitosamente');
        router.push('/dashboard/admin/mentores');
      } else {
        alert(data.error || 'Error al actualizar mentor');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar mentor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
          <p className="text-slate-300">Cargando mentor...</p>
        </div>
      </div>
    );
  }

  if (!mentor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>

          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <User className="text-purple-400" size={40} />
            Editar Mentor
          </h1>
          <p className="text-slate-400">
            Editando perfil de <span className="text-white font-semibold">{mentor.usuario.nombre}</span>
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info del Usuario (No editable) */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="text-blue-400" />
              Usuario Asociado
            </h2>
            <div className="flex items-center gap-4 bg-slate-900/50 rounded-lg p-4">
              <img
                src={mentor.usuario.imagen || '/default-avatar.png'}
                alt={mentor.usuario.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-600"
              />
              <div>
                <p className="text-white font-bold text-lg">{mentor.usuario.nombre}</p>
                <p className="text-slate-400">{mentor.usuario.email}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-3">
              ℹ️ El usuario asociado no se puede cambiar después de crear el perfil
            </p>
          </div>

          {/* Sección A: Datos Básicos */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <User className="text-purple-400" />
              A. Datos Básicos
            </h2>

            {/* Nivel */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Nivel <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['JUNIOR', 'SENIOR', 'MASTER'].map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setFormData({ ...formData, nivel })}
                    className={`py-3 rounded-lg font-semibold transition-all ${
                      formData.nivel === nivel
                        ? 'bg-purple-600 text-white border-2 border-purple-400'
                        : 'bg-slate-700 text-slate-300 border-2 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>

            {/* Título/Cargo */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Título/Cargo Profesional
              </label>
              <input
                type="text"
                placeholder="ej. Senior Marketing Strategist"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Especialidad Principal */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Especialidad Principal <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ej. Estrategia de Negocios, Liderazgo, Finanzas"
                value={formData.especialidad}
                onChange={(e) =>
                  setFormData({ ...formData, especialidad: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Especialidades Secundarias */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                <Tag size={18} className="text-purple-400" />
                Especialidades Secundarias (Tags)
              </label>
              {especialidadesSecundarias.map((esp, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="ej. Marketing Digital, SEO, Branding"
                    value={esp}
                    onChange={(e) => actualizarEspecialidad(index, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarEspecialidad(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarEspecialidad}
                className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
              >
                + Agregar especialidad
              </button>
            </div>

            {/* Años de Experiencia */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Años de Experiencia
              </label>
              <input
                type="number"
                min="0"
                value={formData.experienciaAnios}
                onChange={(e) =>
                  setFormData({ ...formData, experienciaAnios: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Total Sesiones */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Total de Sesiones Realizadas
              </label>
              <input
                type="number"
                min="0"
                value={formData.totalSesiones}
                onChange={(e) =>
                  setFormData({ ...formData, totalSesiones: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
              <p className="text-slate-400 text-sm mt-2">
                Este número se incrementa automáticamente con cada mentoría completada
              </p>
            </div>
          </div>

          {/* Sección B: Perfil Público */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="text-blue-400" />
              B. Perfil Público
            </h2>

            {/* Biografía Corta */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Biografía Corta (para tarjetas del catálogo)
              </label>
              <textarea
                placeholder="Breve descripción de 150-200 caracteres..."
                value={formData.biografiaCorta}
                onChange={(e) =>
                  setFormData({ ...formData, biografiaCorta: e.target.value })
                }
                maxLength={200}
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-slate-400 text-sm mt-2">
                {formData.biografiaCorta.length}/200 caracteres
              </p>
            </div>

            {/* Biografía Completa */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Biografía Completa (para perfil detallado)
              </label>
              <textarea
                placeholder="Descripción detallada del mentor, su trayectoria, experiencia, filosofía de mentoría..."
                value={formData.biografiaCompleta}
                onChange={(e) =>
                  setFormData({ ...formData, biografiaCompleta: e.target.value })
                }
                rows={8}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Logros Destacados */}
            <div>
              <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                <Star size={18} className="text-amber-400" />
                Logros Destacados
              </label>
              <p className="text-slate-400 text-sm mb-3">
                Puntos destacados que se mostrarán como bullets en el perfil
              </p>
              {logros.map((logro, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="ej. +500 emprendedores asesorados"
                    value={logro}
                    onChange={(e) => actualizarLogro(index, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarLogro(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarLogro}
                className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
              >
                + Agregar logro
              </button>
            </div>
          </div>

          {/* Sección C: Configuración Financiera */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <DollarSign className="text-green-400" />
              C. Configuración Financiera
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Comisión Plataforma */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Comisión Plataforma (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.comisionPlataforma}
                  onChange={(e) =>
                    setFormData({ ...formData, comisionPlataforma: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Comisión Mentor */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Comisión Mentor (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.comisionMentor}
                  onChange={(e) =>
                    setFormData({ ...formData, comisionMentor: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Sección D: Visibilidad */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Eye className="text-amber-400" />
              D. Visibilidad y Estado
            </h2>

            <div className="space-y-4">
              {/* Disponible */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.disponible}
                  onChange={(e) =>
                    setFormData({ ...formData, disponible: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div>
                  <p className="text-white font-semibold">Disponible</p>
                  <p className="text-slate-400 text-sm">
                    El mentor aparecerá en el catálogo público
                  </p>
                </div>
              </label>

              {/* Destacado */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.destacado}
                  onChange={(e) =>
                    setFormData({ ...formData, destacado: e.target.checked })
                  }
                  className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                />
                <div>
                  <p className="text-white font-semibold flex items-center gap-2">
                    Destacado <Award size={16} className="text-amber-400" />
                  </p>
                  <p className="text-slate-400 text-sm">
                    Aparecerá primero en el catálogo con badge especial
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
