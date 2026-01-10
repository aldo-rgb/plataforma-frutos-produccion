'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heart, Search, User, ChevronRight, AlertTriangle, CheckCircle, Phone, FileText, ArrowLeft, Loader2 } from 'lucide-react';

interface Vision {
  id: number;
  nombre: string;
  SchoolProduct: {
    id: number;
    name: string;
    levelType: string;
    startDate: string;
    endDate: string;
  }[];
}

interface UserOption {
  id: number;
  nombre: string;
  email: string;
}

type Step = 'select-vision' | 'select-user' | 'fill-form' | 'success';

export default function PublicMedicalFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-400" size={48} />
      </div>
    }>
      <MedicalFormContent />
    </Suspense>
  );
}

function MedicalFormContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  const directUserId = searchParams.get('userId');
  const directVisionId = searchParams.get('visionId');
  const isEmergency = searchParams.get('emergency') === 'true';
  
  const [step, setStep] = useState<Step>('select-vision');
  const [visions, setVisions] = useState<Vision[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
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
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    consentAccepted: false
  });

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Cargar usuario y visión directamente si vienen en los parámetros
  useEffect(() => {
    const loadDirectAccess = async () => {
      if (directUserId && directVisionId) {
        setLoading(true);
        try {
          // Cargar usuario directo
          const userRes = await fetch(`/api/public/medical-form/user-direct?userId=${directUserId}&visionId=${directVisionId}`);
          if (userRes.ok) {
            const data = await userRes.json();
            if (data.user && data.vision) {
              setSelectedUser(data.user);
              setSelectedVision(data.vision);
              setStep('fill-form');
            }
          }
        } catch (error) {
          console.error('Error loading direct access:', error);
        } finally {
          setLoading(false);
        }
      } else if (orgId) {
        fetchVisions();
      } else {
        setLoading(false);
      }
    };
    loadDirectAccess();
  }, [directUserId, directVisionId, orgId]);

  const fetchVisions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/medical-form/visions?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setVisions(data.visions || []);
      }
    } catch (error) {
      console.error('Error fetching visions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (visionId: number, search = '') => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/public/medical-form/users?visionId=${visionId}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleVisionSelect = (vision: Vision) => {
    setSelectedVision(vision);
    setStep('select-user');
    fetchUsers(vision.id);
  };

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (selectedVision) {
      fetchUsers(selectedVision.id, value);
    }
  };

  const handleUserSelect = (user: UserOption) => {
    setSelectedUser(user);
    setStep('fill-form');
  };

  const handleInputChange = (field: string, value: boolean | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
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
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    return canvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedVision) return;
    
    if (!formData.emergencyContactName || !formData.emergencyContactRelation || !formData.emergencyContactPhone) {
      alert('Por favor complete la información del contacto de emergencia');
      return;
    }
    
    if (!formData.consentAccepted) {
      alert('Debe aceptar el consentimiento para continuar');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/medical-form/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          visionId: selectedVision.id,
          ...formData,
          signatureData: getSignatureData()
        })
      });

      if (res.ok) {
        setStep('success');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar el formulario');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al guardar el formulario');
    } finally {
      setSubmitting(false);
    }
  };

  // Mostrar enlace inválido solo si no hay org NI userId+visionId
  if (!orgId && (!directUserId || !directVisionId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center border border-slate-700">
          <AlertTriangle className="text-yellow-400 mx-auto mb-4" size={48} />
          <h1 className="text-xl font-bold text-white mb-2">Enlace Inválido</h1>
          <p className="text-slate-400">Este enlace no contiene la información necesaria. Por favor solicita un nuevo código QR.</p>
        </div>
      </div>
    );
  }

  // Step: Select Vision
  if (step === 'select-vision') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <Heart className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Formulario Médico</h1>
            <p className="text-slate-400">Selecciona la visión a la que te registraste</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-400" size={40} />
            </div>
          ) : visions.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-700">
              <AlertTriangle className="text-yellow-400 mx-auto mb-4" size={48} />
              <h2 className="text-lg font-semibold text-white mb-2">No hay visiones disponibles</h2>
              <p className="text-slate-400">No se encontraron visiones activas en este momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visions.map(vision => (
                <button
                  key={vision.id}
                  onClick={() => handleVisionSelect(vision)}
                  className="w-full bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {vision.nombre}
                      </h3>
                      {vision.SchoolProduct.length > 0 && (
                        <p className="text-sm text-slate-400 mt-1">
                          {vision.SchoolProduct[0].name} - Inicia: {new Date(vision.SchoolProduct[0].startDate).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-colors" size={24} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step: Select User
  if (step === 'select-user') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <button
            onClick={() => {
              setStep('select-vision');
              setSelectedVision(null);
              setUsers([]);
              setSearchTerm('');
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Volver</span>
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
              <User className="text-blue-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Busca tu nombre</h1>
            <p className="text-slate-400">{selectedVision?.nombre}</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Escribe tu nombre o correo..."
              value={searchTerm}
              onChange={handleUserSearch}
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-lg"
            />
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-400" size={32} />
            </div>
          ) : users.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-slate-700">
              <p className="text-slate-400">
                {searchTerm 
                  ? 'No se encontraron participantes con ese nombre' 
                  : 'Escribe tu nombre para buscarte'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 hover:border-green-500/50 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                      <User className="text-slate-300" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white group-hover:text-green-400 transition-colors">
                        {user.nombre}
                      </p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-green-400 transition-colors" size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step: Fill Form
  if (step === 'fill-form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
        <div className="max-w-2xl mx-auto pt-8">
          <button
            onClick={() => {
              setStep('select-user');
              setSelectedUser(null);
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Volver</span>
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <FileText className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Formulario Médico</h1>
            <p className="text-slate-400">{selectedUser?.nombre}</p>
          </div>

          <div className="space-y-6">
            {/* Sección: Condiciones Médicas */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Heart className="text-red-400" size={20} />
                Condiciones Médicas
              </h2>

              {/* Pregunta 1 */}
              <MedicalQuestion
                question="¿Padeces actualmente alguna enfermedad?"
                checked={formData.hasCurrentIllness}
                onCheck={(val) => handleInputChange('hasCurrentIllness', val)}
                details={formData.currentIllnessDetails}
                onDetails={(val) => handleInputChange('currentIllnessDetails', val)}
                placeholder="Describe la enfermedad..."
              />

              {/* Pregunta 2 */}
              <MedicalQuestion
                question="¿Estás recibiendo tratamiento médico actualmente?"
                checked={formData.hasCurrentTreatment}
                onCheck={(val) => handleInputChange('hasCurrentTreatment', val)}
                details={formData.currentTreatmentDetails}
                onDetails={(val) => handleInputChange('currentTreatmentDetails', val)}
                placeholder="Describe el tratamiento..."
              />

              {/* Pregunta 3 */}
              <MedicalQuestion
                question="¿Tomas algún medicamento?"
                checked={formData.takesMedication}
                onCheck={(val) => handleInputChange('takesMedication', val)}
                details={formData.medicationDetails}
                onDetails={(val) => handleInputChange('medicationDetails', val)}
                placeholder="¿Cuáles medicamentos y dosis?"
              />

              {/* Pregunta 4 */}
              <MedicalQuestion
                question="¿Tienes alguna alergia conocida?"
                checked={formData.hasAllergies}
                onCheck={(val) => handleInputChange('hasAllergies', val)}
                details={formData.allergyDetails}
                onDetails={(val) => handleInputChange('allergyDetails', val)}
                placeholder="Describe tus alergias..."
              />

              {/* Pregunta 5 */}
              <MedicalQuestion
                question="¿Has tenido alguna cirugía?"
                checked={formData.hadSurgery}
                onCheck={(val) => handleInputChange('hadSurgery', val)}
                details={formData.surgeryDetails}
                onDetails={(val) => handleInputChange('surgeryDetails', val)}
                placeholder="Describe las cirugías..."
              />

              {/* Pregunta 6 */}
              <MedicalQuestion
                question="¿Has sido hospitalizado recientemente?"
                checked={formData.wasHospitalized}
                onCheck={(val) => handleInputChange('wasHospitalized', val)}
                details={formData.hospitalizationDetails}
                onDetails={(val) => handleInputChange('hospitalizationDetails', val)}
                placeholder="Describe las hospitalizaciones..."
              />

              {/* Pregunta 7 */}
              <MedicalQuestion
                question="¿Padeces alguna enfermedad crónica? (diabetes, hipertensión, epilepsia, asma)"
                checked={formData.hasChronicIllness}
                onCheck={(val) => handleInputChange('hasChronicIllness', val)}
                details={formData.chronicIllnessDetails}
                onDetails={(val) => handleInputChange('chronicIllnessDetails', val)}
                placeholder="Describe la condición crónica..."
              />

              {/* Pregunta 8 */}
              <MedicalQuestion
                question="¿Tienes alguna lesión física actualmente?"
                checked={formData.hasPhysicalInjury}
                onCheck={(val) => handleInputChange('hasPhysicalInjury', val)}
                details={formData.physicalInjuryDetails}
                onDetails={(val) => handleInputChange('physicalInjuryDetails', val)}
                placeholder="Describe la lesión..."
              />

              {/* Pregunta 9 */}
              <MedicalQuestion
                question="¿Tienes alguna restricción para realizar actividades físicas?"
                checked={formData.hasActivityRestrictions}
                onCheck={(val) => handleInputChange('hasActivityRestrictions', val)}
                details={formData.activityRestrictionDetails}
                onDetails={(val) => handleInputChange('activityRestrictionDetails', val)}
                placeholder="Describe las restricciones..."
              />

              {/* Pregunta 10 */}
              <MedicalQuestion
                question="¿Tienes alguna condición psicológica o emocional que debamos conocer?"
                checked={formData.hasPsychologicalCondition}
                onCheck={(val) => handleInputChange('hasPsychologicalCondition', val)}
                details={formData.psychologicalConditionDetails}
                onDetails={(val) => handleInputChange('psychologicalConditionDetails', val)}
                placeholder="Describe la condición..."
                isLast
              />
            </div>

            {/* Sección: Contacto de Emergencia */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Phone className="text-green-400" size={20} />
                Contacto de Emergencia
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-green-500"
                    placeholder="Nombre del contacto de emergencia"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Parentesco *</label>
                  <input
                    type="text"
                    value={formData.emergencyContactRelation}
                    onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-green-500"
                    placeholder="Ej: Madre, Padre, Hermano/a, Esposo/a"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-green-500"
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Firma y Consentimiento */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="text-purple-400" size={20} />
                Consentimiento
              </h2>

              <div className="bg-slate-700/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Declaro que la información proporcionada en este formulario es verídica y completa. 
                  Autorizo al equipo de coordinación a utilizar esta información únicamente para 
                  garantizar mi bienestar durante las actividades del programa. Entiendo que esta 
                  información será tratada de manera confidencial.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2">Firma digital</label>
                <div className="bg-slate-900 rounded-xl border border-slate-600 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={clearSignature}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Borrar firma
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentAccepted}
                  onChange={(e) => handleInputChange('consentAccepted', e.target.checked)}
                  className="mt-1 w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                />
                <span className="text-sm text-slate-300">
                  Acepto los términos del consentimiento y confirmo que la información proporcionada es correcta *
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.consentAccepted}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Enviar Formulario
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Success
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center border border-slate-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <CheckCircle className="text-green-400" size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">¡Formulario Enviado!</h1>
        <p className="text-slate-400 mb-6">
          Tu información médica ha sido registrada correctamente. El equipo de coordinación ha sido notificado.
        </p>
        <p className="text-sm text-slate-500">
          Ya puedes cerrar esta ventana
        </p>
      </div>
    </div>
  );
}

// Componente para las preguntas médicas
function MedicalQuestion({ 
  question, 
  checked, 
  onCheck, 
  details, 
  onDetails, 
  placeholder,
  isLast = false
}: {
  question: string;
  checked: boolean;
  onCheck: (val: boolean) => void;
  details: string;
  onDetails: (val: string) => void;
  placeholder: string;
  isLast?: boolean;
}) {
  return (
    <div className={`${!isLast ? 'border-b border-slate-700 pb-4 mb-4' : ''}`}>
      <div className="flex items-start gap-3 mb-2">
        <span className="text-slate-300 text-sm flex-1">{question}</span>
      </div>
      <div className="flex gap-3 mb-2">
        <button
          onClick={() => onCheck(true)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            checked 
              ? 'bg-red-500/20 text-red-400 border-2 border-red-500' 
              : 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:border-slate-600'
          }`}
        >
          Sí
        </button>
        <button
          onClick={() => onCheck(false)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            !checked 
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500' 
              : 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:border-slate-600'
          }`}
        >
          No
        </button>
      </div>
      {checked && (
        <textarea
          value={details}
          onChange={(e) => onDetails(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 resize-none"
          rows={2}
        />
      )}
    </div>
  );
}
