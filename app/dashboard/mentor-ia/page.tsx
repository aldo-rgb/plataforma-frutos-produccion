'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2, FileText, Volume2 } from 'lucide-react';
import { obtenerHistorialChat, guardarMensajeChat } from '../../actions/chat-ia';
import { useRouter } from 'next/navigation';
import VoiceButton from '@/components/quantum/VoiceButton';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

export default function MentorIAPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState('');
  const [mostrarBotonCarta, setMostrarBotonCarta] = useState(false);
  const [extrayendoCarta, setExtrayendoCarta] = useState(false);
  const [modoVoz, setModoVoz] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const respuestaActualRef = useRef('');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Cargar historial al iniciar
  useEffect(() => {
    const cargarMemoria = async () => {
      try {
        const resultado = await obtenerHistorialChat();
        if (resultado.success && resultado.mensajes) {
          const historialFormateado = resultado.mensajes.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.contenido
          }));
          setMensajes(historialFormateado);
        }
      } catch (error) {
        console.error("Error cargando historial:", error);
      } finally {
        setCargandoHistorial(false);
      }
    };
    cargarMemoria();
  }, []);

  useEffect(() => {
    scrollToBottom();
    // Detectar si hay suficiente conversación para crear carta
    if (mensajes.length >= 6) { // Al menos 3 intercambios
      setMostrarBotonCarta(true);
    }
  }, [mensajes]);

  const handleExtractCarta = async () => {
    setExtrayendoCarta(true);
    setEstadoGuardado('🔍 Analizando conversación y extrayendo información...');

    try {
      const response = await fetch('/api/quantum/extract-carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacion: mensajes })
      });

      if (!response.ok) {
        throw new Error('Error extrayendo carta');
      }

      const { cartaData } = await response.json();
      
      // Guardar en localStorage para que el wizard lo use
      localStorage.setItem('quantum-carta-draft', JSON.stringify(cartaData));
      
      setEstadoGuardado('✅ Información extraída. Redirigiendo al Wizard...');
      
      // Redirigir al wizard después de 1 segundo
      setTimeout(() => {
        router.push('/dashboard/carta/wizard-v2?from=quantum');
      }, 1000);

    } catch (error) {
      console.error('Error extrayendo carta:', error);
      setEstadoGuardado('❌ Error al extraer información. Intenta de nuevo.');
      setTimeout(() => setEstadoGuardado(''), 3000);
    } finally {
      setExtrayendoCarta(false);
    }
  };

  const handleVoiceTranscript = async (text: string) => {
    // Agregar mensaje del usuario inmediatamente
    const nuevosMensajes = [
      ...mensajes,
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: '🎙️ Quantum está pensando...' }
    ];
    setMensajes(nuevosMensajes);

    // Guardar mensaje del usuario
    await guardarMensajeChat('user', text);
  };

  const handleVoiceResponse = async (audioUrl: string, responseText: string) => {
    // Actualizar el último mensaje del asistente con la respuesta real
    setMensajes(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
        updated[lastIndex] = {
          role: 'assistant',
          content: responseText,
          audioUrl: audioUrl
        };
      }
      return updated;
    });

    // Guardar respuesta del asistente
    await guardarMensajeChat('assistant', responseText);
  };

  const playAudio = (audioUrl: string) => {
    // Detener audio actual si existe
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audio.play().catch(err => console.error('Error reproduciendo audio:', err));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || procesando) return;

    const mensajeUsuario = input.trim();
    setInput('');
    setProcesando(true);

    try {
        // 1. UI Optimista: Mostrar mensaje del usuario y burbuja vacía del bot
        const nuevosMensajes = [
            ...mensajes,
            { role: 'user' as const, content: mensajeUsuario },
            { role: 'assistant' as const, content: '' }
        ];
        setMensajes(nuevosMensajes);

        // Guardar mensaje del usuario en BD
        await guardarMensajeChat('user', mensajeUsuario);

        // 2. Llamada a la API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...mensajes, { role: 'user', content: mensajeUsuario }]
            }),
        });

        if (!response.ok) throw new Error('Error en la API');
        if (!response.body) throw new Error('Sin respuesta');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        respuestaActualRef.current = '';
        let lastUpdate = 0;

        // 3. BUCLE DE LECTURA (Versión corregida sin parseo estricto)
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decodificar el chunk recibido
            const chunk = decoder.decode(value, { stream: true });
            
            // CORRECCIÓN CRÍTICA: Acumulamos directamente lo que envía el backend
            respuestaActualRef.current += chunk;

            // Throttle: Actualizar la pantalla máximo cada 50ms para no saturar
            const now = Date.now();
            if (now - lastUpdate > 50) {
                lastUpdate = now;
                setMensajes(prev => {
                    const nuevos = [...prev];
                    const ultimoIndex = nuevos.length - 1;
                    // Solo actualizamos si el último mensaje es del asistente
                    if (ultimoIndex >= 0 && nuevos[ultimoIndex].role === 'assistant') {
                        const copia = [...nuevos];
                        copia[ultimoIndex] = { 
                            ...copia[ultimoIndex], 
                            content: respuestaActualRef.current 
                        };
                        return copia;
                    }
                    return nuevos;
                });
            }
        }

        // 4. Actualización Final (Para asegurar que llegue el último pedazo de texto)
        setMensajes(prev => {
            const nuevos = [...prev];
            const ultimoIndex = nuevos.length - 1;
            if (ultimoIndex >= 0 && nuevos[ultimoIndex].role === 'assistant') {
                const copia = [...nuevos];
                copia[ultimoIndex] = { 
                    ...copia[ultimoIndex], 
                    content: respuestaActualRef.current 
                };
                return copia;
            }
            return nuevos;
        });

        // 5. DETECCIÓN DE JSON Y GUARDADO
        const respuestaCompleta = respuestaActualRef.current;
        
        // Regex para buscar el bloque JSON de forma más robusta
        const regexJson = /```json([\s\S]*?)```/;
        const match = respuestaCompleta.match(regexJson);

        if (match && match[1]) {
            console.log('✅ JSON detectado, iniciando guardado automático...');
            
            // FEEDBACK VISUAL INMEDIATO
            setEstadoGuardado('⚙️ Detectando metas... Guardando en tu tablero, por favor espera.');
            
            try {
                // Enviamos la respuesta completa (el backend extraerá el JSON)
                const procesarResponse = await fetch('/api/chat/procesar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        respuestaCompleta: respuestaCompleta 
                    }),
                });

                if (procesarResponse.ok) {
                    console.log('✅ ¡Metas guardadas en base de datos!');
                    
                    // Feedback visual de éxito
                    setEstadoGuardado('✅ ¡Guardado! Redirigiendo a tu Carta de Frutos...');
                    
                    // Redirigir a la carta después de un breve momento
                    setTimeout(() => {
                        window.location.href = '/dashboard/carta';
                    }, 1500);
                } else {
                    const errorData = await procesarResponse.json();
                    console.error('❌ Error guardando en BD:', errorData);
                    setEstadoGuardado('❌ Error al guardar. Ver consola para detalles.');
                }
            } catch (e) {
                console.error('Error parseando o enviando JSON:', e);
                setEstadoGuardado('❌ Error de conexión. Verifica tu red.');
            }
        }

    } catch (error) {
        console.error("Error general:", error);
    } finally {
        setProcesando(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
          <Bot className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-bold flex items-center gap-2">
            Coach Ontológico IA
            <Sparkles className="w-4 h-4 text-purple-400" />
          </h2>
          <p className="text-xs text-slate-400">Tu mentor de liderazgo imposible</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900/50">
        {cargandoHistorial ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-8 mb-6">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              <h3 className="text-2xl font-bold text-white mb-3">Bienvenido a Quantum IA</h3>
              <p className="text-slate-300 mb-4 leading-relaxed">
                Soy tu coach ontológico personal. Puedo ayudarte a:
              </p>
              <ul className="text-left space-y-2 mb-6 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong className="text-white">Definir tus objetivos</strong> en las 8 áreas de vida</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong className="text-white">Crear tu Carta F.R.U.T.O.S.</strong> de forma conversacional</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong className="text-white">Diseñar acciones concretas</strong> con frecuencias específicas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong className="text-white">Transformar conversaciones</strong> en planes de acción</span>
                </li>
              </ul>
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 text-sm">
                <p className="text-blue-300">
                  💡 <strong>Tip:</strong> Después de conversar sobre tus objetivos, aparecerá un botón para 
                  crear tu Carta automáticamente. Podrás revisar y ajustar todo antes de confirmar.
                </p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Escribe algo para comenzar tu transformación...
            </p>
          </div>
        ) : (
          mensajes.map((m, idx) => (
            <div
              key={`msg-${idx}-${m.content.length}`}
              className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                ${m.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-md
                ${m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">{line}</p>
                ))}
                
                {/* Botón para reproducir audio si existe */}
                {m.audioUrl && m.role === 'assistant' && (
                  <button
                    onClick={() => playAudio(m.audioUrl!)}
                    className="mt-2 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Volume2 size={14} />
                    <span>Reproducir audio</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {procesando && mensajes[mensajes.length - 1]?.content === '' && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-4">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800">
        {/* Banner de estado de guardado */}
        {estadoGuardado && (
          <div className="mb-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-lg text-center font-medium animate-pulse shadow-lg border border-purple-400/50">
            {estadoGuardado}
          </div>
        )}

        {/* Botón para crear carta desde conversación */}
        {mostrarBotonCarta && !extrayendoCarta && !estadoGuardado && (
          <div className="mb-3 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/40 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-emerald-400" size={24} />
                <div>
                  <h3 className="text-white font-semibold">¿Listo para formalizar tus objetivos?</h3>
                  <p className="text-slate-300 text-sm">Crea tu Carta F.R.U.T.O.S. con lo que hemos conversado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExtractCarta}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <FileText size={18} />
                Crear Carta
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe o usa el micrófono para hablar..."
            disabled={procesando || extrayendoCarta}
            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
          
          {/* Botón de voz cuando no hay texto */}
          {!input.trim() && !procesando && !extrayendoCarta ? (
            <VoiceButton
              onTranscriptReady={handleVoiceTranscript}
              onAudioResponse={handleVoiceResponse}
              conversationHistory={mensajes.map(m => ({ role: m.role, content: m.content }))}
              disabled={procesando || extrayendoCarta}
            />
          ) : (
            <button
              type="submit"
              disabled={procesando || extrayendoCarta || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
            >
              {procesando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Quantum IA puede cometer errores. Verifica la información importante.
        </p>
      </form>
    </div>
  );
}
