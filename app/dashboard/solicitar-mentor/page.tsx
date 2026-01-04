'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, ArrowLeft, Upload, CheckCircle, Loader2,
  Star, Users, TrendingUp, Calendar, DollarSign, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface MentorApplication {
  id: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function SolicitarMentorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [existingApplication, setExistingApplication] = useState<MentorApplication | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Información Básica
    titulo: '',
    especialidad: '',
    especialidadOtra: '', // Campo para especialidad personalizada
    especialidadesSecundarias: [] as string[],
    experienciaAnios: 0,
    biografiaCompleta: '', // Historia completa
    
    // Experiencia y Logros
    logros: [] as string[],
    expertiseTags: [] as string[],
    
    // Documentos de soporte
    documentosUrls: [] as string[],
    
    // Video de presentación (opcional)
    videoIntroUrl: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/mentor/application/check');
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
      if (!formData.biografiaCompleta || formData.biografiaCompleta.length < 200) {
        newErrors.biografiaCompleta = 'Mínimo 200 caracteres para tu biografía';
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
      // Scroll al primer error
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
      console.log('Enviando solicitud...', formData);
      
      // 1. Guardar la aplicación
      const response = await fetch('/api/mentor/application/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar solicitud');
      }
      
      // 2. Redirigir a checkout de Stripe
      if (data.checkoutUrl) {
        console.log('Redirigiendo a Stripe:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      } else {
        console.error('No se recibió checkoutUrl:', data);
        throw new Error('URL de pago no disponible. Por favor contacta al soporte.');
      }
    } catch (error: any) {
      console.error('Error completo:', error);
      alert(error.message || 'Error al procesar la solicitud');
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
        
        // Validar tamaño (máx 5MB por archivo)
        if (file.size > 5 * 1024 * 1024) {
          alert(`El archivo ${file.name} es muy grande. Máximo 5MB.`);
          continue;
        }
        
        // Validar tipo
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          alert(`El archivo ${file.name} no es un tipo válido. Solo PDF, JPG o PNG.`);
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'mentor-documents');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
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
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Si ya tiene una aplicación
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
          
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-8 text-center shadow-2xl">
            {(existingApplication.status === 'PENDING' || existingApplication.status === 'DRAFT') && (
              <>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Calendar className="w-10 h-10 text-yellow-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  {existingApplication.status === 'DRAFT' ? 'Pago Pendiente' : 'Solicitud en Proceso de Revisión'}
                </h2>
                <p className="text-slate-400 mb-4 text-lg">
                  {existingApplication.status === 'DRAFT' 
                    ? 'Tu solicitud está pendiente de pago. Completa el pago para enviarla a revisión.'
                    : 'Tu solicitud para ser mentor está siendo revisada por nuestro equipo de administración.'
                  }
                </p>
                {existingApplication.status === 'PENDING' && (
                  <p className="text-slate-500 mb-6">
                    El proceso de revisión toma entre 3-5 días hábiles. Te notificaremos por correo electrónico cuando tengamos una respuesta.
                  </p>
                )}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-400">
                    <strong className="text-white">Fecha de solicitud:</strong>{' '}
                    {new Date(existingApplication.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    <strong className="text-white">Estado:</strong>{' '}
                    <span className={existingApplication.status === 'DRAFT' ? 'text-yellow-400' : 'text-green-400'}>
                      {existingApplication.status === 'DRAFT' ? 'Borrador - Pago Pendiente' : 'En Revisión'}
                    </span>
                  </p>
                </div>
                
                {/* Botón de simulación de pago - Solo en desarrollo */}
                {existingApplication.status === 'DRAFT' && process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={async () => {
                      if (confirm('¿Simular pago para esta solicitud?')) {
                        try {
                          const res = await fetch('/api/mentor/application/simulate-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ applicationId: existingApplication.id })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert('✅ Pago simulado exitosamente. Recargando página...');
                            window.location.reload();
                          } else {
                            alert('❌ Error: ' + data.error);
                          }
                        } catch (error) {
                          alert('❌ Error al simular pago');
                        }
                      }
                    }}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    🧪 Simular Pago (Dev)
                  </button>
                )}
              </>
            )}
            
            {existingApplication.status === 'APPROVED' && (
              <>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">¡Felicidades, eres Mentor de Quantum Matter!</h2>
                <p className="text-slate-400 mb-6 text-lg">
                  Tu solicitud fue aprobada. Ya puedes acceder a todas las funciones de mentor.
                </p>
                <Link
                  href="/dashboard/mentor"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <GraduationCap className="w-5 h-5" />
                  Ir a Panel de Mentor
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
                <p className="text-slate-500 mb-6">
                  Puedes aplicar nuevamente después de 3 meses o contactar al equipo de soporte para más información.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/configuracion" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a Configuración
        </Link>
        
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <GraduationCap className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Solicitar ser Mentor</h1>
              <p className="text-slate-400">Comparte tu experiencia y transforma vidas</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 max-w-md mx-auto mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                  currentStep >= step
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-purple-600' : 'bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-slate-400">
            Paso {currentStep} de 3: {
              currentStep === 1 ? 'Información Básica y Biografía' :
              currentStep === 2 ? 'Experiencia y Portafolio' :
              'Revisión y Pago'
            }
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 sm:p-8 shadow-xl">
          {/* Step 1: Información Básica */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Información Básica</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título Profesional *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Coach Certificado en"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                {errors.titulo && <p className="text-red-400 text-sm mt-1">{errors.titulo}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Especialidad Principal *
                </label>
                <select
                  value={formData.especialidad}
                  onChange={(e) => {
                    setFormData({ ...formData, especialidad: e.target.value, especialidadOtra: '' });
                    if (e.target.value !== 'Otros') {
                      setErrors({ ...errors, especialidadOtra: '' });
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Selecciona una especialidad</option>
                  <option value="Desarrollo Personal">Desarrollo Personal</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Relaciones">Relaciones</option>
                  <option value="Salud y Bienestar">Salud y Bienestar</option>
                  <option value="Negocios">Negocios</option>
                  <option value="Espiritualidad">Espiritualidad</option>
                  <option value="Liderazgo">Liderazgo</option>
                  <option value="Otros">Otros</option>
                </select>
                {errors.especialidad && <p className="text-red-400 text-sm mt-1">{errors.especialidad}</p>}
              </div>
              
              {formData.especialidad === 'Otros' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Especifica tu especialidad *
                  </label>
                  <input
                    type="text"
                    value={formData.especialidadOtra}
                    onChange={(e) => setFormData({ ...formData, especialidadOtra: e.target.value })}
                    placeholder="Ej: Coach de Productividad, Mentoría Académica, etc."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  {errors.especialidadOtra && <p className="text-red-400 text-sm mt-1">{errors.especialidadOtra}</p>}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Años de Experiencia *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.experienciaAnios}
                  onChange={(e) => setFormData({ ...formData, experienciaAnios: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
                {errors.experienciaAnios && <p className="text-red-400 text-sm mt-1">{errors.experienciaAnios}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Biografía Completa * (mín. 200 caracteres)
                </label>
                <textarea
                  value={formData.biografiaCompleta}
                  onChange={(e) => setFormData({ ...formData, biografiaCompleta: e.target.value })}
                  placeholder="Cuéntanos tu historia, cómo llegaste aquí, qué te motiva a ser mentor..."
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className={errors.biografiaCompleta ? 'text-red-400' : 'text-slate-500'}>
                    {errors.biografiaCompleta || 'Comparte tu experiencia y filosofía como mentor'}
                  </span>
                  <span className="text-slate-500">{formData.biografiaCompleta.length} caracteres</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Experiencia y Portafolio */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Experiencia y Portafolio</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Logros y Certificaciones *
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    id="logro-input"
                    placeholder="Agrega un logro o certificación"
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        addItem('logros', input.value);
                        input.value = '';
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.logros.map((logro, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                    >
                      {logro}
                      <button
                        type="button"
                        onClick={() => removeItem('logros', index)}
                        className="hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {errors.logros && <p className="text-red-400 text-sm mt-2">{errors.logros}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Habilidades y Expertise *
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    id="skill-input"
                    placeholder="Agrega una habilidad"
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        addItem('expertiseTags', input.value);
                        input.value = '';
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.expertiseTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeItem('expertiseTags', index)}
                        className="hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {errors.expertiseTags && <p className="text-red-400 text-sm mt-2">{errors.expertiseTags}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Documentos de Soporte (opcional)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Certificaciones, títulos, portafolio, etc. (PDF, JPG, PNG - Máx 5MB cada uno)
                </p>
                <div className="space-y-3">
                  <label className="block w-full cursor-pointer">
                    <div className="flex items-center justify-center gap-3 px-4 py-6 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg hover:border-purple-500 transition">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-400">
                        {uploadingDocs ? 'Subiendo archivos...' : 'Click para subir documentos'}
                      </span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      disabled={uploadingDocs}
                      className="hidden"
                    />
                  </label>
                  
                  {formData.documentosUrls.length > 0 && (
                    <div className="space-y-2">
                      {formData.documentosUrls.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-300">
                              Documento {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Video de Presentación (opcional)
                </label>
                <input
                  type="url"
                  value={formData.videoIntroUrl}
                  onChange={(e) => setFormData({ ...formData, videoIntroUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Revisión y Pago */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Revisión y Pago</h2>
              
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Resumen de tu Solicitud</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Título:</span>
                    <span className="text-white font-medium">{formData.titulo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Especialidad:</span>
                    <span className="text-white font-medium">{formData.especialidad}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Experiencia:</span>
                    <span className="text-white font-medium">{formData.experienciaAnios} años</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Logros agregados:</span>
                    <span className="text-white font-medium">{formData.logros.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <DollarSign className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Inversión Única</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      La afiliación de mentor tiene un costo anual de <span className="text-purple-400 font-bold">$999 MXN</span>.
                      Este pago incluye:
                    </p>
                    <ul className="text-sm text-slate-300 space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Revisión completa de tu perfil y soporte de Quantum AI para crear un perfil extraordinario.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Acceso a plataforma de mentoría
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Capacitación inicial
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Soporte continuo
                      </li>
                    </ul>
                    <div className="text-2xl font-bold text-white">
                      $999 <span className="text-sm text-slate-400 font-normal">MXN (pago anual)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Proceso de Aprobación</p>
                    <p>
                      Una vez realizado el pago, tu solicitud será revisada por nuestro equipo. 
                      El proceso toma entre 3-5 días hábiles. Te notificaremos por correo el resultado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Proceder al Pago
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
