"use client";
import React, { useState, useEffect } from 'react';
import { User, Briefcase, FileText, Link as LinkIcon, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function MentorProfileEditorPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    jobTitle: '',
    profileImage: '',
    experienceYears: 0,
    bioShort: '',
    bioFull: '',
    skillsInput: '' // Campo temporal para escribir skills separadas por coma
  });

  // Cargar datos iniciales
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mentor/profile-editor`);
        const data = await res.json();
        if (res.ok && data) {
          setFormData({
            nombre: data.nombre || '',
            jobTitle: data.jobTitle || '',
            profileImage: data.profileImage || '',
            experienceYears: data.experienceYears || 0,
            bioShort: data.bioShort || '',
            bioFull: data.bioFull || '',
            // Convertimos el array de skills a string para el input
            skillsInput: data.skills ? data.skills.join(', ') : ''
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setShowSuccess(false);
    setShowError(false);
    
    // Preparamos los datos (convertir skills string a array)
    const dataToSend = {
      jobTitle: formData.jobTitle,
      profileImage: formData.profileImage,
      experienceYears: Number(formData.experienceYears),
      bioShort: formData.bioShort,
      bioFull: formData.bioFull,
      skills: formData.skillsInput.split(',').map(s => s.trim()).filter(s => s)
    };

    console.log('📤 Datos que se están enviando:', dataToSend);

    try {
      const res = await fetch('/api/mentor/profile-editor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSend })
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000); // Ocultar después de 5 segundos
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
    <div className="p-8 max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-white mb-2">Editar Mi Perfil Público</h1>
          <p className="text-slate-400">Los participantes verán esta información al reservar llamadas contigo</p>
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
            <User className="text-purple-400" /> Foto y Título
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
                <p className="text-xs text-slate-500 mt-1">Por ahora pega un link directo a una imagen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: TRAYECTORIA */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <Briefcase className="text-purple-400" /> Experiencia y Habilidades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Años de Experiencia
              </label>
              <input 
                type="number" 
                name="experienceYears" 
                value={formData.experienceYears} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
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
                placeholder="Liderazgo, Finanzas, Marketing..." 
              />
            </div>
          </div>
          
          {/* Preview de skills */}
          {formData.skillsInput && (
            <div className="flex flex-wrap gap-2 mt-4">
              {formData.skillsInput.split(',').map((skill, i) => (
                <span 
                  key={i} 
                  className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* SECCIÓN 3: BIOGRAFÍA */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
            <FileText className="text-purple-400" /> Biografía
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Biografía Corta (Para la tarjeta)
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
                Trayectoria Completa (Perfil detallado)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Cuenta tu historia, logros y metodología.
              </p>
              <textarea 
                name="bioFull" 
                rows={6} 
                value={formData.bioFull} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Describe tu experiencia, logros clave, metodología de trabajo y qué hace única tu mentoría..."
              ></textarea>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
