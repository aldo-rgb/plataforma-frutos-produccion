/**
 * 🎙️ QUANTUM BIO-WRITER - Componente de Entrevista
 * 
 * Modal interactivo que entrevista al mentor y genera su perfil profesional
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterviewContext {
  mainAchievement?: string;
  mentorshipStyle?: string;
  idealClient?: string;
  currentStep: 1 | 2 | 3 | 4;
}

interface BioResult {
  heroJourneyBio: string;
  promiseStatement: string;
  tagline: string;
  vision: string;
  jobTitle: string;
  mentorTitle: string;
  mainSpecialty: string;
  secondarySpecialties: string[];
  keySkills: string[];
  achievements: string[];
  detectedStyle: 'HARDCORE' | 'EMPATHIC' | 'BALANCED';
  expertiseTags: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: BioResult) => void;
}

export default function QuantumBioWriter({ isOpen, onClose, onComplete }: Props) {
  const [context, setContext] = useState<InterviewContext>({ currentStep: 1 });
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Iniciar automáticamente la entrevista cuando se abre el modal
  useEffect(() => {
    if (isOpen && !currentQuestion && !result) {
      startInterview();
    }
  }, [isOpen]);

  const startInterview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/mentor/bio-interview/start', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Error al iniciar entrevista');
      
      const data = await res.json();
      setCurrentQuestion(data.question);
      setContext(data.context);
      
    } catch (err) {
      console.error(err);
      setError('Error al iniciar la entrevista. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/mentor/bio-interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          answer: userAnswer,
        }),
      });
      
      if (!res.ok) throw new Error('Error al procesar respuesta');
      
      const data = await res.json();
      
      if (data.isComplete) {
        // Entrevista completada
        setResult(data.result);
      } else {
        // Siguiente pregunta
        setCurrentQuestion(data.nextQuestion);
        setContext(data.context);
        setUserAnswer('');
      }
      
    } catch (err) {
      console.error(err);
      setError('Error al procesar tu respuesta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateBio = async (tone: 'more_authoritative' | 'more_empathic' | 'more_inspiring') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/mentor/bio-interview/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          tone,
        }),
      });
      
      if (!res.ok) throw new Error('Error al regenerar');
      
      const data = await res.json();
      setResult(data.result);
      
    } catch (err) {
      console.error(err);
      setError('Error al regenerar biografía.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyBio = () => {
    if (result) {
      onComplete(result);
      onClose();
    }
  };

  const reset = () => {
    setContext({ currentStep: 1 });
    setCurrentQuestion('');
    setUserAnswer('');
    setResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-indigo-500/30 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🎙️</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">QUANTUM Bio-Writer</h2>
                  <p className="text-indigo-200 text-sm">Creador de perfil con autoridad</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-indigo-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                {error}
              </div>
            )}

            {/* Interview Questions */}
            {currentQuestion && !result && (
              <div className="space-y-6">
                {/* Progress */}
                <div className="flex gap-2 mb-8">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        context.currentStep >= step
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Question */}
                <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🤖</div>
                    <div className="flex-1">
                      <p className="text-white text-lg whitespace-pre-line">{currentQuestion}</p>
                    </div>
                  </div>
                </div>

                {/* Answer Input */}
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  disabled={isLoading}
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={submitAnswer}
                    disabled={!userAnswer.trim() || isLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Procesando...' : 'Continuar'}
                  </button>
                  <button
                    onClick={() => { reset(); onClose(); }}
                    className="px-6 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Result Preview */}
            {result && (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="text-center mb-6 sticky top-0 bg-slate-900 pb-4 z-10">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    ¡Tu perfil COMPLETO está listo!
                  </h3>
                  <p className="text-gray-400">
                    QUANTUM ha generado TODO tu perfil profesional
                  </p>
                </div>

                {/* Títulos Profesionales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-4">
                    <p className="text-xs text-purple-300 font-medium mb-1">TÍTULO PROFESIONAL</p>
                    <p className="text-white font-bold">{result.jobTitle}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-xs text-indigo-300 font-medium mb-1">TÍTULO DE MENTOR</p>
                    <p className="text-white font-bold">{result.mentorTitle}</p>
                  </div>
                </div>

                {/* Tagline */}
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-4">
                  <p className="text-xs text-indigo-300 font-medium mb-1">TAGLINE DE IMPACTO</p>
                  <p className="text-white text-xl font-bold">{result.tagline}</p>
                </div>

                {/* Promise */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">MI PROMESA (20-30 palabras)</p>
                  <p className="text-white text-lg">{result.promiseStatement}</p>
                </div>

                {/* Bio */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">BIOGRAFÍA COMPLETA (100-150 palabras)</p>
                  <p className="text-gray-300 leading-relaxed">{result.heroJourneyBio}</p>
                </div>

                {/* Visión */}
                <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-xs text-emerald-300 font-medium mb-2">VISIÓN PERSONAL</p>
                  <p className="text-white">{result.vision}</p>
                </div>

                {/* Especialidad Principal */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">ESPECIALIDAD PRINCIPAL</p>
                  <p className="text-white font-semibold text-lg">{result.mainSpecialty}</p>
                </div>

                {/* Especialidades Secundarias */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">ESPECIALIDADES SECUNDARIAS</p>
                  <div className="flex flex-wrap gap-2">
                    {result.secondarySpecialties.map((spec, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Habilidades Clave */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">HABILIDADES CLAVE</p>
                  <div className="flex flex-wrap gap-2">
                    {result.keySkills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Logros */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">LOGROS PRINCIPALES</p>
                  <ul className="space-y-2">
                    {result.achievements.map((achievement, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags de Expertise */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-3">TAGS DE EXPERTISE</p>
                  <div className="flex flex-wrap gap-2">
                    {result.expertiseTags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Style Badge */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-gray-400">Estilo detectado:</span>
                  <span className={`px-3 py-1 rounded-full font-bold ${
                    result.detectedStyle === 'HARDCORE'
                      ? 'bg-red-500/20 text-red-300'
                      : result.detectedStyle === 'EMPATHIC'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {result.detectedStyle === 'HARDCORE' ? '💪 Hardcore' : 
                     result.detectedStyle === 'EMPATHIC' ? '🤝 Empático' : 
                     '⚖️ Balanceado'}
                  </span>
                </div>

                {/* Regenerate Options */}
                <div className="border-t border-slate-700 pt-6">
                  <p className="text-sm text-gray-400 mb-3">¿Quieres cambiar el tono?</p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <button
                      onClick={() => regenerateBio('more_authoritative')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      💪 Más autoritario
                    </button>
                    <button
                      onClick={() => regenerateBio('more_empathic')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      🤝 Más empático
                    </button>
                    <button
                      onClick={() => regenerateBio('more_inspiring')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      ✨ Más inspirador
                    </button>
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={applyBio}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                  >
                    ✅ Aplicar a mi Perfil
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-4 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    🔄 Empezar de nuevo
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
