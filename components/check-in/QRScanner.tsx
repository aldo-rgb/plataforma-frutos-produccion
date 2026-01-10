'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, CameraOff, Keyboard, Flashlight, FlashlightOff, 
  Volume2, VolumeX, AlertCircle, RefreshCw 
} from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  defaultMode?: 'camera' | 'gun';
}

type ScanMode = 'camera' | 'gun';
type PermissionStatus = 'pending' | 'granted' | 'denied' | 'error';

export default function QRScanner({ onScan, defaultMode }: QRScannerProps) {
  // Detectar si es móvil/tablet para default
  const [isMobile, setIsMobile] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(defaultMode || 'gun');
  const [isScanning, setIsScanning] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('pending');
  const [keyboardInput, setKeyboardInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scanCooldown = 1500; // 1.5 segundos entre escaneos

  // Detectar dispositivo móvil al montar
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Si no hay defaultMode, usar cámara en móvil, pistola en desktop
    if (!defaultMode) {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setScanMode(isTouchDevice ? 'camera' : 'gun');
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [defaultMode]);

  // Precargar sonido
  useEffect(() => {
    audioRef.current = new Audio('/assets/sounds/scan_success.mp3');
    audioRef.current.preload = 'auto';
    
    // Fallback: usar Web Audio API si el archivo no existe
    audioRef.current.onerror = () => {
      console.log('Audio file not found, using Web Audio API fallback');
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Iniciar/detener scanner según el modo
  useEffect(() => {
    if (scanMode === 'camera') {
      startScanner();
    } else {
      stopScanner();
      // Focus en input para pistola
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    return () => {
      stopScanner();
    };
  }, [scanMode]);

  // Mantener focus en input para modo pistola
  useEffect(() => {
    if (scanMode === 'gun') {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [scanMode]);

  // Feedback sensorial
  const triggerFeedback = useCallback(async (type: 'success' | 'error') => {
    setScanFeedback(type);
    
    // Visual feedback (se resetea después de 1 segundo)
    setTimeout(() => setScanFeedback('idle'), 1000);
    
    if (type === 'success') {
      // Sonido
      if (isSoundEnabled) {
        playSuccessSound();
      }
      
      // Vibración (solo en móviles que lo soporten)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  }, [isSoundEnabled]);

  // Reproducir sonido de éxito
  const playSuccessSound = () => {
    // Intentar reproducir el archivo de audio
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Fallback: generar bip con Web Audio API
        playBeepWithWebAudio();
      });
    } else {
      playBeepWithWebAudio();
    }
  };

  // Bip con Web Audio API (fallback)
  const playBeepWithWebAudio = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1200; // Frecuencia del bip
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Web Audio not available');
    }
  };

  // Procesar escaneo con debounce
  const handleScan = useCallback((data: string) => {
    const now = Date.now();
    if (now - lastScanTime < scanCooldown) {
      return; // Ignorar escaneos muy rápidos
    }
    
    setLastScanTime(now);
    triggerFeedback('success');
    onScan(data);
  }, [lastScanTime, triggerFeedback, onScan]);

  // Iniciar scanner de cámara
  const startScanner = async () => {
    try {
      // Verificar permisos primero
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Verificar soporte de linterna
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      setHasTorchSupport(!!capabilities?.torch);
      
      // Detener el stream temporal (lo manejará html5-qrcode)
      stream.getTracks().forEach(t => t.stop());
      
      setPermissionStatus('granted');
      
      // Pequeño delay para asegurar que el DOM está listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const scanner = new Html5Qrcode('qr-reader', {
        verbose: false
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
          disableFlip: false
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {
          // Ignorar errores de frame sin QR
        }
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('error');
      }
      
      setIsScanning(false);
    }
  };

  // Detener scanner
  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
        setIsTorchOn(false);
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  // Toggle linterna
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorchSupport) return;
    
    try {
      const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        
        const newTorchState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: newTorchState } as any]
        });
        
        setIsTorchOn(newTorchState);
      }
    } catch (error) {
      console.error('Error toggling torch:', error);
    }
  };

  // Reintentar permisos
  const retryPermission = () => {
    setPermissionStatus('pending');
    startScanner();
  };

  // Manejar entrada de pistola
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keyboardInput.trim()) {
      e.preventDefault();
      handleScan(keyboardInput.trim());
      setKeyboardInput('');
    }
  };

  // Clases dinámicas para feedback visual
  const getBorderColor = () => {
    switch (scanFeedback) {
      case 'success': return 'border-green-500 shadow-green-500/50';
      case 'error': return 'border-red-500 shadow-red-500/50';
      default: return 'border-cyan-500/50';
    }
  };

  const getCornerColor = () => {
    switch (scanFeedback) {
      case 'success': return 'border-green-400';
      case 'error': return 'border-red-400';
      default: return 'border-cyan-400';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header con Toggle de Modo */}
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-sm text-slate-400 font-medium">MODO DE ESCANEO:</span>
        
        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setScanMode('camera')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'camera'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera size={16} />
              Cámara
            </button>
            <button
              onClick={() => setScanMode('gun')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scanMode === 'gun'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard size={16} />
              Pistola
            </button>
          </div>
        </div>
      </div>

      {/* Modo Cámara */}
      {scanMode === 'camera' && (
        <div className="relative">
          {/* Contenedor del visor */}
          <div 
            className={`relative bg-slate-900 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-lg ${getBorderColor()}`}
            style={{ minHeight: '350px' }}
          >
            {/* Visor de cámara */}
            <div id="qr-reader" className="w-full" />
            
            {/* Overlay de esquinas cuando está escaneando */}
            {isScanning && permissionStatus === 'granted' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Esquinas Cyan Neón animadas */}
                <div className={`absolute top-6 left-6 w-16 h-16 border-l-4 border-t-4 ${getCornerColor()} rounded-tl-xl transition-colors duration-300 ${scanFeedback === 'idle' ? 'animate-pulse' : ''}`} />
                <div className={`absolute top-6 right-6 w-16 h-16 border-r-4 border-t-4 ${getCornerColor()} rounded-tr-xl transition-colors duration-300 ${scanFeedback === 'idle' ? 'animate-pulse' : ''}`} />
                <div className={`absolute bottom-6 left-6 w-16 h-16 border-l-4 border-b-4 ${getCornerColor()} rounded-bl-xl transition-colors duration-300 ${scanFeedback === 'idle' ? 'animate-pulse' : ''}`} />
                <div className={`absolute bottom-6 right-6 w-16 h-16 border-r-4 border-b-4 ${getCornerColor()} rounded-br-xl transition-colors duration-300 ${scanFeedback === 'idle' ? 'animate-pulse' : ''}`} />
                
                {/* Línea de escaneo */}
                {scanFeedback === 'idle' && (
                  <div className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan opacity-70" />
                )}
                
                {/* Flash de éxito */}
                {scanFeedback === 'success' && (
                  <div className="absolute inset-0 bg-green-500/20 animate-flash" />
                )}
              </div>
            )}

            {/* Pantalla de permiso denegado */}
            {permissionStatus === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 rounded-2xl p-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <CameraOff className="text-red-400" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Acceso a Cámara Requerido</h3>
                <p className="text-slate-400 text-center text-sm mb-6 max-w-xs">
                  Quantum App necesita acceso a la cámara para escanear códigos QR. 
                  Por favor revisa la configuración del navegador.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={retryPermission}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw size={16} />
                    Reintentar
                  </button>
                  <button
                    onClick={() => setScanMode('gun')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Keyboard size={16} />
                    Usar Pistola
                  </button>
                </div>
              </div>
            )}

            {/* Error genérico */}
            {permissionStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 rounded-2xl p-6">
                <AlertCircle className="text-amber-400 mb-4" size={48} />
                <h3 className="text-white font-bold text-lg mb-2">Error de Cámara</h3>
                <p className="text-slate-400 text-center text-sm mb-4">
                  No se pudo iniciar la cámara. Verifica que no esté siendo usada por otra aplicación.
                </p>
                <button
                  onClick={retryPermission}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  <RefreshCw size={16} />
                  Reintentar
                </button>
              </div>
            )}

            {/* Loading */}
            {permissionStatus === 'pending' && !isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400">Iniciando cámara...</p>
              </div>
            )}
          </div>

          {/* Controles de cámara */}
          {isScanning && (
            <div className="flex justify-center gap-3 mt-4">
              {/* Linterna */}
              {hasTorchSupport && (
                <button
                  onClick={toggleTorch}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                    isTorchOn 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isTorchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
                  {isTorchOn ? 'Apagar' : 'Linterna'}
                </button>
              )}
              
              {/* Sonido */}
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isSoundEnabled 
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-500 border border-slate-700'
                }`}
              >
                {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
          )}

          {/* Indicador de estado */}
          <p className="text-center text-slate-500 text-sm mt-4">
            {isScanning 
              ? 'Apunta al código QR para escanear' 
              : 'Esperando acceso a la cámara...'}
          </p>
        </div>
      )}

      {/* Modo Pistola/Teclado */}
      {scanMode === 'gun' && (
        <div className={`bg-slate-900 rounded-2xl p-8 border-2 transition-all duration-300 ${getBorderColor()}`}>
          <div className="flex flex-col items-center">
            {/* Icono */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${
              scanFeedback === 'success' 
                ? 'bg-green-500/20' 
                : 'bg-cyan-500/20'
            }`}>
              <Keyboard className={`transition-colors duration-300 ${
                scanFeedback === 'success' ? 'text-green-400' : 'text-cyan-400'
              }`} size={40} />
            </div>
            
            <h3 className="text-white font-bold text-lg mb-2">Modo Pistola USB</h3>
            <p className="text-slate-400 text-center text-sm mb-6">
              Apunta con la pistola de códigos al QR del participante.
              El código se enviará automáticamente.
            </p>
            
            {/* Input invisible pero funcional */}
            <div className="w-full relative">
              <input
                ref={inputRef}
                type="text"
                value={keyboardInput}
                onChange={(e) => setKeyboardInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full bg-slate-800/50 border-2 rounded-xl px-6 py-4 text-center text-lg text-white placeholder-slate-600 focus:outline-none transition-all duration-300 ${
                  scanFeedback === 'success' 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-cyan-500/30 focus:border-cyan-500'
                }`}
                placeholder="Esperando escaneo..."
                autoFocus
                autoComplete="off"
              />
              
              {/* Indicador de actividad */}
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-colors ${
                scanFeedback === 'success' 
                  ? 'bg-green-500' 
                  : 'bg-cyan-500 animate-pulse'
              }`} />
            </div>
            
            {/* Sonido toggle */}
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="flex items-center gap-2 mt-4 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {isSoundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
            </button>
          </div>
        </div>
      )}

      {/* Indicador de modo actual (para staff) */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600">
        <span className={`w-2 h-2 rounded-full ${isScanning || scanMode === 'gun' ? 'bg-green-500' : 'bg-amber-500'}`} />
        {scanMode === 'camera' 
          ? (isScanning ? 'Cámara activa' : 'Cámara inactiva')
          : 'Pistola USB activa'
        }
        {isMobile && <span className="text-slate-700">• Dispositivo móvil detectado</span>}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 15%; }
          50% { top: 85%; }
          100% { top: 15%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes flash {
          0% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
