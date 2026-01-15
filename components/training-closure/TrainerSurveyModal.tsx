'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Mic, Square, Play, Pause, Send, X, 
  Building2, Users, Sparkles, Loader2, CheckCircle2, Volume2,
  ChevronDown, ChevronUp, ListChecks
} from 'lucide-react';

interface TrainerSurveyProps {
  productId: number;
  productName: string;
  onComplete: () => void;
  onClose: () => void;
}

type RatingCategory = 'salonAmbiente' | 'instalaciones' | 'staff';

// Sub-categorías para cada segmento
const subCategories: Record<RatingCategory, { key: string; label: string }[]> = {
  salonAmbiente: [
    { key: 'limpieza', label: 'Limpieza' },
    { key: 'equipoSonido', label: 'Equipo de sonido' },
    { key: 'carteles', label: 'Carteles' },
    { key: 'pantallaProyector', label: 'Pantalla/Proyector' },
    { key: 'espacioProyeccion', label: 'Espacio correcto para proyectar' },
    { key: 'rotafolio', label: 'Rotafolio' },
    { key: 'marcadores', label: 'Marcadores' },
    { key: 'baulCompleto', label: 'Baúl completo' },
    { key: 'ticketsVida', label: 'Tickets de vida' },
    { key: 'tareas', label: 'Tareas' },
    { key: 'reglasImpresas', label: 'Reglas impresas' },
    { key: 'mesaStaff', label: 'Mesa de Staff/Entrenador' }
  ],
  instalaciones: [
    { key: 'aireAcondicionado', label: 'Aire acondicionado funcional' },
    { key: 'limpiezaBanos', label: 'Limpieza baños' },
    { key: 'montajeCoffeeBreak', label: 'Montaje de coffee break' },
    { key: 'estadoSillas', label: 'Estado de las sillas' },
    { key: 'estadoPintura', label: 'Estado de la pintura' },
    { key: 'estadoVinilos', label: 'Estado de vinilos, anuncios y publicidad' }
  ],
  staff: [
    { key: 'capitaniasAsignadas', label: 'Capitanías asignadas' },
    { key: 'puntualidad', label: 'Puntualidad' },
    { key: 'imagenProfesional', label: 'Imagen profesional' },
    { key: 'alineamientoContextual', label: 'Alineamiento contextual' }
  ]
};

export default function TrainerSurveyModal({
  productId,
  productName,
  onComplete,
  onClose
}: TrainerSurveyProps) {
  // Ratings globales por segmento
  const [ratings, setRatings] = useState<Record<RatingCategory, number>>({
    salonAmbiente: 0,
    instalaciones: 0,
    staff: 0
  });

  // Ratings detallados por sub-categoría
  const [detailedRatings, setDetailedRatings] = useState<Record<RatingCategory, Record<string, number>>>({
    salonAmbiente: {},
    instalaciones: {},
    staff: {}
  });

  // Qué segmentos tienen los detalles expandidos
  const [expandedDetails, setExpandedDetails] = useState<Record<RatingCategory, boolean>>({
    salonAmbiente: false,
    instalaciones: false,
    staff: false
  });

  // Si el usuario usó detalles para cada segmento
  const [usedDetails, setUsedDetails] = useState<Record<RatingCategory, boolean>>({
    salonAmbiente: false,
    instalaciones: false,
    staff: false
  });

  const [observaciones, setObservaciones] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const categories: { key: RatingCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'salonAmbiente', label: 'Salón & Ambiente', icon: <Building2 className="w-5 h-5" /> },
    { key: 'instalaciones', label: 'Instalaciones', icon: <Sparkles className="w-5 h-5" /> },
    { key: 'staff', label: 'Staff', icon: <Users className="w-5 h-5" /> }
  ];

  // Calcular promedio cuando cambian los ratings detallados
  useEffect(() => {
    (Object.keys(detailedRatings) as RatingCategory[]).forEach(category => {
      const categoryRatings = detailedRatings[category];
      const ratingValues = Object.values(categoryRatings).filter(v => v > 0);
      
      if (ratingValues.length > 0) {
        const average = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
        const roundedAverage = Math.round(average);
        
        // Solo actualizar si usó detalles
        if (usedDetails[category]) {
          setRatings(prev => ({
            ...prev,
            [category]: roundedAverage
          }));
        }
      }
    });
  }, [detailedRatings, usedDetails]);

  const toggleDetails = (category: RatingCategory) => {
    setExpandedDetails(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    
    // Marcar que usó detalles cuando expande
    if (!expandedDetails[category]) {
      setUsedDetails(prev => ({
        ...prev,
        [category]: true
      }));
    }
  };

  const setDetailedRating = (category: RatingCategory, subKey: string, value: number) => {
    setDetailedRatings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subKey]: value
      }
    }));
  };

  const getDetailedProgress = (category: RatingCategory) => {
    const total = subCategories[category].length;
    const rated = Object.values(detailedRatings[category]).filter(v => v > 0).length;
    return { rated, total };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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

      if (navigator.vibrate) navigator.vibrate(50);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('No se pudo acceder al micrófono. Por favor, permite el acceso.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const allRated = Object.values(ratings).every(r => r > 0);
    if (!allRated) {
      alert('Por favor, califica todas las categorías');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedAudioUrl: string | null = null;

      if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, `trainer-survey-${productId}-${Date.now()}.webm`);
        formData.append('productId', productId.toString());

        const uploadRes = await fetch('/api/upload/audio', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedAudioUrl = uploadData.url;
        }
      }

      // Función para generar detalles auto-llenados con la calificación global
      const generateAutoFilledDetails = (category: RatingCategory, globalRating: number) => {
        const details: Record<string, number> = {};
        subCategories[category].forEach(sub => {
          details[sub.key] = globalRating;
        });
        return details;
      };

      // Si usó detalles, enviar los detalles; si no, auto-llenar con el rating global
      const finalDetalles = {
        salonAmbiente: usedDetails.salonAmbiente 
          ? detailedRatings.salonAmbiente 
          : generateAutoFilledDetails('salonAmbiente', ratings.salonAmbiente),
        instalaciones: usedDetails.instalaciones 
          ? detailedRatings.instalaciones 
          : generateAutoFilledDetails('instalaciones', ratings.instalaciones),
        staff: usedDetails.staff 
          ? detailedRatings.staff 
          : generateAutoFilledDetails('staff', ratings.staff)
      };

      const res = await fetch('/api/trainer/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          salonAmbiente: ratings.salonAmbiente,
          instalaciones: ratings.instalaciones,
          staff: ratings.staff,
          audioUrl: uploadedAudioUrl,
          observaciones: observaciones || null,
          // Siempre enviar detalles (auto-llenados o manuales)
          detalles: finalDetalles
        })
      });

      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        onComplete();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar la encuesta');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error al enviar la encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  // Componente de estrellas para rating global
  const StarRating = ({ category, disabled = false }: { category: RatingCategory; disabled?: boolean }) => {
    const [hoveredStar, setHoveredStar] = useState(0);
    const currentRating = ratings[category];

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.2 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
            onMouseEnter={() => !disabled && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => {
              if (!disabled) {
                setRatings(prev => ({ ...prev, [category]: star }));
                // Si edita manualmente, desmarcar uso de detalles
                setUsedDetails(prev => ({ ...prev, [category]: false }));
                if (navigator.vibrate) navigator.vibrate(20);
              }
            }}
            className={`focus:outline-none ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <Star
              className={`w-10 h-10 transition-all ${
                star <= (hoveredStar || currentRating)
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                  : 'text-slate-600 hover:text-slate-500'
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  // Componente de estrellas pequeñas para sub-categorías
  const MiniStarRating = ({ category, subKey }: { category: RatingCategory; subKey: string }) => {
    const [hoveredStar, setHoveredStar] = useState(0);
    const currentRating = detailedRatings[category][subKey] || 0;

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => {
              setDetailedRating(category, subKey, star);
              if (navigator.vibrate) navigator.vibrate(15);
            }}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-all ${
                star <= (hoveredStar || currentRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-600 hover:text-slate-500'
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-green-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-green-500/10 my-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
              Misión Completada
            </h2>
            <p className="text-slate-400 text-sm mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Categorías con estrellas */}
        <div className="space-y-4 mb-6">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
            >
              {/* Header del segmento */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                      {cat.icon}
                    </div>
                    <div>
                      <span className="text-white font-semibold">{cat.label}</span>
                      {usedDetails[cat.key] && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Promedio
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Botón Dar Detalles */}
                  <button
                    onClick={() => toggleDetails(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      expandedDetails[cat.key]
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Detalles
                    {expandedDetails[cat.key] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                
                {/* Estrellas globales */}
                <StarRating category={cat.key} disabled={usedDetails[cat.key]} />
                
                {usedDetails[cat.key] && (
                  <p className="text-xs text-slate-500 mt-2">
                    ⭐ Calificación calculada del promedio de detalles
                  </p>
                )}
              </div>

              {/* Panel de detalles expandible */}
              <AnimatePresence>
                {expandedDetails[cat.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
                      {/* Progreso */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">Calificación detallada</span>
                        <span className="text-xs text-purple-400">
                          {getDetailedProgress(cat.key).rated}/{getDetailedProgress(cat.key).total} completados
                        </span>
                      </div>
                      
                      {/* Sub-categorías */}
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {subCategories[cat.key].map((sub) => (
                          <div 
                            key={sub.key}
                            className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2"
                          >
                            <span className="text-sm text-slate-300 flex-1 mr-2">{sub.label}</span>
                            <MiniStarRating category={cat.key} subKey={sub.key} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Grabación de Audio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-4"
        >
          <p className="text-slate-400 text-sm mb-3">Observaciones (Opcional)</p>
          
          {!audioUrl ? (
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>
              
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-mono">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <span className="text-slate-500 text-sm">Grabar nota de voz</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </motion.button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-400" />
                  <span className="text-white text-sm">Nota de voz</span>
                </div>
                <span className="text-slate-400 text-xs">{formatTime(recordingTime)}</span>
              </div>
              
              <button
                onClick={deleteRecording}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
              
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
        </motion.div>

        {/* Campo de texto opcional */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Escribe tus observaciones aquí (opcional)..."
            className="w-full h-24 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </motion.div>

        {/* Botón de enviar */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting || Object.values(ratings).some(r => r === 0)}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/30"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Enviar Evaluación
            </>
          )}
        </motion.button>

        {/* Tiempo estimado */}
        <p className="text-center text-slate-500 text-xs mt-3">
          ⚡ Menos de 60 segundos
        </p>
      </motion.div>
    </motion.div>
  );
}
