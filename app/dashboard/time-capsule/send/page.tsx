'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Square, 
  MessageSquare,
  Loader2,
  ChevronLeft,
  Star,
  User,
  Volume2,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Recipient {
  id: number;
  nombre: string;
  imagen: string | null;
  level: number;
}

interface Campaign {
  campaignId: number;
  campaignName: string;
  closeDate: string;
  daysRemaining: number;
  pointsPerMessage: number;
  pendingRecipients: Recipient[];
}

function SendCapsuleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipientId = searchParams.get('recipient');
  const campaignId = searchParams.get('campaign');

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Formulario
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/time-capsule/messages');
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);

          // Si hay params, pre-seleccionar
          if (campaignId && recipientId) {
            const campaign = data.campaigns.find(
              (c: Campaign) => c.campaignId === parseInt(campaignId)
            );
            if (campaign) {
              setSelectedCampaign(campaign);
              const recipient = campaign.pendingRecipients.find(
                (r: Recipient) => r.id === parseInt(recipientId)
              );
              if (recipient) {
                setSelectedRecipient(recipient);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [campaignId, recipientId]);

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
      console.error('Error microphone:', err);
      alert('No se pudo acceder al micrófono');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaign || !selectedRecipient || (!textContent && !audioBlob)) return;

    setSubmitting(true);

    try {
      let uploadedAudioUrl = null;

      // Subir audio si existe
      if (audioBlob) {
        const uploadRes = await fetch('/api/public/buzon/upload-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: selectedCampaign.campaignId,
            recipientId: selectedRecipient.id,
            fileName: `audio-${Date.now()}.webm`,
            contentType: 'audio/webm'
          })
        });

        if (!uploadRes.ok) throw new Error('Error al subir audio');
        
        const { uploadUrl, fileUrl } = await uploadRes.json();

        await fetch(uploadUrl, {
          method: 'PUT',
          body: audioBlob,
          headers: { 'Content-Type': 'audio/webm' }
        });

        uploadedAudioUrl = fileUrl;
      }

      // Enviar mensaje
      const res = await fetch('/api/time-capsule/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.campaignId,
          recipientId: selectedRecipient.id,
          textContent: textContent || null,
          audioUrl: uploadedAudioUrl,
          audioDuration: recordingTime || null
        })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setPointsEarned(data.pointsEarned || 0);
      } else {
        alert(data.error || 'Error al enviar');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al enviar mensaje');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
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
          <p className="text-gray-300 mb-4">
            Tu mensaje para {selectedRecipient?.nombre} ha sido guardado en la Time Capsule.
          </p>
          
          {pointsEarned > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-300 font-medium">
                ¡Ganaste {pointsEarned} puntos!
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedRecipient(null);
                setTextContent('');
                deleteRecording();
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-medium"
            >
              Enviar otro
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-medium text-center"
            >
              Volver
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const totalPending = campaigns.reduce(
    (acc, c) => acc + c.pendingRecipients.length, 
    0
  );

  if (campaigns.length === 0 || totalPending === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            ¡Misión cumplida!
          </h2>
          <p className="text-gray-400 mb-6">
            Ya enviaste mensajes a todos los participantes de tu equipo.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-white">
            🎁 Enviar Mensaje a Time Capsule
          </h1>
          <p className="text-gray-400">
            Envía mensajes de empoderamiento a tu equipo
          </p>
        </div>

        {/* Selección de campaña */}
        {!selectedCampaign && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-white">
              Selecciona una campaña
            </h2>
            {campaigns.map((campaign) => (
              <button
                key={campaign.campaignId}
                onClick={() => setSelectedCampaign(campaign)}
                className="w-full p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{campaign.campaignName}</span>
                  <span className="text-purple-400 text-sm">
                    {campaign.pendingRecipients.length} pendientes
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{campaign.daysRemaining} días restantes</span>
                  <span>+{campaign.pointsPerMessage} pts/mensaje</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selección de destinatario */}
        {selectedCampaign && !selectedRecipient && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                ¿A quién le envías?
              </h2>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cambiar campaña
              </button>
            </div>
            
            <div className="space-y-2">
              {selectedCampaign.pendingRecipients.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedRecipient(person)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors"
                >
                  {person.imagen ? (
                    <Image
                      src={person.imagen}
                      alt={person.nombre}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-purple-600/50 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <span className="text-white font-medium">{person.nombre}</span>
                    <span className="text-gray-400 text-sm ml-2">Nivel {person.level}</span>
                  </div>
                  <Send className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de mensaje */}
        {selectedCampaign && selectedRecipient && (
          <div>
            {/* Destinatario seleccionado */}
            <div className="flex items-center gap-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl mb-6">
              {selectedRecipient.imagen ? (
                <Image
                  src={selectedRecipient.imagen}
                  alt={selectedRecipient.nombre}
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
                <p className="text-white font-medium">{selectedRecipient.nombre}</p>
                <p className="text-purple-300 text-sm">Nivel {selectedRecipient.level}</p>
              </div>
              <button
                onClick={() => setSelectedRecipient(null)}
                className="ml-auto text-gray-400 hover:text-white text-sm"
              >
                Cambiar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mensaje de texto */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  <MessageSquare className="inline w-4 h-4 mr-1" />
                  Tu mensaje de empoderamiento
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Escribe algo que inspire y empodere..."
                />
              </div>

              {/* Audio */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  <Mic className="inline w-4 h-4 mr-1" />
                  O graba un audio (opcional)
                </label>
                
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
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
                            className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full"
                          >
                            <Square className="w-6 h-6" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full"
                        >
                          <Mic className="w-6 h-6" />
                        </button>
                      )}
                      <p className="text-gray-400 text-sm">
                        {isRecording ? 'Grabando...' : 'Presiona para grabar'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Volume2 className="w-5 h-5 text-purple-400" />
                      <audio src={audioUrl} controls className="flex-1" />
                      <button
                        type="button"
                        onClick={deleteRecording}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Puntos */}
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm">
                  Ganarás <strong>{selectedCampaign.pointsPerMessage} puntos</strong> al enviar este mensaje
                </span>
              </div>

              {/* Botón enviar */}
              <button
                type="submit"
                disabled={submitting || (!textContent && !audioBlob)}
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
                    Enviar mensaje
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SendCapsulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    }>
      <SendCapsuleContent />
    </Suspense>
  );
}
