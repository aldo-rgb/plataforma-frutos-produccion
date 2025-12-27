'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Zap, Calendar, Trash2, Check, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface TareaRetrasada {
  id: number;
  accionId: number;
  texto: string;
  dueDate: string;
  diasRetraso: number;
  categoria: string;
  metaPrincipal?: string;
  postponeCount?: number;
}

interface DetectorData {
  needsIntervention: boolean;
  stats: {
    total: number;
    categorias: number;
    diasPromedioRetraso: number;
    masRetrasada: number;
  };
  tareasPorCategoria: Record<string, TareaRetrasada[]>;
  tareasRaw: TareaRetrasada[];
  message: string;
}

interface Mensaje {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function QuantumDetectorPage() {
  const [detectorData, setDetectorData] = useState<DetectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatActive, setChatActive] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDetectorData();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  const fetchDetectorData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quantum/detector');
      const data = await res.json();
      setDetectorData(data);
      console.log('📊 Detector data:', data);
    } catch (error) {
      console.error('Error fetching detector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarSesionDesbloqueo = () => {
    if (!detectorData) return;

    // Construir contexto inicial para la IA
    const tareasTexto = detectorData.tareasRaw
      .map((t, i) => `${i + 1}. "${t.texto}" (${t.diasRetraso} días de retraso, Área: ${t.categoria})`)
      .join('\n');

    const mensajeInicial: Mensaje = {
      role: 'assistant',
      content: `Hola! Soy Quantum en modo Desbloqueo. He detectado ${detectorData.stats.total} tareas que llevan más de 3 días esperando:

${tareasTexto}

No te preocupes, no estoy aquí para juzgar. Mi única misión es ayudarte a abrirposibilidades para que estas tareas se cierren HOY o se renegocien sin culpa.

¿Con cuál de estas te gustaría empezar? O si prefieres, puedo ayudarte a entender qué las está bloqueando.`
    };

    setMensajes([mensajeInicial]);
    setChatActive(true);
  };

  const enviarMensaje = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage: Mensaje = {
      role: 'user',
      content: inputMessage
    };

    setMensajes(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // Llamar al endpoint de chat con streaming
      const response = await fetch('/api/quantum/unblocker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...mensajes, userMessage],
          tareasContext: detectorData?.tareasRaw || []
        })
      });

      if (!response.ok) {
        throw new Error('Error en respuesta');
      }

      // Procesar streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              const data = line.slice(2);
              aiResponse += data;
            }
          }
        }
      }

      // Agregar respuesta completa
      const assistantMessage: Mensaje = {
        role: 'assistant',
        content: aiResponse
      };

      setMensajes(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMessage: Mensaje = {
        role: 'system',
        content: '❌ Error al comunicarse con Quantum. Intenta nuevamente.'
      };
      setMensajes(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const ejecutarAccion = async (action: string, taskId: number, data?: any) => {
    setActionLoading(taskId);
    try {
      const res = await fetch('/api/quantum/unblocker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, taskId, data })
      });

      if (res.ok) {
        // Recargar datos
        await fetchDetectorData();
        
        // Agregar mensaje de confirmación
        const confirmMessage: Mensaje = {
          role: 'system',
          content: `✅ Acción ejecutada: ${action === 'MOVE_TO_TODAY' ? 'Movida a HOY' : action === 'MARK_COMPLETE' ? 'Completada' : action === 'DELETE_TASK' ? 'Eliminada' : 'Procesada'}`
        };
        setMensajes(prev => [...prev, confirmMessage]);
      }
    } catch (error) {
      console.error('Error ejecutando acción:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <Loader2 className="animate-spin text-amber-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-xl">
              <Zap className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quantum Detector</h1>
              <p className="text-gray-600">Monitor de tareas retrasadas (+3 días)</p>
            </div>
          </div>
        </div>

        {/* Dashboard de Estado */}
        {!chatActive && detectorData && (
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Retrasadas</p>
                    <p className="text-3xl font-bold text-amber-600">{detectorData.stats.total}</p>
                  </div>
                  <AlertTriangle className="text-amber-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Áreas Afectadas</p>
                    <p className="text-3xl font-bold text-orange-600">{detectorData.stats.categorias}</p>
                  </div>
                  <Clock className="text-orange-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Promedio Retraso</p>
                    <p className="text-3xl font-bold text-red-600">{detectorData.stats.diasPromedioRetraso}d</p>
                  </div>
                  <Calendar className="text-red-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Más Antigua</p>
                    <p className="text-3xl font-bold text-purple-600">{detectorData.stats.masRetrasada}d</p>
                  </div>
                  <AlertTriangle className="text-purple-500" size={32} />
                </div>
              </div>
            </div>

            {/* Invitación a Conversar */}
            {detectorData.needsIntervention ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3">💡 Sesión de Desbloqueo Disponible</h2>
                    <p className="text-amber-50 mb-2">
                      {detectorData.message}
                    </p>
                    <p className="text-sm text-amber-100">
                      No te preocupes por el "cómo", centrémonos en el "ahora". 
                      Vamos a abrir posibilidades juntos.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={iniciarSesionDesbloqueo}
                    className="bg-white text-amber-600 px-6 py-3 rounded-xl font-semibold hover:bg-amber-50 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Zap size={20} />
                    Iniciar Sesión de Desbloqueo
                    <ArrowRight size={20} />
                  </button>
                  
                  <button
                    onClick={() => {/* Posponer 24h */}}
                    className="bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-700 transition-all"
                  >
                    Ahora no (Posponer 24h)
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-4">
                  <Check size={48} />
                  <div>
                    <h2 className="text-2xl font-bold mb-2">¡Todo al día! 🎉</h2>
                    <p className="text-green-50">
                      No tienes tareas retrasadas. ¡Sigue así, estás en el flujo!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Tareas por Categoría */}
            {detectorData.needsIntervention && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Tareas Retrasadas por Área</h3>
                
                {Object.entries(detectorData.tareasPorCategoria).map(([categoria, tareas]) => (
                  <div key={categoria} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm">
                        {categoria}
                      </span>
                      <span className="text-sm text-gray-500">({tareas.length} tareas)</span>
                    </h4>
                    
                    <div className="space-y-3">
                      {tareas.map((tarea) => (
                        <div key={tarea.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{tarea.texto}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Retrasada {tarea.diasRetraso} días • Meta: {tarea.metaPrincipal?.substring(0, 60)}...
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => ejecutarAccion('MOVE_TO_TODAY', tarea.id)}
                              disabled={actionLoading === tarea.id}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm flex items-center gap-1"
                            >
                              {actionLoading === tarea.id ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
                              HOY
                            </button>
                            
                            <button
                              onClick={() => ejecutarAccion('MARK_COMPLETE', tarea.id)}
                              disabled={actionLoading === tarea.id}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm flex items-center gap-1"
                            >
                              {actionLoading === tarea.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                              Hecha
                            </button>
                            
                            <button
                              onClick={() => ejecutarAccion('DELETE_TASK', tarea.id)}
                              disabled={actionLoading === tarea.id}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm flex items-center gap-1"
                            >
                              {actionLoading === tarea.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat de Desbloqueo */}
        {chatActive && (
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 shadow-xl border-2 border-amber-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="text-amber-600" />
                Sesión de Desbloqueo Activa
              </h2>
              <button
                onClick={() => setChatActive(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div className="bg-white rounded-xl p-4 h-96 overflow-y-auto mb-4 space-y-3">
              {mensajes.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white ml-12'
                      : msg.role === 'system'
                      ? 'bg-green-100 text-green-900 text-center'
                      : 'bg-gray-100 text-gray-900 mr-12'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribe tu respuesta..."
                className="flex-1 px-4 py-3 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={sending}
              />
              <button
                onClick={enviarMensaje}
                disabled={sending || !inputMessage.trim()}
                className="px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                Enviar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
