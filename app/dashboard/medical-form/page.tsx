'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  AlertTriangle,
  Check,
  Loader2,
  ArrowLeft,
  Phone,
  User,
  FileText,
  Shield,
  Trash2,
  Save,
  CheckCircle,
} from 'lucide-react';

// Traducciones
const translations = {
  es: {
    title: 'Registro Médico',
    subtitle: 'Completa tu información médica para el entrenamiento',
    required: 'Obligatorio para asistir al evento',
    
    // Secciones
    medicalConditions: 'Condiciones Médicas',
    emergencyContact: 'Contacto de Emergencia',
    consent: 'Consentimiento y Firma',
    
    // Preguntas
    questions: {
      hasCurrentIllness: '¿Padece actualmente alguna enfermedad?',
      hasCurrentTreatment: '¿Está bajo tratamiento médico actualmente?',
      takesMedication: '¿Toma algún medicamento?',
      hasAllergies: '¿Es alérgico a algún medicamento o sustancia?',
      hadSurgery: '¿Ha sido operado?',
      wasHospitalized: '¿Ha sido hospitalizado?',
      hasChronicIllness: '¿Padece alguna enfermedad crónica? (diabetes, hipertensión, epilepsia, asma, etc.)',
      hasPhysicalInjury: '¿Tiene alguna lesión física actual?',
      hasActivityRestrictions: '¿Tiene restricciones de actividad física?',
      hasPsychologicalCondition: '¿Tiene alguna condición psicológica/emocional diagnosticada?',
    },
    
    // Placeholders
    placeholders: {
      specifyDetails: 'Especifique detalles...',
      contactName: 'Nombre completo',
      contactRelation: 'Parentesco (ej: Madre, Padre, Esposo/a)',
      contactPhone: 'Teléfono de contacto',
    },
    
    // Consentimiento
    consentText: 'Declaro que la información proporcionada es verídica y completa. Autorizo al equipo organizador a utilizar esta información únicamente para fines de seguridad y atención médica durante el evento.',
    signatureLabel: 'Firma Digital',
    signatureInstructions: 'Dibuja tu firma en el recuadro',
    clearSignature: 'Limpiar',
    
    // Botones
    save: 'Guardar Formulario',
    saving: 'Guardando...',
    back: 'Volver',
    
    // Estados
    completed: '¡Formulario Completado!',
    completedDesc: 'Tu registro médico ha sido guardado exitosamente.',
    
    // Errores
    errors: {
      required: 'Este campo es obligatorio',
      signatureRequired: 'La firma es obligatoria',
      consentRequired: 'Debe aceptar el consentimiento',
    },
    
    // Respuestas
    yes: 'Sí',
    no: 'No',
  },
  en: {
    title: 'Medical Registration',
    subtitle: 'Complete your medical information for the training',
    required: 'Required to attend the event',
    
    // Sections
    medicalConditions: 'Medical Conditions',
    emergencyContact: 'Emergency Contact',
    consent: 'Consent and Signature',
    
    // Questions
    questions: {
      hasCurrentIllness: 'Do you currently have any illness?',
      hasCurrentTreatment: 'Are you currently under medical treatment?',
      takesMedication: 'Do you take any medication?',
      hasAllergies: 'Are you allergic to any medication or substance?',
      hadSurgery: 'Have you had surgery?',
      wasHospitalized: 'Have you been hospitalized?',
      hasChronicIllness: 'Do you have any chronic illness? (diabetes, hypertension, epilepsy, asthma, etc.)',
      hasPhysicalInjury: 'Do you have any current physical injury?',
      hasActivityRestrictions: 'Do you have any physical activity restrictions?',
      hasPsychologicalCondition: 'Do you have any diagnosed psychological/emotional condition?',
    },
    
    // Placeholders
    placeholders: {
      specifyDetails: 'Specify details...',
      contactName: 'Full name',
      contactRelation: 'Relationship (e.g., Mother, Father, Spouse)',
      contactPhone: 'Contact phone',
    },
    
    // Consent
    consentText: 'I declare that the information provided is true and complete. I authorize the organizing team to use this information solely for security and medical attention purposes during the event.',
    signatureLabel: 'Digital Signature',
    signatureInstructions: 'Draw your signature in the box',
    clearSignature: 'Clear',
    
    // Buttons
    save: 'Save Form',
    saving: 'Saving...',
    back: 'Back',
    
    // States
    completed: 'Form Completed!',
    completedDesc: 'Your medical registration has been saved successfully.',
    
    // Errors
    errors: {
      required: 'This field is required',
      signatureRequired: 'Signature is required',
      consentRequired: 'You must accept the consent',
    },
    
    // Answers
    yes: 'Yes',
    no: 'No',
  },
};

interface MedicalQuestion {
  key: string;
  detailsKey: string;
}

const medicalQuestions: MedicalQuestion[] = [
  { key: 'hasCurrentIllness', detailsKey: 'currentIllnessDetails' },
  { key: 'hasCurrentTreatment', detailsKey: 'currentTreatmentDetails' },
  { key: 'takesMedication', detailsKey: 'medicationDetails' },
  { key: 'hasAllergies', detailsKey: 'allergyDetails' },
  { key: 'hadSurgery', detailsKey: 'surgeryDetails' },
  { key: 'wasHospitalized', detailsKey: 'hospitalizationDetails' },
  { key: 'hasChronicIllness', detailsKey: 'chronicIllnessDetails' },
  { key: 'hasPhysicalInjury', detailsKey: 'physicalInjuryDetails' },
  { key: 'hasActivityRestrictions', detailsKey: 'activityRestrictionDetails' },
  { key: 'hasPsychologicalCondition', detailsKey: 'psychologicalConditionDetails' },
];

export default function MedicalFormPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  const t = translations[locale];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Medical conditions
    hasCurrentIllness: false,
    currentIllnessDetails: '',
    hasCurrentTreatment: false,
    currentTreatmentDetails: '',
    takesMedication: false,
    medicationDetails: '',
    hasAllergies: false,
    allergyDetails: '',
    hadSurgery: false,
    surgeryDetails: '',
    wasHospitalized: false,
    hospitalizationDetails: '',
    hasChronicIllness: false,
    chronicIllnessDetails: '',
    hasPhysicalInjury: false,
    physicalInjuryDetails: '',
    hasActivityRestrictions: false,
    activityRestrictionDetails: '',
    hasPsychologicalCondition: false,
    psychologicalConditionDetails: '',
    
    // Emergency contact
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    
    // Consent
    consentAccepted: false,
    signatureData: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchMedicalForm();
    }
  }, [status]);

  useEffect(() => {
    // Setup canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const fetchMedicalForm = async () => {
    try {
      const res = await fetch('/api/medical-form');
      const data = await res.json();

      if (data.success && data.medicalForm) {
        setFormData({
          ...data.medicalForm,
          signatureData: data.medicalForm.signatureData || '',
        });
        setIsComplete(data.isComplete);
        
        // Restore signature to canvas
        if (data.medicalForm.signatureData) {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              ctx?.drawImage(img, 0, 0);
            };
            img.src = data.medicalForm.signatureData;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching medical form:', err);
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    // Save signature to form data
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL('image/png');
      setFormData(prev => ({ ...prev, signatureData }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setFormData(prev => ({ ...prev, signatureData: '' }));
      }
    }
  };

  const handleQuestionChange = (key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
      // Clear details if answering No
      ...(!value && { [`${key.replace('has', '').replace('had', '').replace('takes', '').replace('was', '')}Details`]: '' }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.emergencyContactName || !formData.emergencyContactRelation || !formData.emergencyContactPhone) {
      setError(t.errors.required);
      return;
    }

    if (!formData.consentAccepted) {
      setError(t.errors.consentRequired);
      return;
    }

    if (!formData.signatureData) {
      setError(t.errors.signatureRequired);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/medical-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setIsComplete(true);
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-cyan-500 opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-purple-500 opacity-5 blur-[120px] rounded-full"></div>
      </div>

      {/* Language Switch */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex gap-2 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-full p-1">
          <button
            onClick={() => setLocale('es')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              locale === 'es' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              locale === 'en' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              🏥 {t.title}
            </h1>
            <p className="text-slate-400 mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* Required Badge */}
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-amber-400" size={24} />
          <span className="text-amber-300 font-medium">{t.required}</span>
        </div>

        {/* Success State */}
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-400" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">{t.completed}</h2>
              <p className="text-slate-400 mb-8">{t.completedDesc}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                {t.back}
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Section 1: Medical Conditions */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <Heart className="text-red-400" size={24} />
                  </div>
                  <h2 className="text-xl font-bold">{t.medicalConditions}</h2>
                </div>

                <div className="space-y-6">
                  {medicalQuestions.map((question) => (
                    <div key={question.key} className="space-y-3">
                      <p className="text-slate-300 font-medium">
                        {t.questions[question.key as keyof typeof t.questions]}
                      </p>
                      
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => handleQuestionChange(question.key, true)}
                          className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            formData[question.key as keyof typeof formData]
                              ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                              : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {t.yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionChange(question.key, false)}
                          className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            !formData[question.key as keyof typeof formData]
                              ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                              : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {t.no}
                        </button>
                      </div>

                      {formData[question.key as keyof typeof formData] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="overflow-hidden"
                        >
                          <textarea
                            value={formData[question.detailsKey as keyof typeof formData] as string || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [question.detailsKey]: e.target.value }))}
                            placeholder={t.placeholders.specifyDetails}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                            rows={2}
                          />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Emergency Contact */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Phone className="text-blue-400" size={24} />
                  </div>
                  <h2 className="text-xl font-bold">{t.emergencyContact}</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="inline mr-2" size={16} />
                      {t.placeholders.contactName} *
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                      placeholder={t.placeholders.contactName}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t.placeholders.contactRelation} *
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactRelation}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactRelation: e.target.value }))}
                      placeholder={t.placeholders.contactRelation}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Phone className="inline mr-2" size={16} />
                      {t.placeholders.contactPhone} *
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                      placeholder={t.placeholders.contactPhone}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Consent and Signature */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Shield className="text-purple-400" size={24} />
                  </div>
                  <h2 className="text-xl font-bold">{t.consent}</h2>
                </div>

                {/* Consent Checkbox */}
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consentAccepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, consentAccepted: e.target.checked }))}
                      className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-slate-300 text-sm leading-relaxed">
                      {t.consentText}
                    </span>
                  </label>
                </div>

                {/* Digital Signature Canvas */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <FileText className="inline mr-2" size={16} />
                    {t.signatureLabel} *
                  </label>
                  <p className="text-xs text-slate-500 mb-3">{t.signatureInstructions}</p>
                  
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[150px] bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl cursor-crosshair touch-none"
                      style={{ touchAction: 'none' }}
                    />
                    
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {t.save}
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
