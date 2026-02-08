'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Sparkles, Gift, 
  Check, Loader2, Star, Heart, Zap, Plus, Trash2
} from 'lucide-react';

interface Question {
  id: string;
  type: string;
  question: string;
  placeholder?: string;
  subtitle?: string;
  required: boolean;
  icon: string;
  options?: string[];
  minRequired?: number;
  maxItems?: number;
  maxLength?: number;
  conditionalQuestion?: {
    id: string;
    question: string;
    placeholder: string;
  };
}

interface ParticipantSurveyModalProps {
  productId: number;
  productName: string;
  levelType: string;
  questions: Question[];
  pointsReward: number;
  onComplete: () => void;
  onClose: () => void;
}

export default function ParticipantSurveyModal({
  productId,
  productName,
  levelType,
  questions,
  pointsReward,
  onComplete,
  onClose,
}: ParticipantSurveyModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [peopleList, setPeopleList] = useState<{ name: string; relationship: string }[]>([
    { name: '', relationship: '' },
    { name: '', relationship: '' },
    { name: '', relationship: '' },
  ]);

  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = questions[currentStep];

  const getLevelTitle = () => {
    if (levelType === 'BASIC') return 'Básico';
    if (levelType === 'ADVANCED') return 'Avanzado';
    return 'Liderazgo';
  };

  const getLevelGradient = () => {
    if (levelType === 'BASIC') return 'from-cyan-500 via-blue-500 to-indigo-600';
    if (levelType === 'ADVANCED') return 'from-purple-500 via-pink-500 to-rose-500';
    return 'from-amber-500 via-orange-500 to-red-500';
  };

  const handleTextResponse = (value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleColorSelect = (color: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: color
    }));
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleBooleanResponse = (value: boolean) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleLeaderDescription = (field: 'name' | 'word1' | 'word2' | 'word3', value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || {}),
        [field]: value
      }
    }));
  };

  const handlePeopleListChange = (index: number, field: 'name' | 'relationship', value: string) => {
    const newList = [...peopleList];
    newList[index] = { ...newList[index], [field]: value };
    setPeopleList(newList);
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: newList.filter(p => p.name.trim() !== '')
    }));
  };

  const addPersonSlot = () => {
    if (peopleList.length < (currentQuestion.maxItems || 5)) {
      setPeopleList([...peopleList, { name: '', relationship: '' }]);
    }
  };

  const removePersonSlot = (index: number) => {
    if (peopleList.length > (currentQuestion.minRequired || 3)) {
      const newList = peopleList.filter((_, i) => i !== index);
      setPeopleList(newList);
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: newList.filter(p => p.name.trim() !== '')
      }));
    }
  };

  const isCurrentStepValid = () => {
    const response = responses[currentQuestion.id];
    
    if (currentQuestion.type === 'people-list') {
      const filledPeople = peopleList.filter(p => p.name.trim() !== '' && p.relationship.trim() !== '');
      return filledPeople.length >= (currentQuestion.minRequired || 3);
    }
    
    if (currentQuestion.type === 'leader-description') {
      const leader = response as { name?: string; word1?: string; word2?: string; word3?: string } | undefined;
      return leader?.name && leader?.word1 && leader?.word2 && leader?.word3;
    }
    
    if (currentQuestion.type === 'boolean-conditional') {
      if (response === undefined) return false;
      if (response === true && currentQuestion.conditionalQuestion) {
        return !!responses[currentQuestion.conditionalQuestion.id];
      }
      return true;
    }
    
    return !!response;
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/participant/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          responses,
        })
      });

      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        setShowSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar la encuesta');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error al enviar la encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de éxito
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          {/* Animación de confeti/estrellas */}
          <div className="relative mb-8">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.cos(i * 30 * Math.PI / 180) * 100,
                  y: Math.sin(i * 30 * Math.PI / 180) * 100,
                }}
                transition={{ delay: 0.2 + i * 0.05, duration: 1 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${getLevelGradient()} flex items-center justify-center shadow-2xl`}
            >
              <Gift className="w-16 h-16 text-white" />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl font-black text-white mb-4"
          >
            ¡GRACIAS!
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-400 mb-4"
          >
            <Zap className="w-8 h-8" />
            <span>+{pointsReward} puntos</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-slate-400"
          >
            Tu opinión nos ayuda a mejorar
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 overflow-hidden"
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br ${getLevelGradient()} opacity-10 rounded-full blur-3xl`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br ${getLevelGradient()} opacity-10 rounded-full blur-3xl`} />
      </div>

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getLevelGradient()} flex items-center justify-center`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Déjame Conocerte</h2>
              <p className="text-xs text-slate-400">{getLevelTitle()} • {productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pregunta {currentStep + 1} de {totalSteps}</span>
            <span className="flex items-center gap-1">
              <Gift className="w-4 h-4 text-yellow-400" />
              +{pointsReward} puntos al completar
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getLevelGradient()}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Contenido de la pregunta */}
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              {/* Icono y pregunta */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{currentQuestion.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.subtitle && (
                  <p className="text-slate-400 text-sm">{currentQuestion.subtitle}</p>
                )}
              </div>

              {/* Input según el tipo */}
              {currentQuestion.type === 'text' && (
                <input
                  type="text"
                  value={responses[currentQuestion.id] || ''}
                  onChange={(e) => handleTextResponse(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  maxLength={currentQuestion.maxLength}
                  className="w-full px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-2xl text-white text-lg placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  autoFocus
                />
              )}

              {currentQuestion.type === 'textarea' && (
                <textarea
                  value={responses[currentQuestion.id] || ''}
                  onChange={(e) => handleTextResponse(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  maxLength={currentQuestion.maxLength}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-2xl text-white text-lg placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  autoFocus
                />
              )}

              {currentQuestion.type === 'single-word' && (
                <div className="text-center">
                  <input
                    type="text"
                    value={responses[currentQuestion.id] || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '');
                      handleTextResponse(value);
                    }}
                    placeholder={currentQuestion.placeholder}
                    maxLength={currentQuestion.maxLength || 20}
                    className="w-full max-w-xs mx-auto px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-2xl text-white text-2xl text-center placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-bold"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-2">Sin espacios, una sola palabra</p>
                </div>
              )}

              {currentQuestion.type === 'color-picker' && (
                <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                  {currentQuestion.options?.map((color) => (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleColorSelect(color)}
                      className={`w-14 h-14 rounded-2xl transition-all ${
                        responses[currentQuestion.id] === color
                          ? 'ring-4 ring-white ring-offset-4 ring-offset-slate-900 scale-110'
                          : 'hover:ring-2 hover:ring-white/50'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {responses[currentQuestion.id] === color && (
                        <Check className="w-6 h-6 text-white mx-auto drop-shadow-lg" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'boolean-conditional' && (
                <div className="space-y-6">
                  <div className="flex justify-center gap-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBooleanResponse(true)}
                      className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-2 ${
                        responses[currentQuestion.id] === true
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Heart className="w-5 h-5" />
                      ¡Sí!
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBooleanResponse(false)}
                      className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                        responses[currentQuestion.id] === false
                          ? 'bg-slate-500 text-white shadow-lg'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      No mucho
                    </motion.button>
                  </div>

                  {/* Pregunta condicional */}
                  <AnimatePresence>
                    {responses[currentQuestion.id] === true && currentQuestion.conditionalQuestion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-slate-700">
                          <p className="text-slate-300 mb-3 text-center">{currentQuestion.conditionalQuestion.question}</p>
                          <input
                            type="text"
                            value={responses[currentQuestion.conditionalQuestion.id] || ''}
                            onChange={(e) => setResponses(prev => ({
                              ...prev,
                              [currentQuestion.conditionalQuestion!.id]: e.target.value
                            }))}
                            placeholder={currentQuestion.conditionalQuestion.placeholder}
                            className="w-full px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {currentQuestion.type === 'leader-description' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={(responses[currentQuestion.id] as any)?.name || ''}
                    onChange={(e) => handleLeaderDescription('name', e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                    autoFocus
                  />
                  <p className="text-center text-slate-400 text-sm pt-2">Descríbelo en 3 palabras:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['word1', 'word2', 'word3'].map((word, index) => (
                      <input
                        key={word}
                        type="text"
                        value={(responses[currentQuestion.id] as any)?.[word] || ''}
                        onChange={(e) => handleLeaderDescription(word as any, e.target.value)}
                        placeholder={`Palabra ${index + 1}`}
                        className="px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white text-center placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                      />
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.type === 'people-list' && (
                <div className="space-y-4">
                  {peopleList.map((person, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < (currentQuestion.minRequired || 3)
                            ? `bg-gradient-to-br ${getLevelGradient()} text-white`
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className={`text-sm ${
                          index < (currentQuestion.minRequired || 3)
                            ? 'text-white font-medium'
                            : 'text-slate-400'
                        }`}>
                          {index < (currentQuestion.minRequired || 3) ? 'Obligatorio' : 'Opcional'}
                        </span>
                        {index >= (currentQuestion.minRequired || 3) && (
                          <button
                            onClick={() => removePersonSlot(index)}
                            className="ml-auto p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => handlePeopleListChange(index, 'name', e.target.value)}
                          placeholder="Nombre completo"
                          className="px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                        />
                        <select
                          value={person.relationship}
                          onChange={(e) => handlePeopleListChange(index, 'relationship', e.target.value)}
                          className="px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-slate-800">Parentesco...</option>
                          <option value="Mamá" className="bg-slate-800">👩 Mamá</option>
                          <option value="Papá" className="bg-slate-800">👨 Papá</option>
                          <option value="Hermano/a" className="bg-slate-800">👫 Hermano/a</option>
                          <option value="Hijo/a" className="bg-slate-800">👶 Hijo/a</option>
                          <option value="Esposo/a" className="bg-slate-800">💍 Esposo/a</option>
                          <option value="Novio/a" className="bg-slate-800">❤️ Novio/a</option>
                          <option value="Amigo/a" className="bg-slate-800">🤝 Amigo/a</option>
                          <option value="Primo/a" className="bg-slate-800">👥 Primo/a</option>
                          <option value="Tío/a" className="bg-slate-800">👴 Tío/a</option>
                          <option value="Abuelo/a" className="bg-slate-800">👵 Abuelo/a</option>
                          <option value="Compañero trabajo" className="bg-slate-800">💼 Compañero trabajo</option>
                          <option value="Otro" className="bg-slate-800">📝 Otro</option>
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  
                  {peopleList.length < (currentQuestion.maxItems || 5) && (
                    <button
                      onClick={addPersonSlot}
                      className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar otra persona
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navegación inferior fija */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                currentStep === 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            {currentStep === totalSteps - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!isCurrentStepValid() || submitting}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  isCurrentStepValid() && !submitting
                    ? `bg-gradient-to-r ${getLevelGradient()} text-white shadow-lg`
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Enviar y ganar {pointsReward} pts
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                disabled={!isCurrentStepValid()}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  isCurrentStepValid()
                    ? `bg-gradient-to-r ${getLevelGradient()} text-white shadow-lg`
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
