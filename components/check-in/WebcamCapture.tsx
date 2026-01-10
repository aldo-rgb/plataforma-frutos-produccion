'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RotateCcw, Check, User, AlertCircle } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  userName: string;
}

export default function WebcamCapture({ onCapture, userName }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoConstraints = {
    width: 480,
    height: 480,
    facingMode: facingMode
  };

  // Verificar permisos de cámara al montar
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraError(null);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setCameraError('Permiso de cámara denegado. Por favor habilita el acceso a la cámara.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setCameraError('Error al acceder a la cámara: ' + err.message);
        }
      }
    };
    checkCamera();
  }, []);

  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Webcam error:', error);
    setCameraReady(false);
    if (typeof error === 'string') {
      setCameraError(error);
    } else {
      setCameraError('Error al acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current && cameraReady) {
      setIsCapturing(true);
      // Pequeña pausa para efecto visual
      setTimeout(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
          setCapturedImage(imageSrc);
        }
        setIsCapturing(false);
      }, 100);
    }
  }, [cameraReady]);

  const retake = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const toggleCamera = () => {
    setCameraReady(false);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Error de cámara */}
      {cameraError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
          <div>
            <p className="text-red-400 font-semibold">{cameraError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-red-400/70 text-sm underline mt-1"
            >
              Recargar página
            </button>
          </div>
        </div>
      )}

      <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square">
        {/* Silueta guía - solo cuando cámara está lista y no hay captura */}
        {!capturedImage && cameraReady && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Óvalo de cabeza */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-40 border-2 border-dashed border-cyan-400/50 rounded-full" />
              {/* Hombros */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-20 border-2 border-dashed border-cyan-400/50 rounded-t-[100px]" />
            </div>
          </div>
        )}

        {/* Loading placeholder mientras carga la cámara */}
        {!capturedImage && !cameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mb-4"></div>
            <p className="text-slate-400 text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Placeholder cuando hay error */}
        {!capturedImage && cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
            <User className="text-slate-600" size={80} />
            <p className="text-slate-500 text-sm mt-4">Cámara no disponible</p>
          </div>
        )}

        {/* Flash effect al capturar */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-30 animate-pulse" />
        )}

        {/* Vista previa o imagen capturada */}
        {capturedImage ? (
          <div className="relative">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full aspect-square object-cover"
            />
            {/* Overlay de confirmación */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-6">
              <p className="text-white font-semibold">{userName}</p>
            </div>
          </div>
        ) : !cameraError && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full aspect-square object-cover"
            mirrored={facingMode === 'user'}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
          />
        )}

        {/* Botón cambiar cámara */}
        {!capturedImage && cameraReady && (
          <button
            onClick={toggleCamera}
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Controles */}
      <div className="mt-4 flex justify-center gap-4">
        {capturedImage ? (
          <>
            <button
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <RotateCcw size={20} />
              Retomar
            </button>
            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all"
            >
              <Check size={20} />
              Confirmar
            </button>
          </>
        ) : (
          <button
            onClick={capture}
            disabled={!cameraReady || !!cameraError}
            className={`flex items-center gap-3 px-8 py-4 text-white font-bold rounded-xl transition-all text-lg ${
              cameraReady && !cameraError
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700'
                : 'bg-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            <Camera size={24} />
            Capturar Foto
          </button>
        )}
      </div>

      <p className="text-center text-slate-500 text-sm mt-4">
        Centra el rostro dentro de la guía
      </p>
    </div>
  );
}
