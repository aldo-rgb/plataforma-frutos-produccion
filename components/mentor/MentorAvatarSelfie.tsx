'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles, Loader2, User, Save, Check } from 'lucide-react';

interface MentorAvatarSelfieProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarGenerated: (avatarUrl: string) => void;
}

export default function MentorAvatarSelfie({
  isOpen,
  onClose,
  onAvatarGenerated
}: MentorAvatarSelfieProps) {
  const [stage, setStage] = useState<'camera' | 'preview' | 'generating' | 'result'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [savingToVault, setSavingToVault] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar cámara
  useEffect(() => {
    if (isOpen && stage === 'camera') {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, stage]);

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
        await videoRef.current.play();
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
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    stopCamera();
    setStage('preview');
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setStage('camera');
  };

  const generateAvatar = async () => {
    if (!capturedImage) return;

    setStage('generating');
    setError('');

    try {
      const response = await fetch('/api/mentor/generate-avatar-from-selfie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: capturedImage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generando avatar');
      }

      const data = await response.json();
      setGeneratedAvatar(data.avatarUrl);
      setStage('result');
      
      // Notificar al componente padre
      onAvatarGenerated(data.avatarUrl);
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error generando el avatar. Intenta nuevamente.');
      setStage('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
      <div className="max-w-3xl w-full bg-slate-900/90 rounded-3xl border-2 border-purple-500/30 overflow-hidden">
        
        {/* Header */}
        <div className="relative p-6 border-b border-slate-700/50">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Avatar de Maestro con IA</h2>
              <p className="text-slate-400 text-sm">Captura tu rostro y crea un avatar profesional</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* STAGE: CAMERA */}
          {stage === 'camera' && (
            <div className="space-y-6">
              <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Guía visual oval */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-80 border-4 border-purple-500/50 rounded-full"></div>
                </div>

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center space-y-4 p-6">
                      <p className="text-red-400">{error}</p>
                      <button
                        onClick={startCamera}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-slate-300">Centra tu rostro en el óvalo y captura tu foto</p>
                <button
                  onClick={capturePhoto}
                  disabled={!!error}
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={24} />
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE: PREVIEW */}
          {stage === 'preview' && capturedImage && (
            <div className="space-y-6">
              <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-center">{error}</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={retakePhoto}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <RefreshCw size={20} />
                  <span>Repetir</span>
                </button>
                
                <button
                  onClick={generateAvatar}
                  className="inline-flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  <Sparkles size={20} />
                  <span>✅ Generar mi Avatar</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE: GENERATING */}
          {stage === 'generating' && (
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
                <p className="text-slate-400">Transformando tu imagen en un avatar de maestro avanzado</p>
                <p className="text-sm text-slate-500">Esto puede tomar 10-20 segundos</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* STAGE: RESULT */}
          {stage === 'result' && generatedAvatar && (
            <div className="space-y-6">
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

        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
