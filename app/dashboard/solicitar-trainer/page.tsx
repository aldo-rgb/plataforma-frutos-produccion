'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Dumbbell, ArrowLeft, Upload, CheckCircle, Loader2,
  Star, Users, TrendingUp, Calendar, AlertCircle, X
} from 'lucide-react';
import Link from 'next/link';

interface TrainerApplication {
  id: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  rejectionReason?: string;
}

export default function SolicitarTrainerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [existingApplication, setExistingApplication] = useState<TrainerApplication | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    especialidad: '',
    especialidadOtra: '',
    especialidadesSecundarias: [] as string[],
    experienciaAnios: 0,
    biografiaCompleta: '',
    logros: [] as string[],
    expertiseTags: [] as string[],
    documentosUrls: [] as string[],
    videoIntroUrl: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const especialidades = [
    'Transformación Cuántica',
    'Transformación Personal',
    'Liderazgo y Desarrollo',
    'Coaching de Equipos',
    'Bienestar Integral',
    'Productividad y Hábitos',
    'Inteligencia Emocional',
    'Comunicación Efectiva',
    'Desarrollo Espiritual',
    'Otros'
  ];

  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/trainer/application/check');
      const data = await response.json();
      
      if (data.hasApplication) {
        setExistingApplication(data.application);
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.titulo) newErrors.titulo = 'El título es requerido';
      if (!formData.especialidad) newErrors.especialidad = 'La especialidad es requerida';
      if (formData.especialidad === 'Otros' && !formData.especialidadOtra) {
        newErrors.especialidadOtra = 'Especifica tu especialidad';
      }
      if (formData.experienciaAnios < 1) newErrors.experienciaAnios = 'Mínimo 1 año de experiencia';
      const wordCount = formData.biografiaCompleta.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (!formData.biografiaCompleta || wordCount < 20) {
        newErrors.biografiaCompleta = 'Mínimo 20 palabras para tu biografía';
      }
    }
    
    if (step === 2) {
      if (formData.logros.length === 0) {
        newErrors.logros = 'Agrega al menos un logro';
      }
      if (formData.expertiseTags.length === 0) {
        newErrors.expertiseTags = 'Agrega al menos una habilidad';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert('Por favor completa todos los campos requeridos correctamente');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/trainer/application/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar solicitud');
      }
      
      if (data.application) {
        setExistingApplication(data.application);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = (field: 'logros' | 'expertiseTags' | 'especialidadesSecundarias', value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
  };

  const removeItem = (field: 'logros' | 'expertiseTags' | 'especialidadesSecundarias', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadingDocs(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) {
          alert(`El archivo ${file.name} es muy grande. Máximo 5MB.`);
          continue;
        }
        
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          alert(`El archivo ${file.name} no es un tipo válido. Solo PDF, JPG o PNG.`);
          continue;
        }
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('bucket', 'trainer-documents');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData
        });
        
        if (!response.ok) {
          throw new Error(`Error al subir ${file.name}`);
        }
        
        const data = await response.json();
        uploadedUrls.push(data.url);
      }
      
      setFormData(prev => ({
        ...prev,
        documentosUrls: [...prev.documentosUrls, ...uploadedUrls]
      }));
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert(error.message || 'Error al subir archivos');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentosUrls: prev.documentosUrls.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Si ya tiene una aplicación
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
          
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-8 text-center shadow-2xl">
            {existingApplication.status === 'PENDING' && (
              <>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Calendar className="w-10 h-10 text-yellow-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Solicitud en Revisión</h2>
                <p className="text-slate-400 mb-4 text-lg">
                  Tu solicitud para ser entrenador está siendo revisada por nuestro equipo.
                </p>
                <p className="text-slate-500 mb-6">
                  El proceso de revisión toma entre 3-5 días hábiles. Te notificaremos por correo electrónico.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400">
                    <strong className="text-white">Fecha de solicitud:</strong>{' '}
                    {new Date(existingApplication.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </>
            )}
            
            {existingApplication.status === 'APPROVED' && (
              <>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">¡Felicidades, eres Entrenador!</h2>
                <p className="text-slate-400 mb-6 text-lg">
                  Tu solicitud fue aprobada. Ya puedes acceder a todas las funciones de entrenador.
                </p>
                <Link
                  href="/dashboard/trainer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <Dumbbell className="w-5 h-5" />
                  Ir a Panel de Entrenador
                </Link>
              </>
            )}
            
            {existingApplication.status === 'REJECTED' && (
              <>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Solicitud No Aprobada</h2>
                <p className="text-slate-400 mb-4 text-lg">
                  Lamentablemente tu solicitud no fue aprobada en este momento.
                </p>
                {existingApplication.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <p className="text-red-300 text-sm">
                      <strong>Motivo:</strong> {existingApplication.rejectionReason}
                    </p>
                  </div>
                )}
                <p className="text-slate-500">
                  Puedes aplicar nuevamente después de 3 meses o contactar al equipo de soporte.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/configuracion" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Configuración
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/20 rounded-2xl mb-4">
            <Dumbbell className="w-10 h-10 text-orange-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Soy Entrenador</h1>
          <p className="text-slate-400 text-lg">Programa de Transformación</p>
        </div>

        {/* Beneficios */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Facilita Entrenamientos</h3>
            <p className="text-slate-400 text-sm">Guía a participantes en su transformación</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Herramientas Exclusivas</h3>
            <p className="text-slate-400 text-sm">Accede al panel de entrenador</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Sin Costo</h3>
            <p className="text-slate-400 text-sm">Aplica sin cuota de membresía</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentStep >= step ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 rounded ${currentStep > step ? 'bg-orange-600' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-8 shadow-2xl">
          {/* Step 1: Información Básica */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Información Básica</h2>
              
              <div>
                <label className="block text-slate-300 mb-2">Título Profesional *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className={`w-full px-4 py-3 bg-slate-800 border ${errors.titulo ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:border-orange-500 focus:outline-none`}
                  placeholder="Ej: Coach de Transformación, Facilitador de Cambio"
                />
                {errors.titulo && <p className="text-red-400 text-sm mt-1">{errors.titulo}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Especialidad Principal *</label>
                <select
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  className={`w-full px-4 py-3 bg-slate-800 border ${errors.especialidad ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:border-orange-500 focus:outline-none`}
                >
                  <option value="">Selecciona una especialidad</option>
                  {especialidades.map((esp) => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
                {errors.especialidad && <p className="text-red-400 text-sm mt-1">{errors.especialidad}</p>}
              </div>

              {formData.especialidad === 'Otros' && (
                <div>
                  <label className="block text-slate-300 mb-2">Especifica tu especialidad *</label>
                  <input
                    type="text"
                    value={formData.especialidadOtra}
                    onChange={(e) => setFormData({ ...formData, especialidadOtra: e.target.value })}
                    className={`w-full px-4 py-3 bg-slate-800 border ${errors.especialidadOtra ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:border-orange-500 focus:outline-none`}
                    placeholder="Describe tu especialidad"
                  />
                  {errors.especialidadOtra && <p className="text-red-400 text-sm mt-1">{errors.especialidadOtra}</p>}
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-2">Años de Experiencia *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.experienciaAnios}
                  onChange={(e) => setFormData({ ...formData, experienciaAnios: parseInt(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 bg-slate-800 border ${errors.experienciaAnios ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:border-orange-500 focus:outline-none`}
                />
                {errors.experienciaAnios && <p className="text-red-400 text-sm mt-1">{errors.experienciaAnios}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-2">
                  Tu Historia / Biografía * (mín. 20 palabras)
                </label>
                <textarea
                  value={formData.biografiaCompleta}
                  onChange={(e) => setFormData({ ...formData, biografiaCompleta: e.target.value })}
                  rows={6}
                  className={`w-full px-4 py-3 bg-slate-800 border ${errors.biografiaCompleta ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none`}
                  placeholder="Cuéntanos sobre ti, tu experiencia y por qué quieres ser entrenador..."
                />
                <p className="text-slate-500 text-sm mt-1">
                  {formData.biografiaCompleta.trim().split(/\s+/).filter(w => w.length > 0).length} palabras
                </p>
                {errors.biografiaCompleta && <p className="text-red-400 text-sm mt-1">{errors.biografiaCompleta}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Experiencia y Logros */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Experiencia y Logros</h2>
              
              <div>
                <label className="block text-slate-300 mb-2">Logros Destacados *</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    id="logro-input"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Ej: Certificación en PNL"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('logros', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('logro-input') as HTMLInputElement;
                      addItem('logros', input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.logros.map((logro, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm flex items-center gap-2">
                      {logro}
                      <button onClick={() => removeItem('logros', i)} className="hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.logros && <p className="text-red-400 text-sm mt-1">{errors.logros}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Habilidades y Expertise *</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    id="skill-input"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Ej: Facilitación grupal"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('expertiseTags', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('skill-input') as HTMLInputElement;
                      addItem('expertiseTags', input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.expertiseTags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm flex items-center gap-2">
                      {tag}
                      <button onClick={() => removeItem('expertiseTags', i)} className="hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.expertiseTags && <p className="text-red-400 text-sm mt-1">{errors.expertiseTags}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Especialidades Secundarias (opcional)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    id="esp-sec-input"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Ej: Meditación"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('especialidadesSecundarias', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('esp-sec-input') as HTMLInputElement;
                      addItem('especialidadesSecundarias', input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.especialidadesSecundarias.map((esp, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2">
                      {esp}
                      <button onClick={() => removeItem('especialidadesSecundarias', i)} className="hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documentos y Confirmación */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Documentación y Confirmación</h2>
              
              <div>
                <label className="block text-slate-300 mb-2">Documentos de Soporte (opcional)</label>
                <p className="text-slate-500 text-sm mb-3">
                  Sube certificaciones, diplomas o documentos que respalden tu experiencia. Formatos: PDF, JPG, PNG (máx 5MB c/u)
                </p>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-orange-500/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="doc-upload"
                    disabled={uploadingDocs}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    {uploadingDocs ? (
                      <Loader2 className="w-10 h-10 text-orange-400 mx-auto mb-2 animate-spin" />
                    ) : (
                      <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    )}
                    <p className="text-slate-400">
                      {uploadingDocs ? 'Subiendo...' : 'Haz clic para subir documentos'}
                    </p>
                  </label>
                </div>
                
                {formData.documentosUrls.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.documentosUrls.map((url, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                        <span className="text-slate-300 text-sm truncate">Documento {i + 1}</span>
                        <button
                          onClick={() => removeDocument(i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Video de Presentación (opcional)</label>
                <input
                  type="url"
                  value={formData.videoIntroUrl}
                  onChange={(e) => setFormData({ ...formData, videoIntroUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              {/* Resumen */}
              <div className="bg-slate-800/50 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Resumen de tu Solicitud</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-400">Título:</span> <span className="text-white">{formData.titulo}</span></p>
                  <p><span className="text-slate-400">Especialidad:</span> <span className="text-white">{formData.especialidad === 'Otros' ? formData.especialidadOtra : formData.especialidad}</span></p>
                  <p><span className="text-slate-400">Experiencia:</span> <span className="text-white">{formData.experienciaAnios} años</span></p>
                  <p><span className="text-slate-400">Logros:</span> <span className="text-white">{formData.logros.length}</span></p>
                  <p><span className="text-slate-400">Habilidades:</span> <span className="text-white">{formData.expertiseTags.length}</span></p>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-300 text-sm">
                  <strong>✓ Sin costo de aplicación</strong> - Tu solicitud será revisada por el equipo de administración en un plazo de 3-5 días hábiles.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Anterior
              </button>
            ) : (
              <div />
            )}
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg transition-all"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Enviar Solicitud
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">¡Solicitud Enviada!</h2>
            <p className="text-slate-400 mb-6">
              Tu solicitud para ser entrenador ha sido enviada exitosamente. 
              Te notificaremos por correo electrónico cuando sea revisada.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-lg transition-all hover:from-orange-500 hover:to-amber-500"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
