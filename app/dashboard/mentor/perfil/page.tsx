"use client";
import React, { useState, useEffect } from 'react';
import { User, Briefcase, FileText, Link as LinkIcon, Save, Loader2, CheckCircle2, XCircle, MapPin, DollarSign } from 'lucide-react';

export default function MentorProfileEditorPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Función para calcular comisiones según nivel
  const calcularComisiones = (nivel: 'JUNIOR' | 'SENIOR' | 'MASTER') => {
    switch (nivel) {
      case 'JUNIOR':
        return { comisionMentor: 70, comisionPlataforma: 30 };
      case 'SENIOR':
        return { comisionMentor: 85, comisionPlataforma: 15 };
      case 'MASTER':
        return { comisionMentor: 90, comisionPlataforma: 10 };
      default:
        return { comisionMentor: 70, comisionPlataforma: 30 };
    }
  };

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Campos de Usuario
    nombre: '',
    jobTitle: '',
    profileImage: '',
    experienceYears: 0,
    bioShort: '',
    bioFull: '',
    skillsInput: '', // Campo temporal para escribir skills separadas por coma
    vision: '',
    sede: '',
    
    // Campos de PerfilMentor
    nivel: 'JUNIOR' as 'JUNIOR' | 'SENIOR' | 'MASTER',
    titulo: '',
    especialidad: '',
    especialidadesSecundariasInput: '', // Campo temporal
    biografia: '',
    biografiaCorta: '',
    biografiaCompleta: '',
    logrosInput: '', // Campo temporal
    experienciaAnios: 0,
    precioBase: 1000,
    disponible: true,
    comisionMentor: 70,
    comisionPlataforma: 30,
    enlaceVideoLlamada: '',
    tipoVideoLlamada: 'zoom' as 'zoom' | 'meet' | 'teams'
  });

  // Cargar datos iniciales
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mentor/profile-editor`);
        const data = await res.json();
        if (res.ok && data) {
          setFormData({
            // Datos de Usuario
            nombre: data.nombre || '',
            jobTitle: data.jobTitle || '',
            profileImage: data.profileImage || '',
            experienceYears: data.experienceYears || 0,
            bioShort: data.bioShort || '',
            bioFull: data.bioFull || '',
            skillsInput: data.skills ? data.skills.join(', ') : '',
            vision: data.vision || '',
            sede: data.sede || '',
            
            // Datos de PerfilMentor
            nivel: data.nivel || 'JUNIOR',
            titulo: data.titulo || '',
            especialidad: data.especialidad || '',
            especialidadesSecundariasInput: data.especialidadesSecundarias ? data.especialidadesSecundarias.join(', ') : '',
            biografia: data.biografia || '',
            biografiaCorta: data.biografiaCorta || '',
            biografiaCompleta: data.biografiaCompleta || '',
            logrosInput: data.logros ? data.logros.join(', ') : '',
            experienciaAnios: data.experienciaAnios || 0,
            precioBase: data.precioBase || 1000,
            disponible: data.disponible !== undefined ? data.disponible : true,
            comisionMentor: data.comisionMentor || 70,
            comisionPlataforma: data.comisionPlataforma || 30,
            enlaceVideoLlamada: data.enlaceVideoLlamada || '',
            tipoVideoLlamada: data.tipoVideoLlamada || 'zoom'
          });
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    // Si cambia el nivel, recalcular comisiones
    if (name === 'nivel') {
      const comisiones = calcularComisiones(value as 'JUNIOR' | 'SENIOR' | 'MASTER');
      setFormData({ 
        ...formData, 
        [name]: value,
        ...comisiones
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setShowSuccess(false);
    setShowError(false);
    
    // Preparamos los datos separados por tabla
    const dataToSend = {
      usuario: {
        jobTitle: formData.jobTitle,
        profileImage: formData.profileImage,
        experienceYears: Number(formData.experienceYears),
        bioShort: formData.bioShort,
        bioFull: formData.bioFull,
        skills: formData.skillsInput.split(',').map(s => s.trim()).filter(s => s),
        vision: formData.vision,
        sede: formData.sede
      },
      perfilMentor: {
        titulo: formData.titulo,
        especialidad: formData.especialidad,
        especialidadesSecundarias: formData.especialidadesSecundariasInput.split(',').map(s => s.trim()).filter(s => s),
        biografia: formData.biografia,
        biografiaCorta: formData.biografiaCorta,
        biografiaCompleta: formData.biografiaCompleta,
        logros: formData.logrosInput.split(',').map(s => s.trim()).filter(s => s),
        experienciaAnios: Number(formData.experienciaAnios),
        precioBase: Number(formData.precioBase),
        disponible: formData.disponible,
        enlaceVideoLlamada: formData.enlaceVideoLlamada,
        tipoVideoLlamada: formData.tipoVideoLlamada
      }
    };

    console.log('📤 Datos que se están enviando:', dataToSend);

    try {
      const res = await fetch('/api/mentor/profile-editor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      }
    } catch (error) {
      console.error('Error:', error);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Notificación de Éxito */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]">
            <div className="bg-white/20 p-2 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">¡Perfil actualizado!</p>
              <p className="text-sm text-emerald-50">Tus cambios se guardaron correctamente</p>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de Error */}
      {showError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]">
            <div className="bg-white/20 p-2 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Error al guardar</p>
              <p className="text-sm text-red-50">Intenta nuevamente en un momento</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Editar Mi Perfil Completo</h1>
          <p className="text-slate-400">Completa todos los campos de tu perfil público de mentor</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      <div className="space-y-8">
        {/* SECCIÓN 1: IDENTIDAD VISUAL */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <User className="text-purple-400" /> Identidad y Foto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Preview de Foto */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border-2 border-dashed border-slate-600">
              {formData.profileImage ? (
                <img 
                  src={formData.profileImage} 
                  alt="Preview" 
                  className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-slate-700" 
                />
              ) : (
                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <User className="w-16 h-16 text-slate-600" />
                </div>
              )}
              <p className="text-xs text-slate-400 text-center">Preview de cómo te verán</p>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm">
                  Nombre Completo
                </label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={formData.nombre} 
                  onChange={handleChange} 
                  disabled
                  className="w-full bg-slate-900 border border-slate-600 text-slate-400 p-3 rounded-lg cursor-not-allowed" 
                  placeholder="Tu nombre completo" 
                />
                <p className="text-xs text-slate-500 mt-1">No se puede editar desde aquí</p>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm">
                  Título Profesional (Cargo)
                </label>
                <input 
                  type="text" 
                  name="jobTitle" 
                  value={formData.jobTitle} 
                  onChange={handleChange} 
                  className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                  placeholder="ej. Senior Business Strategist" 
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm">
                  Título de Mentor
                </label>
                <input 
                  type="text" 
                  name="titulo" 
                  value={formData.titulo} 
                  onChange={handleChange} 
                  className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                  placeholder="ej. Mentor Senior, Coach Certificado" 
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> URL de Foto de Perfil
                </label>
                <input 
                  type="text" 
                  name="profileImage" 
                  value={formData.profileImage} 
                  onChange={handleChange} 
                  className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                  placeholder="https://..." 
                />
                <p className="text-xs text-slate-500 mt-1">Pega un link directo a una imagen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: NIVEL Y ESPECIALIDADES */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <Briefcase className="text-purple-400" /> Nivel y Especialidades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Nivel de Mentor - Asignado por el Sistema
              </label>
              <div className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                <span className={`text-lg font-bold ${
                  formData.nivel === 'MASTER' ? 'text-purple-400' : 
                  formData.nivel === 'SENIOR' ? 'text-blue-400' : 
                  'text-green-400'
                }`}>
                  {formData.nivel === 'MASTER' ? '⭐ Master' : 
                   formData.nivel === 'SENIOR' ? '🔷 Senior' : 
                   '🌱 Junior'}
                </span>
                <span className="text-xs text-slate-500">Comisión: {formData.comisionMentor}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                El nivel se asigna según tu calidad de servicio y rating
              </p>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Años de Experiencia (Mentoría)
              </label>
              <input 
                type="number" 
                name="experienciaAnios" 
                value={formData.experienciaAnios} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Especialidad Principal
              </label>
              <input 
                type="text" 
                name="especialidad" 
                value={formData.especialidad} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="ej. Liderazgo Empresarial" 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Especialidades Secundarias (Separadas por coma)
              </label>
              <input 
                type="text" 
                name="especialidadesSecundariasInput" 
                value={formData.especialidadesSecundariasInput} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="Finanzas, Marketing, Ventas..." 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Habilidades Clave (Separadas por coma)
              </label>
              <input 
                type="text" 
                name="skillsInput" 
                value={formData.skillsInput} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="Liderazgo, Comunicación, Estrategia..." 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Logros Principales (Separados por coma)
              </label>
              <input 
                type="text" 
                name="logrosInput" 
                value={formData.logrosInput} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="Certificación X, Premio Y, 100+ clientes..." 
              />
            </div>
          </div>
          
          {/* Preview de especialidades secundarias */}
          {formData.especialidadesSecundariasInput && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Especialidades Secundarias:</p>
              <div className="flex flex-wrap gap-2">
                {formData.especialidadesSecundariasInput.split(',').map((esp, i) => (
                  <span 
                    key={i} 
                    className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-500/30"
                  >
                    {esp.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Preview de skills */}
          {formData.skillsInput && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Habilidades:</p>
              <div className="flex flex-wrap gap-2">
                {formData.skillsInput.split(',').map((skill, i) => (
                  <span 
                    key={i} 
                    className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Preview de logros */}
          {formData.logrosInput && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Logros:</p>
              <div className="flex flex-wrap gap-2">
                {formData.logrosInput.split(',').map((logro, i) => (
                  <span 
                    key={i} 
                    className="bg-amber-600/20 text-amber-300 px-3 py-1 rounded-full text-sm border border-amber-500/30"
                  >
                    {logro.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECCIÓN 3: BIOGRAFÍA */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <FileText className="text-purple-400" /> Biografía y Presentación
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Biografía Corta (Para tarjeta de usuario)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Máximo 120 caracteres. Sé impactante.
              </p>
              <textarea 
                name="bioShort" 
                rows={2} 
                maxLength={120} 
                value={formData.bioShort} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
                placeholder="Una frase que defina tu propuesta de valor..."
              ></textarea>
              <p className="text-xs text-slate-500 mt-1 text-right">
                {formData.bioShort.length}/120 caracteres
              </p>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Biografía Completa (Para perfil de usuario)
              </label>
              <textarea 
                name="bioFull" 
                rows={4} 
                value={formData.bioFull} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Describe tu trayectoria profesional completa..."
              ></textarea>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Presentación Corta de Mentor (Para listado)
              </label>
              <textarea 
                name="biografiaCorta" 
                rows={2} 
                value={formData.biografiaCorta} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
                placeholder="Tu propuesta de valor como mentor en pocas palabras..."
              ></textarea>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Biografía de Mentor (Resumen medio)
              </label>
              <textarea 
                name="biografia" 
                rows={4} 
                value={formData.biografia} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Tu experiencia y enfoque como mentor..."
              ></textarea>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Biografía Completa de Mentor (Perfil detallado)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Cuenta tu historia, logros, metodología y especialidades.
              </p>
              <textarea 
                name="biografiaCompleta" 
                rows={8} 
                value={formData.biografiaCompleta} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Describe en detalle tu experiencia, logros clave, metodología de trabajo, certificaciones y qué hace única tu mentoría..."
              ></textarea>
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: UBICACIÓN Y VISIÓN */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <MapPin className="text-purple-400" /> Ubicación y Visión Personal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Sede / Ubicación
              </label>
              <input 
                type="text" 
                name="sede" 
                value={formData.sede} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="ej. Ciudad de México, Guadalajara..." 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Precio Base por Sesión (MXN)
              </label>
              <input 
                type="number" 
                name="precioBase" 
                value={formData.precioBase} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="1000" 
              />
            </div>

            {/* Configuración de Videollamada */}
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Plataforma de Videollamada
              </label>
              <select
                name="tipoVideoLlamada"
                value={formData.tipoVideoLlamada}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              >
                <option value="zoom">Zoom</option>
                <option value="meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Enlace de Videollamada (Universal)
              </label>
              <input 
                type="url" 
                name="enlaceVideoLlamada" 
                value={formData.enlaceVideoLlamada} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="https://zoom.us/j/tu-sala-personal o https://meet.google.com/tu-codigo" 
              />
              <p className="text-xs text-slate-400 mt-2">
                Este enlace se compartirá con los estudiantes cuando confirmes una sesión. 
                Asegúrate de usar tu sala personal o un enlace que no expire.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Visión Personal
              </label>
              <textarea 
                name="vision" 
                rows={3} 
                value={formData.vision} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Tu visión personal y profesional..."
              ></textarea>
            </div>
          </div>
        </section>

        {/* SECCIÓN 5: CONFIGURACIÓN DE COMISIONES Y DISPONIBILIDAD */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <DollarSign className="text-purple-400" /> Configuración de Mentoría
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Comisión del Mentor (%) - Automática
              </label>
              <div className="w-full bg-slate-950 border border-slate-700 text-slate-400 p-3 rounded-lg flex items-center justify-between">
                <span className="text-2xl font-bold text-green-400">{formData.comisionMentor}%</span>
                <span className="text-xs">Según nivel {formData.nivel}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Junior: 70% • Senior: 85% • Master: 90%
              </p>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Comisión de Plataforma (%) - Automática
              </label>
              <div className="w-full bg-slate-950 border border-slate-700 text-slate-400 p-3 rounded-lg flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-400">{formData.comisionPlataforma}%</span>
                <span className="text-xs">Según nivel {formData.nivel}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Junior: 30% • Senior: 15% • Master: 10%
              </p>
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="disponible" 
                  checked={formData.disponible} 
                  onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })} 
                  className="w-5 h-5 text-purple-600 bg-slate-900 border-slate-600 rounded focus:ring-2 focus:ring-purple-500" 
                />
                <span className="text-slate-300">Disponible para nuevos participantes</span>
              </label>
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">
              <strong className="text-white">Nota:</strong> Las comisiones se calculan automáticamente según tu nivel de mentor. 
              Para cambiar las comisiones, modifica tu nivel arriba. 
              Total: <span className="font-bold text-green-400">100%</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
