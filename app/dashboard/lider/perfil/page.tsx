'use client';
import React, { useState, useEffect } from 'react';
import { Camera, User, Briefcase, FileText, Link as LinkIcon, Save, Loader2, CheckCircle2, XCircle, MapPin, DollarSign, Send } from 'lucide-react';
import dynamic from 'next/dynamic';

const QuantumBioWriter = dynamic(() => import('@/components/mentor/QuantumBioWriter'), { ssr: false });
const MentorAvatarSelfie = dynamic(() => import('@/components/mentor/MentorAvatarSelfie'), { ssr: false });

export default function MentorProfileEditorPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showQuantumBio, setShowQuantumBio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAvatarSelfie, setShowAvatarSelfie] = useState(false);
  const [solicitandoAprobacion, setSolicitandoAprobacion] = useState(false);
  const [aprobacionEnviada, setAprobacionEnviada] = useState(false);
  const [showAprobacionExito, setShowAprobacionExito] = useState(false);
  const [showAprobacionError, setShowAprobacionError] = useState(false);
  const [errorAprobacionMsg, setErrorAprobacionMsg] = useState('');
  const [camposFaltantesAprobacion, setCamposFaltantesAprobacion] = useState<string[]>([]);
  const [profileApprovalStatus, setProfileApprovalStatus] = useState<'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'>('DRAFT');
  
  // Validación de campos obligatorios (solo campos editables)
  const isFormValid = () => {
    const validations = {
      profileImage: formData.profileImage.trim() !== '',
      jobTitle: formData.jobTitle.trim() !== '',
      titulo: formData.titulo.trim() !== '',
      biografiaCorta: formData.biografiaCorta.trim() !== '',
      biografia: formData.biografia.trim() !== '',
      biografiaCompleta: formData.biografiaCompleta.trim() !== '',
      vision: formData.vision.trim() !== '',
      especialidad: formData.especialidad.trim() !== '',
      especialidadesSecundariasInput: formData.especialidadesSecundariasInput.trim() !== '',
      skillsInput: formData.skillsInput.trim() !== '',
      logrosInput: formData.logrosInput.trim() !== ''
      // Nota: nombre, sede, enlaceVideoLlamada, experienciaAnios, precioBase, comisiones y disponible NO se validan 
      // porque son campos de solo lectura o auto-calculados que el líder no puede editar
    };
    
    // Debug: mostrar qué campos faltan
    const camposFaltantes = Object.entries(validations)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (camposFaltantes.length > 0) {
      console.log('❌ Campos faltantes:', camposFaltantes);
      console.log('📋 Valores actuales:', {
        profileImage: formData.profileImage,
        jobTitle: formData.jobTitle,
        titulo: formData.titulo,
        biografiaCorta: formData.biografiaCorta,
        biografia: formData.biografia,
        biografiaCompleta: formData.biografiaCompleta,
        vision: formData.vision,
        especialidad: formData.especialidad,
        especialidadesSecundariasInput: formData.especialidadesSecundariasInput,
        skillsInput: formData.skillsInput,
        logrosInput: formData.logrosInput
      });
    }
    
    return Object.values(validations).every(v => v === true);
  };
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
          setProfileApprovalStatus(data.profileApprovalStatus || 'DRAFT');
          if (data.profileApprovalStatus === 'PENDING') {
            setAprobacionEnviada(true);
          }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      
      // Actualizar la URL de la imagen en el formulario
      setFormData(prev => ({
        ...prev,
        profileImage: data.url
      }));

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen. Intenta nuevamente.');
    } finally {
      setUploadingImage(false);
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

  const solicitarAprobacion = async () => {
    setSolicitandoAprobacion(true);
    setShowAprobacionExito(false);
    setShowAprobacionError(false);
    setErrorAprobacionMsg('');
    setCamposFaltantesAprobacion([]);

    try {
      const res = await fetch('/api/lider/perfil/solicitar-aprobacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAprobacionEnviada(true);
        setProfileApprovalStatus('PENDING');
        setShowAprobacionExito(true);
        setTimeout(() => setShowAprobacionExito(false), 5000);
      } else {
        console.error('❌ Error al solicitar aprobación:', data);
        setErrorAprobacionMsg(data.error || 'Error al solicitar aprobación');
        if (data.camposFaltantes && data.camposFaltantes.length > 0) {
          setCamposFaltantesAprobacion(data.camposFaltantes);
        }
        setShowAprobacionError(true);
        setTimeout(() => {
          setShowAprobacionError(false);
          setErrorAprobacionMsg('');
          setCamposFaltantesAprobacion([]);
        }, 8000);
      }
    } catch (error) {
      console.error('Error al solicitar aprobación:', error);
      setErrorAprobacionMsg('Error de conexión. Intenta nuevamente.');
      setShowAprobacionError(true);
      setTimeout(() => {
        setShowAprobacionError(false);
        setErrorAprobacionMsg('');
      }, 5000);
    } finally {
      setSolicitandoAprobacion(false);
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
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Notificación de Éxito */}
      {showSuccess && (
        <div className="fixed top-4 right-4 left-4 lg:left-auto z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl shadow-2xl flex items-center gap-3 w-full lg:min-w-[320px] lg:w-auto">
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

      {/* Notificación de Aprobación Solicitada - Éxito */}
      {showAprobacionExito && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-5 rounded-xl shadow-2xl flex items-center gap-3 min-w-[360px]">
            <div className="bg-white/20 p-2.5 rounded-lg">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-lg">¡Solicitud Enviada!</p>
              <p className="text-sm text-green-50">El director revisará tu perfil pronto</p>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de Aprobación - Error */}
      {showAprobacionError && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-top-5 duration-300 max-w-md">
          <div className="bg-gradient-to-br from-red-500/95 via-red-600/95 to-red-700/95 text-white px-6 py-5 rounded-2xl shadow-2xl backdrop-blur-sm border border-red-400/30">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-2.5 rounded-lg shrink-0">
                <XCircle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">Error al Solicitar Aprobación</p>
                <p className="text-sm text-red-50 mb-3">{errorAprobacionMsg}</p>
                {camposFaltantesAprobacion.length > 0 && (
                  <div className="bg-red-900/30 rounded-lg p-3 mt-2 border border-red-400/20">
                    <p className="text-xs font-semibold text-red-100 mb-2">📋 Campos requeridos:</p>
                    <ul className="space-y-1">
                      {camposFaltantesAprobacion.map((campo, idx) => (
                        <li key={idx} className="text-xs text-red-50 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
                          {campo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">Editar Mi Perfil Completo</h1>
        <p className="text-sm lg:text-base text-slate-400">Completa todos los campos de tu perfil público de líder</p>
      </div>

      <div className="space-y-8">
        {/* QUANTUM BIO-WRITER - BANNER SUPERIOR */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 lg:p-6 rounded-xl border border-indigo-500/30 flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:justify-between shadow-lg">
          <div className="flex items-start lg:items-center gap-3 flex-1">
            <div className="text-2xl lg:text-3xl">🎙️</div>
            <div>
              <h3 className="text-base lg:text-lg font-bold text-white">Tu perfil es lo mas importante</h3>
              <p className="text-xs lg:text-sm text-gray-400">Permite que QUANTUM te guie y genera tu perfil completo en 2 minutos</p>
            </div>
          </div>
          <button 
            onClick={() => setShowQuantumBio(true)}
            className="w-full lg:w-auto px-4 lg:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            <span>✨</span> Iniciar Entrevista con Quantum
          </button>
        </div>

        {/* SECCIÓN 1: IDENTIDAD VISUAL */}
        <section className="bg-slate-800 p-4 lg:p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-lg lg:text-xl font-bold text-white mb-4 lg:mb-6">
            <User className="text-purple-400" /> Identidad y Foto
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Preview de Foto */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border-2 border-dashed border-slate-600">
              {formData.profileImage ? (
                <img 
                  src={formData.profileImage} 
                  alt="Preview" 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover mb-3 lg:mb-4 border-4 border-slate-700" 
                />
              ) : (
                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <User className="w-16 h-16 text-slate-600" />
                </div>
              )}
              <p className="text-xs text-slate-400 text-center">Preview de cómo te verán</p>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
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
                  <LinkIcon className="w-4 h-4" /> Foto de Perfil
                </label>
                
                {/* Botón de subida de archivo */}
                <div className="flex flex-col lg:flex-row items-start gap-4">
                  <div className="w-full lg:w-auto">
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <label
                        htmlFor="imageUpload"
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg cursor-pointer transition-all text-sm lg:text-base ${
                          uploadingImage
                            ? 'bg-slate-700 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700'
                        } text-white font-medium text-center`}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">Subir Imagen</span>
                          </>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAvatarSelfie(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 lg:px-4 lg:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all font-medium text-sm lg:text-base"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="sm:hidden">IA</span>
                        <span className="hidden sm:inline">Avatar con IA</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">JPG, PNG o GIF (máx. 5MB)</p>
                  </div>
                  
                  <div className="w-full lg:flex-1 bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-indigo-300 mb-1">💡 Consejo Profesional</p>
                    <p className="text-xs text-slate-300">
                      Usa una foto profesional con buena iluminación, fondo neutral y vestimenta formal. 
                      Una imagen de calidad genera hasta 70% más confianza.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: NIVEL Y ESPECIALIDADES */}
        <section className="bg-slate-800 p-4 lg:p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-lg lg:text-xl font-bold text-white mb-4 lg:mb-6">
            <Briefcase className="text-purple-400" /> Especialidades
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4">
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
        <section className="bg-slate-800 p-4 lg:p-6 rounded-2xl border border-slate-700">
          <h2 className="flex items-center gap-2 text-lg lg:text-xl font-bold text-white mb-4 lg:mb-6">
            <FileText className="text-purple-400" /> Biografía y Presentación
          </h2>
          <div className="space-y-4">
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
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">
                Visión Personal
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Tu visión personal y profesional a largo plazo
              </p>
              <textarea 
                name="vision" 
                rows={4} 
                value={formData.vision} 
                onChange={handleChange} 
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Describe tu visión personal y profesional..."
              ></textarea>
            </div>
          </div>
        </section>

        {/* NOTA: Secciones de Ubicación/Configuración y Comisiones están ocultas para el rol LIDER
            Los líderes no manejan precios ni comisiones, solo gestionan su equipo interno */}
        
        {/* BOTONES DE ACCIÓN AL FINAL */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={initialLoading || loading || !isFormValid()}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 lg:py-3 lg:px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base w-full sm:w-auto"
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
          <button
            onClick={solicitarAprobacion}
            disabled={initialLoading || solicitandoAprobacion || profileApprovalStatus === 'PENDING' || profileApprovalStatus === 'APPROVED' || !isFormValid()}
            className={`flex items-center justify-center gap-2 font-bold py-2.5 px-4 lg:py-3 lg:px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm lg:text-base w-full sm:w-auto ${
              profileApprovalStatus === 'PENDING' 
                ? 'bg-gradient-to-r from-yellow-600 to-amber-600 shadow-yellow-500/30' 
                : profileApprovalStatus === 'APPROVED'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-500/30'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/30'
            } text-white`}
          >
            {solicitandoAprobacion ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : profileApprovalStatus === 'PENDING' ? (
              <>
                <Loader2 className="w-5 h-5" />
                🔍 En Revisión
              </>
            ) : profileApprovalStatus === 'APPROVED' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                ✅ Perfil Aprobado
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Solicitar Aprobación
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quantum Bio-Writer Modal */}
      <QuantumBioWriter
        isOpen={showQuantumBio}
        onClose={() => setShowQuantumBio(false)}
        onComplete={async (result) => {
          // Actualizar el formulario con los datos generados
          const updatedFormData = {
            ...formData,
            // Biografías
            biografiaCompleta: result.heroJourneyBio,
            biografia: result.promiseStatement,
            biografiaCorta: result.tagline,
            vision: result.vision,
            // Títulos
            jobTitle: result.jobTitle,
            titulo: result.mentorTitle,
            // Especialidades
            especialidad: result.mainSpecialty,
            especialidadesSecundariasInput: result.secondarySpecialties.join(', '),
            // Habilidades y logros
            skillsInput: result.keySkills.join(', '),
            logrosInput: result.achievements.join(', '),
          };
          
          setFormData(updatedFormData);
          setShowQuantumBio(false);
          
          // Auto-guardar inmediatamente para no perder los datos
          setLoading(true);
          setShowSuccess(false);
          setShowError(false);
          
          try {
            const dataToSend = {
              usuario: {
                jobTitle: updatedFormData.jobTitle,
                profileImage: updatedFormData.profileImage,
                experienceYears: Number(updatedFormData.experienceYears),
                skills: updatedFormData.skillsInput.split(',').map(s => s.trim()).filter(s => s),
                vision: updatedFormData.vision,
                sede: updatedFormData.sede
              },
              perfilMentor: {
                titulo: updatedFormData.titulo,
                especialidad: updatedFormData.especialidad,
                especialidadesSecundarias: updatedFormData.especialidadesSecundariasInput.split(',').map(s => s.trim()).filter(s => s),
                biografia: updatedFormData.biografia,
                biografiaCorta: updatedFormData.biografiaCorta,
                biografiaCompleta: updatedFormData.biografiaCompleta,
                logros: updatedFormData.logrosInput.split(',').map(s => s.trim()).filter(s => s),
                experienciaAnios: Number(updatedFormData.experienciaAnios),
                precioBase: Number(updatedFormData.precioBase),
                disponible: updatedFormData.disponible,
                enlaceVideoLlamada: updatedFormData.enlaceVideoLlamada,
                tipoVideoLlamada: updatedFormData.tipoVideoLlamada
              }
            };

            console.log('🤖 Auto-guardando datos de Quantum:', dataToSend);

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
            console.error('Error en auto-guardado:', error);
            setShowError(true);
            setTimeout(() => setShowError(false), 5000);
          } finally {
            setLoading(false);
          }
        }}
      />

      {showAvatarSelfie && (
        <MentorAvatarSelfie
          isOpen={showAvatarSelfie}
          onClose={() => setShowAvatarSelfie(false)}
          onAvatarGenerated={(url) => {
            setFormData(prev => ({ ...prev, profileImage: url }));
            setShowAvatarSelfie(false);
          }}
        />
      )}
    </div>
  );
}
