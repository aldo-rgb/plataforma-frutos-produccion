'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageCircle, Phone, QrCode, X, Check, 
  Clock, Loader2, UserPlus, AlertTriangle
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadBuddyData();
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

  const startScanning = async () => {
    setShowScanModal(true);
    setScanError(null);
    setScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setScanError('No se pudo acceder a la cámara');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowScanModal(false);
    setScanning(false);
  };

  const handleScanResult = async (userId: string) => {
    stopScanning();
    setProcessing(true);
    
    try {
      const res = await fetch('/api/buddy/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scannedUserId: userId })
      });
      
      const json = await res.json();
      
      if (json.success && json.canConnect) {
        setScannedUser(json.targetUser);
        setShowConfirmModal(true);
      } else {
        setScanError(json.error || 'Error al escanear');
        setShowScanModal(true);
      }
    } catch {
      setScanError('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualScan = async () => {
    const userId = prompt('ID del usuario a conectar (para pruebas):');
    if (userId) {
      await handleScanResult(userId);
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
            onClick={startScanning}
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
        <button onClick={startScanning} className="w-full mt-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium transition-colors flex items-center justify-center gap-2">
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

      <button onClick={startScanning} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30">
        <QrCode className="w-5 h-5" /> ESCANEAR GAFETE DE MI BUDDY
      </button>
      <button onClick={handleManualScan} className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-slate-400">(Prueba: ingresar ID manual)</button>
      {renderModals()}
    </motion.div>
  );

  function renderModals() {
    return (
      <>
        <AnimatePresence>
          {showScanModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Escanear Gafete</h3>
                  <button onClick={stopScanning} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                {scanError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400">{scanError}</p>
                    <button onClick={() => { setScanError(null); startScanning(); }} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Reintentar</button>
                  </div>
                ) : (
                  <>
                    <div className="aspect-square bg-black rounded-xl overflow-hidden mb-4">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm text-slate-400 text-center">Apunta al código QR del gafete</p>
                    <button onClick={handleManualScan} className="w-full mt-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Ingresar ID manual (pruebas)</button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
