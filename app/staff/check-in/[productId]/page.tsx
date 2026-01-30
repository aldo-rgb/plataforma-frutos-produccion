'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Scan, Search, Camera, Printer, CheckCircle, XCircle,
  AlertTriangle, AlertCircle, User, FileText, CreditCard, Shield,
  Volume2, RefreshCw, Wifi, WifiOff, Nfc
} from 'lucide-react';
import OmniScanner from '@/components/check-in/OmniScanner';
import WebcamCapture from '@/components/check-in/WebcamCapture';
import BadgePreview from '@/components/check-in/BadgePreview';

type CheckInStatus = 'idle' | 'scanning' | 'validating' | 'medical_block' | 'photo_required' | 'badge_print' | 'nfc_write' | 'qr_verification' | 'success' | 'error' | 'already_checked_in';

interface ValidationResult {
  valid: boolean;
  user?: {
    id: number;
    nombre: string;
    apodo?: string;
    email: string;
    profileImage?: string;
    hasPhoto: boolean;
    referralCode?: string;
    rol?: string;
  };
  enrollment?: {
    id: number;
    level: string;
    status: string;
  };
  medicalForm?: {
    id: number;
    isComplete: boolean;
    hasAlerts: boolean;
  };
  ticket?: {
    id: string;
    status: string;
    isPaid: boolean;
  };
  errors: {
    type: 'ticket' | 'medical' | 'photo' | 'enrollment' | 'general';
    message: string;
    blocking: boolean;
  }[];
  canProceed: boolean;
  requiresNewPhoto?: boolean;  // Siempre tomar nueva foto para BASIC, ADVANCED, PL(1er fin)
  checkInPhotoLabel?: string;  // Etiqueta del tipo de check-in
}

interface ProductInfo {
  id: number;
  name: string;
  visionId: number;
  visionName: string;
  levelType: string;
  startDate: string;
  organizationId: number;
  organizationName: string;
  logoUrl?: string;
  brandColor?: string;
}

export default function CheckInStationPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>('idle');
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enrolled: 0, checkedIn: 0, pending: 0 });
  const [isProcessing, setIsProcessing] = useState(false); // Flag para evitar múltiples validaciones
  
  // Control de debounce para sonidos - evitar múltiples sonidos rápidos
  const lastSoundTimeRef = useRef<number>(0);
  const soundCooldown = 500; // Mínimo 500ms entre sonidos
  
  // Función para cancelar vibraciones
  const stopVibration = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(0); // Cancelar cualquier vibración
    }
  }, []);

  // Sonidos con debounce
  const playSound = useCallback((type: 'success' | 'error' | 'warning' | 'scan') => {
    if (!soundEnabled) return;
    
    // Debounce: ignorar si el último sonido fue hace menos de 500ms
    const now = Date.now();
    if (now - lastSoundTimeRef.current < soundCooldown) {
      return;
    }
    lastSoundTimeRef.current = now;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const sounds = {
        success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType },
        error: { freq: 220, duration: 0.3, type: 'square' as OscillatorType },
        warning: { freq: 440, duration: 0.2, type: 'triangle' as OscillatorType },
        scan: { freq: 1200, duration: 0.05, type: 'sine' as OscillatorType }
      };
      
      const sound = sounds[type];
      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch (e) {
      // Silenciar errores de audio
      console.error('Audio error:', e);
    }
  }, [soundEnabled]);

  // Cargar info del producto y stats
  const fetchProductInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/check-in/product/${resolvedParams.productId}`);
      if (res.ok) {
        const data = await res.json();
        setProductInfo(data.product);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching product info:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.productId]);

  useEffect(() => {
    fetchProductInfo();
  }, [fetchProductInfo]);

  // Detectar conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Validar QR escaneado o búsqueda manual
  const validateUser = async (identifier: string) => {
    // Evitar múltiples validaciones simultáneas
    if (isProcessing || checkInStatus !== 'idle') {
      console.log('⚠️ Validación bloqueada - ya hay una en proceso o estado no es idle');
      return;
    }
    
    setIsProcessing(true);
    setCheckInStatus('validating');
    stopVibration(); // Cancelar cualquier vibración previa
    playSound('scan');

    try {
      const res = await fetch('/api/staff/check-in/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier, // Puede ser QR data, email, o ID
          productId: parseInt(resolvedParams.productId)
        })
      });

      const data = await res.json();
      setValidationResult(data);

      if (!data.valid || data.errors.length > 0) {
        // Determinar el tipo de bloqueo
        const hasTicketError = data.errors.some((e: any) => e.type === 'ticket' && e.blocking);
        const hasMedicalError = data.errors.some((e: any) => e.type === 'medical' && e.blocking);
        const hasPhotoError = data.errors.some((e: any) => e.type === 'photo');
        const alreadyCheckedIn = data.errors.some((e: any) => e.message?.includes('ya hizo check-in'));

        if (alreadyCheckedIn && data.user) {
          setCheckInStatus('already_checked_in');
          playSound('warning');
        } else if (hasTicketError) {
          setCheckInStatus('error');
          playSound('error');
        } else if (hasMedicalError) {
          setCheckInStatus('medical_block');
          playSound('warning');
        } else if (hasPhotoError && data.canProceed) {
          setCheckInStatus('photo_required');
          playSound('warning');
        } else if (data.canProceed) {
          // Siempre ir a foto primero
          setCheckInStatus('photo_required');
          playSound('success');
        } else {
          setCheckInStatus('error');
          playSound('error');
        }
      } else {
        // Todo OK, ir a captura/confirmación de foto
        setCheckInStatus('photo_required');
        playSound('success');
      }
    } catch (error) {
      console.error('Error validating:', error);
      stopVibration(); // Cancelar vibraciones en error
      setCheckInStatus('error');
      playSound('error');
      setValidationResult({
        valid: false,
        errors: [{ type: 'general', message: 'Error de conexión', blocking: true }],
        canProceed: false
      });
    } finally {
      // Liberar el flag después de un pequeño delay para evitar rebotes
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };

  // Verificar que el QR/NFC escaneado corresponde al participante seleccionado
  const verifyParticipantQR = async (scanData: string) => {
    if (!validationResult?.user) return;

    const trimmedData = scanData.trim();
    console.log('🔍 Verificando scan:', trimmedData, 'para usuario:', validationResult.user.id, validationResult.user.referralCode);

    try {
      // Caso 0: Formato FRUTOS:ID:REFERRALCODE (nuestro QR del gafete)
      if (trimmedData.startsWith('FRUTOS:')) {
        const parts = trimmedData.split(':');
        const qrUserId = parseInt(parts[1]);
        const qrReferralCode = parts[2];
        
        if (qrUserId === validationResult.user.id) {
          playSound('success');
          setCheckInStatus('validating'); // Mostrar "Validando" mientras completa
          completeCheckIn(false);
          return;
        } else {
          playSound('error');
          alert(`QR inválido. Este gafete pertenece a otro participante (ID: ${qrUserId}). Se esperaba el gafete de ${validationResult.user.nombre}.`);
          return;
        }
      }

      // Caso 0.5: ReferralCode directo (ej: EMIMKCJPFBWZGFM)
      const upperData = trimmedData.toUpperCase();
      if (validationResult.user.referralCode && upperData === validationResult.user.referralCode.toUpperCase()) {
        playSound('success');
        setCheckInStatus('validating'); // Mostrar "Validando" mientras completa
        completeCheckIn(false);
        return;
      }

      // Caso 1: Token NFC (empieza con FRT.)
      if (trimmedData.startsWith('FRT.')) {
        // Validar token NFC en el servidor
        const res = await fetch(`/api/staff/check-in/nfc-token?token=${encodeURIComponent(scanData)}`);
        const data = await res.json();

        if (data.valid && data.user.id === validationResult.user.id) {
          playSound('success');
          setCheckInStatus('validating'); // Mostrar "Validando" mientras completa
          completeCheckIn(false);
          return;
        } else if (data.valid && data.user.id !== validationResult.user.id) {
          playSound('error');
          alert(`Token NFC inválido. Esta tarjeta pertenece a ${data.user.nombre} (ID: ${data.user.id}). Se esperaba la tarjeta de ${validationResult.user.nombre}.`);
          return;
        } else {
          playSound('error');
          alert(`Token NFC inválido: ${data.error || 'Error desconocido'}`);
          return;
        }
      }

      // Caso 2: Intentar parsear como JSON (QR estándar)
      try {
        const qrInfo = JSON.parse(scanData);
        
        // Verificar que el ID coincide
        if (qrInfo.id === validationResult.user.id) {
          playSound('success');
          setCheckInStatus('validating'); // Mostrar "Validando" mientras completa
          completeCheckIn(false);
        } else {
          playSound('error');
          alert(`QR inválido. Este QR pertenece a otro participante (ID: ${qrInfo.id}). Se esperaba el QR de ${validationResult.user.nombre}.`);
        }
        return;
      } catch {
        // No es JSON, continuar con otros métodos
      }

      // Caso 3: Si es solo el ID numérico
      const scannedId = parseInt(scanData);
      if (!isNaN(scannedId) && scannedId === validationResult.user.id) {
        playSound('success');
        setCheckInStatus('validating'); // Mostrar "Validando" mientras completa
        completeCheckIn(false);
        return;
      }

      // Caso 4: URL de verificación (extraer token)
      const urlMatch = scanData.match(/\/verify\/(.+)$/);
      if (urlMatch) {
        // Recursivamente validar el token extraído
        verifyParticipantQR(`FRT.${urlMatch[1]}`);
        return;
      }

      // Ningún caso coincidió
      playSound('error');
      alert(`Código inválido. Escanea el gafete de ${validationResult.user.nombre}.`);
      
    } catch (error) {
      console.error('Error verifying scan:', error);
      playSound('error');
      alert('Error al verificar. Intenta de nuevo.');
    }
  };

  // Manejar búsqueda manual
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSearch.trim()) {
      validateUser(manualSearch.trim());
    }
  };

  // Captura de foto completada
  const handlePhotoCapture = async (imageData: string) => {
    if (!validationResult?.user) return;

    try {
      const res = await fetch('/api/staff/check-in/capture-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: validationResult.user.id,
          imageData,
          productId: productInfo?.id // Enviar productId para guardar en The Vault
        })
      });

      if (res.ok) {
        // Actualizar el resultado con la foto
        setValidationResult(prev => prev ? {
          ...prev,
          user: { ...prev.user!, hasPhoto: true, profileImage: imageData }
        } : null);
        setCheckInStatus('badge_print');
        playSound('success');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  // Formulario médico completado
  const handleMedicalFormComplete = async () => {
    // Revalidar - primero resetear estado para permitir la validación
    if (validationResult?.user) {
      setIsProcessing(false);
      setCheckInStatus('idle');
      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(r => setTimeout(r, 100));
      validateUser(validationResult.user.id.toString());
    }
  };

  // Completar check-in
  const completeCheckIn = async (printBadge: boolean) => {
    if (!validationResult?.user || !productInfo) return;

    try {
      const res = await fetch('/api/staff/check-in/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: validationResult.user.id,
          productId: productInfo.id,
          visionId: productInfo.visionId,
          organizationId: productInfo.organizationId,
          enrollmentId: validationResult.enrollment?.id,
          printBadge
        })
      });

      if (res.ok) {
        setCheckInStatus('success');
        // Refrescar stats después del check-in exitoso
        fetchProductInfo();
        playSound('success');
        // Ya no hay auto-reset, el usuario debe hacer click en "Siguiente Participante"
      }
    } catch (error) {
      console.error('Error completing check-in:', error);
      playSound('error');
    }
  };

  // Resetear estación
  const resetStation = () => {
    stopVibration(); // Cancelar cualquier vibración
    setIsProcessing(false); // Liberar flag
    setCheckInStatus('idle');
    setValidationResult(null);
    setManualSearch('');
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white">
              <ArrowLeft size={24} />
            </Link>
            {productInfo?.logoUrl && (
              <img src={productInfo.logoUrl} alt="Logo" className="h-10 w-auto" />
            )}
            <div>
              <h1 className="text-xl font-bold">Quantum Check-In Station</h1>
              <p className="text-slate-400 text-sm">
                {productInfo?.visionName} • {productInfo?.levelType === 'BASIC' ? 'Básico' : productInfo?.levelType === 'ADVANCED' ? 'Avanzado' : productInfo?.levelType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Contador de inscritos */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-white font-bold text-lg">{stats.enrolled}</div>
              <div className="text-slate-500 text-xs">Inscritos</div>
            </div>

            {/* Contador de asistencias */}
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-green-400 font-bold text-lg">{stats.checkedIn}</div>
              <div className="text-green-400/70 text-xs">Asistencias</div>
            </div>

            {/* Contador de pendientes */}
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-amber-400 font-bold text-lg">{stats.pending}</div>
              <div className="text-amber-400/70 text-xs">Pendientes</div>
            </div>

            {/* Status de conexión */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>

            {/* Toggle sonido */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Estado: IDLE - Esperando escaneo */}
          {checkInStatus === 'idle' && (
            <div className="text-center">
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Scan className="text-cyan-400" size={64} />
                </div>
                <h2 className="text-3xl font-bold mb-2">Esperando Participante</h2>
                <p className="text-slate-400">Escanea QR, usa scanner o tap NFC</p>
              </div>

              {/* Omni Scanner - 3 canales simultáneos */}
              <div className="mb-8">
                <OmniScanner 
                  onScan={(data: string, method: 'camera' | 'keyboard' | 'nfc') => {
                    console.log(`Detected via ${method}:`, data);
                    validateUser(data);
                  }}
                  enabled={checkInStatus === 'idle' && !isProcessing}
                />
              </div>

              {/* Búsqueda Manual */}
              <div className="max-w-md mx-auto">
                <form onSubmit={handleManualSearch} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      placeholder="Buscar por nombre, email o ID..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Buscar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Estado: VALIDATING */}
          {checkInStatus === 'validating' && (
            <div className="text-center">
              <div className="w-32 h-32 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
                <RefreshCw className="text-cyan-400 animate-spin" size={64} />
              </div>
              <h2 className="text-3xl font-bold mb-2">Validando...</h2>
              <p className="text-slate-400">Verificando ticket, formulario médico y datos</p>
            </div>
          )}

          {/* Estado: ERROR - Ticket inválido o deuda */}
          {checkInStatus === 'error' && validationResult && (
            <div className="text-center bg-red-500/10 border-2 border-red-500 rounded-3xl p-12 animate-pulse">
              <div className="w-32 h-32 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <XCircle className="text-red-500" size={64} />
              </div>
              <h2 className="text-4xl font-bold text-red-500 mb-4">ACCESO DENEGADO</h2>
              
              <div className="space-y-3 mb-8">
                {validationResult.errors.map((error, i) => (
                  <div key={i} className="bg-red-500/20 border border-red-500/50 rounded-xl px-6 py-3">
                    <p className="text-red-400 font-semibold">{error.message}</p>
                  </div>
                ))}
              </div>

              {validationResult.user && (
                <p className="text-slate-400 mb-6">
                  Usuario: {validationResult.user.nombre}
                </p>
              )}

              <button
                onClick={resetStation}
                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Siguiente Participante
              </button>
            </div>
          )}

          {/* Estado: ALREADY_CHECKED_IN - Ya registró asistencia hoy */}
          {checkInStatus === 'already_checked_in' && validationResult?.user && productInfo && (
            <div className="text-center bg-cyan-500/10 border-2 border-cyan-500 rounded-3xl p-12">
              <div className="w-32 h-32 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="text-cyan-400" size={64} />
              </div>
              <h2 className="text-3xl font-bold text-cyan-400 mb-2">YA REGISTRADO</h2>
              <p className="text-slate-300 text-xl mb-2">{validationResult.user.nombre}</p>
              <p className="text-slate-400 mb-8">Este participante ya hizo check-in hoy</p>

              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={() => setCheckInStatus('badge_print')}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all"
                >
                  <Printer size={24} />
                  Reimprimir Gafete
                </button>

                <button
                  onClick={resetStation}
                  className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Siguiente Participante
                </button>
              </div>
            </div>
          )}

          {/* Estado: MEDICAL_BLOCK - Falta formulario médico */}
          {checkInStatus === 'medical_block' && validationResult?.user && (
            <div className="text-center bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-12">
              <div className="w-32 h-32 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <AlertTriangle className="text-amber-500" size={64} />
              </div>
              <h2 className="text-4xl font-bold text-amber-500 mb-4">BLOQUEO MÉDICO</h2>
              <p className="text-slate-300 text-lg mb-2">{validationResult.user.nombre}</p>
              <p className="text-slate-400 mb-8">Falta completar el Cuestionario Médico</p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    // Abrir formulario médico en nueva pestaña con userId y visionId
                    window.open(`/formulario-medico?userId=${validationResult.user?.id}&visionId=${productInfo?.visionId}&emergency=true`, '_blank');
                  }}
                  className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors flex items-center gap-3"
                >
                  <FileText size={24} />
                  Llenar Ahora
                </button>

                <button
                  onClick={handleMedicalFormComplete}
                  className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Ya lo completó
                </button>
              </div>

              <button
                onClick={resetStation}
                className="mt-6 text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Estado: PHOTO_REQUIRED - Captura/Confirmación de foto */}
          {checkInStatus === 'photo_required' && validationResult?.user && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Camera className="text-purple-400" size={48} />
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {validationResult.requiresNewPhoto 
                    ? `📸 Foto de Check-in ${validationResult.checkInPhotoLabel || ''}` 
                    : 'Captura de Identidad'}
                </h2>
                <p className="text-slate-400">{validationResult.user.nombre}</p>
                {validationResult.requiresNewPhoto && (
                  <p className="text-amber-400 text-sm mt-2">
                    ⚠️ Se requiere nueva foto para este entrenamiento
                  </p>
                )}
              </div>

              {/* Si requiere nueva foto, siempre mostrar webcam */}
              {/* Si no requiere y ya tiene foto, mostrar opción de mantener */}
              {!validationResult.requiresNewPhoto && validationResult.user.hasPhoto && validationResult.user.profileImage ? (
                <div className="max-w-md mx-auto">
                  <div className="mb-6">
                    <p className="text-slate-300 mb-4">Foto actual del participante:</p>
                    <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-purple-500">
                      <img 
                        src={validationResult.user.profileImage} 
                        alt={validationResult.user.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setCheckInStatus('badge_print')}
                      className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-3"
                    >
                      <CheckCircle size={24} />
                      Continuar con esta foto
                    </button>
                    
                    <button
                      onClick={() => {
                        // Marcar que necesita nueva foto
                        setValidationResult(prev => prev ? {
                          ...prev,
                          user: { ...prev.user!, hasPhoto: false }
                        } : null);
                      }}
                      className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
                    >
                      <Camera size={20} />
                      Tomar nueva foto
                    </button>
                  </div>
                </div>
              ) : (
                <WebcamCapture
                  onCapture={handlePhotoCapture}
                  userName={validationResult.user.nombre}
                />
              )}

              <button
                onClick={resetStation}
                className="mt-6 text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Estado: BADGE_PRINT - Imprimir/Descargar/Grabar NFC gafete */}
          {checkInStatus === 'badge_print' && validationResult?.user && productInfo && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Printer className="text-purple-400" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-2">Asignar Gafete</h2>
                <p className="text-slate-400">Imprime, descarga o graba en NFC para <span className="text-white">{validationResult.user.nombre}</span></p>
              </div>

              {/* Preview del gafete CON botones de descarga/impresión/NFC */}
              <BadgePreview
                participant={{
                  id: validationResult.user.id,
                  name: validationResult.user.nombre,
                  nickname: validationResult.user.apodo,
                  role: validationResult.user.rol || (productInfo.levelType === 'BASIC' ? 'PARTICIPANTE' : 'ADVANCED'),
                  photoUrl: validationResult.user.profileImage,
                  referralCode: validationResult.user.referralCode
                }}
                organization={{
                  name: productInfo.organizationName,
                  logoUrl: productInfo.logoUrl,
                  brandColor: productInfo.brandColor
                }}
                product={{
                  id: productInfo.id,
                  name: productInfo.visionName || productInfo.name,
                  visionId: productInfo.visionId
                }}
                showButtons={true}
                showNFCOption={true}
                onNFCWrite={() => {
                  // Después de grabar NFC, ir a verificación
                  setCheckInStatus('qr_verification');
                }}
              />

              {/* Botón para continuar al escaneo DESPUÉS de imprimir/grabar */}
              <div className="mt-8 bg-slate-800/50 rounded-2xl p-6 max-w-md mx-auto">
                <p className="text-slate-400 text-sm mb-4">Una vez impreso/grabado y entregado el gafete:</p>
                <button
                  onClick={() => setCheckInStatus('qr_verification')}
                  className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  <Scan size={24} />
                  Continuar → Verificar Gafete
                </button>
              </div>

              <button
                onClick={resetStation}
                className="mt-6 text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Estado: QR_VERIFICATION - Verificar gafete (QR, Pistola o NFC) */}
          {checkInStatus === 'qr_verification' && validationResult?.user && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                  <Scan className="text-amber-400" size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verificar Gafete del Participante</h2>
                <p className="text-slate-400">
                  Pide a <span className="text-white font-semibold">{validationResult.user.nombre}</span> que presente su gafete
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  📷 Escanea QR • 🔫 Usa Scanner • 📱 Tap NFC
                </p>
              </div>

              {/* Omni Scanner para verificación */}
              <div className="max-w-md mx-auto mb-6">
                <OmniScanner 
                  onScan={(data: string, method: 'camera' | 'keyboard' | 'nfc') => {
                    console.log(`Verification scan via ${method}:`, data);
                    verifyParticipantQR(data);
                  }}
                  enabled={true}
                  expectedUserId={validationResult.user.id}
                  defaultScannerMode="gun"
                  autoActivateNFC={true}
                />
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCheckInStatus('badge_print')}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  ← Volver
                </button>
                <button
                  onClick={resetStation}
                  className="px-6 py-3 text-slate-500 hover:text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Estado: SUCCESS - Check-in completado */}
          {checkInStatus === 'success' && validationResult?.user && productInfo && (
            <div className="text-center">
              <div className="bg-green-500/10 border-2 border-green-500 rounded-3xl p-8 mb-8">
                <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-500" size={48} />
                </div>
                <h2 className="text-4xl font-bold text-green-400 mb-2">
                  ¡CHECK-IN EXITOSO!
                </h2>
                <p className="text-2xl text-white">{validationResult.user.nombre}</p>
                <p className="text-slate-400 mt-2">Asistencia registrada correctamente</p>
              </div>

              {/* Gafete SIN botones - solo preview */}
              <div className="mb-6">
                <BadgePreview
                  participant={{
                    id: validationResult.user.id,
                    name: validationResult.user.nombre,
                    nickname: validationResult.user.apodo,
                    role: validationResult.user.rol || (productInfo.levelType === 'BASIC' ? 'PARTICIPANTE' : 'ADVANCED'),
                    photoUrl: validationResult.user.profileImage,
                    referralCode: validationResult.user.referralCode
                  }}
                  organization={{
                    name: productInfo.organizationName,
                    logoUrl: productInfo.logoUrl,
                    brandColor: productInfo.brandColor
                  }}
                  product={{
                    name: productInfo.visionName || productInfo.name
                  }}
                  showButtons={false}
                />
              </div>

              <button
                onClick={resetStation}
                className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
              >
                Siguiente Participante
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
