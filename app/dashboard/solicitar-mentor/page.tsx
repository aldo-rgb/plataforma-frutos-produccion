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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [licenseCode, setLicenseCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  
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

  useEffect(() => {
    console.log('🔷 showCodeModal cambió a:', showCodeModal);
  }, [showCodeModal]);

  useEffect(() => {
    console.log('🔶 showPaymentModal cambió a:', showPaymentModal);
  }, [showPaymentModal]);

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

  const validateLicenseCode = async () => {
    if (!licenseCode.trim()) return;

    setValidatingCode(true);
    try {
      const response = await fetch('/api/mentor/application/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: licenseCode })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ ${data.error}\n${data.message || ''}`);
        return;
      }

      // Éxito - mostrar modal personalizado
      setShowCodeModal(false);
      setLicenseCode('');
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error validando código:', error);
      alert('❌ Error al validar el código. Por favor intenta de nuevo.');
    } finally {
      setValidatingCode(false);
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
      
      // 1. Guardar la aplicación como DRAFT
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
      
      // 2. Actualizar la aplicación existente y mostrar modal de opciones de pago
      if (data.application) {
        setExistingApplication(data.application);
        setSubmitting(false);
        setShowPaymentModal(true); // Abrir modal de opciones de pago
      } else {
        throw new Error('No se pudo crear la aplicación. Por favor contacta al soporte.');
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
                
                {/* Botón para completar el pago */}
                {existingApplication.status === 'DRAFT' && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                    >
                      <DollarSign className="w-5 h-5" />
                      Completar Pago
                    </button>
                  </div>
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

        {/* Modal de opciones de pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 relative">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="text-center text-white">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-bold mb-3">Membresía de Mentor</h2>
                  <p className="text-white/90 text-lg mb-4">Quantum Matter - Certificación Profesional</p>
                  <div className="inline-block bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                    <div className="text-5xl font-bold">$300</div>
                    <div className="text-sm text-white/80">USD / Anual</div>
                  </div>
                </div>
              </div>

              {/* Cuerpo del modal */}
              <div className="p-8 bg-slate-900">
                {/* Título de sección */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Selecciona tu método de pago</h3>
                  <p className="text-slate-400">Elige la opción que prefieras para completar tu membresía</p>
                </div>

                {/* Grid de opciones de pago */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {/* Stripe */}
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        const response = await fetch('/api/mentor/application/create-checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            applicationId: existingApplication?.id,
                            paymentMethod: 'stripe'
                          })
                        });
                        
                        const data = await response.json();
                        
                        if (!response.ok) {
                          throw new Error(data.error || 'Error al crear sesión de pago');
                        }
                        
                        if (data.checkoutUrl) {
                          window.location.href = data.checkoutUrl;
                        } else {
                          throw new Error('URL de pago no disponible');
                        }
                      } catch (error: any) {
                        console.error('Error:', error);
                        alert(error.message || 'Error al procesar el pago');
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="group relative bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 text-white p-6 rounded-2xl transition-all transform hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:transform-none border-2 border-indigo-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="5" width="20" height="14" rx="2" fill="#635BFF"/>
                            <path d="M8 15h8M8 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg">Stripe</div>
                          <div className="text-sm text-indigo-100">Tarjeta de crédito</div>
                        </div>
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Recomendado</span>
                    </div>
                    <div className="text-sm text-indigo-100">
                      • Procesamiento instantáneo<br/>
                      • Acepta Visa, Mastercard, Amex<br/>
                      • Pago seguro internacional
                    </div>
                    {submitting && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => alert('🚧 PayPal estará disponible próximamente')}
                    className="relative bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl opacity-50 cursor-not-allowed border-2 border-blue-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#003087">
                            <path d="M8.32 21.97a.546.546 0 01-.538-.458L5.003 6.37a.546.546 0 01.538-.635h5.2c3.377 0 5.2 1.674 5.2 4.573 0 3.503-2.24 5.733-5.824 5.733H8.11l-.672 4.904a.546.546 0 01-.538.458l.42-3.433z"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg">PayPal</div>
                          <div className="text-sm text-blue-100">Cuenta PayPal</div>
                        </div>
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Próximamente</span>
                    </div>
                    <div className="text-sm text-blue-100">
                      • Pago rápido y seguro<br/>
                      • Sin compartir datos bancarios<br/>
                      • Disponible globalmente
                    </div>
                  </button>

                  {/* Mercado Pago */}
                  <button
                    onClick={() => alert('🚧 Mercado Pago estará disponible próximamente')}
                    className="relative bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-6 rounded-2xl opacity-50 cursor-not-allowed border-2 border-cyan-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#009EE3">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg">Mercado Pago</div>
                          <div className="text-sm text-cyan-100">Pago local</div>
                        </div>
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Latinoamérica</span>
                    </div>
                    <div className="text-sm text-cyan-100">
                      • Pago en tu moneda local<br/>
                      • Transferencia o tarjeta<br/>
                      • Cuotas sin interés
                    </div>
                  </button>

                  {/* Código de Licencia */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔵 Click en botón Código');
                      console.log('🔵 showPaymentModal antes:', showPaymentModal);
                      console.log('🔵 showCodeModal antes:', showCodeModal);
                      console.log('🔵 Cerrando modal de pago...');
                      setShowPaymentModal(false);
                      console.log('🔵 Esperando 150ms...');
                      setTimeout(() => {
                        console.log('🔵 Dentro del setTimeout - Abriendo modal de código...');
                        console.log('🔵 showCodeModal justo antes de cambiar:', showCodeModal);
                        setShowCodeModal(true);
                        console.log('🔵 setShowCodeModal(true) ejecutado');
                      }, 150);
                    }}
                    className="relative bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-2xl hover:scale-105 transition-all duration-200 border-2 border-amber-400/30 hover:border-amber-300/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg">Código</div>
                          <div className="text-sm text-amber-100">Licencia especial</div>
                        </div>
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Especial</span>
                    </div>
                    <div className="text-sm text-amber-100">
                      • Código promocional<br/>
                      • Licencia corporativa<br/>
                      • Acceso inmediato
                    </div>
                  </button>
                </div>

                {/* Footer con garantía */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white mb-2 text-lg">Pago 100% Seguro</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Todos los pagos están protegidos con encriptación de nivel bancario (SSL 256-bit). 
                        Tu información nunca es almacenada en nuestros servidores. Después del pago exitoso, 
                        tu solicitud será revisada en <strong className="text-white">24-48 horas</strong> y recibirás una notificación por correo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Código de Licencia - Global para existingApplication */}
        {showCodeModal && (() => {
          console.log('🟢 MODAL DE CÓDIGO ESTÁ RENDERIZANDO (existingApplication)');
          return (
          <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300"
            onClick={(e) => {
              console.log('🔴 Click en overlay del modal de código');
              if (e.target === e.currentTarget) {
                console.log('🔴 Cerrando modal de código');
                setShowCodeModal(false);
                setLicenseCode('');
              }
            }}
          >
            <div 
              className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl max-w-lg w-full shadow-2xl border border-amber-500/20 overflow-hidden animate-in zoom-in-95 duration-300"
              onClick={(e) => {
                console.log('🟡 Click dentro del modal de código (no debería cerrar)');
                e.stopPropagation();
              }}
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -z-10"></div>
              
              {/* Header */}
              <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-8">
                <button
                  onClick={() => {
                    setShowCodeModal(false);
                    setLicenseCode('');
                  }}
                  className="absolute top-5 right-5 text-white/80 hover:text-white transition-all p-2 hover:bg-white/10 rounded-xl hover:rotate-90 duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="text-center text-white">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                      <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
                    Código de Licencia
                  </h3>
                  <p className="text-white/90 text-sm font-medium">
                    Ingresa tu código especial para continuar
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 relative">
                <div className="mb-6">
                  <label className="block text-white font-bold mb-3 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Código de Licencia
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={licenseCode}
                      onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full px-5 py-4 bg-slate-800/80 border-2 border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-mono text-center text-xl tracking-widest hover:bg-slate-800 shadow-inner"
                      maxLength={19}
                      autoFocus
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  {licenseCode && (
                    <p className="text-xs text-slate-400 mt-2 text-center animate-in fade-in slide-in-from-top-1 duration-300">
                      {licenseCode.length} / 19 caracteres
                    </p>
                  )}
                </div>

                {/* Info */}
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 mb-6 border border-slate-700/50 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-sm text-slate-300">
                      <p className="font-bold text-white mb-2 text-base">Códigos válidos:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>Códigos promocionales</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>Licencias corporativas</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                          <span>Códigos de evento</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCodeModal(false);
                      setLicenseCode('');
                    }}
                    className="flex-1 px-5 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-slate-700/50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={validateLicenseCode}
                    disabled={!licenseCode.trim() || validatingCode}
                    className="flex-1 px-5 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:via-orange-500 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-600 text-white rounded-2xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl hover:shadow-amber-500/50 disabled:hover:scale-100"
                  >
                    {validatingCode ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Validar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    );
  }

  // Modal de éxito
  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[80] p-4 animate-in fade-in duration-300">
        <div className="bg-gradient-to-br from-green-900/40 via-slate-900 to-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-green-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
          
          {/* Content */}
          <div className="relative p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-lg animate-in zoom-in duration-500 delay-150">
              <CheckCircle className="w-12 h-12 text-green-400 animate-in zoom-in duration-700 delay-300" />
            </div>
            
            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-3 animate-in slide-in-from-bottom-4 duration-500 delay-200">
              ¡Código validado exitosamente!
            </h3>
            
            {/* Message */}
            <p className="text-slate-300 mb-6 text-base leading-relaxed animate-in slide-in-from-bottom-4 duration-500 delay-300">
              Tu solicitud está ahora en <span className="text-green-400 font-semibold">revisión</span>. 
              Te notificaremos cuando sea aprobada.
            </p>
            
            {/* Info box */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50 animate-in slide-in-from-bottom-4 duration-500 delay-400">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left text-sm text-slate-300">
                  <p className="font-semibold text-white mb-1">Próximos pasos:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      <span>Revisaremos tu solicitud en 24-48 horas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      <span>Recibirás una notificación por email</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      <span>Podrás acceder a tu panel de mentor</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                window.location.reload();
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-500 hover:via-emerald-500 hover:to-green-500 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl hover:shadow-green-500/50 animate-in slide-in-from-bottom-4 duration-500 delay-500"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
        
        <div className="mb-4 sm:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
            <div className="text-left sm:text-center">
              <h1 className="text-xl sm:text-3xl font-bold text-white">WIZARD MENTORES</h1>
              <p className="text-xs sm:text-base text-slate-400 hidden sm:block">Múltiples acciones por área</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-0 max-w-xs sm:max-w-md mx-auto mb-2 sm:mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center justify-center">
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm flex-shrink-0 ${
                  currentStep >= step
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 sm:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 flex-shrink-0 ${
                    currentStep > step ? 'bg-purple-600' : 'bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center text-xs sm:text-sm text-slate-400">
            <span className="font-semibold">Paso {currentStep}/3:</span>{' '}
            <span className="hidden sm:inline">{
              currentStep === 1 ? 'Información Básica y Biografía' :
              currentStep === 2 ? 'Experiencia y Portafolio' :
              'Revisión y Pago'
            }</span>
            <span className="sm:hidden">{
              currentStep === 1 ? 'Info Básica' :
              currentStep === 2 ? 'Experiencia' :
              'Revisión'
            }</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-6 lg:p-8 shadow-xl">
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

      {/* Modal de opciones de pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 relative">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-center text-white">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-bold mb-3">Membresía de Mentor</h2>
                <p className="text-white/90 text-lg mb-4">Quantum Matter - Certificación Profesional</p>
                <div className="inline-block bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                  <div className="text-5xl font-bold">$300</div>
                  <div className="text-sm text-white/80">USD / Anual</div>
                </div>
              </div>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-8 bg-slate-900">
              {/* Título de sección */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Selecciona tu método de pago</h3>
                <p className="text-slate-400">Elige la opción que prefieras para completar tu membresía</p>
              </div>

              {/* Grid de opciones de pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Stripe */}
                <button
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      const response = await fetch('/api/mentor/application/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          applicationId: existingApplication?.id,
                          paymentMethod: 'stripe'
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (!response.ok) {
                        throw new Error(data.error || 'Error al crear sesión de pago');
                      }
                      
                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      } else {
                        throw new Error('URL de pago no disponible');
                      }
                    } catch (error: any) {
                      console.error('Error:', error);
                      alert(error.message || 'Error al procesar el pago');
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="group relative bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 disabled:from-slate-800 disabled:to-slate-900 text-white p-6 rounded-2xl transition-all transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 disabled:cursor-not-allowed disabled:transform-none border-2 border-slate-700 hover:border-indigo-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2">
                        <img src="/logos/Stripe.png" alt="Stripe" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-xl text-white">Stripe</div>
                        <div className="text-sm text-slate-400">Tarjeta de crédito</div>
                      </div>
                    </div>
                    <span className="text-xs bg-indigo-500 px-3 py-1 rounded-full font-medium">Recomendado</span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Procesamiento instantáneo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Acepta Visa, Mastercard, Amex</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Pago seguro internacional</span>
                    </div>
                  </div>
                  {submitting && (
                    <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </button>

                {/* PayPal */}
                <button
                  onClick={() => alert('🚧 PayPal estará disponible próximamente')}
                  className="relative bg-gradient-to-br from-slate-800 to-slate-700 text-white p-6 rounded-2xl opacity-50 cursor-not-allowed border-2 border-slate-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2">
                        <img src="/logos/paypal.png" alt="PayPal" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-xl text-white">PayPal</div>
                        <div className="text-sm text-slate-400">Cuenta PayPal</div>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-600 px-3 py-1 rounded-full font-medium">Próximamente</span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>• Pago rápido y seguro</div>
                    <div>• Sin compartir datos bancarios</div>
                    <div>• Disponible globalmente</div>
                  </div>
                </button>

                {/* Mercado Pago */}
                <button
                  onClick={() => alert('🚧 Mercado Pago estará disponible próximamente')}
                  className="relative bg-gradient-to-br from-slate-800 to-slate-700 text-white p-6 rounded-2xl opacity-50 cursor-not-allowed border-2 border-slate-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2">
                        <img src="/logos/mercadopago.png" alt="Mercado Pago" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-xl text-white">Mercado Pago</div>
                        <div className="text-sm text-slate-400">Pago local</div>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-600 px-3 py-1 rounded-full font-medium">Latinoamérica</span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>• Pago en tu moneda local</div>
                    <div>• Transferencia o tarjeta</div>
                    <div>• Cuotas sin interés</div>
                  </div>
                </button>

                {/* Código de Licencia */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟠 Click en botón Código (wizard)');
                    setShowPaymentModal(false);
                    setTimeout(() => {
                      setShowCodeModal(true);
                      console.log('🟠 Modal código abierto (wizard)');
                    }, 150);
                  }}
                  className="relative bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-2xl hover:scale-105 transition-all duration-200 border-2 border-amber-400/30 hover:border-amber-300/50 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-xl text-white">Código</div>
                        <div className="text-sm text-slate-400">Licencia especial</div>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-600 px-3 py-1 rounded-full font-medium">Especial</span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>• Código promocional</div>
                    <div>• Licencia corporativa</div>
                    <div>• Acceso inmediato</div>
                  </div>
                </button>
              </div>

              {/* Footer con garantía */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-2 text-lg">Pago 100% Seguro</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Todos los pagos están protegidos con encriptación de nivel bancario (SSL 256-bit). 
                      Tu información nunca es almacenada en nuestros servidores. Después del pago exitoso, 
                      tu solicitud será revisada en <strong className="text-white">24-48 horas</strong> y recibirás una notificación por correo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }

