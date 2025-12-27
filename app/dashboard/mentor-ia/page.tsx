'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Volume2 } from 'lucide-react';
import { obtenerHistorialChat, guardarMensajeChat } from '../../actions/chat-ia';
import VoiceButton from '@/components/quantum/VoiceButton';
import { useSession } from 'next-auth/react';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

export default function MentorIAPage() {
  const { data: session } = useSession();
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const respuestaActualRef = useRef('');

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
        } else {
          // Si no hay historial, mostrar mensaje de bienvenida
          setMensajes([]);
        }
      } catch (error) {
        console.error("Error cargando historial:", error);
      } finally {
        setCargandoHistorial(false);
      }
    };
    cargarMemoria();
  }, []);

  // Función para iniciar con "Estoy listo"
  const iniciarProceso = async () => {
    await handleSendMessage("Estoy listo, inicia el proceso.");
  };

  // Función auxiliar para enviar mensaje programáticamente
  const handleSendMessage = async (mensaje: string) => {
    if (procesando) return;

    setProcesando(true);

    try {
        // 1. UI Optimista
        const nuevosMensajes = [
            ...mensajes,
            { role: 'user' as const, content: mensaje },
            { role: 'assistant' as const, content: '' }
        ];
        setMensajes(nuevosMensajes);

        // Guardar mensaje del usuario en BD
        await guardarMensajeChat('user', mensaje);

        // 2. Llamada a la API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...mensajes, { role: 'user', content: mensaje }]
            }),
        });

        if (!response.ok) throw new Error('Error en la API');
        if (!response.body) throw new Error('Sin respuesta');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        respuestaActualRef.current = '';
        let lastUpdate = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            respuestaActualRef.current += chunk;

            const now = Date.now();
            if (now - lastUpdate > 50) {
                lastUpdate = now;
                setMensajes(prevMensajes => {
                    const copia = [...prevMensajes];
                    const ultimoIndex = copia.length - 1;
                    if (copia[ultimoIndex]?.role === 'assistant') {
                        copia[ultimoIndex] = {
                            ...copia[ultimoIndex],
                            content: respuestaActualRef.current
                        };
                    }
                    return copia;
                });
            }
        }

        setMensajes(prevMensajes => {
            const copia = [...prevMensajes];
            const ultimoIndex = copia.length - 1;
            if (copia[ultimoIndex]?.role === 'assistant') {
                copia[ultimoIndex] = {
                    ...copia[ultimoIndex],
                    content: respuestaActualRef.current
                };
            }
            return copia;
        });

        await guardarMensajeChat('assistant', respuestaActualRef.current);

    } catch (error) {
        console.error('Error:', error);
        setEstadoGuardado('❌ Error en la comunicación');
    } finally {
        setProcesando(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

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

        // 5. DETECCIÓN DE ÁREAS Y GUARDADO AUTOMÁTICO
        const respuestaCompleta = respuestaActualRef.current;
        
        // Detectar la señal especial que indica que Quantum terminó
        const tieneSeñalJSON = respuestaCompleta.includes('<<<JSON_START>>>');
        
        // Si detectamos la señal, ocultamos el JSON y mostramos solo el mensaje amigable
        if (tieneSeñalJSON) {
            console.log('✅ Señal JSON_START detectada, procesando...');
            
            // Extraer solo la parte antes de la señal (el mensaje amigable)
            const parteVisible = respuestaCompleta.split('<<<JSON_START>>>')[0].trim();
            
            // Actualizar el último mensaje para mostrar SOLO el mensaje amigable
            setMensajes(prevMensajes => {
                const copia = [...prevMensajes];
                const ultimoIndex = copia.length - 1;
                if (copia[ultimoIndex]?.role === 'assistant') {
                    copia[ultimoIndex] = {
                        ...copia[ultimoIndex],
                        content: parteVisible + '\n\n⏳ Procesando automáticamente...'
                    };
                }
                return copia;
            });
            
            // FEEDBACK VISUAL INMEDIATO
            setEstadoGuardado('⚙️ Extrayendo áreas configuradas.Esto puede tomar una minutos');
            
            try {
                // Usar el endpoint de extracción inteligente
                const extractResponse = await fetch('/api/quantum/extract-carta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        conversacion: mensajes.concat([{ role: 'assistant', content: respuestaCompleta }])
                    }),
                });

                if (!extractResponse.ok) {
                    throw new Error('Error en extracción');
                }

                const extractData = await extractResponse.json();
                console.log('✅ Datos extraídos:', extractData);

                // NO guardar en BD todavía - solo redirigir al wizard con los datos
                setEstadoGuardado('✅ Datos capturados! Redirigiendo al wizard para revisión...');
                
                // Obtener email del usuario de la sesión
                const userEmail = session?.user?.email || 'guest';
                
                // Guardar en localStorage ESPECÍFICO del usuario
                const quantumDraftKey = `quantum_draft_data_${userEmail}`;
                localStorage.setItem(quantumDraftKey, JSON.stringify({
                    cartaData: extractData.cartaData,
                    areasDisponibles: extractData.areasDisponibles,
                    timestamp: new Date().toISOString(),
                    source: 'quantum',
                    userEmail
                }));
                
                console.log(`💾 Draft guardado para usuario: ${userEmail}`);

                // Redirigir al wizard después de un breve momento
                setTimeout(() => {
                    window.location.href = '/dashboard/carta/wizard-v2';
                }, 1500);
                
            } catch (e) {
                console.error('Error en extracción:', e);
                setEstadoGuardado('❌ Error procesando. Revisa la consola.');
            }
        }

    } catch (error) {
        console.error("Error general:", error);
    } finally {
        setProcesando(false);
    }
  };

  // Handler para cuando el VoiceButton transcribe el audio
  const handleTranscriptReady = (text: string) => {
    setMensajes(prev => [...prev, { role: 'user', content: text }]);
    guardarMensajeChat('user', text);
  };

  // Handler para cuando el VoiceButton tiene la respuesta en audio
  const handleAudioResponse = (audioUrl: string, responseText: string) => {
    setMensajes(prev => [...prev, { role: 'assistant', content: responseText, audioUrl }]);
    guardarMensajeChat('assistant', responseText);
  };

  // Función para reproducir audio de respuestas anteriores
  const playAudio = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    audio.play();
    audio.onended = () => setCurrentAudio(null);
  };

  const limpiarConversacion = async () => {
    try {
      // Limpiar en el servidor
      const response = await fetch('/api/chat/clear', { method: 'POST' });
      if (response.ok) {
        setMensajes([]);
        setShowClearModal(false);
        setEstadoGuardado('✅ Conversación limpiada');
        setTimeout(() => setEstadoGuardado(''), 2000);
      }
    } catch (error) {
      console.error('Error limpiando conversación:', error);
      setEstadoGuardado('❌ Error al limpiar');
      setShowClearModal(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
            <Bot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">
              Quantum IA por Voz 🎙️
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h2>
            <p className="text-xs text-slate-400">Habla con Quantum IA - Interacción bidireccional</p>
          </div>
        </div>
        
        {/* Botón para limpiar conversación */}
        <button
          onClick={() => setShowClearModal(true)}
          disabled={procesando || mensajes.length === 0}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-lg border border-red-500/30 text-sm font-semibold transition-colors"
          title="Limpiar conversación y empezar de nuevo"
        >
          🗑️ Nueva Conversación
        </button>
      </div>
      
      {/* Modal de Confirmación */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border-2 border-red-500/50 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
                  <span className="text-3xl">🗑️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Nueva Conversación</h3>
                  <p className="text-sm text-red-400">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-300 text-base leading-relaxed">
                ¿Estás seguro de que deseas <span className="text-red-400 font-semibold">limpiar toda la conversación</span>?
              </p>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Se eliminará todo el historial de mensajes</span>
                </p>
                <p className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>La próxima conversación usará la configuración actualizada de áreas</span>
                </p>
                <p className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Podrás empezar de nuevo con un contexto limpio</span>
                </p>
              </div>
            </div>
            
            {/* Footer - Buttons */}
            <div className="bg-slate-800/50 border-t border-slate-700 p-6 flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={limpiarConversacion}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
              >
                Sí, Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900/50">
        {cargandoHistorial ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="max-w-2xl w-full">
              {/* Mensaje de Bienvenida Quantum */}
              <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Bienvenido, Arquitecto</h3>
                    <p className="text-purple-300">Soy QUANTUM</p>
                  </div>
                </div>

                <div className="space-y-4 text-gray-300 mb-6">
                  <p className="text-base leading-relaxed">
                    Estás a punto de diseñar el <span className="text-purple-400 font-semibold">código fuente de tu futuro</span>: tu Carta F.R.U.T.O.S.
                  </p>
                  
                  <p className="text-base leading-relaxed">
                    No vamos a simplemente "anotar deseos". Vamos a extraer y definir con precisión quirúrgica:
                  </p>

                  <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-purple-400 text-lg">🎯</span>
                      <div>
                        <p className="font-semibold text-white">Tu Identidad</p>
                        <p className="text-sm text-gray-400">Quién necesitas SER (Declaraciones de Poder)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-blue-400 text-lg">📊</span>
                      <div>
                        <p className="font-semibold text-white">Tus Objetivos</p>
                        <p className="text-sm text-gray-400">Qué vas a LOGRAR (Números fríos)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-pink-400 text-lg">⚡</span>
                      <div>
                        <p className="font-semibold text-white">Tus Acciones</p>
                        <p className="text-sm text-gray-400">Qué harás y con qué Frecuencia para garantizar el éxito</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-900/20 border border-orange-500/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-orange-400 text-2xl">⚠️</span>
                      <div>
                        <p className="font-bold text-orange-300 mb-2">ADVERTENCIA DE SISTEMA</p>
                        <p className="text-sm text-gray-300">
                          Este proceso requiere profundidad e interiorización. Necesitas al menos <span className="text-orange-400 font-semibold">40 minutos de enfoque total</span> y un lugar tranquilo donde puedas ser honesto contigo mismo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-lg font-semibold text-white mt-6">
                    ¿Tienes el tiempo y la disposición mental para comenzar ahora?
                  </p>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-4">
                  <button
                    onClick={iniciarProceso}
                    disabled={procesando}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/80 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-6 h-6" />
                    <span>🚀 ESTOY LISTO</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    ⏳ AHORA NO
                  </button>
                </div>
              </div>
            </div>
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

              <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-md
                ${m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">{line}</p>
                ))}
                
                {/* Botón para reproducir audio si existe */}
                {m.audioUrl && (
                  <button
                    onClick={() => playAudio(m.audioUrl!)}
                    className="mt-2 flex items-center gap-2 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1 rounded-lg transition"
                  >
                    <Volume2 size={14} />
                    Reproducir audio
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
        
        <div className="flex gap-3">
          {/* Botón de Voz - Izquierda */}
          <VoiceButton
            onTranscriptReady={handleTranscriptReady}
            onAudioResponse={handleAudioResponse}
            disabled={procesando}
            conversationHistory={mensajes.map(m => ({ role: m.role, content: m.content }))}
          />
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta algo sobre tu liderazgo..."
            disabled={procesando}
            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={procesando || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Impacto AI puede cometer errores. Verifica la información importante.
        </p>
      </form>
    </div>
  );
}
