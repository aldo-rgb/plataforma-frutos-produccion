'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Target, 
  Clock, 
  User, 
  Send, 
  Upload, 
  Check, 
  AlertTriangle,
  MessageSquare,
  Award,
  Zap,
  FileText,
  Image as ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface Question {
  id: number;
  questionText: string;
  questionType: 'OPEN' | 'TEXT' | 'TEXTAREA' | 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'CHECKBOX' | 'SCALE' | 'YES_NO';
  options: string[];
  isRequired: boolean;
  order: number;
  answer?: {
    textAnswer?: string;
    selectedOptions?: string[];
    scaleValue?: number;
    booleanAnswer?: boolean;
  };
}

interface Submission {
  id: number;
  missionId: number;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  textResponse?: string;
  evidenceUrl?: string;
  learningNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  pointsEarned: number;
  earnedBonus: boolean;
  reviewer?: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  mission: {
    id: number;
    releaseAt: string;
    deadlineAt?: string;
    trainerMessage?: string;
    bonusPoints?: number;
    bonusDeadline?: string;
    trainer?: {
      id: number;
      nombre: string;
      imagen?: string;
    };
    vision?: {
      id: number;
      name: string;
    };
  };
  template: {
    id: number;
    title: string;
    type: string;
    instructions?: string;
    tags: string[];
    pointsReward: number;
    requiresEvidence: boolean;
    questions: Question[];
  };
}

export default function MisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [textResponse, setTextResponse] = useState('');
  const [learningNote, setLearningNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [uploading, setUploading] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [earnedBonusPoints, setEarnedBonusPoints] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/participante/mision/${submissionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar misión');
      }

      setSubmission(data.submission);

      // Cargar respuestas existentes
      if (data.submission.textResponse) {
        setTextResponse(data.submission.textResponse);
      }
      if (data.submission.learningNote) {
        setLearningNote(data.submission.learningNote);
      }
      if (data.submission.evidenceUrl) {
        setEvidenceUrl(data.submission.evidenceUrl);
      }

      // Cargar respuestas a preguntas
      const existingAnswers: Record<number, any> = {};
      data.submission.template.questions.forEach((q: Question) => {
        if (q.answer) {
          existingAnswers[q.id] = {
            textAnswer: q.answer.textAnswer,
            selectedOptions: q.answer.selectedOptions || [],
            scaleValue: q.answer.scaleValue,
            booleanAnswer: q.answer.booleanAnswer
          };
        }
      });
      setAnswers(existingAnswers);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.url) {
        setEvidenceUrl(data.url);
      }
    } catch (err) {
      console.error('Error uploading:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission) return;

    // Validar campos requeridos
    const template = submission.template;
    
    // Validar preguntas requeridas
    for (const q of template.questions) {
      if (q.isRequired) {
        const answer = answers[q.id];
        if (!answer) {
          alert(`Por favor responde la pregunta: "${q.questionText}"`);
          return;
        }
        if (q.questionType === 'TEXT' || q.questionType === 'TEXTAREA') {
          if (!answer.textAnswer?.trim()) {
            alert(`Por favor responde la pregunta: "${q.questionText}"`);
            return;
          }
        }
      }
    }

    // Validar evidencia si es requerida
    if (template.requiresEvidence && !evidenceUrl) {
      alert('Esta misión requiere evidencia. Por favor sube una imagen o video.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/participante/mision/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textResponse,
          evidenceUrl,
          learningNote,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId: parseInt(questionId),
            ...answer
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar misión');
      }

      // Mostrar modal de éxito
      setEarnedBonusPoints(data.earnedBonus || false);
      setShowSuccessModal(true);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (questionId: number, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...value }
    }));
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id] || {};
    const isDisabled = submission?.status === 'SUBMITTED' || submission?.status === 'APPROVED';

    switch (question.questionType) {
      case 'OPEN': // Tipo del schema - pregunta abierta
      case 'TEXT':
      case 'TEXTAREA':
        return (
          <textarea
            value={answer.textAnswer || ''}
            onChange={(e) => updateAnswer(question.id, { textAnswer: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none min-h-[120px] resize-y"
            placeholder="Escribe tu respuesta..."
            disabled={isDisabled}
          />
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  answer.selectedOptions?.includes(option)
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={answer.selectedOptions?.includes(option) || false}
                  onChange={() => updateAnswer(question.id, { selectedOptions: [option] })}
                  className="hidden"
                  disabled={isDisabled}
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  answer.selectedOptions?.includes(option)
                    ? 'border-emerald-500'
                    : 'border-gray-500'
                }`}>
                  {answer.selectedOptions?.includes(option) && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'MULTIPLE_SELECT': // Tipo del schema - selección múltiple
      case 'CHECKBOX':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  answer.selectedOptions?.includes(option)
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={answer.selectedOptions?.includes(option) || false}
                  onChange={(e) => {
                    const current = answer.selectedOptions || [];
                    if (e.target.checked) {
                      updateAnswer(question.id, { selectedOptions: [...current, option] });
                    } else {
                      updateAnswer(question.id, { selectedOptions: current.filter((o: string) => o !== option) });
                    }
                  }}
                  className="hidden"
                  disabled={isDisabled}
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  answer.selectedOptions?.includes(option)
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-500'
                }`}>
                  {answer.selectedOptions?.includes(option) && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'SCALE':
        return (
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => updateAnswer(question.id, { scaleValue: num })}
                disabled={isDisabled}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  answer.scaleValue === num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-emerald-500'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {num}
              </button>
            ))}
          </div>
        );

      case 'YES_NO':
        return (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => updateAnswer(question.id, { booleanAnswer: true })}
              disabled={isDisabled}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                answer.booleanAnswer === true
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-emerald-500'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => updateAnswer(question.id, { booleanAnswer: false })}
              disabled={isDisabled}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                answer.booleanAnswer === false
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-red-500'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              No
            </button>
          </div>
        );

      default:
        // Fallback para cualquier tipo desconocido - mostrar textarea
        console.warn(`Tipo de pregunta desconocido: ${question.questionType}`);
        return (
          <textarea
            value={answer.textAnswer || ''}
            onChange={(e) => updateAnswer(question.id, { textAnswer: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none min-h-[100px] resize-y"
            placeholder="Escribe tu respuesta..."
            disabled={isDisabled}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex flex-col items-center justify-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">{error || 'Misión no encontrada'}</h1>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Volver
        </button>
      </div>
    );
  }

  const isCompleted = submission.status === 'SUBMITTED' || submission.status === 'APPROVED';
  const isRejected = submission.status === 'REJECTED';
  const hasDeadline = submission.mission.deadlineAt;
  const deadlinePassed = hasDeadline && isPast(new Date(submission.mission.deadlineAt!));

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f111a] border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Target size={14} />
                Misión del Entrenador
              </div>
              <h1 className="text-lg font-bold">{submission.template.title}</h1>
            </div>
            
            {/* Status badge */}
            {submission.status === 'APPROVED' && (
              <span className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                <Check size={14} />
                Completada
              </span>
            )}
            {submission.status === 'SUBMITTED' && (
              <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                <Clock size={14} />
                En Revisión
              </span>
            )}
            {submission.status === 'REJECTED' && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-bold">
                <AlertTriangle size={14} />
                Rechazada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        
        {/* Trainer info */}
        <div className="flex items-center gap-3 mb-6">
          {submission.mission.trainer?.imagen ? (
            <img 
              src={submission.mission.trainer.imagen}
              alt={submission.mission.trainer.nombre}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
              <User size={24} className="text-emerald-400" />
            </div>
          )}
          <div>
            <p className="font-medium">{submission.mission.trainer?.nombre || 'Entrenador'}</p>
            <p className="text-sm text-gray-400">
              {submission.mission.vision?.name || 'Tu Visión'}
            </p>
          </div>
        </div>

        {/* Tags */}
        {submission.template.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {submission.template.tags.map((tag, i) => (
              <span 
                key={i}
                className="text-xs bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Deadline & Points */}
        <div className="flex flex-wrap gap-4 mb-6">
          {hasDeadline && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              deadlinePassed
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-300 border border-gray-700'
            }`}>
              <Clock size={16} />
              <span>
                {deadlinePassed 
                  ? 'Fecha límite pasada'
                  : `Entrega: ${format(new Date(submission.mission.deadlineAt!), "d 'de' MMMM, HH:mm", { locale: es })}`
                }
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Award size={16} />
            <span className="font-bold">+{submission.template.pointsReward} PC</span>
          </div>
        </div>

        {/* Trainer message */}
        {submission.mission.trainerMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <MessageSquare size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-400 mb-1">Mensaje del Entrenador:</p>
                <p className="text-gray-300">{submission.mission.trainerMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {submission.template.instructions && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Instrucciones:</p>
                <p className="text-gray-300 whitespace-pre-wrap">{submission.template.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rejection feedback */}
        {isRejected && submission.reviewNote && (
          <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400 mb-1">Motivo del rechazo:</p>
                <p className="text-red-200">{submission.reviewNote}</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        {submission.template.questions.length > 0 && (
          <div className="space-y-6 mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={20} className="text-emerald-400" />
              Preguntas
            </h3>
            
            {submission.template.questions.map((question, index) => (
              <div key={question.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium mb-3">
                  {index + 1}. {question.questionText}
                  {question.isRequired && <span className="text-red-400 ml-1">*</span>}
                </p>
                {renderQuestion(question)}
              </div>
            ))}
          </div>
        )}

        {/* Evidence upload */}
        {submission.template.requiresEvidence && (
          <div className="mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
              <ImageIcon size={20} className="text-emerald-400" />
              Evidencia
              <span className="text-red-400">*</span>
            </h3>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {evidenceUrl ? (
                <div className="relative">
                  <img 
                    src={evidenceUrl} 
                    alt="Evidencia" 
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                  {!isCompleted && (
                    <button
                      onClick={() => setEvidenceUrl('')}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-gray-800 rounded-lg transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isCompleted || uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-500 mb-2" />
                      <p className="text-gray-400">Haz clic para subir tu evidencia</p>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        )}

        {/* Learning note */}
        <div className="mb-8">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
            <FileText size={20} className="text-emerald-400" />
            Nota de Aprendizaje (Opcional)
          </h3>
          <textarea
            value={learningNote}
            onChange={(e) => setLearningNote(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none min-h-[100px]"
            placeholder="¿Qué notas hasta este momento? Comparte tus reflexiones..."
            disabled={isCompleted}
          />
        </div>

        {/* Submit button */}
        {!isCompleted && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send size={20} />
                Enviar Misión
              </>
            )}
          </button>
        )}

        {/* Completion info */}
        {isCompleted && submission.submittedAt && (
          <div className="text-center py-4 text-gray-400">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>Enviada el {format(new Date(submission.submittedAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}</p>
            {submission.earnedBonus && (
              <p className="text-yellow-400 font-bold mt-2">
                <Zap className="inline w-4 h-4 mr-1" />
                ¡Ganaste puntos bonus!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowSuccessModal(false);
              router.push('/dashboard/hoy');
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-gradient-to-br from-[#0f1419] to-[#1a2332] rounded-2xl border border-emerald-500/30 p-8 max-w-md w-full shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in duration-300">
            {/* Confetti effect */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="text-4xl animate-bounce">🎉</div>
            </div>
            
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-white mb-2">
              ¡Misión Completada!
            </h2>
            
            {/* Description */}
            <p className="text-gray-400 text-center mb-6">
              Has completado esta misión exitosamente. Los puntos han sido agregados a tu cuenta.
            </p>
            
            {/* Bonus badge */}
            {earnedBonusPoints && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <Zap className="w-5 h-5" />
                  <span className="font-bold">¡Puntos Bonus!</span>
                  <Zap className="w-5 h-5" />
                </div>
                <p className="text-center text-yellow-200/80 text-sm mt-1">
                  Entregaste a tiempo y ganaste puntos extra
                </p>
              </div>
            )}
            
            {/* Points earned preview */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Puntos potenciales:</span>
                <span className="text-emerald-400 font-bold text-lg">
                  +{submission?.template.pointsReward || 0} PC
                </span>
              </div>
              {earnedBonusPoints && submission?.mission.bonusPoints && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Bonus:</span>
                  <span className="text-yellow-400 font-bold">
                    +{submission.mission.bonusPoints} PC
                  </span>
                </div>
              )}
            </div>
            
            {/* Action button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/dashboard/hoy');
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
