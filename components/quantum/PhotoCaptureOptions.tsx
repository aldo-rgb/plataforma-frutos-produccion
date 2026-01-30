'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Sparkles, Loader2, CheckCircle, Image, Trash2, Plus } from 'lucide-react';

interface PhotoCaptureOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  gender: 'male' | 'female' | 'neutral';
  onPhotosReady: (photos: string[], mode: 'ai-selfie' | 'ai-upload' | 'no-ai') => void;
  selectedDesignation?: {
    id: string;
    designation: string;
    rationale: string;
    visual_tags: string[];
    archetype: string;
  };
}

type CaptureMode = 'selection' | 'ai-selfie' | 'ai-upload' | 'no-ai';

const SELFIE_INSTRUCTIONS = [
  { step: 1, text: 'Rostro de frente, mirando a la cámara', icon: '😊' },
  { step: 2, text: 'Rostro ligeramente de lado (3/4)', icon: '🙂' },
  { step: 3, text: 'Otra expresión o iluminación diferente', icon: '😄' },
  { step: 4, text: '(Opcional) Expresión seria o sonriendo', icon: '😎' },
];

export default function PhotoCaptureOptions({
  isOpen,
  onClose,
  gender,
  onPhotosReady,
  selectedDesignation
}: PhotoCaptureOptionsProps) {
  const [mode, setMode] = useState<CaptureMode>('selection');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentSelfieStep, setCurrentSelfieStep] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhotos([]);
      setMode('selection');
      setCurrentSelfieStep(0);
      setError('');
    }
  }, [isOpen]);

  // Iniciar cámara cuando entramos a modo selfie
  useEffect(() => {
    if (isOpen && mode === 'ai-selfie') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch (e) {
            console.error('Error playing video:', e);
          }
        };
      }
      setError('');
    } catch (err: any) {
      console.error('Error accediendo a la cámara:', err);
      setError(err.message || 'No se pudo acceder a la cámara');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Voltear horizontalmente para efecto espejo
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhotos(prev => [...prev, imageData]);
      setCurrentSelfieStep(prev => prev + 1);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxFiles = mode === 'no-ai' ? 1 : 4;
    const remainingSlots = maxFiles - capturedPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedPhotos(prev => {
          if (prev.length < maxFiles) {
            return [...prev, result];
          }
          return prev;
        });
      };
      reader.readAsDataURL(file);
    });

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    if (mode === 'ai-selfie') {
      setCurrentSelfieStep(prev => Math.max(0, prev - 1));
    }
  };

  const handleContinue = () => {
    if (capturedPhotos.length === 0) return;
    
    const minPhotos = mode === 'no-ai' ? 1 : 2;
    if (capturedPhotos.length < minPhotos) {
      setError(`Necesitas al menos ${minPhotos} foto${minPhotos > 1 ? 's' : ''}`);
      return;
    }

    onPhotosReady(capturedPhotos, mode as 'ai-selfie' | 'ai-upload' | 'no-ai');
  };

  const getMinPhotos = () => mode === 'no-ai' ? 1 : 2;
  const getMaxPhotos = () => mode === 'no-ai' ? 1 : 4;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        
        {/* MODO: SELECCIÓN DE OPCIÓN */}
        {mode === 'selection' && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Camera className="text-white" size={32} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase tracking-wider">
                Crear tu Avatar
              </h2>
              <p className="text-slate-400">
                Elige cómo quieres crear tu imagen de perfil
              </p>
            </div>

            {/* 3 Opciones */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Opción 1: Selfie con IA */}
              <button
                onClick={() => setMode('ai-selfie')}
                className="group relative p-6 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/50 hover:to-blue-800/50 border-2 border-cyan-500/30 hover:border-cyan-400 rounded-2xl transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Camera className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      📸 Generar con IA + Selfies
                      <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full">RECOMENDADO</span>
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Toma 2-4 selfies con diferentes ángulos para generar tu avatar futurista con IA
                    </p>
                    <div className="flex items-center gap-2 text-xs text-cyan-400">
                      <Sparkles size={14} />
                      <span>Mejor calidad y parecido facial</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Opción 2: Subir fotos con IA */}
              <button
                onClick={() => setMode('ai-upload')}
                className="group relative p-6 bg-gradient-to-br from-purple-900/40 to-pink-900/40 hover:from-purple-800/50 hover:to-pink-800/50 border-2 border-purple-500/30 hover:border-purple-400 rounded-2xl transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Upload className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      🖼️ Generar con IA + Fotos existentes
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Sube 2-4 fotos de tu galería para generar tu avatar futurista con IA
                    </p>
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <Sparkles size={14} />
                      <span>Usa fotos que ya tengas guardadas</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Opción 3: Sin IA */}
              <button
                onClick={() => setMode('no-ai')}
                className="group relative p-6 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 hover:from-emerald-800/50 hover:to-teal-800/50 border-2 border-emerald-500/30 hover:border-emerald-400 rounded-2xl transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Image className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      👤 Foto de perfil sin IA
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Sube o toma una foto normal para usar directamente como perfil
                    </p>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle size={14} />
                      <span>Rápido y simple, sin procesamiento</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Botón Cancelar */}
            <div className="text-center pt-2">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* MODO: SELFIE CON IA */}
        {mode === 'ai-selfie' && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/30 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setMode('selection');
                  setCapturedPhotos([]);
                  setCurrentSelfieStep(0);
                }}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-cyan-400">📸 Capturar Selfies</h2>
              <span className="text-sm text-slate-500">{capturedPhotos.length}/4</span>
            </div>

            {/* Instrucciones */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-300 mb-3 font-medium">Instrucciones para mejores resultados:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SELFIE_INSTRUCTIONS.map((instruction, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg text-center transition-all ${
                      idx < capturedPhotos.length 
                        ? 'bg-green-500/20 border border-green-500/50' 
                        : idx === currentSelfieStep 
                        ? 'bg-cyan-500/20 border-2 border-cyan-400 animate-pulse'
                        : 'bg-slate-700/50 border border-slate-600'
                    }`}
                  >
                    <span className="text-2xl">{idx < capturedPhotos.length ? '✅' : instruction.icon}</span>
                    <p className="text-xs text-slate-300 mt-1">{instruction.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vista de cámara */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
              {error ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 text-center p-4">
                  <div>
                    <X className="mx-auto mb-2" size={48} />
                    <p>{error}</p>
                    <button 
                      onClick={startCamera}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  {/* Guía de encuadre */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-cyan-400/50 rounded-full"></div>
                  </div>
                  {/* Indicador de foto actual */}
                  {currentSelfieStep < 4 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full">
                      <p className="text-cyan-400 text-sm font-medium">
                        {SELFIE_INSTRUCTIONS[currentSelfieStep]?.text}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Botón de captura */}
            {capturedPhotos.length < 4 && !error && (
              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 transition-transform hover:scale-110"
                >
                  <Camera className="text-white" size={36} />
                </button>
              </div>
            )}

            {/* Preview de fotos capturadas */}
            {capturedPhotos.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Fotos capturadas ({capturedPhotos.length}/4):</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {capturedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img 
                        src={photo} 
                        alt={`Selfie ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border-2 border-cyan-500/50"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 rounded text-xs text-white">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinue}
                disabled={capturedPhotos.length < 2}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  capturedPhotos.length >= 2
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles size={20} />
                Generar Avatar con IA
              </button>
            </div>
          </div>
        )}

        {/* MODO: SUBIR FOTOS CON IA */}
        {mode === 'ai-upload' && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setMode('selection');
                  setCapturedPhotos([]);
                }}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-purple-400">🖼️ Subir Fotos</h2>
              <span className="text-sm text-slate-500">{capturedPhotos.length}/4</span>
            </div>

            {/* Instrucciones */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-300 mb-2">Para mejores resultados, sube fotos con:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>✓ Rostro claramente visible</li>
                <li>✓ Diferentes ángulos (frente, 3/4, etc.)</li>
                <li>✓ Buena iluminación</li>
                <li>✓ Mínimo 2 fotos, máximo 4</li>
              </ul>
            </div>

            {/* Input de archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Zona de drop / botón de subir */}
            {capturedPhotos.length < 4 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-purple-500/50 hover:border-purple-400 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors bg-purple-500/5 hover:bg-purple-500/10"
              >
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Plus className="text-purple-400" size={32} />
                </div>
                <p className="text-purple-400 font-medium">Click para seleccionar fotos</p>
                <p className="text-slate-500 text-sm">o arrastra y suelta aquí</p>
              </button>
            )}

            {/* Preview de fotos */}
            {capturedPhotos.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Fotos seleccionadas ({capturedPhotos.length}/4):</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {capturedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img 
                        src={photo} 
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover rounded-xl border-2 border-purple-500/50"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <X size={16} className="text-white" />
                      </button>
                      <span className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                        Foto #{idx + 1}
                      </span>
                    </div>
                  ))}
                  {/* Botón para agregar más */}
                  {capturedPhotos.length < 4 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-purple-500/30 hover:border-purple-400 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="text-purple-400" size={24} />
                      <span className="text-xs text-purple-400">Agregar</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinue}
                disabled={capturedPhotos.length < 2}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  capturedPhotos.length >= 2
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles size={20} />
                Generar Avatar con IA
              </button>
            </div>
          </div>
        )}

        {/* MODO: SIN IA */}
        {mode === 'no-ai' && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-emerald-500/30 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setMode('selection');
                  setCapturedPhotos([]);
                }}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-emerald-400">👤 Foto de Perfil</h2>
              <span className="text-sm text-slate-500">{capturedPhotos.length}/1</span>
            </div>

            {/* Input de archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />

            {capturedPhotos.length === 0 ? (
              /* Opciones de captura */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="p-8 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/30 hover:border-emerald-400 rounded-2xl transition-all flex flex-col items-center gap-3"
                >
                  <Upload className="text-emerald-400" size={48} />
                  <span className="text-emerald-400 font-medium">Subir de galería</span>
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'user');
                      fileInputRef.current.click();
                    }
                  }}
                  className="p-8 bg-teal-500/10 hover:bg-teal-500/20 border-2 border-teal-500/30 hover:border-teal-400 rounded-2xl transition-all flex flex-col items-center gap-3"
                >
                  <Camera className="text-teal-400" size={48} />
                  <span className="text-teal-400 font-medium">Tomar foto</span>
                </button>
              </div>
            ) : (
              /* Preview de foto */
              <div className="space-y-4">
                <div className="relative max-w-sm mx-auto">
                  <img 
                    src={capturedPhotos[0]} 
                    alt="Foto de perfil"
                    className="w-full aspect-square object-cover rounded-2xl border-4 border-emerald-500/50"
                  />
                  <button
                    onClick={() => setCapturedPhotos([])}
                    className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Trash2 size={20} className="text-white" />
                  </button>
                </div>
                <p className="text-center text-sm text-emerald-400">
                  ✓ Esta foto se usará directamente como tu imagen de perfil
                </p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinue}
                disabled={capturedPhotos.length < 1}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  capturedPhotos.length >= 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle size={20} />
                Usar como Perfil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
