'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  onTranscriptReady: (text: string) => void;
  onAudioResponse: (audioUrl: string, responseText: string) => void;
  disabled?: boolean;
  conversationHistory: Array<{ role: string; content: string }>;
}

export default function VoiceButton({ 
  onTranscriptReady, 
  onAudioResponse,
  disabled = false,
  conversationHistory 
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Limpiar al desmontar
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Configurar visualización de ondas
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animar ondas
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current || !isRecording) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        // Procesar audio
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎙️ Grabación iniciada');

    } catch (error) {
      console.error('Error accediendo al micrófono:', error);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      console.log('⏹️ Grabación detenida');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Paso 1: Transcribir audio a texto
      console.log('🎙️ Transcribiendo audio...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await fetch('/api/quantum/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!transcribeResponse.ok) {
        throw new Error('Error en transcripción');
      }

      const { text } = await transcribeResponse.json();
      console.log('✅ Transcripción:', text);

      // Mostrar texto transcrito inmediatamente
      onTranscriptReady(text);

      // Paso 2: Obtener respuesta de Quantum (optimizada para voz)
      console.log('🤖 Consultando a Quantum...');
      const chatResponse = await fetch('/api/quantum/chat-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: 'user', content: text }
          ]
        })
      });

      if (!chatResponse.ok) {
        throw new Error('Error en respuesta de Quantum');
      }

      const { response } = await chatResponse.json();
      console.log('✅ Respuesta de Quantum:', response);

      // Paso 3: Convertir respuesta a audio
      console.log('🗣️ Generando audio...');
      const ttsResponse = await fetch('/api/quantum/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: response })
      });

      if (!ttsResponse.ok) {
        throw new Error('Error generando audio');
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('✅ Audio generado');

      // Reproducir audio automáticamente
      playAudio(audioUrl);

      // Notificar al componente padre con el texto de respuesta
      onAudioResponse(audioUrl, response);

    } catch (error) {
      console.error('❌ Error procesando audio:', error);
      alert('Error al procesar el audio. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('Error reproduciendo audio');
    };

    audio.play().catch(err => {
      console.error('Error al reproducir:', err);
      setIsSpeaking(false);
    });
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing && !isSpeaking) {
      startRecording();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        disabled={disabled || isProcessing || isSpeaking}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isRecording 
            ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50' 
            : isProcessing || isSpeaking
            ? 'bg-purple-600 cursor-wait'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-purple-500/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Animación de ondas cuando está grabando */}
        {isRecording && (
          <>
            <div 
              className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"
              style={{ 
                transform: `scale(${1 + audioLevel * 0.5})`,
                transition: 'transform 0.1s ease-out'
              }}
            />
            <div 
              className="absolute inset-0 rounded-full bg-red-400 opacity-50"
              style={{ 
                transform: `scale(${1.2 + audioLevel * 0.3})`,
                transition: 'transform 0.1s ease-out'
              }}
            />
          </>
        )}

        {/* Anillo pulsante cuando está hablando */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-pulse" />
        )}

        {/* Icono */}
        <div className="relative z-10 text-white">
          {isProcessing ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isRecording ? (
            <Square size={20} fill="white" />
          ) : (
            <Mic size={24} />
          )}
        </div>
      </button>

      {/* Estado visual */}
      {isRecording && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-red-400 font-medium animate-pulse">
            Escuchando...
          </span>
        </div>
      )}
      
      {isProcessing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-purple-400 font-medium">
            Procesando...
          </span>
        </div>
      )}

      {isSpeaking && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-purple-400 font-medium animate-pulse">
            Quantum está hablando...
          </span>
        </div>
      )}
    </div>
  );
}
