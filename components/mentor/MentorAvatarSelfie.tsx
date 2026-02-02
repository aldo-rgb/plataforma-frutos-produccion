'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles, Loader2, User, Save, Check, Upload, Trash2, Plus } from 'lucide-react';

interface MentorAvatarSelfieProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarGenerated: (avatarUrl: string) => void;
}

const SELFIE_INSTRUCTIONS = [
  { step: 1, text: 'Rostro de frente, mirando a la cámara', icon: '😊' },
  { step: 2, text: 'Rostro ligeramente de lado (3/4)', icon: '🙂' },
  { step: 3, text: 'Otra expresión o iluminación', icon: '😄' },
  { step: 4, text: '(Opcional) Expresión diferente', icon: '😎' },
];

type CaptureMode = 'selection' | 'gender-selection' | 'ai-selfie' | 'ai-upload';
type Gender = 'man' | 'woman' | null;
type NextMode = 'ai-selfie' | 'ai-upload' | null;

export default function MentorAvatarSelfie({
  isOpen,
  onClose,
  onAvatarGenerated
}: MentorAvatarSelfieProps) {
  const [mode, setMode] = useState<CaptureMode>('selection');
  const [gender, setGender] = useState<Gender>(null);
  const [pendingMode, setPendingMode] = useState<NextMode>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentSelfieStep, setCurrentSelfieStep] = useState(0);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [savingToVault, setSavingToVault] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhotos([]);
      setMode('selection');
      setGender(null);
      setPendingMode(null);
      setCurrentSelfieStep(0);
      setError('');
      setGeneratedAvatar(null);
      setSavedToVault(false);
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

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No se encontró ninguna cámara conectada');
      }

      console.log('📹 Dispositivos de video encontrados:', videoDevices.length);

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
      console.log('✅ Cámara iniciada correctamente');
    } catch (err: any) {
      console.error('❌ Error accediendo a la cámara:', err);
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No se encontró ninguna cámara. Verifica que tu dispositivo tenga una cámara conectada.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso denegado. Por favor permite el acceso a la cámara en tu navegador.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación. Cierra otras apps que puedan estar usando la cámara.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'No se pudo configurar la cámara con los parámetros solicitados.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Voltear horizontalmente para efecto espejo
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhotos(prev => [...prev, imageData]);
    setCurrentSelfieStep(prev => prev + 1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxFiles = 4;
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

  const generateAvatar = async () => {
    if (capturedPhotos.length < 2) {
      setError('Necesitas al menos 2 fotos para generar el avatar');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/mentor/generate-avatar-from-selfie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: capturedPhotos, // Array de fotos
          image: capturedPhotos[0], // Mantener compatibilidad
          gender: gender // 'man' o 'woman'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generando avatar');
      }

      const data = await response.json();
      setGeneratedAvatar(data.avatarUrl);
      
      // Notificar al componente padre
      onAvatarGenerated(data.avatarUrl);
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error generando el avatar. Intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToVault = async () => {
    if (!generatedAvatar) return;
    
    setSavingToVault(true);
    setError('');
    
    try {
      const response = await fetch('/api/vault/save-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          avatarUrl: generatedAvatar,
          type: 'mentor-ai-avatar'
        })
      });
      
      if (!response.ok) throw new Error('Error al guardar');
      
      setSavedToVault(true);
    } catch (err) {
      console.error('Error guardando en vault:', err);
      setError('No se pudo guardar en The Vault');
    } finally {
      setSavingToVault(false);
    }
  };

  const resetToSelection = () => {
    stopCamera();
    setCapturedPhotos([]);
    setCurrentSelfieStep(0);
    setMode('selection');
    setGender(null);
    setPendingMode(null);
    setGeneratedAvatar(null);
    setError('');
    setSavedToVault(false);
  };

  const handleModeSelection = (selectedMode: 'ai-selfie' | 'ai-upload') => {
    setPendingMode(selectedMode);
    setMode('gender-selection');
  };

  const handleGenderSelection = (selectedGender: 'man' | 'woman') => {
    setGender(selectedGender);
    if (pendingMode) {
      setMode(pendingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
      <div className="max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        
        {/* MODO: SELECCIÓN DE OPCIÓN */}
        {mode === 'selection' && !generatedAvatar && !isGenerating && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Camera className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Avatar de Maestro con IA</h2>
                  <p className="text-slate-400 text-sm">Captura tu rostro y crea un avatar profesional</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 2 Opciones */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Opción 1: Selfie con IA */}
              <button
                onClick={() => handleModeSelection('ai-selfie')}
                className="group relative p-6 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/50 hover:to-blue-800/50 border-2 border-cyan-500/30 hover:border-cyan-400 rounded-2xl transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Camera className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      📸 Tomar Selfies con Cámara
                      <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full">RECOMENDADO</span>
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Toma 2-4 selfies con diferentes ángulos para generar tu avatar profesional de maestro
                    </p>
                    <div className="flex items-center gap-2 text-xs text-cyan-400">
                      <Sparkles size={14} />
                      <span>Mejor calidad y parecido facial</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Opción 2: Subir fotos */}
              <button
                onClick={() => handleModeSelection('ai-upload')}
                className="group relative p-6 bg-gradient-to-br from-purple-900/40 to-pink-900/40 hover:from-purple-800/50 hover:to-pink-800/50 border-2 border-purple-500/30 hover:border-purple-400 rounded-2xl transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Upload className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      🖼️ Subir Fotos de Galería
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Sube 2-4 fotos de tu galería para generar tu avatar profesional de maestro
                    </p>
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <Sparkles size={14} />
                      <span>Usa fotos que ya tengas guardadas</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* MODO: SELECCIÓN DE GÉNERO */}
        {mode === 'gender-selection' && !generatedAvatar && !isGenerating && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={resetToSelection}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <User className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">¿Cómo te identificas?</h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Descripción */}
            <div className="text-center">
              <p className="text-slate-400">
                Para generar un avatar que se parezca más a ti, necesitamos saber cómo identificarte
              </p>
            </div>

            {/* Opciones de Género */}
            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
              
              {/* Opción: Hombre */}
              <button
                onClick={() => handleGenderSelection('man')}
                className="group relative p-8 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 hover:from-blue-800/60 hover:to-cyan-800/60 border-2 border-blue-500/30 hover:border-blue-400 rounded-2xl transition-all"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-5xl">👨</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Hombre</h3>
                    <p className="text-slate-400 text-sm">Avatar masculino</p>
                  </div>
                </div>
              </button>

              {/* Opción: Mujer */}
              <button
                onClick={() => handleGenderSelection('woman')}
                className="group relative p-8 bg-gradient-to-br from-pink-900/40 to-purple-900/40 hover:from-pink-800/60 hover:to-purple-800/60 border-2 border-pink-500/30 hover:border-pink-400 rounded-2xl transition-all"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-5xl">👩</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Mujer</h3>
                    <p className="text-slate-400 text-sm">Avatar femenino</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* MODO: SELFIE CON CÁMARA */}
        {mode === 'ai-selfie' && !isGenerating && !generatedAvatar && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/30 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={resetToSelection}
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
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Guía visual oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 sm:w-64 sm:h-80 border-4 border-purple-500/50 rounded-full"></div>
                  </div>
                </>
              )}
            </div>

            {/* Fotos capturadas */}
            {capturedPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {capturedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500/50">
                    <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded-full"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {capturedPhotos.length < 4 && !error && (
                <button
                  onClick={capturePhoto}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  <Camera size={20} />
                  <span>Capturar Foto {capturedPhotos.length + 1}</span>
                </button>
              )}
              
              {capturedPhotos.length >= 2 && (
                <button
                  onClick={generateAvatar}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all"
                >
                  <Sparkles size={20} />
                  <span>✅ Generar Avatar ({capturedPhotos.length} fotos)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODO: SUBIR FOTOS */}
        {mode === 'ai-upload' && !isGenerating && !generatedAvatar && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={resetToSelection}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-purple-400">🖼️ Subir Fotos</h2>
              <span className="text-sm text-slate-500">{capturedPhotos.length}/4</span>
            </div>

            {/* Info */}
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 text-center">
              <p className="text-purple-300 text-sm">
                Sube 2-4 fotos de tu rostro con diferentes ángulos para mejores resultados.
              </p>
              <p className="text-purple-400/70 text-xs mt-1">
                Incluye fotos de frente, 3/4 y con diferentes expresiones.
              </p>
            </div>

            {/* Zona de upload */}
            <div 
              className="border-2 border-dashed border-purple-500/50 rounded-2xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="mx-auto mb-4 text-purple-400" size={48} />
              <p className="text-white font-medium mb-1">Haz clic para seleccionar fotos</p>
              <p className="text-slate-400 text-sm">o arrastra y suelta aquí</p>
            </div>

            {/* Fotos subidas */}
            {capturedPhotos.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Fotos seleccionadas:</p>
                <div className="grid grid-cols-4 gap-2">
                  {capturedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-500/50">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded-full"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {capturedPhotos.length < 4 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-400 flex items-center justify-center transition-colors"
                    >
                      <Plus className="text-slate-500" size={24} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Botón generar */}
            {capturedPhotos.length >= 2 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={generateAvatar}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all"
                >
                  <Sparkles size={20} />
                  <span>✅ Generar Avatar ({capturedPhotos.length} fotos)</span>
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-center text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ESTADO: GENERANDO */}
        {isGenerating && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-8">
            <div className="py-12 text-center space-y-6">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 animate-spin" style={{ animationDuration: '3s' }}>
                  <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                    <Sparkles className="text-purple-400" size={48} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase">Quantum AI Procesando...</h3>
                <p className="text-slate-400">Transformando tus {capturedPhotos.length} fotos en un avatar de maestro avanzado</p>
                <p className="text-sm text-slate-500">Esto puede tomar 20-40 segundos</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {generatedAvatar && !isGenerating && (
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/30 p-6 space-y-6">
            <div className="relative aspect-square max-w-md mx-auto bg-slate-950 rounded-2xl overflow-hidden border-4 border-purple-500/50">
              <img
                src={generatedAvatar}
                alt="Generated Avatar"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay success */}
              <div className="absolute top-4 right-4">
                <div className="bg-green-500 rounded-full p-2">
                  <Sparkles className="text-white" size={20} />
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                ¡Avatar de Maestro Generado!
              </h3>
              <p className="text-slate-300">Tu avatar profesional está listo para usar</p>
              
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={saveToVault}
                  disabled={savingToVault || savedToVault}
                  className={`inline-flex items-center gap-2 px-6 py-3 font-bold rounded-lg transition-all ${
                    savedToVault
                      ? 'bg-green-600 text-white'
                      : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {savingToVault ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : savedToVault ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>¡Guardado en The Vault!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Guardar en The Vault</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetToSelection}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Generar otro</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  Continuar
                </button>
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                💡 Guarda tu avatar en The Vault para acceder a él más tarde
              </p>
            </div>
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
