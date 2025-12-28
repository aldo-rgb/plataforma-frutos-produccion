'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, CheckCircle, Zap, Atom } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface QuantumCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (declaraciones: Record<string, string>) => void;
  currentDeclaraciones?: Record<string, string>;
  perteneceAGrupo?: boolean;
  areasActivas?: Array<{ key: string; name: string; emoji: string }>;
}

const AREAS = [
  { key: 'finanzas', name: 'FINANZAS', emoji: '💰' },
  { key: 'relaciones', name: 'RELACIONES', emoji: '❤️' },
  { key: 'talentos', name: 'TALENTOS', emoji: '🎨' },
  { key: 'salud', name: 'SALUD', emoji: '💪' },
  { key: 'pazMental', name: 'PAZ MENTAL', emoji: '🧘' },
  { key: 'ocio', name: 'OCIO', emoji: '🎮' },
  { key: 'servicioTrans', name: 'SERVICIO TRANSFORMACIONAL', emoji: '🌟' },
  { key: 'servicioComun', name: 'SERVICIO COMUNITARIO', emoji: '🤝' }
];

export default function QuantumCoachModal({ 
  isOpen, 
  onClose, 
  onComplete,
  currentDeclaraciones = {},
  perteneceAGrupo = false,
  areasActivas: areasActivasProp
}: QuantumCoachModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [declaracionesActuales, setDeclaracionesActuales] = useState<Record<string, string>>(currentDeclaraciones);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [conversationId] = useState(() => `quantum-${Date.now()}`);
  
  // Usar áreas activas recibidas como prop, o filtrar por defecto si no se reciben
  const areasActivas = areasActivasProp || AREAS.filter(area => {
    if (!perteneceAGrupo) {
      return area.key !== 'servicioTrans' && area.key !== 'servicioComun';
    }
    return true;
  });
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/quantum/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          conversationId,
          currentDeclaraciones: declaracionesActuales,
          perteneceAGrupo,
          areasActivas: areasActivas.map(a => ({ key: a.key, name: a.name, emoji: a.emoji }))
        })
      });

      const data = await response.json();
      
      if (data.message) {
        setMessages([{
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error initializing Quantum:', error);
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy Quantum, tu coach ontológico. ¿En qué puedo ayudarte hoy?\n\n1️⃣ **Explícame**: ¿Cómo se redacta una declaración del SER?\n2️⃣ **Ayúdame a descubrir**: Hazme preguntas para encontrar mis declaraciones',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Detectar si es una confirmación de declaración ANTES de enviar al API
    const esConfirmacion = /^(s[ií]|ok|confirmo|esa|perfecto|exacto|correcto|de acuerdo)$/i.test(userMessage.content.trim());
    let declaracionesParaEnviar = { ...declaracionesActuales };
    
    console.log('📊 Estado actual de declaraciones:', declaracionesActuales);
    console.log('📋 Áreas activas configuradas:', areasActivas.map(a => `${a.key}: ${a.name}`));
    
    // Si es confirmación, buscar la declaración propuesta en el último mensaje del asistente
    if (esConfirmacion && messages.length > 0) {
      const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMessage) {
        // Buscar declaración propuesta: "Yo soy..."
        const propuestaMatch = lastAssistantMessage.content.match(/["']?(Yo soy[^"'\n?]+)["']?/i);
        if (propuestaMatch) {
          // Determinar qué área estamos trabajando
          const areasYaCompletas = Object.keys(declaracionesActuales).filter(k => declaracionesActuales[k]);
          const indiceAreaActual = areasYaCompletas.length;
          
          console.log(`✅ Áreas completadas hasta ahora (${areasYaCompletas.length}):`, areasYaCompletas);
          console.log(`📍 Índice área actual: ${indiceAreaActual} de ${areasActivas.length}`);
          
          if (indiceAreaActual < areasActivas.length) {
            const areaActual = areasActivas[indiceAreaActual];
            declaracionesParaEnviar = {
              ...declaracionesActuales,
              [areaActual.key]: propuestaMatch[1].trim()
            };
            
            // Actualizar el estado inmediatamente
            setDeclaracionesActuales(declaracionesParaEnviar);
            console.log(`✅ Pre-registrando declaración para ${areaActual.key} (${areaActual.name}):`, propuestaMatch[1].trim());
          }
        }
      }
    }
    
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/quantum/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          conversationId,
          message: userMessage.content,
          currentDeclaraciones: declaracionesParaEnviar, // Enviar las declaraciones actualizadas
          conversationHistory: messages,
          perteneceAGrupo,
          areasRequeridas: areasActivas.length,
          areasActivas: areasActivas.map(a => ({ key: a.key, name: a.name, emoji: a.emoji }))
        })
      });

      const data = await response.json();

      if (data.message) {
        const assistantMessage = data.message;
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date()
        }]);
        
        // La lógica de registro ahora se hace ANTES de enviar el mensaje
        // No necesitamos extraer aquí porque ya se hizo pre-registro
        
        // Auto-detectar si debe finalizar
        if (data.shouldFinalize) {
          setTimeout(() => {
            handleAutoFinalize();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Disculpa, hubo un error. Por favor intenta nuevamente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      // Re-focus input after sending message
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleAutoFinalize = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/quantum/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          conversationId,
          conversationHistory: messages,
          currentDeclaraciones: declaracionesActuales,
          perteneceAGrupo
        })
      });

      const data = await response.json();

      if (data.declaraciones) {
        // Guardar las declaraciones pero NO cerrar automáticamente
        setDeclaracionesActuales(data.declaraciones);
        
        // Mostrar mensaje pidiendo al usuario que haga clic en el botón
        setMessages(prev => [...prev, {
          role: 'system',
          content: '✅ ¡Perfecto! He preparado tus declaraciones del SER. Ahora haz clic en el botón verde "✨ Aplicar declaraciones" para guardar tu nueva identidad.',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error auto-finalizing:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Hubo un error al preparar las declaraciones. Intenta usar el botón "Aplicar declaraciones".',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/quantum/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          conversationId,
          conversationHistory: messages,
          currentDeclaraciones: declaracionesActuales
        })
      });

      const data = await response.json();

      if (data.declaraciones) {
        // Store the declarations for when user clicks "Aceptar"
        setDeclaracionesActuales(data.declaraciones);
        setShowSuccessModal(true);
      } else {
        alert('No se pudieron extraer declaraciones. Por favor, intenta ser más específico en la conversación.');
      }
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Error al procesar las declaraciones. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSuccess = () => {
    // No need to call API again - declarations already saved from handleAutoFinalize or handleFinalize
    onComplete(declaracionesActuales);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Quantum Brain Logo */}
                <svg 
                  width="48" 
                  height="48" 
                  viewBox="0 0 48 48" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-lg"
                >
                  {/* Quantum Field - Outer Glow */}
                  <circle cx="24" cy="24" r="22" fill="url(#quantumGlow)" opacity="0.3" className="animate-pulse" />
                  
                  {/* Brain Structure */}
                  <path 
                    d="M24 8C17.5 8 12 13 12 19.5C12 22 13 24 14.5 25.5C13 27 12 29 12 31.5C12 36 16 40 21 40C22.5 40 24 39.5 25 38.5C26 39.5 27.5 40 29 40C34 40 38 36 38 31.5C38 29 37 27 35.5 25.5C37 24 38 22 38 19.5C38 13 32.5 8 26 8" 
                    stroke="url(#brainGradient)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                  
                  {/* Brain Folds - Left */}
                  <path 
                    d="M16 20C16 20 18 18 20 20C22 22 20 24 18 24" 
                    stroke="url(#brainGradient)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    fill="none"
                  />
                  
                  {/* Brain Folds - Right */}
                  <path 
                    d="M32 20C32 20 30 18 28 20C26 22 28 24 30 24" 
                    stroke="url(#brainGradient)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    fill="none"
                  />
                  
                  {/* Neural Connections */}
                  <line x1="20" y1="28" x2="28" y2="28" stroke="url(#neuralGradient)" strokeWidth="1.5" opacity="0.8" />
                  <line x1="18" y1="32" x2="30" y2="32" stroke="url(#neuralGradient)" strokeWidth="1.5" opacity="0.8" />
                  
                  {/* Quantum Particles - Floating */}
                  <circle cx="12" cy="16" r="1.5" fill="#60a5fa" className="animate-pulse" style={{animationDelay: '0s'}} />
                  <circle cx="36" cy="14" r="1.5" fill="#a78bfa" className="animate-pulse" style={{animationDelay: '0.3s'}} />
                  <circle cx="10" cy="26" r="1.5" fill="#c084fc" className="animate-pulse" style={{animationDelay: '0.6s'}} />
                  <circle cx="38" cy="28" r="1.5" fill="#60a5fa" className="animate-pulse" style={{animationDelay: '0.9s'}} />
                  <circle cx="14" cy="36" r="1.5" fill="#a78bfa" className="animate-pulse" style={{animationDelay: '1.2s'}} />
                  <circle cx="34" cy="38" r="1.5" fill="#c084fc" className="animate-pulse" style={{animationDelay: '1.5s'}} />
                  
                  {/* Energy Waves */}
                  <circle cx="24" cy="24" r="18" stroke="url(#waveGradient)" strokeWidth="0.5" opacity="0.3" fill="none" className="animate-ping" style={{animationDuration: '3s'}} />
                  <circle cx="24" cy="24" r="20" stroke="url(#waveGradient)" strokeWidth="0.5" opacity="0.2" fill="none" className="animate-ping" style={{animationDuration: '4s', animationDelay: '1s'}} />
                  
                  {/* Gradients */}
                  <defs>
                    <radialGradient id="quantumGlow">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </radialGradient>
                    <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                    <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                    <linearGradient id="waveGradient">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">QUANTUM</h2>
                <p className="text-indigo-200 text-sm flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {isLoading ? 'Analizando patrones...' : 'Conectado al campo cuántico'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-800/30">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-[80%] rounded-xl px-5 py-4 ${
                  message.role === 'user'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/50 text-white border-l-4 border-indigo-500'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl flex-shrink-0">🤖</div>
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}
                {message.role === 'user' && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                )}
                <p className="text-xs opacity-40 mt-2">
                  {message.timestamp.toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 mb-4">
              <div className="bg-slate-800/50 border-l-4 border-indigo-500 rounded-xl px-5 py-4">
                <div className="flex items-center gap-3 text-indigo-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Procesando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-900">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu respuesta..."
              disabled={isLoading || isProcessing}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl
                       text-white placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || isProcessing || !inputValue.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl
                       hover:shadow-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>

          <button
            onClick={handleFinalize}
            disabled={isProcessing || messages.length < 3}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl
                     hover:shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Procesando declaraciones...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18} />
                ✨ Aplicar declaraciones
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Content */}
            <div className="space-y-4">
              {/* Message with Icon */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm text-white leading-relaxed">
                  ¡Tus declaraciones han sido actualizadas por Quantum!
                </p>
              </div>

              {/* Button */}
              <button
                onClick={handleConfirmSuccess}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg text-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
