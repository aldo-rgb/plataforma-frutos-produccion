'use client';

import { useState, useEffect, useCallback } from 'react';
import { Nfc, Smartphone, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface NFCWriterProps {
  userId: number;
  userName: string;
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type NFCStatus = 'checking' | 'unsupported' | 'ready' | 'waiting' | 'writing' | 'success' | 'error';

interface NDEFRecord {
  recordType: string;
  data?: string | ArrayBuffer;
  encoding?: string;
  lang?: string;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFWriter {
  write(message: NDEFMessage | string): Promise<void>;
}

declare global {
  interface Window {
    NDEFReader: {
      new(): NDEFWriter & {
        scan(): Promise<void>;
        onreading: ((event: any) => void) | null;
        onreadingerror: ((event: any) => void) | null;
      };
    };
  }
}

export default function NFCWriter({ userId, userName, token, onSuccess, onCancel }: NFCWriterProps) {
  const [status, setStatus] = useState<NFCStatus>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkNFCSupport = async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(ios);

      if (ios) {
        setStatus('unsupported');
        setErrorMessage('iOS no permite escribir NFC desde el navegador. Usa un dispositivo Android o la App nativa.');
        return;
      }

      if (!('NDEFReader' in window)) {
        setStatus('unsupported');
        setErrorMessage('Este navegador no soporta NFC. Usa Chrome en Android.');
        return;
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: 'nfc' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setStatus('unsupported');
          setErrorMessage('Permiso de NFC denegado. Habilítalo en la configuración del navegador.');
          return;
        }
      } catch {
        // Algunos navegadores no soportan query de permisos NFC
      }

      setStatus('ready');
    };

    checkNFCSupport();
  }, []);

  const writeNFCTag = useCallback(async () => {
    if (status !== 'ready' && status !== 'error') return;

    setStatus('waiting');
    setErrorMessage('');

    try {
      const ndef = new window.NDEFReader();
      
      const message: NDEFMessage = {
        records: [
          {
            recordType: 'text',
            data: token,
            encoding: 'utf-8',
            lang: 'en'
          },
          {
            recordType: 'url',
            data: `https://frutos.com/verify/${token}`
          }
        ]
      };

      setStatus('writing');
      await ndef.write(message);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      playSuccessSound();
      setStatus('success');

      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Error writing NFC:', error);
      setStatus('error');

      if (error.name === 'NotAllowedError') {
        setErrorMessage('Permiso denegado. Permite el acceso NFC y vuelve a intentar.');
      } else if (error.name === 'NotSupportedError') {
        setErrorMessage('El tag NFC no es compatible o está protegido contra escritura.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('No se pudo leer/escribir el tag. Acércalo más al dispositivo.');
      } else if (error.name === 'AbortError') {
        setErrorMessage('Operación cancelada. Mantén la tarjeta cerca hasta que termine.');
      } else {
        setErrorMessage(error.message || 'Error al escribir en la tarjeta NFC.');
      }

      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }
    }
  }, [status, token, onSuccess]);

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.15);
        
        oscillator.start(audioContext.currentTime + i * 0.1);
        oscillator.stop(audioContext.currentTime + i * 0.1 + 0.15);
      });
    } catch (e) {
      console.log('Could not play sound');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {status === 'checking' && (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 text-cyan-400 mx-auto animate-spin mb-4" />
          <p className="text-slate-400">Verificando soporte NFC...</p>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-amber-400" size={40} />
          </div>
          <h3 className="text-xl font-bold text-amber-400 mb-2">NFC No Disponible</h3>
          <p className="text-slate-400 mb-6">{errorMessage}</p>
          
          {isIOS && (
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-300">
                <span className="text-cyan-400">💡 Tip:</span> Para grabar tarjetas NFC desde iPhone, 
                necesitas usar la App nativa de Frutos Platform.
              </p>
            </div>
          )}

          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
          >
            Usar otro método
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl p-8 border-2 border-cyan-500/30">
            <div className="w-24 h-24 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
              <Nfc className="text-cyan-400" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Grabar Tarjeta NFC</h3>
            <p className="text-slate-400 mb-2">Usuario: <span className="text-cyan-400">{userName}</span></p>
            <p className="text-slate-500 text-sm mb-6">ID: {userId}</p>

            <button
              onClick={writeNFCTag}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <Nfc size={24} />
              Iniciar Grabación
            </button>
          </div>

          <button
            onClick={onCancel}
            className="mt-4 text-slate-500 hover:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === 'waiting' && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-8 border-2 border-amber-500/50 animate-pulse">
            <div className="relative w-48 h-48 mx-auto mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-20 h-20 bg-amber-500/20 rounded-full animate-ping" />
                <div className="absolute w-32 h-32 bg-amber-500/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-44 h-44 bg-amber-500/5 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <Smartphone className="text-amber-400" size={64} />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-amber-400 mb-2">Acerca la Tarjeta</h3>
            <p className="text-slate-300">
              Coloca la tarjeta NFC en la parte trasera del dispositivo
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Mantén la tarjeta quieta hasta que termine
            </p>
          </div>
        </div>
      )}

      {status === 'writing' && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border-2 border-purple-500/50">
            <div className="w-24 h-24 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="text-purple-400 animate-spin" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-purple-400 mb-2">Escribiendo...</h3>
            <p className="text-slate-300">No retires la tarjeta</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-8 border-2 border-green-500/50">
            <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-green-400" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">¡Tarjeta Grabada!</h3>
            <p className="text-slate-300 mb-2">Asignada a: <span className="text-green-400">{userName}</span></p>
            <p className="text-slate-500 text-sm">Redirigiendo a verificación...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-2xl p-8 border-2 border-red-500/50">
            <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="text-red-400" size={40} />
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Error de Escritura</h3>
            <p className="text-slate-400 mb-6">{errorMessage}</p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={writeNFCTag}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
