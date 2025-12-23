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
          
          if (indiceAreaActual < areasActivas.length) {
            const areaActual = areasActivas[indiceAreaActual];
            declaracionesParaEnviar = {
              ...declaracionesActuales,
              [areaActual.key]: propuestaMatch[1].trim()
            };
            
            // Actualizar el estado inmediatamente
            setDeclaracionesActuales(declaracionesParaEnviar);
            console.log(`✅ Pre-registrando declaración para ${areaActual.key}:`, propuestaMatch[1].trim());
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
        // Store the declarations for when user clicks "Aceptar"
        setDeclaracionesActuales(data.declaraciones);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error auto-finalizing:', error);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 border-2 border-cyan-500/30 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl shadow-cyan-500/20 overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-cyan-500/20 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Quantum Avatar - Orbe Animado */}
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-full shadow-lg shadow-cyan-500/50 animate-pulse">
                <Atom className="w-7 h-7 text-white animate-spin" style={{ animationDuration: '8s' }} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wider" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                QUANTUM
              </h2>
              <p className="text-xs text-cyan-300/70 font-mono flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                {isLoading ? 'Analizando patrones...' : 'Conectado al campo cuántico'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-cyan-400 transition-colors p-2 hover:bg-cyan-500/10 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="relative flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border border-slate-700'
                    : 'bg-gradient-to-br from-cyan-950/40 to-blue-950/40 text-cyan-50 border-l-4 border-cyan-400 shadow-lg shadow-cyan-500/10'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3 text-cyan-400">
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-xs font-bold font-mono tracking-wider">QUANTUM</span>
                  </div>
                )}
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${message.role === 'assistant' ? 'font-mono' : ''}`}>
                  {message.content}
                </p>
                <p className="text-xs opacity-40 mt-3 font-mono">
                  {message.timestamp.toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2">
              <div className="bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border-l-4 border-cyan-400 rounded-2xl px-5 py-4 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-3 text-cyan-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-mono">QUANTUM está procesando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative px-6 py-5 border-t border-cyan-500/20 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu respuesta..."
              disabled={isLoading || isProcessing}
              className="flex-1 px-5 py-3 bg-slate-900/50 border-2 border-cyan-500/30 rounded-xl
                       text-cyan-50 placeholder-cyan-700 font-mono text-sm
                       focus:outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || isProcessing || !inputValue.trim()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl
                       hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       transition-all duration-300 font-mono tracking-wide"
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
                     hover:shadow-lg hover:shadow-green-500/50 hover:scale-[1.02]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300 font-mono tracking-wide
                     border-2 border-green-400/30"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Procesando declaraciones...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18} className="animate-pulse" />
                ✨ Aplicar declaraciones
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 border-2 border-cyan-400/50 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl shadow-cyan-500/30 animate-in zoom-in-95 duration-300">
            
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl pointer-events-none"></div>
            
            {/* Content */}
            <div className="relative space-y-4">
              {/* Message with Icon */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-sm text-cyan-50 leading-relaxed">
                  ¡Tus declaraciones han sido actualizadas por Quantum!
                </p>
              </div>

              {/* Button */}
              <button
                onClick={handleConfirmSuccess}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/50 text-sm"
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
