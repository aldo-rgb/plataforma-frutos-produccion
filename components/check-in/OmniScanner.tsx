'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Keyboard, Nfc, CheckCircle, Usb, Smartphone } from 'lucide-react';
import QRScanner from './QRScanner';

interface OmniScannerProps {
  onScan: (data: string, method: 'camera' | 'keyboard' | 'nfc') => void;
  enabled?: boolean;
  expectedUserId?: number;
  defaultScannerMode?: 'camera' | 'gun'; // Modo por defecto del scanner QR
}

type ScannerChannel = 'camera' | 'keyboard' | 'nfc';

interface ChannelStatus {
  camera: 'inactive' | 'active' | 'detected';
  keyboard: 'inactive' | 'listening' | 'detected';
  nfc: 'unsupported' | 'inactive' | 'scanning' | 'detected' | 'usb_ready';
}

// Tipos de soporte NFC
type NFCMode = 'native' | 'usb' | 'none';

interface NDEFReadingEvent {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      data: ArrayBuffer;
      encoding?: string;
      lang?: string;
    }>;
  };
}

export default function OmniScanner({ onScan, enabled = true, expectedUserId, defaultScannerMode }: OmniScannerProps) {
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
    camera: 'inactive',
    keyboard: 'inactive',
    nfc: 'inactive'
  });
  const [lastDetection, setLastDetection] = useState<{ channel: ScannerChannel; data: string } | null>(null);
  const [keyboardBuffer, setKeyboardBuffer] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcMode, setNfcMode] = useState<NFCMode>('none');
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nfcReaderRef = useRef<any>(null);
  const nfcBufferRef = useRef<string>('');
  const nfcTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar si es dispositivo móvil
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

  // Verificar soporte NFC (nativo o USB)
  useEffect(() => {
    const checkNFC = async () => {
      const hasNDEFReader = 'NDEFReader' in window;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const nativeSupported = hasNDEFReader && !isIOS && isAndroid;
      
      // Debug info
      console.log('🔍 NFC Check:', {
        hasNDEFReader,
        isIOS,
        isAndroid,
        isMobile,
        nativeSupported,
        userAgent: navigator.userAgent,
      });
      
      if (nativeSupported) {
        // Chrome Android con Web NFC nativo
        setNfcSupported(true);
        setNfcMode('native');
        setChannelStatus(prev => ({ ...prev, nfc: 'inactive' }));
      } else if (!isMobile) {
        // Escritorio: habilitar modo USB NFC
        setNfcSupported(true);
        setNfcMode('usb');
        setChannelStatus(prev => ({ ...prev, nfc: 'usb_ready' }));
        console.log('💻 NFC USB mode enabled for desktop');
      } else {
        // iOS u otro móvil sin soporte
        setNfcSupported(false);
        setNfcMode('none');
        setChannelStatus(prev => ({ ...prev, nfc: 'unsupported' }));
      }
    };
    
    checkNFC();
  }, [isAndroid, isMobile]);

  const triggerHaptic = useCallback((pattern: number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const playDetectionSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1400, audioContext.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const handleDetection = useCallback((data: string, channel: ScannerChannel) => {
    if (!enabled) return;

    setLastDetection({ channel, data });
    setChannelStatus(prev => ({ ...prev, [channel]: 'detected' }));
    
    triggerHaptic([100, 50, 100]);
    playDetectionSound();

    onScan(data, channel);

    setTimeout(() => {
      setChannelStatus(prev => ({ 
        ...prev, 
        [channel]: channel === 'nfc' ? (nfcMode === 'usb' ? 'usb_ready' : (nfcSupported ? 'scanning' : 'unsupported')) :
                   channel === 'keyboard' ? 'listening' : 
                   channel === 'camera' ? 'active' : 
                   'inactive' 
      }));
      setLastDetection(null);
    }, 2000);
  }, [enabled, nfcSupported, nfcMode, onScan, triggerHaptic, playDetectionSound]);

  // === CANAL A: CÁMARA (QRScanner) ===
  const handleQRScan = useCallback((data: string) => {
    handleDetection(data, 'camera');
  }, [handleDetection]);

  useEffect(() => {
    if (enabled) {
      setChannelStatus(prev => ({ ...prev, camera: 'active' }));
    } else {
      setChannelStatus(prev => ({ ...prev, camera: 'inactive' }));
    }
  }, [enabled]);

  // === CANAL B: PISTOLA/TECLADO + NFC USB ===
  useEffect(() => {
    if (!enabled) {
      setChannelStatus(prev => ({ ...prev, keyboard: 'inactive' }));
      return;
    }

    setChannelStatus(prev => ({ ...prev, keyboard: 'listening' }));

    // Patrones que indican lectura NFC (URLs de verificación, UIDs, etc.)
    const isNFCData = (data: string): boolean => {
      // URL de verificación NFC
      if (data.includes('/verify/') || data.includes('frutos.') || data.includes('nfc:')) return true;
      // UID de tarjeta NFC (formato hexadecimal típico)
      if (/^[0-9A-Fa-f]{8,14}$/.test(data)) return true;
      // Prefijo NFC común
      if (data.startsWith('NFC:') || data.startsWith('NDEF:')) return true;
      // Data que empieza con https y contiene verify
      if (data.startsWith('https://') && data.includes('verify')) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Enter' && keyboardBuffer.length > 0) {
        e.preventDefault();
        
        // Determinar si es NFC USB o pistola normal
        const isNFC = isNFCData(keyboardBuffer);
        
        if (isNFC && nfcMode === 'usb') {
          // Detectado como NFC USB
          console.log('📱 NFC USB detected:', keyboardBuffer);
          handleDetection(keyboardBuffer, 'nfc');
        } else {
          // Pistola/teclado normal
          handleDetection(keyboardBuffer, 'keyboard');
        }
        
        setKeyboardBuffer('');
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        
        setKeyboardBuffer(prev => prev + e.key);

        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
        
        keyboardTimeoutRef.current = setTimeout(() => {
          setKeyboardBuffer('');
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    };
  }, [enabled, keyboardBuffer, handleDetection, nfcMode]);

  // === CANAL C: NFC READER (Nativo - Solo Android) ===
  useEffect(() => {
    // Solo activar NFC nativo en Android
    if (!enabled || nfcMode !== 'native') return;

    const startNFCReader = async () => {
      try {
        // @ts-ignore - Web NFC API
        const ndef = new (window as any).NDEFReader();
        nfcReaderRef.current = ndef;

        ndef.onreading = (event: NDEFReadingEvent) => {
          if (event.message.records.length > 0) {
            const record = event.message.records[0];
            
            let data = '';
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              data = decoder.decode(record.data);
            } else if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              data = decoder.decode(record.data);
              const match = data.match(/\/verify\/(.+)$/);
              if (match) {
                data = match[1];
              }
            } else {
              const decoder = new TextDecoder();
              data = decoder.decode(record.data);
            }

            if (data) {
              handleDetection(data, 'nfc');
            }
          }
        };

        ndef.onreadingerror = (error: any) => {
          console.error('NFC read error:', error);
        };

        await ndef.scan();
        setChannelStatus(prev => ({ ...prev, nfc: 'scanning' }));
        console.log('📱 NFC Native scanning started');
      } catch (error) {
        console.error('Error starting NFC:', error);
        setChannelStatus(prev => ({ ...prev, nfc: 'inactive' }));
      }
    };

    startNFCReader();

    return () => {
      nfcReaderRef.current = null;
    };
  }, [enabled, nfcMode, handleDetection]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'listening':
      case 'scanning':
      case 'usb_ready':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'detected':
        return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50 animate-pulse';
      case 'unsupported':
        return 'text-slate-500 bg-slate-800 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusText = (channel: ScannerChannel) => {
    const status = channelStatus[channel];
    switch (status) {
      case 'active': return 'ACTIVA';
      case 'listening': return 'LISTA';
      case 'scanning': return 'ESCUCHANDO...';
      case 'usb_ready': return 'USB LISTO';
      case 'detected': return '¡DETECTADO!';
      case 'unsupported': return 'NO DISPONIBLE';
      case 'inactive':
      default: return 'INACTIVO';
    }
  };

  // Obtener icono y label para NFC según modo
  const getNFCInfo = () => {
    if (nfcMode === 'usb') {
      return { icon: Usb, label: 'NFC USB', sublabel: 'Lector USB conectado' };
    } else if (nfcMode === 'native') {
      return { icon: Smartphone, label: 'NFC Nativo', sublabel: 'Tap con tarjeta' };
    }
    return { icon: Nfc, label: 'NFC', sublabel: 'No disponible' };
  };

  const nfcInfo = getNFCInfo();

  return (
    <div className="w-full">
      {/* Indicadores de canales activos */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`rounded-xl p-3 border-2 transition-all ${getStatusColor(channelStatus.camera)}`}>
          <div className="flex items-center gap-2 mb-1">
            <Camera size={18} />
            <span className="font-bold text-sm">Cámara</span>
          </div>
          <div className="text-xs opacity-80">[ {getStatusText('camera')} ]</div>
        </div>

        <div className={`rounded-xl p-3 border-2 transition-all ${getStatusColor(channelStatus.keyboard)}`}>
          <div className="flex items-center gap-2 mb-1">
            <Keyboard size={18} />
            <span className="font-bold text-sm">Pistola</span>
          </div>
          <div className="text-xs opacity-80">[ {getStatusText('keyboard')} ]</div>
          {keyboardBuffer && (
            <div className="text-xs mt-1 font-mono bg-slate-900 px-2 py-1 rounded truncate">
              {keyboardBuffer}
            </div>
          )}
        </div>

        <div className={`rounded-xl p-3 border-2 transition-all ${getStatusColor(channelStatus.nfc)}`}>
          <div className="flex items-center gap-2 mb-1">
            <nfcInfo.icon size={18} />
            <span className="font-bold text-sm">{nfcInfo.label}</span>
          </div>
          <div className="text-xs opacity-80">
            {channelStatus.nfc === 'scanning' && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                ESCUCHANDO...
              </span>
            )}
            {channelStatus.nfc === 'usb_ready' && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                USB LISTO
              </span>
            )}
            {channelStatus.nfc !== 'scanning' && channelStatus.nfc !== 'usb_ready' && `[ ${getStatusText('nfc')} ]`}
          </div>
        </div>
      </div>

      {/* Última detección */}
      {lastDetection && (
        <div className="mb-6 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-cyan-400 flex-shrink-0" size={24} />
            <div className="flex-1 min-w-0">
              <div className="text-cyan-400 font-bold text-sm">
                ¡Código detectado vía {
                  lastDetection.channel === 'camera' ? 'Cámara' :
                  lastDetection.channel === 'keyboard' ? 'Pistola' : 'NFC'
                }!
              </div>
              <div className="text-slate-300 text-xs truncate font-mono">
                {lastDetection.data.substring(0, 50)}...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visor de cámara QR */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700">
        <QRScanner 
          onScan={handleQRScan}
          defaultMode={defaultScannerMode || 'camera'}
          enabled={enabled}
        />
      </div>

      {/* Instrucciones */}
      <div className="mt-4 text-center text-slate-500 text-sm">
        <p>📷 Escanea QR con la cámara</p>
        <p>🔫 Usa pistola USB (detecta entrada rápida)</p>
        {nfcMode === 'native' && <p>📱 Tap con tarjeta NFC (Android)</p>}
        {nfcMode === 'usb' && <p>🔌 Conecta lector NFC USB para escanear tarjetas</p>}
        {nfcMode === 'none' && isMobile && <p className="text-yellow-500">⚠️ NFC no disponible en este dispositivo</p>}
      </div>
    </div>
  );
}
