'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Mic, 
  Send, 
  Square, 
  Clock, 
  Heart, 
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  MessageSquare
} from 'lucide-react';
import Image from 'next/image';

interface Participant {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface Campaign {
  id: number;
  name: string;
  description: string;
  closeDate: string;
  vision: { id: number; nombre: string };
  organization: { id: number; name: string; logoUrl: string | null };
}

export default function BuzonPublicoPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  // Estado del formulario
  const [senderName, setSenderName] = useState('');
  const [senderRelation, setSenderRelation] = useState('');
  const [textContent, setTextContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Estado del audio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar campaña y participantes iniciales
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`/api/public/buzon/${slug}`);
        const data = await res.json();
        
        if (data.closed || data.error) {
          setClosed(true);
          setError(data.error || 'El buzón está cerrado');
        } else {
          setCampaign(data.campaign);
          setDaysRemaining(data.daysRemaining);
          // Cargar participantes iniciales
          setParticipants(data.participants || []);
        }
      } catch (err) {
        setError('Error al cargar el buzón');
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [slug]);

  // Buscar participantes con debounce
  useEffect(() => {
    // Si no hay búsqueda, no hacer nada (ya se cargaron los iniciales)
    if (searchQuery.length < 2) {
      // Recargar lista completa si se borra la búsqueda
      if (searchQuery.length === 0 && campaign) {
        fetch(`/api/public/buzon/${slug}`)
          .then(res => res.json())
          .then(data => setParticipants(data.participants || []))
          .catch(console.error);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/public/buzon/${slug}?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setParticipants(data.participants || []);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, slug]);

  // Grabación de audio
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('No se pudo acceder al micrófono. Por favor, permite el acceso.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Enviar mensaje
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || (!textContent && !audioBlob)) return;

    setSubmitting(true);

    try {
      let uploadedAudioUrl = null;

      // Subir audio si existe
      if (audioBlob) {
        // Obtener URL pre-firmada
        const uploadRes = await fetch('/api/public/buzon/upload-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignSlug: slug,
            recipientId: selectedParticipant.id,
            fileName: `audio-${Date.now()}.webm`,
            contentType: 'audio/webm'
          })
        });

        if (!uploadRes.ok) throw new Error('Error al preparar subida de audio');
        
        const { uploadUrl, fileUrl } = await uploadRes.json();

        // Subir audio a S3
        await fetch(uploadUrl, {
          method: 'PUT',
          body: audioBlob,
          headers: { 'Content-Type': 'audio/webm' }
        });

        uploadedAudioUrl = fileUrl;
      }

      // Enviar mensaje
      const res = await fetch(`/api/public/buzon/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedParticipant.id,
          senderName,
          senderRelation,
          textContent: textContent || null,
          audioUrl: uploadedAudioUrl,
          audioDuration: recordingTime || null,
          recaptchaToken: 'TODO' // Implementar reCaptcha
        })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setSuccessMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error submitting:', err);
      setError('Error al enviar el mensaje');
    } finally {
      setSubmitting(false);
    }
  };

  // Reiniciar formulario
  const resetForm = () => {
    setSelectedParticipant(null);
    setSenderName('');
    setSenderRelation('');
    setTextContent('');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setSuccess(false);
    setSuccessMessage('');
    setSearchQuery('');
    setParticipants([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (closed || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Buzón Cerrado</h1>
          <p className="text-gray-300">{error || 'Este buzón ya no acepta mensajes.'}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Mensaje Enviado!</h1>
          <p className="text-gray-300 mb-6">{successMessage}</p>
          <button
            onClick={resetForm}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Enviar otro mensaje
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {/* Header */}
      <header className="p-6 text-center border-b border-white/10">
        {campaign?.organization.logoUrl && (
          <Image
            src={campaign.organization.logoUrl}
            alt={campaign.organization.name}
            width={80}
            height={80}
            className="mx-auto mb-4 rounded-xl"
          />
        )}
        <h1 className="text-3xl font-bold text-white mb-2">{campaign?.name}</h1>
        <p className="text-purple-300">{campaign?.description}</p>
        
        {/* Countdown */}
        <div className="mt-4 inline-flex items-center gap-2 bg-purple-600/30 px-4 py-2 rounded-full">
          <Clock className="w-5 h-5 text-purple-300" />
          <span className="text-white font-medium">
            {daysRemaining > 0 
              ? `${daysRemaining} días restantes para enviar mensajes`
              : 'Último día para enviar mensajes'
            }
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!selectedParticipant ? (
            // PASO 1: Buscar participante
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl text-white mb-2">
                  ¿A quién quieres empoderar hoy?
                </h2>
                <p className="text-gray-400">
                  Busca el nombre del participante
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escribe un nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
                )}
              </div>

              {/* Resultados de búsqueda */}
              {participants.length > 0 && (
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <button
                      key={participant.id}
                      onClick={() => setSelectedParticipant(participant)}
                      className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                    >
                      {participant.imagen ? (
                        <Image
                          src={participant.imagen}
                          alt={participant.nombre}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-purple-600/50 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <span className="text-white font-medium">{participant.nombre}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && participants.length === 0 && !searching && (
                <p className="text-center text-gray-400">
                  No se encontraron participantes con ese nombre
                </p>
              )}
            </motion.div>
          ) : (
            // PASO 2: Escribir mensaje
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Destinatario seleccionado */}
              <div className="flex items-center gap-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl mb-6">
                {selectedParticipant.imagen ? (
                  <Image
                    src={selectedParticipant.imagen}
                    alt={selectedParticipant.nombre}
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 bg-purple-600/50 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{selectedParticipant.nombre}</p>
                  <p className="text-purple-300 text-sm">Destinatario del mensaje</p>
                </div>
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="ml-auto text-gray-400 hover:text-white"
                >
                  Cambiar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos del remitente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Tu nombre</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ej: María"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Relación</label>
                    <select
                      value={senderRelation}
                      onChange={(e) => setSenderRelation(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecciona...</option>
                      <option value="Mamá">Mamá</option>
                      <option value="Papá">Papá</option>
                      <option value="Hermano/a">Hermano/a</option>
                      <option value="Hijo/a">Hijo/a</option>
                      <option value="Esposo/a">Esposo/a</option>
                      <option value="Amigo/a">Amigo/a</option>
                      <option value="Familiar">Familiar</option>
                      <option value="Compañero/a">Compañero/a</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                {/* Carta de texto */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    <MessageSquare className="inline w-4 h-4 mr-1" />
                    Tu mensaje escrito
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Escribe aquí tu mensaje de empoderamiento..."
                  />
                </div>

                {/* Grabador de audio */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    <Mic className="inline w-4 h-4 mr-1" />
                    O graba un audio (opcional)
                  </label>
                  
                  <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                    {!audioUrl ? (
                      <div className="flex items-center justify-center gap-4">
                        {isRecording ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-white font-mono">{formatTime(recordingTime)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-colors"
                            >
                              <Square className="w-6 h-6" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full transition-colors"
                          >
                            <Mic className="w-6 h-6" />
                          </button>
                        )}
                        <p className="text-gray-400 text-sm">
                          {isRecording ? 'Grabando... Presiona para detener' : 'Presiona para grabar'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <audio src={audioUrl} controls className="flex-1" />
                        <button
                          type="button"
                          onClick={deleteRecording}
                          className="text-red-400 hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={submitting || (!textContent && !audioBlob) || !senderName || !senderRelation}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar mensaje secreto
                    </>
                  )}
                </button>

                <p className="text-center text-gray-400 text-sm">
                  <Heart className="inline w-4 h-4 text-pink-400 mr-1" />
                  Tu mensaje será encriptado y entregado el día del evento
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
