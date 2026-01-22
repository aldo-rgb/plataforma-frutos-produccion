'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageCircle, Phone, QrCode, X, Check, 
  Clock, Loader2, UserPlus, AlertTriangle, Wifi
} from 'lucide-react';
import Image from 'next/image';

interface BuddyInfo {
  id: number;
  nombre: string;
  apodo?: string;
  profileImage?: string | null;
  telefono?: string | null;
}

interface MatchedBuddy {
  buddyPairId: string;
  matchedAt: string;
  buddy: BuddyInfo;
}

interface PendingBuddy {
  buddyPairId: string;
  buddy: {
    id: number;
    nombre: string;
    apodo?: string;
    profileImage?: string | null;
  };
}

interface BuddyData {
  status: string;
  visionId?: number;
  matchedBuddies: MatchedBuddy[];
  pendingRequests: PendingBuddy[];
  pendingToAccept: PendingBuddy[];
  totalBuddies: number;
  message: string;
}

export default function BuddySystemWidget() {
  const [data, setData] = useState<BuddyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [scannedUser, setScannedUser] = useState<BuddyInfo | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingBuddy | null>(null);
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const jsQRRef = useRef<any>(null);

  useEffect(() => {
    loadBuddyData();
    // Check NFC support
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    }
    // Preload jsQR
    import('jsqr').then(module => {
      jsQRRef.current = module.default;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopNFC();
    };
  }, []);

  const loadBuddyData = async () => {
    try {
      const res = await fetch('/api/buddy');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (error) {
      console.error('Error loading buddy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extraer identificador del texto escaneado (userId o referralCode)
  const extractIdentifier = (text: string): { type: 'userId' | 'referralCode'; value: string } | null => {
    console.log('🔍 Extracting identifier from:', JSON.stringify(text));
    const trimmed = text.trim();
    
    // Formato: FRUTOS:USER:123
    const frutosMatch = trimmed.match(/FRUTOS:USER:(\d+)/i);
    if (frutosMatch) {
      console.log('✅ Matched FRUTOS:USER format:', frutosMatch[1]);
      return { type: 'userId', value: frutosMatch[1] };
    }
    
    // Formato gafete: USER:123
    const userMatch = trimmed.match(/^USER:(\d+)$/i);
    if (userMatch) {
      console.log('✅ Matched USER: format:', userMatch[1]);
      return { type: 'userId', value: userMatch[1] };
    }
    
    // URL con /perfil/123 o ?userId=123 o profile/123
    const urlMatch = trimmed.match(/(?:perfil\/|profile\/|userId=|user=|id=)(\d+)/i);
    if (urlMatch) {
      console.log('✅ Matched URL format:', urlMatch[1]);
      return { type: 'userId', value: urlMatch[1] };
    }
    
    // URL de signup con ref=CODE (ej: /auth/signup?org=1&ref=ABC123)
    const refMatch = trimmed.match(/[?&]ref=([A-Z0-9]+)/i);
    if (refMatch) {
      console.log('✅ Matched ref= URL format:', refMatch[1]);
      return { type: 'referralCode', value: refMatch[1].toUpperCase() };
    }
    
    // Solo número (ID directo)
    if (/^\d+$/.test(trimmed)) {
      console.log('✅ Matched numeric ID:', trimmed);
      return { type: 'userId', value: trimmed };
    }
    
    // ReferralCode alfanumérico (ej: GAMSCFFVKXD4D, PRUMK5P5P7Y2AE1) - 6-20 caracteres
    if (/^[A-Z0-9]{6,20}$/i.test(trimmed)) {
      console.log('✅ Matched referralCode:', trimmed.toUpperCase());
      return { type: 'referralCode', value: trimmed.toUpperCase() };
    }
    
    console.log('❌ No pattern matched for:', trimmed);
    return null;
  };

  const processScannedData = async (scannedText: string) => {
    console.log('📱 Processing scanned data:', JSON.stringify(scannedText));
    const identifier = extractIdentifier(scannedText);
    
    if (!identifier) {
      // Mostrar qué se escaneó para debugging
      const preview = scannedText.length > 50 ? scannedText.substring(0, 50) + '...' : scannedText;
      setScanError(`Código no reconocido: "${preview}"`);
      return;
    }

    console.log('✅ Identifier found:', identifier);
    stopCamera();
    stopNFC();
    setProcessing(true);
    
    try {
      // Enviar userId o referralCode según el tipo identificado
      const body = identifier.type === 'userId' 
        ? { scannedUserId: identifier.value }
        : { referralCode: identifier.value };
      
      console.log('📤 Sending to API:', body);
      const res = await fetch('/api/buddy/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const json = await res.json();
      console.log('📥 API response:', json);
      
      if (json.success && json.canConnect) {
        setShowScanModal(false);
        setScannedUser(json.targetUser);
        setShowConfirmModal(true);
      } else {
        setScanError(json.error || 'No se puede conectar con este usuario');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanError('Error de conexión. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const startCamera = async () => {
    setScanError(null);
    setCameraActive(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true);
            startQRScanning();
          }).catch(console.error);
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setScanError('Permiso de cámara denegado. Actívalo en configuración.');
      } else if (err.name === 'NotFoundError') {
        setScanError('No se encontró ninguna cámara.');
      } else {
        setScanError('Error al acceder a la cámara: ' + err.message);
      }
    }
  };

  const startQRScanning = () => {
    if (!jsQRRef.current) {
      console.error('jsQR not loaded');
      return;
    }

    const scan = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        console.log('QR Code detected:', code.data);
        processScannedData(code.data);
      }
    };
    
    // Scan every 150ms
    scanIntervalRef.current = setInterval(scan, 150);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
  };

  const startNFC = async () => {
    // Verificar soporte de NFC Web API
    if (!('NDEFReader' in window)) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setScanError('NFC no disponible en iPhone/iPad. Usa la cámara para escanear el QR.');
      } else {
        setScanError('NFC no disponible. Usa Chrome o Edge en Android.');
      }
      return;
    }

    try {
      setNfcReading(true);
      setScanError(null);
      
      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      nfcAbortRef.current = new AbortController();
      
      await ndef.scan({ signal: nfcAbortRef.current.signal });
      console.log('NFC scan started');
      
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        console.log('NFC Reading:', { serialNumber, recordCount: message?.records?.length });
        
        // Primero intentar con serialNumber si no hay records útiles
        let foundData = false;
        
        if (message?.records?.length > 0) {
          for (const record of message.records) {
            let text = '';
            try {
              if (record.recordType === 'text') {
                const decoder = new TextDecoder(record.encoding || 'utf-8');
                text = decoder.decode(record.data);
              } else if (record.recordType === 'url') {
                const decoder = new TextDecoder();
                text = decoder.decode(record.data);
                // Extraer código de URL si es verify
                const match = text.match(/\/verify\/(.+)$/);
                if (match) text = match[1];
              } else {
                const decoder = new TextDecoder();
                text = decoder.decode(record.data);
              }
              
              if (text) {
                console.log('NFC Data from record:', text);
                foundData = true;
                processScannedData(text);
                return;
              }
            } catch (e) {
              console.error('Error decoding NFC record:', e);
            }
          }
        }
        
        // Fallback: usar serialNumber como identificador
        if (!foundData && serialNumber) {
          console.log('Using NFC serialNumber:', serialNumber);
          processScannedData(serialNumber);
          return;
        }
        
        setScanError('Tag NFC no contiene datos válidos');
      });

      ndef.addEventListener('readingerror', (err: any) => {
        console.error('NFC read error:', err);
        setScanError('Error leyendo el tag NFC. Acércalo nuevamente.');
        setNfcReading(false);
      });

    } catch (error: any) {
      console.error('NFC Error:', error);
      setNfcReading(false);
      
      if (error.name === 'AbortError') {
        // Ignorar - es un cierre normal
        return;
      }
      
      if (error.name === 'NotAllowedError') {
        setScanError('Permiso NFC denegado. Habilítalo en configuración del navegador.');
      } else if (error.name === 'NotSupportedError') {
        setScanError('NFC no está habilitado en este dispositivo. Actívalo en Ajustes.');
      } else if (error.name === 'SecurityError') {
        setScanError('NFC requiere conexión HTTPS segura.');
      } else {
        setScanError('Error NFC: ' + (error.message || 'Error desconocido'));
      }
    }
  };

  const stopNFC = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcReading(false);
  };

  const openScanModal = () => {
    setShowScanModal(true);
    setScanError(null);
    setProcessing(false);
    // Start camera after modal is shown
    setTimeout(() => startCamera(), 300);
  };

  const closeScanModal = () => {
    stopCamera();
    stopNFC();
    setShowScanModal(false);
    setScanError(null);
    setProcessing(false);
  };

  const handleManualInput = () => {
    const input = prompt('Ingresa el ID del usuario:');
    if (input) {
      processScannedData(input);
    }
  };

  const handleInitiateBuddy = async () => {
    if (!scannedUser || !phone || !acceptTerms) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate',
          targetUserId: scannedUser.id,
          phone
        })
      });
      
      const json = await res.json();
      
      if (json.success) {
        setShowConfirmModal(false);
        setScannedUser(null);
        setPhone('');
        setAcceptTerms(false);
        loadBuddyData();
      } else {
        alert(json.error || 'Error al enviar solicitud');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptBuddy = async () => {
    if (!selectedPending || !phone || !acceptTerms) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          buddyPairId: selectedPending.buddyPairId,
          phone
        })
      });
      
      const json = await res.json();
      
      if (json.success) {
        setShowAcceptModal(false);
        setSelectedPending(null);
        setPhone('');
        setAcceptTerms(false);
        loadBuddyData();
      } else {
        alert(json.error || 'Error al aceptar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectBuddy = async (buddyPairId: string) => {
    if (!confirm('¿Rechazar esta solicitud de buddy?')) return;
    
    try {
      await fetch('/api/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', buddyPairId })
      });
      loadBuddyData();
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  // RENDER: Estado con buddies matcheados
  if (data?.matchedBuddies && data.matchedBuddies.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Buddy System</h3>
              <p className="text-[10px] sm:text-xs text-green-400">✓ Pacto sellado</p>
            </div>
          </div>
          <button
            onClick={openScanModal}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors"
            title="Agregar otro buddy"
          >
            <UserPlus className="w-4 h-4 text-purple-400" />
          </button>
        </div>

        <div className="space-y-3">
          {data.matchedBuddies.map((matched) => (
            <BuddyCard key={matched.buddyPairId} buddy={matched.buddy} />
          ))}
        </div>

        {data.pendingToAccept.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-amber-400 mb-2">📥 Solicitudes pendientes:</p>
            {data.pendingToAccept.map((pending) => (
              <div key={pending.buddyPairId} className="flex items-center justify-between bg-amber-500/10 rounded-lg p-3 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/30 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-300">{getInitials(pending.buddy.nombre)}</span>
                  </div>
                  <span className="text-sm text-white">{pending.buddy.apodo || pending.buddy.nombre}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedPending(pending); setShowAcceptModal(true); }} className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg">
                    <Check className="w-4 h-4 text-green-400" />
                  </button>
                  <button onClick={() => handleRejectBuddy(pending.buddyPairId)} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {renderModals()}
      </motion.div>
    );
  }

  // RENDER: Estado pendiente de aceptar
  if (data?.pendingToAccept && data.pendingToAccept.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-900/20 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 sm:p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 relative">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">Buddy System</h3>
            <p className="text-[10px] sm:text-xs text-amber-400">Tienes {data.pendingToAccept.length} solicitud(es)</p>
          </div>
        </div>

        {data.pendingToAccept.map((pending) => (
          <div key={pending.buddyPairId} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-3">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">{getInitials(pending.buddy.nombre)}</span>
              </div>
              <div>
                <h4 className="font-semibold text-white">{pending.buddy.apodo || pending.buddy.nombre}</h4>
                <p className="text-xs text-amber-400">Te ha elegido como Buddy</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedPending(pending); setShowAcceptModal(true); }} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition-colors">
                Aceptar Alianza
              </button>
              <button onClick={() => handleRejectBuddy(pending.buddyPairId)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                Rechazar
              </button>
            </div>
          </div>
        ))}
        {renderModals()}
      </motion.div>
    );
  }

  // RENDER: Estado esperando respuesta
  if (data?.pendingRequests && data.pendingRequests.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 sm:p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">Buddy System</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Esperando respuesta...</p>
          </div>
        </div>

        {data.pendingRequests.map((pending) => (
          <div key={pending.buddyPairId} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/50 to-purple-600/50 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-white/70">{getInitials(pending.buddy.nombre)}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white">{pending.buddy.apodo || pending.buddy.nombre}</h4>
                <p className="text-xs text-amber-400">Esperando confirmación...</p>
              </div>
            </div>
          </div>
        ))}
        <button onClick={openScanModal} className="w-full mt-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Agregar otro Buddy
        </button>
        {renderModals()}
      </motion.div>
    );
  }

  // RENDER: Estado sin buddy (Empty State)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-4 sm:p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 sm:p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm sm:text-base">Buddy System</h3>
          <p className="text-[10px] sm:text-xs text-slate-400">Tu compañero de camino</p>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="w-16 h-16 bg-purple-500/30 rounded-full flex items-center justify-center border-2 border-purple-500">
          <span className="text-2xl">👤</span>
        </div>
        <div className="text-2xl text-slate-600">+</div>
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-600">
          <span className="text-2xl text-slate-600">?</span>
        </div>
      </div>

      <p className="text-sm text-slate-400 text-center mb-4">En este camino no vas solo. Encuentra a tu Buddy.</p>

      <button onClick={openScanModal} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30">
        <QrCode className="w-5 h-5" /> ESCANEAR GAFETE DE MI BUDDY
      </button>
      <button onClick={handleManualInput} className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-slate-400">(Prueba: ingresar ID manual)</button>
      {renderModals()}
    </motion.div>
  );

  function renderModals() {
    return (
      <>
        {/* SCAN MODAL */}
        <AnimatePresence>
          {showScanModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0.9 }} 
                className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-purple-400" />
                    Escanear Gafete
                  </h3>
                  <button onClick={closeScanModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {processing ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-300">Verificando usuario...</p>
                  </div>
                ) : (
                  <>
                    {/* Camera View */}
                    <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Scanning overlay */}
                      {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Corner markers */}
                          <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                          <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                          {/* Center targeting */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-purple-400/50 rounded-lg" />
                          </div>
                        </div>
                      )}
                      
                      {/* Camera status */}
                      {!cameraActive && !scanError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-3" />
                          <p className="text-slate-400 text-sm">Iniciando cámara...</p>
                        </div>
                      )}
                    </div>

                    {/* Error message */}
                    {scanError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div>
                            <p className="text-red-400 text-sm">{scanError}</p>
                            <button 
                              onClick={() => { setScanError(null); startCamera(); }}
                              className="text-red-300 text-xs underline mt-1"
                            >
                              Reintentar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    <p className="text-sm text-slate-400 text-center mb-4">
                      {cameraActive 
                        ? '📷 Apunta al código QR del gafete' 
                        : scanError ? '' : 'Permite el acceso a la cámara para escanear'}
                    </p>

                    {/* NFC Button */}
                    {nfcSupported && (
                      <button 
                        onClick={nfcReading ? stopNFC : startNFC}
                        className={`w-full py-3 mb-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                          nfcReading 
                            ? 'bg-blue-600 text-white animate-pulse' 
                            : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        <Wifi className="w-5 h-5" />
                        {nfcReading ? '📡 Acerca el gafete NFC...' : 'Usar NFC'}
                      </button>
                    )}

                    {/* Manual input */}
                    <button 
                      onClick={handleManualInput} 
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm transition-colors"
                    >
                      Ingresar ID manualmente
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM MODAL */}
        <AnimatePresence>
          {showConfirmModal && scannedUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-white text-center mb-2">Confirmar Alianza</h3>
                <p className="text-purple-400 text-center mb-6">con {scannedUser.apodo || scannedUser.nombre}</p>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{getInitials(scannedUser.nombre)}</span>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Al confirmar, abrirás tu canal de comunicación.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Tu número de WhatsApp:</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3312345678" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none" />
                </div>
                <label className="flex items-start gap-3 mb-6 cursor-pointer">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600" />
                  <span className="text-sm text-slate-300">Acepto compartir mi número de WhatsApp y me comprometo a sostener a mi Buddy durante el proceso.</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={() => { setShowConfirmModal(false); setScannedUser(null); }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium">Cancelar</button>
                  <button onClick={handleInitiateBuddy} disabled={!phone || !acceptTerms || processing} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirmar</>}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACCEPT MODAL */}
        <AnimatePresence>
          {showAcceptModal && selectedPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-white text-center mb-2">Aceptar Alianza</h3>
                <p className="text-purple-400 text-center mb-6">con {selectedPending.buddy.apodo || selectedPending.buddy.nombre}</p>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{getInitials(selectedPending.buddy.nombre)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 text-center mb-4">Para cerrar el pacto, es necesario reciprocidad.</p>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Tu número de WhatsApp:</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3312345678" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none" />
                </div>
                <label className="flex items-start gap-3 mb-6 cursor-pointer">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600" />
                  <span className="text-sm text-slate-300">Acepto recibir la responsabilidad de mi Buddy y autorizo compartir mi teléfono.</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={() => { setShowAcceptModal(false); setSelectedPending(null); }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium">Cancelar</button>
                  <button onClick={handleAcceptBuddy} disabled={!phone || !acceptTerms || processing} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerrar Pacto'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
}

function BuddyCard({ buddy }: { buddy: BuddyInfo }) {
  const initials = buddy.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const whatsappLink = buddy.telefono ? `https://wa.me/52${buddy.telefono.replace(/\D/g, '')}` : null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {buddy.profileImage ? (
            <Image src={buddy.profileImage} alt={buddy.nombre} width={56} height={56} className="rounded-full object-cover ring-2 ring-purple-500/50" />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-purple-500/50">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{buddy.apodo || buddy.nombre}</h4>
          <p className="text-xs text-slate-400 truncate">{buddy.nombre}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        {whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium transition-colors">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        )}
        {buddy.telefono && (
          <a href={`tel:${buddy.telefono}`} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium transition-colors">
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
