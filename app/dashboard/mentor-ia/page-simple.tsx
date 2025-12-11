'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { obtenerHistorialChat, guardarMensajeChat } from '../../actions/chat-ia';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

export default function MentorIAPage() {
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [, forceUpdate] = useState(0); // Force re-render hack
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [mensajes]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || procesando) return;

    const mensajeUsuario = input.trim();
    setInput('');
    setProcesando(true);

    try {
      // Agregar mensaje del usuario
      setMensajes(prev => [...prev, { role: 'user', content: mensajeUsuario }]);
      await guardarMensajeChat('user', mensajeUsuario);

      // Placeholder para la respuesta
      const placeholderIndex = mensajes.length + 1;
      setMensajes(prev => [...prev, { role: 'assistant', content: '' }]);

      // Llamar a la API
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
      let respuestaCompleta = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lineas = chunk.split('\n');
        
        for (const linea of lineas) {
          if (linea.startsWith('0:')) {
            try {
              const texto = JSON.parse(linea.substring(2));
              respuestaCompleta += texto;
              
              // Forzar actualización inmediata
              setMensajes(prev => {
                const nuevos = [...prev];
                if (nuevos[placeholderIndex]) {
                  nuevos[placeholderIndex] = { role: 'assistant', content: respuestaCompleta };
                }
                return nuevos;
              });
              forceUpdate(n => n + 1); // Forzar re-render
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        }
      }

      // Procesar JSON si existe
      if (respuestaCompleta.includes('```json') && respuestaCompleta.includes('carta_de_frutos')) {
        try {
          const procesarResponse = await fetch('/api/chat/procesar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ respuestaCompleta }),
          });
          
          if (procesarResponse.ok) {
            setTimeout(() => {
              window.location.href = '/dashboard/carta';
            }, 3000);
          }
        } catch (error) {
          console.error('Error procesando:', error);
        }
      }

    } catch (error) {
      console.error("Error:", error);
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
          <div className="text-center text-slate-500 mt-10">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Tu futuro imposible ya inicio. Escribe algo para iniciar..</p>
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
        <div className="flex gap-3">
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
