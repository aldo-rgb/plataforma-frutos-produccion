'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ShieldCheck, Save, ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Las 9 Categorías con Lenguaje de Transformación
const CATEGORIAS = [
  { 
    id: 'finanzas', 
    label: 'Finanzas', 
    pregunta: 'Empecemos por el TENER. La abundancia es una consecuencia de quién eres. Para este entrenamiento, ¿cuál es tu meta financiera audaz, específica y medible (Monto y Fecha)?' 
  },
  { 
    id: 'relaciones', 
    label: 'Relaciones', 
    pregunta: 'Vamos a las relaciones. Un líder sana y construye. ¿Qué relación específica en tu vida requiere una transformación inmediata y qué vas a hacer al respecto?' 
  },
  { 
    id: 'talentos', 
    label: 'Talentos', 
    pregunta: 'Tu don único. ¿Qué habilidad o talento has estado postergando y te comprometes a explotar radicalmente durante este tiempo?' 
  },
  { 
    id: 'paz', 
    label: 'Paz Mental', 
    pregunta: 'Hablemos del SER. Sin paz interna, no hay claridad externa. ¿Qué práctica innegociable realizarás a diario para blindar tu mente?' 
  },
  { 
    id: 'ocio', 
    label: 'Diversión', 
    pregunta: 'La energía alta requiere recarga. ¿Cómo te vas a premiar semanalmente? Define una actividad de ocio que te llene de vitalidad.' 
  },
  { 
    id: 'salud', 
    label: 'Salud', 
    pregunta: 'Tu cuerpo es tu vehículo de manifestación. Declara tu meta física (Peso, Kms, Alimentos) y sé brutalmente honesto con tu compromiso.' 
  },
  { 
    id: 'trans', 
    label: 'Transformación', 
    pregunta: 'Servicio al origen. ¿De qué manera vas a devolver valor al programa que te transformó (Staff, apoyo, logística)?' 
  },
  { 
    id: 'comun', 
    label: 'Comunidad', 
    pregunta: 'Impacto externo. Un líder crea líderes. ¿Qué proyecto de servicio social o impacto comunitario vas a ejecutar?' 
  },
  { 
    id: 'enrol', 
    label: 'Enrolamiento', 
    pregunta: 'Finalmente, tu legado de influencia. ¿A cuántas personas te comprometes a inspirar para que vivan este proceso? (Define tu número).' 
  },
];

export default function ChatbotPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); 
  const [messages, setMessages] = useState<any[]>([
    { 
      role: 'bot', 
      text: 'Bienvenido. Soy tu Coach Ontológico. Estás a punto de diseñar tu futuro. Comencemos a definir tu Declaración.' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [respuestas, setRespuestas] = useState<any>({});
  const [isTyping, setIsTyping] = useState(false);
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Iniciar la primera pregunta
  useEffect(() => {
    if (messages.length === 1) {
      setTimeout(() => {
        addBotMessage(CATEGORIAS[0].pregunta);
      }, 1500);
    }
  }, []);

  const addBotMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', text }]);
    }, 1000); 
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    // 1. Guardar mensaje usuario
    const currentCat = CATEGORIAS[step];
    const userMsg = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    
    // 2. Guardar respuesta
    const nuevasRespuestas = { ...respuestas, [currentCat.id]: inputText };
    setRespuestas(nuevasRespuestas);
    setInputText('');

    // 3. Avanzar
    if (step < CATEGORIAS.length - 1) {
      setStep(prev => prev + 1);
      const nextCat = CATEGORIAS[step + 1];
      addBotMessage(nextCat.pregunta);
    } else {
      setStep(prev => prev + 1);
      addBotMessage('¡Declaración completada! He registrado tus compromisos. Revisa el resumen abajo. Si estás listo para sostener tu palabra, presiona SELLAR CARTA.');
    }
  };

  // --- CONEXIÓN REAL A LA BASE DE DATOS ---
  const handleFinalSave = async () => {
    setSaving(true);
    
    try {
      // 1. PRIMERO: Pedimos a la IA que desglose las metas en tareas (Semana 1)
      // (Enviamos las respuestas del chat)
      const resIA = await fetch('/api/generar-tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metas: respuestas }),
      });
      const dataIA = await resIA.json();
      
      // 2. SEGUNDO: Guardamos esas tareas específicas en la BD
      const resBD = await fetch('/api/carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            // Guardamos las metas resumen
            resumen: respuestas,
            // Y las tareas desglosadas que generó la IA
            tareas: dataIA.tareas 
        }),
      });

      if (resBD.ok) {
        router.push('/dashboard/carta');
      } else {
        alert("Error al guardar en el Quantum. Intenta de nuevo.");
        setSaving(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error procesando tus metas.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl mt-4 mb-20">
      
      {/* HEADER */}
      <div className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/carta" className="p-2 hover:bg-white/5 rounded-full transition-colors">
             <ArrowLeft className="text-slate-400" size={20} />
          </Link>
          <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <Bot size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg italic">MENTOR VIRTUAL</h2>
            <p className="text-xs text-slate-400">Protocolo de Definición</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-500 uppercase">Progreso</p>
          <div className="w-32 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500" style={{ width: `${(step / CATEGORIAS.length) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg animate-in fade-in slide-in-from-bottom-2
              ${msg.role === 'user' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm' 
                : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-sm'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/5 flex gap-1">
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        
        {/* RESUMEN FINAL */}
        {step >= CATEGORIAS.length && (
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 mt-4 animate-in fade-in slide-in-from-bottom-10">
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={18} /> Confirmar Declaración
            </h3>
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(respuestas).map(([key, val]: any) => (
                <div key={key} className="text-xs border-b border-white/5 pb-2 last:border-0">
                  <span className="text-purple-400 font-bold uppercase block mb-1">{CATEGORIAS.find(c => c.id === key)?.label}:</span>
                  <span className="text-white italic">"{val}"</span>
                </div>
              ))}
            </div>
            <button 
              onClick={handleFinalSave}
              disabled={saving}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? 'PROCESANDO...' : 'SELLAR CARTA (NO MODIFICABLE)'}
              {!saving && <Save size={18} />}
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-2">
              * Al confirmar, declaras que estas metas son tu compromiso irrevocable.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      {step < CATEGORIAS.length && (
        <div className="p-4 bg-slate-900 border-t border-white/10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu meta aquí..."
              className="w-full bg-slate-950 text-white placeholder-slate-600 border border-white/10 rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              autoFocus
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="absolute right-2 p-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}