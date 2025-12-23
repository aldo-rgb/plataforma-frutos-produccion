'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, AlertCircle, Loader2, BrainCircuit } from 'lucide-react';
import ConfiguradorAccion from '@/components/dashboard/ConfiguradorAccion';
import { validateYoSoy, validateMetaSMART } from '@/lib/validaciones-carta';

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Declaraciones de Identidad', subtitle: 'El poder del "Yo Soy"', emoji: '✨' },
  { id: 2, title: 'Metas SMART', subtitle: 'Objetivos específicos y medibles', emoji: '🎯' },
  { id: 3, title: 'Plan de Acción', subtitle: 'Frecuencia y compromiso', emoji: '🔥' }
];

const AREAS = [
  { key: 'finanzas', name: 'FINANZAS', emoji: '💰', color: '#10b981', placeholder: 'Ejemplo: Yo soy abundancia en crecimiento constante' },
  { key: 'relaciones', name: 'RELACIONES', emoji: '❤️', color: '#f43f5e', placeholder: 'Ejemplo: Yo soy amor en acción que construye vínculos genuinos' },
  { key: 'talentos', name: 'TALENTOS', emoji: '🎨', color: '#8b5cf6', placeholder: 'Ejemplo: Yo soy creatividad que transforma ideas en realidad' },
  { key: 'salud', name: 'SALUD', emoji: '💪', color: '#3b82f6', placeholder: 'Ejemplo: Yo soy energía vital que cuida mi templo sagrado' },
  { key: 'pazMental', name: 'PAZ MENTAL', emoji: '🧘', color: '#06b6d4', placeholder: 'Ejemplo: Yo soy serenidad que fluye en cada respiración' },
  { key: 'ocio', name: 'OCIO', emoji: '🎮', color: '#f59e0b', placeholder: 'Ejemplo: Yo soy disfrute consciente en cada momento de descanso' },
  { key: 'servicioTrans', name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟', color: '#ec4899', placeholder: 'Ejemplo: Yo soy impacto positivo que eleva vidas' },
  { key: 'servicioComun', name: 'SERVICIO COMUNITARIO', emoji: '🤝', color: '#14b8a6', placeholder: 'Ejemplo: Yo soy contribución que fortalece mi comunidad' }
];

export default function CartaWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Datos de la carta
  const [cartaData, setCartaData] = useState<any>({
    finanzasDeclaracion: '',
    relacionesDeclaracion: '',
    talentosDeclaracion: '',
    saludDeclaracion: '',
    pazMentalDeclaracion: '',
    ocioDeclaracion: '',
    servicioTransDeclaracion: '',
    servicioComunDeclaracion: '',
    finanzasMeta: '',
    relacionesMeta: '',
    talentosMeta: '',
    saludMeta: '',
    pazMentalMeta: '',
    ocioMeta: '',
    servicioTransMeta: '',
    servicioComunMeta: '',
    metas: [] // Para las acciones del paso 3
  });

  const [feedback, setFeedback] = useState<any>({});
  const [estado, setEstado] = useState('BORRADOR');

  // Cargar carta existente
  useEffect(() => {
    loadCarta();
  }, []);

  const loadCarta = async () => {
    try {
      const res = await fetch('/api/carta/my-carta');
      const data = await res.json();
      
      if (data.carta) {
        setCartaData({
          ...data.carta,
          metas: data.carta.Meta || []
        });
        setEstado(data.carta.estado);
        
        // Si hay feedback del mentor, cargarlo
        if (data.carta.feedbackMentor) {
          parseFeedback(data.carta.feedbackMentor);
        }
      }
    } catch (error) {
      console.error('Error loading carta:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseFeedback = (feedbackText: string) => {
    // Parsear el feedback del mentor para mostrar campos en rojo
    const lines = feedbackText.split('\n');
    const parsedFeedback: any = {};
    
    lines.forEach(line => {
      if (line.includes('Identidad:')) {
        const area = line.split(' - ')[0].replace('❌ ', '');
        const message = line.split('Identidad: ')[1];
        parsedFeedback[`${area}_identity`] = message;
      } else if (line.includes('Meta:')) {
        const area = line.split(' - ')[0].replace('❌ ', '');
        const message = line.split('Meta: ')[1];
        parsedFeedback[`${area}_meta`] = message;
      }
    });
    
    setFeedback(parsedFeedback);
  };

  // Auto-save
  const saveProgress = async () => {
    if (estado === 'APROBADA') return; // No permitir edición si ya está aprobada

    setSaving(true);
    try {
      await fetch('/api/carta/my-carta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartaData)
      });
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  // Debounce para auto-save
  useEffect(() => {
    if (!loading && estado !== 'APROBADA') {
      const timer = setTimeout(() => {
        saveProgress();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [cartaData]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Primero guardar cambios
      await saveProgress();
      
      // Luego enviar para revisión
      const res = await fetch('/api/carta/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartaId: cartaData.id })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        await loadCarta(); // Recargar para actualizar estado
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error al enviar la carta');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== REGLAS DE VALIDACIÓN DURAS ==========
  
  // Validar Step 1: Todas las áreas deben tener "Yo soy" + contenido
  const validateStep1 = () => {
    const allAreasValid = AREAS.every(area => 
      validateYoSoy(cartaData[`${area.key}Declaracion`] || '')
    );
    return allAreasValid;
  };

  // Validar Step 2: Todas las áreas deben tener meta SMART válida
  const validateStep2 = () => {
    const allMetasValid = AREAS.every(area => {
      const meta = cartaData[`${area.key}Meta`] || '';
      if (!meta.trim()) return false;
      
      // Aplicar los 3 pilares cuánticos
      const validation = validateMetaSMART(meta);
      return validation.valid;
    });
    return allMetasValid;
  };

  // Validar Step 3: Todas las metas deben tener al menos 1 acción configurada
  const validateStep3 = () => {
    const metas = cartaData.metas || [];
    if (metas.length === 0) return false;
    
    return metas.every((meta: any) => {
      if (!meta.Accion || meta.Accion.length === 0) return false;
      
      // Validar cada acción
      return meta.Accion.every((accion: any) => {
        if (!accion.frequency) return false;
        
        // Validaciones específicas por tipo de frecuencia
        if (accion.frequency === 'WEEKLY' && (!accion.assignedDays || accion.assignedDays.length === 0)) {
          return false;
        }
        
        if (accion.frequency === 'MONTHLY' && !accion.monthDay) {
          return false;
        }
        
        return true;
      });
    });
  };

  const canSubmit = () => {
    // Todas las validaciones deben pasar
    return validateStep1() && 
           validateStep2() && 
           validateStep3() && 
           estado !== 'APROBADA' && 
           estado !== 'PENDIENTE_MENTOR' && 
           estado !== 'PENDIENTE_ADMIN';
  };

  // Verificar si puede avanzar al siguiente paso
  const canAdvanceToStep2 = () => validateStep1();
  const canAdvanceToStep3 = () => validateStep1() && validateStep2();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1015] pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" />
                Mi Carta F.R.U.T.O.S.
              </h1>
              <p className="text-sm text-gray-400">Constructor de mi futuro en 100 días</p>
            </div>
            
            {/* Estado */}
            <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
              estado === 'APROBADA' ? 'bg-green-500/20 text-green-400' :
              estado === 'CAMBIOS_SOLICITADOS' ? 'bg-orange-500/20 text-orange-400' :
              estado === 'PENDIENTE_MENTOR' || estado === 'PENDIENTE_ADMIN' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {estado === 'APROBADA' && <Check size={16} />}
              {estado === 'CAMBIOS_SOLICITADOS' && <AlertCircle size={16} />}
              {estado}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl flex-1 transition-all ${
                    currentStep === step.id 
                      ? 'bg-purple-600 text-white' 
                      : currentStep > step.id
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <span className="text-2xl">{step.emoji}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold">{step.title}</div>
                    <div className="text-xs opacity-75">{step.subtitle}</div>
                  </div>
                  {currentStep > step.id && <Check size={16} className="ml-auto" />}
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="text-gray-600 mx-1" size={20} />
                )}
              </div>
            ))}
          </div>

          {/* Auto-save indicator */}
          {saving && (
            <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto p-6">
        {/* Paso 1: Declaraciones de Identidad */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-purple-200">
                <strong>💡 Instrucción:</strong> Escribe declaraciones en presente ("Yo soy...") que reflejen la persona que ya eres o te comprometes a ser. 
                Usa lenguaje poderoso y específico. 
              </p>
              <div className="mt-2 text-xs text-purple-300">
                ✅ Válido: "Yo soy abundancia en crecimiento constante"<br/>
                ❌ Inválido: "yo soy" (debe tener contenido después)
              </div>
            </div>

            {AREAS.map((area) => {
              const fieldKey = `${area.key}Declaracion`;
              const fieldValue = cartaData[fieldKey] || '';
              const isRejected = feedback[`${area.name}_identity`];
              const isApproved = estado === 'APROBADA';
              const isValid = validateYoSoy(fieldValue);
              const showValidation = fieldValue.trim().length > 0;
              
              return (
                <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{area.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{area.name}</h3>
                      {isRejected && (
                        <p className="text-xs text-red-400 mt-1">❌ {isRejected}</p>
                      )}
                      {showValidation && !isValid && !isApproved && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Debe iniciar con "Yo soy" o "Soy" + al menos una palabra más
                        </p>
                      )}
                      {showValidation && isValid && !isApproved && (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <Check size={12} />
                          Declaración válida
                        </p>
                      )}
                    </div>
                    {isApproved && (
                      <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check size={12} /> Aprobado
                      </div>
                    )}
                    {!isApproved && showValidation && isValid && (
                      <div className="bg-green-500/20 text-green-400 w-8 h-8 rounded-full flex items-center justify-center">
                        <Check size={16} />
                      </div>
                    )}
                  </div>

                  <textarea
                    value={fieldValue}
                    onChange={(e) => setCartaData({ ...cartaData, [fieldKey]: e.target.value })}
                    placeholder={area.placeholder}
                    disabled={isApproved}
                    className={`w-full bg-gray-900 text-white p-4 rounded-lg resize-none focus:ring-2 transition-all ${
                      isRejected ? 'border-2 border-red-500 focus:ring-red-500' :
                      isApproved ? 'border-2 border-green-500/50 opacity-75 cursor-not-allowed' :
                      showValidation && !isValid ? 'border-2 border-red-500 focus:ring-red-500' :
                      showValidation && isValid ? 'border-2 border-green-500 focus:ring-green-500' :
                      'border border-gray-700 focus:ring-purple-500'
                    }`}
                    rows={3}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Paso 2: Metas SMART */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-200">
                <strong>🎯 Instrucción:</strong> Define metas <strong>SMART</strong> (Específicas, Medibles, Alcanzables, Relevantes, con Tiempo definido).
              </p>
              <div className="mt-2 text-xs text-blue-300 space-y-1">
                <div>✅ <strong>DEBE</strong> incluir números/cantidades ($10,000 / 5kg / 12 libros)</div>
                <div>🚫 <strong>PROHIBIDO</strong> usar: "tratar", "intentar", "desear", "ver si puedo"</div>
                <div>📏 Mínimo 15 caracteres para garantizar especificidad</div>
              </div>
            </div>

            {AREAS.map((area) => {
              const fieldKey = `${area.key}Meta`;
              const fieldValue = cartaData[fieldKey] || '';
              const isRejected = feedback[`${area.name}_meta`];
              const isApproved = estado === 'APROBADA';
              
              // Validación en tiempo real con los 3 pilares
              const validation = fieldValue.trim() ? validateMetaSMART(fieldValue) : null;
              const showValidation = fieldValue.trim().length > 0;
              
              return (
                <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{area.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{area.name}</h3>
                      {isRejected && (
                        <p className="text-xs text-red-400 mt-1">❌ {isRejected}</p>
                      )}
                    </div>
                    {isApproved && (
                      <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check size={12} /> Aprobado
                      </div>
                    )}
                    {!isApproved && showValidation && validation?.valid && (
                      <div className="bg-green-500/20 text-green-400 w-8 h-8 rounded-full flex items-center justify-center">
                        <Check size={16} />
                      </div>
                    )}
                  </div>

                  <textarea
                    value={fieldValue}
                    onChange={(e) => setCartaData({ ...cartaData, [fieldKey]: e.target.value })}
                    placeholder={`Ej: Generar $50,000 en ventas de nuevos clientes durante los próximos 90 días`}
                    disabled={isApproved}
                    className={`w-full bg-gray-900 text-white p-4 rounded-lg resize-none focus:ring-2 transition-all ${
                      isRejected ? 'border-2 border-red-500 focus:ring-red-500' :
                      isApproved ? 'border-2 border-green-500/50 opacity-75 cursor-not-allowed' :
                      showValidation && !validation?.valid ? 'border-2 border-red-500 focus:ring-red-500' :
                      showValidation && validation?.valid ? 'border-2 border-green-500 focus:ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                      'border border-gray-700 focus:ring-purple-500'
                    }`}
                    rows={3}
                  />

                  {/* FEEDBACK DEL COACH (Validación Cuántica) */}
                  {showValidation && !validation?.valid && validation?.error && (
                    <div className="mt-3 bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex gap-3 animate-in slide-in-from-top-2">
                      <BrainCircuit className="text-red-400 shrink-0 mt-1" size={20} />
                      <div>
                        <h4 className="text-red-400 font-bold text-sm uppercase mb-1">
                          {validation.error}
                        </h4>
                        <p className="text-gray-300 text-sm italic leading-relaxed">
                          {validation.suggestion}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* REFUERZO POSITIVO */}
                  {showValidation && validation?.valid && !isApproved && (
                    <div className="mt-3 text-green-400 text-xs flex items-center gap-2 font-medium px-2">
                      <Check size={12} />
                      ✨ Declaración poderosa detectada. ¡Eso es compromiso cuántico!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Paso 3: Configuración de Acciones */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-200">
                <strong>🔥 Instrucción:</strong> Para cada área, define al menos <strong>1 acción recurrente</strong>. 
                Selecciona la frecuencia cuidadosamente: esto determinará cuántas evidencias (fotos) deberás subir durante los 100 días.
              </p>
            </div>

            {AREAS.map((area) => (
              <div key={area.key} className="bg-[#1a1b1f] border-2 border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{area.emoji}</div>
                  <h3 className="text-white font-bold">{area.name}</h3>
                </div>

                <ConfiguradorAccion
                  initialData={{}}
                  onSave={(config) => {
                    console.log(`Configuración para ${area.name}:`, config);
                    // TODO: Guardar en la base de datos
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VALIDATION WARNINGS */}
      {currentStep === 1 && !validateStep1() && (
        <div className="max-w-5xl mx-auto mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-bold text-sm mb-1">⚠️ Atención: Validación de Identidad</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Todas las declaraciones de identidad <strong>DEBEN iniciar con las palabras mágicas</strong>: <strong className="text-purple-300">"Yo Soy"</strong> o <strong className="text-purple-300">"Soy"</strong>,
                <strong> seguido de al menos una palabra más</strong> (ej: "Yo soy abundante", no solo "yo soy").
              </p>
              <div className="mt-2 text-xs text-gray-400">
                {AREAS.filter(a => !validateYoSoy(cartaData[`${a.key}Declaracion`] || '')).map(a => (
                  <div key={a.key} className="flex items-center gap-2 mt-1">
                    <span className="text-red-500">✗</span>
                    <span>{a.emoji} {a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && !validateStep2() && (
        <div className="max-w-5xl mx-auto mt-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-orange-400 font-bold text-sm mb-1">⚠️ Metas Incompletas o Inválidas</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Todas las áreas deben tener <strong>1 meta SMART válida</strong> que cumpla los 3 pilares:
                <strong> 1) Sin lenguaje de víctima</strong>, <strong>2) Con números/cantidades</strong>, <strong>3) Mínimo 15 caracteres</strong>.
              </p>
              <div className="mt-2 text-xs text-gray-400">
                {AREAS.filter(a => !(cartaData[`${a.key}Meta`] || '').trim()).map(a => (
                  <div key={a.key} className="flex items-center gap-2 mt-1">
                    <span className="text-orange-500">✗</span>
                    <span>{a.emoji} {a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 3 && !validateStep3() && (
        <div className="max-w-5xl mx-auto mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-400 font-bold text-sm mb-1">⚠️ Configuración de Acciones Pendiente</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Cada área debe tener al menos <strong>1 acción con frecuencia configurada</strong>.
                Asegúrate de seleccionar la frecuencia y los días correspondientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1b1f] border-t border-gray-800 p-4 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Paso {currentStep} de {WIZARD_STEPS.length}
            </p>
            {/* Indicadores de validación */}
            <div className="flex gap-2 justify-center mt-2">
              <div className={`w-2 h-2 rounded-full ${validateStep1() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-2 h-2 rounded-full ${validateStep2() ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className={`w-2 h-2 rounded-full ${validateStep3() ? 'bg-green-500' : 'bg-gray-600'}`} />
            </div>
          </div>

          {currentStep < 3 ? (
            <button
              onClick={() => {
                // Validar antes de avanzar
                if (currentStep === 1 && !canAdvanceToStep2()) {
                  alert('⚠️ Debes completar todas las declaraciones de identidad con "Yo Soy" antes de continuar.');
                  return;
                }
                if (currentStep === 2 && !canAdvanceToStep3()) {
                  alert('⚠️ Debes completar todas las metas SMART antes de continuar.');
                  return;
                }
                handleNext();
              }}
              disabled={(currentStep === 1 && !canAdvanceToStep2()) || (currentStep === 2 && !canAdvanceToStep3())}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || submitting}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Enviar para Revisión
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
