"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Camera, User, Briefcase, FileText, Link as LinkIcon, Save, Loader2, CheckCircle2, XCircle, MapPin, Dumbbell } from 'lucide-react';
import dynamic from 'next/dynamic';

// Reusar componentes de mentor para trainer
const QuantumBioWriter = dynamic(() => import('@/components/mentor/QuantumBioWriter'), { ssr: false });
const MentorAvatarSelfie = dynamic(() => import('@/components/mentor/MentorAvatarSelfie'), { ssr: false });

export default function TrainerProfileEditorPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showQuantumBio, setShowQuantumBio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAvatarSelfie, setShowAvatarSelfie] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    // Campos de Usuario
    nombre: '',
    jobTitle: '',
    profileImage: '',
    experienceYears: 0,
    skillsInput: '',
    vision: '',
    sede: '',
    
    // Campos de PerfilTrainer
    nivel: 'JUNIOR' as 'JUNIOR' | 'SENIOR' | 'MASTER',
    titulo: '',
    especialidad: '',
    especialidadesSecundariasInput: '',
    biografia: '',
    biografiaCorta: '',
    biografiaCompleta: '',
    logrosInput: '',
    experienciaAnios: 0,
    disponible: true,
    enlaceVideoLlamada: '',
    tipoVideoLlamada: 'zoom' as 'zoom' | 'meet' | 'teams',
    maxClients: 10,
    acceptingNewClients: true,
    tagline: '',
    expertiseTagsInput: '',
    methodologyStyle: 'BALANCED' as 'STRUCTURED' | 'BALANCED' | 'FLEXIBLE',
    idealClientDescription: '',
    heroJourneyBio: '',
    promiseStatement: '',
    videoIntroUrl: ''
  });

  // Validación de campos obligatorios
  const isFormValid = () => {
    return (
      formData.profileImage.trim() !== '' &&
      formData.nombre.trim() !== '' &&
      formData.jobTitle.trim() !== '' &&
      formData.titulo.trim() !== '' &&
      formData.biografiaCorta.trim() !== '' &&
      formData.biografia.trim() !== '' &&
      formData.biografiaCompleta.trim() !== '' &&
      formData.sede.trim() !== '' &&
      formData.especialidad.trim() !== '' &&
      formData.experienciaAnios > 0
    );
  };

  // Obtener lista de campos faltantes
  const camposFaltantes = useMemo(() => {
    const campos: { key: string; label: string }[] = [];
    
    if (!formData.profileImage?.trim()) campos.push({ key: 'profileImage', label: 'Foto de Perfil' });
    if (!formData.nombre?.trim()) campos.push({ key: 'nombre', label: 'Nombre' });
    if (!formData.jobTitle?.trim()) campos.push({ key: 'jobTitle', label: 'Cargo/Profesión' });
    if (!formData.titulo?.trim()) campos.push({ key: 'titulo', label: 'Título de Entrenador' });
    if (!formData.biografiaCorta?.trim()) campos.push({ key: 'biografiaCorta', label: 'Tagline' });
    if (!formData.biografia?.trim()) campos.push({ key: 'biografia', label: 'Biografía Media' });
    if (!formData.biografiaCompleta?.trim()) campos.push({ key: 'biografiaCompleta', label: 'Biografía Completa' });
    if (!formData.sede?.trim()) campos.push({ key: 'sede', label: 'Sede' });
    if (!formData.especialidad?.trim()) campos.push({ key: 'especialidad', label: 'Especialidad Principal' });
    if (!formData.experienciaAnios || formData.experienciaAnios <= 0) campos.push({ key: 'experienciaAnios', label: 'Años de Experiencia' });
    
    return campos;
  }, [formData]);

  // Detectar si hay cambios
  const hasChanges = () => {
    if (!initialData) return true;
    
    return Object.keys(formData).some(key => 
      formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData]
    );
  };

  // Cargar datos iniciales
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trainer/profile-editor`);
        const data = await res.json();
        if (res.ok && data) {
          const loadedData = {
            // Datos de Usuario
            nombre: data.nombre || '',
            jobTitle: data.jobTitle || '',
            profileImage: data.profileImage || '',
            experienceYears: data.experienceYears || 0,
            skillsInput: data.skills ? data.skills.join(', ') : '',
            vision: data.vision || '',
            sede: data.sede || '',
            
            // Datos de PerfilTrainer
            nivel: data.nivel || 'JUNIOR',
            titulo: data.titulo || '',
            especialidad: data.especialidad || '',
            especialidadesSecundariasInput: data.especialidadesSecundarias ? data.especialidadesSecundarias.join(', ') : '',
            biografia: data.biografia || '',
            biografiaCorta: data.biografiaCorta || '',
            biografiaCompleta: data.biografiaCompleta || '',
            logrosInput: data.logros ? data.logros.join(', ') : '',
            experienciaAnios: data.experienciaAnios || 0,
            disponible: data.disponible !== undefined ? data.disponible : true,
            enlaceVideoLlamada: data.enlaceVideoLlamada || '',
            tipoVideoLlamada: data.tipoVideoLlamada || 'zoom',
            maxClients: data.maxClients !== undefined ? data.maxClients : 10,
            acceptingNewClients: data.acceptingNewClients !== undefined ? data.acceptingNewClients : true,
            tagline: data.tagline || '',
            expertiseTagsInput: data.expertiseTags ? data.expertiseTags.join(', ') : '',
            methodologyStyle: data.methodologyStyle || 'BALANCED',
            idealClientDescription: data.idealClientDescription || '',
            heroJourneyBio: data.heroJourneyBio || '',
            promiseStatement: data.promiseStatement || '',
            videoIntroUrl: data.videoIntroUrl || ''
          };
          setFormData(loadedData);
          setInitialData(loadedData);
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
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    setUploadingImage(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'trainer-profiles');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (data.url) {
        setFormData(prev => ({ ...prev, profileImage: data.url }));
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!hasChanges()) {
      alert('No hay cambios para guardar');
      return;
    }

    setLoading(true);
    setShowError(false);

    try {
      const skillsArray = formData.skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      const especialidadesSecundariasArray = formData.especialidadesSecundariasInput.split(',').map(s => s.trim()).filter(Boolean);
      const logrosArray = formData.logrosInput.split(',').map(s => s.trim()).filter(Boolean);
      const expertiseTagsArray = formData.expertiseTagsInput.split(',').map(s => s.trim()).filter(Boolean);

      const response = await fetch('/api/trainer/profile-editor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: {
            profileImage: formData.profileImage,
            jobTitle: formData.jobTitle,
            experienceYears: formData.experienceYears,
            skills: skillsArray,
            vision: formData.vision,
            sede: formData.sede
          },
          perfilTrainer: {
            titulo: formData.titulo,
            especialidad: formData.especialidad,
            especialidadesSecundarias: especialidadesSecundariasArray,
            biografia: formData.biografia,
            biografiaCorta: formData.biografiaCorta,
            biografiaCompleta: formData.biografiaCompleta,
            logros: logrosArray,
            experienciaAnios: Number(formData.experienciaAnios),
            disponible: formData.disponible,
            enlaceVideoLlamada: formData.enlaceVideoLlamada,
            tipoVideoLlamada: formData.tipoVideoLlamada,
            maxClients: Number(formData.maxClients),
            acceptingNewClients: formData.acceptingNewClients,
            tagline: formData.tagline,
            expertiseTags: expertiseTagsArray,
            methodologyStyle: formData.methodologyStyle,
            idealClientDescription: formData.idealClientDescription,
            heroJourneyBio: formData.heroJourneyBio,
            promiseStatement: formData.promiseStatement,
            videoIntroUrl: formData.videoIntroUrl
          }
        })
      });

      if (response.ok) {
        setShowSuccess(true);
        setInitialData({ ...formData });
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        console.error('Error guardando:', error);
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-orange-950/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando perfil de entrenador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-orange-950/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Dumbbell className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Mi Perfil de Entrenador</h1>
          </div>
          <p className="text-slate-400">Configura tu perfil para Quantum Leap</p>
        </div>

        {/* Campos faltantes */}
        {camposFaltantes.length > 0 && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 font-medium mb-2">Campos pendientes para completar tu perfil:</p>
            <div className="flex flex-wrap gap-2">
              {camposFaltantes.map(campo => (
                <span key={campo.key} className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-sm">
                  {campo.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sección 1: Identidad Visual */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-400" />
            Identidad Visual
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Foto de perfil */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Perfil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-orange-500"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center">
                    <User className="w-12 h-12 text-slate-500" />
                  </div>
                )}
                
                <label className="absolute bottom-0 right-0 p-2 bg-orange-600 rounded-full cursor-pointer hover:bg-orange-500 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              
              <button
                onClick={() => setShowAvatarSelfie(true)}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg text-sm font-medium hover:from-orange-500 hover:to-amber-500 transition-all"
              >
                🤖 Crear Avatar con IA
              </button>
            </div>

            {/* Nombre */}
            <div className="flex-1">
              <label className="block text-slate-400 text-sm mb-2">Nombre Completo *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Tu nombre completo"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Títulos Profesionales */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-400" />
            Títulos Profesionales
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Cargo/Profesión *</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Coach de Alto Rendimiento"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Título de Entrenador *</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Entrenador Quantum Leap"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Biografías */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              Biografías
            </h2>
            <button
              onClick={() => setShowQuantumBio(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              ✨ Generar con IA
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Tagline (Biografía Corta) *</label>
              <input
                type="text"
                name="biografiaCorta"
                value={formData.biografiaCorta}
                onChange={handleChange}
                maxLength={120}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Una frase que te define (máx. 120 caracteres)"
              />
              <p className="text-slate-500 text-xs mt-1">{formData.biografiaCorta.length}/120 caracteres</p>
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Biografía Media *</label>
              <textarea
                name="biografia"
                value={formData.biografia}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
                placeholder="Describe brevemente tu experiencia y enfoque"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Biografía Completa *</label>
              <textarea
                name="biografiaCompleta"
                value={formData.biografiaCompleta}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
                placeholder="Tu historia completa, logros y metodología"
              />
            </div>
          </div>
        </div>

        {/* Sección 4: Ubicación */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400" />
            Ubicación
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Sede *</label>
              <input
                type="text"
                name="sede"
                value={formData.sede}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Ciudad de México"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Visión/Organización</label>
              <input
                type="text"
                name="vision"
                value={formData.vision}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Quantum Leap CDMX"
              />
            </div>
          </div>
        </div>

        {/* Sección 5: Expertise */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-orange-400" />
            Expertise
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Especialidad Principal *</label>
              <input
                type="text"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Transformación Personal"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Especialidades Secundarias (separadas por coma)</label>
              <input
                type="text"
                name="especialidadesSecundariasInput"
                value={formData.especialidadesSecundariasInput}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Coaching, Liderazgo, PNL"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Habilidades (separadas por coma)</label>
              <input
                type="text"
                name="skillsInput"
                value={formData.skillsInput}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: Comunicación, Empatía, Facilitación"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Logros (separados por coma)</label>
              <input
                type="text"
                name="logrosInput"
                value={formData.logrosInput}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Ej: +100 participantes transformados, Certificación internacional"
              />
            </div>
          </div>
        </div>

        {/* Sección 6: Experiencia */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-400" />
            Experiencia
          </h2>
          
          <div>
            <label className="block text-slate-400 text-sm mb-2">Años de Experiencia *</label>
            <input
              type="number"
              name="experienciaAnios"
              value={formData.experienciaAnios}
              onChange={handleChange}
              min={0}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
          
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disponible}
                onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-slate-300">Disponible para nuevos entrenamientos</span>
            </label>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !isFormValid() || !hasChanges()}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg font-bold hover:from-orange-500 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

        {/* Notificaciones */}
        {showSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom">
            <CheckCircle2 className="w-5 h-5" />
            Perfil guardado exitosamente
          </div>
        )}
        
        {showError && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom">
            <XCircle className="w-5 h-5" />
            Error al guardar el perfil
          </div>
        )}

        {/* Modal: Quantum Bio Writer */}
        {showQuantumBio && (
          <QuantumBioWriter
            onClose={() => setShowQuantumBio(false)}
            onGenerated={(bios) => {
              setFormData(prev => ({
                ...prev,
                biografiaCorta: bios.short || prev.biografiaCorta,
                biografia: bios.medium || prev.biografia,
                biografiaCompleta: bios.full || prev.biografiaCompleta
              }));
              setShowQuantumBio(false);
            }}
            currentData={{
              nombre: formData.nombre,
              especialidad: formData.especialidad,
              experiencia: formData.experienciaAnios,
              logros: formData.logrosInput.split(',').map(s => s.trim()).filter(Boolean)
            }}
          />
        )}

        {/* Modal: Avatar Selfie */}
        {showAvatarSelfie && (
          <MentorAvatarSelfie
            onClose={() => setShowAvatarSelfie(false)}
            onGenerated={(imageUrl) => {
              setFormData(prev => ({ ...prev, profileImage: imageUrl }));
              setShowAvatarSelfie(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
