'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Participant {
  id: number;
  oderId?: number;
  enrolledAt?: string;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
    referralCode?: string;
  };
  rol?: string; // For staff members
}

interface Vision {
  id: number;
  nombre: string;
}

interface NFCWriteQueue {
  userId: number;
  nombre: string;
  referralCode: string;
  status: 'pending' | 'writing' | 'success' | 'error';
  error?: string;
}

export default function BadgesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visionId = params.id as string;
  const levelParam = searchParams.get('level') || 'BASIC';

  const [vision, setVision] = useState<Vision | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [level, setLevel] = useState(levelParam);
  const [searchTerm, setSearchTerm] = useState('');

  // NFC States
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [nfcMode, setNfcMode] = useState(false);
  const [nfcQueue, setNfcQueue] = useState<NFCWriteQueue[]>([]);
  const [currentNfcIndex, setCurrentNfcIndex] = useState(0);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [nfcError, setNfcError] = useState('');
  const [nfcDebug, setNfcDebug] = useState(''); // DEBUG LOG VISUAL
  const nfcAbortRef = useRef<AbortController | null>(null);

  // Check NFC Support
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    
    if (!ios && 'NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [visionId, level]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vision info
      const visionRes = await fetch(`/api/school-admin/visiones/${visionId}`);
      if (visionRes.ok) {
        const visionData = await visionRes.json();
        setVision(visionData.vision);
      }

      // Fetch enrollments based on level
      let endpoint = `/api/school-admin/visiones/${visionId}/basic-enrollments`;
      if (level === 'ADVANCED') {
        endpoint = `/api/school-admin/visiones/${visionId}/advanced-enrollments`;
      } else if (level === 'PL') {
        endpoint = `/api/school-admin/visiones/${visionId}/pl-enrollments`;
      }
      
      const enrollRes = await fetch(endpoint);
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        // Combinar staff (GC + Trainer) con participantes para gafetes
        const staff = enrollData.staff || [];
        const enrollments = enrollData.enrollments || [];
        setParticipants([...staff, ...enrollments]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== NFC FUNCTIONS ==========
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

  const startNfcWriteMode = () => {
    const idsToWrite = Array.from(selectedIds);
    if (idsToWrite.length === 0) {
      alert('Selecciona al menos un participante para grabar NFC');
      return;
    }

    // Build queue from selected participants
    const queue: NFCWriteQueue[] = idsToWrite.map(userId => {
      const participant = participants.find(p => p.Usuario.id === userId);
      return {
        userId,
        nombre: participant?.Usuario.nombre || 'Desconocido',
        referralCode: participant?.Usuario.referralCode || `USER-${userId}`,
        status: 'pending'
      };
    });

    setNfcQueue(queue);
    setCurrentNfcIndex(0);
    setNfcMode(true);
    setNfcStatus('idle');
    setNfcError('');
  };

  // FUNCIÓN SIMPLIFICADA - SOLO WRITE DIRECTO
  const handleWriteNFC = async () => {
    setNfcDebug('1. Iniciando...');
    
    if (!('NDEFReader' in window)) {
      setNfcDebug('ERROR: NDEFReader no existe');
      alert('Tu dispositivo no soporta NFC');
      return;
    }
    setNfcDebug('2. NDEFReader existe');

    const currentItem = nfcQueue[currentNfcIndex];
    if (!currentItem) {
      setNfcDebug('ERROR: No hay item actual');
      return;
    }
    setNfcDebug('3. Item: ' + currentItem.referralCode);

    setNfcStatus('writing');
    setNfcError('');

    try {
      setNfcDebug('4. Creando NDEFReader...');
      const ndef = new (window as any).NDEFReader();
      
      setNfcDebug('5. ACERCA LA TARJETA Y MANTENLA...');
      
      // Write DIRECTO - según la spec, write() debe esperar la tarjeta
      // Usamos un AbortController con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setNfcDebug('TIMEOUT 60s - Intenta de nuevo');
        setNfcStatus('error');
        setNfcError('Timeout - no se detectó tarjeta');
      }, 60000);
      
      await ndef.write(
        {
          records: [
            {
              recordType: 'text',
              data: `USER:${currentItem.referralCode}`
            }
          ]
        },
        { 
          overwrite: true,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      setNfcDebug('6. ESCRITO OK!');
      
      // Vibrar para indicar éxito
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Marcar como exitoso
      setNfcQueue(prev => prev.map((item, idx) => 
        idx === currentNfcIndex ? { ...item, status: 'success' } : item
      ));
      
      setNfcStatus('success');
      
      // Pasar al siguiente después de un delay
      setTimeout(() => {
        const nextIndex = currentNfcIndex + 1;
        if (nextIndex < nfcQueue.length) {
          setCurrentNfcIndex(nextIndex);
          setNfcStatus('idle');
          setNfcError('');
          setNfcDebug('');
        } else {
          setNfcStatus('idle');
          setNfcDebug('COMPLETADO');
        }
      }, 1500);

    } catch (error: any) {
      setNfcDebug('ERROR: ' + error.name + ' - ' + error.message);
      setNfcError(error.message || 'Error de NFC');
      setNfcStatus('error');
    }
  };

  const exitNfcMode = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcMode(false);
    setNfcQueue([]);
    setCurrentNfcIndex(0);
    setNfcStatus('idle');
    setNfcError('');
  };
  // ========== END NFC FUNCTIONS ==========

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredParticipants;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.Usuario.id)));
    }
  };

  const generatePDF = async (all: boolean = false) => {
    setGenerating(true);
    try {
      const ids = all 
        ? participants.map(p => p.Usuario.id)
        : Array.from(selectedIds);
      
      if (ids.length === 0) {
        alert('Selecciona al menos un participante');
        setGenerating(false);
        return;
      }

      const queryParams = new URLSearchParams({
        level,
        userIds: ids.join(','),
      });

      const response = await fetch(`/api/school-admin/visiones/${visionId}/badges-pdf?${queryParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gafetes-${level.toLowerCase()}-${vision?.nombre?.replace(/\s+/g, '-') || 'vision'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(error.message || 'Error al generar los gafetes');
    } finally {
      setGenerating(false);
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.Usuario && (
      p.Usuario.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Usuario.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const levelColors = {
    BASIC: {
      bg: 'from-green-900/30 to-slate-900/50',
      border: 'border-green-500/30',
      text: 'text-green-300',
      button: 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500',
      accent: 'bg-green-500/20',
    },
    ADVANCED: {
      bg: 'from-orange-900/30 to-slate-900/50',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      button: 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500',
      accent: 'bg-orange-500/20',
    },
    PL: {
      bg: 'from-purple-900/30 to-slate-900/50',
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      button: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
      accent: 'bg-purple-500/20',
    },
  };

  const colors = levelColors[level as keyof typeof levelColors] || levelColors.BASIC;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/school-admin/vision/${visionId}/manage`}
              className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                🪪 Generador de Gafetes
              </h1>
              <p className="text-slate-400 mt-1">
                {vision?.nombre || 'Cargando...'} - Nivel {level === 'BASIC' ? 'Básico' : level === 'ADVANCED' ? 'Avanzado' : 'Liderazgo'}
              </p>
            </div>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setLevel('BASIC'); setSelectedIds(new Set()); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              level === 'BASIC'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            🌱 Nivel Básico
          </button>
          <button
            onClick={() => { setLevel('ADVANCED'); setSelectedIds(new Set()); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              level === 'ADVANCED'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            🔥 Nivel Avanzado
          </button>
          <button
            onClick={() => { setLevel('PL'); setSelectedIds(new Set()); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              level === 'PL'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            👑 Liderazgo
          </button>
        </div>

        {/* Actions Bar */}
        <div className={`bg-gradient-to-br ${colors.bg} rounded-xl ${colors.border} border-2 p-4 mb-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar participante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2 pl-10 w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Select All */}
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                {selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0 ? (
                  <>
                    <span className="text-cyan-400">☑</span> Deseleccionar todos
                  </>
                ) : (
                  <>
                    <span>☐</span> Seleccionar todos
                  </>
                )}
              </button>

              <span className={`${colors.text} font-medium`}>
                {selectedIds.size} seleccionado(s) de {filteredParticipants.length}
              </span>
            </div>

            <div className="flex gap-3">
              {/* Print Selected */}
              <button
                onClick={() => generatePDF(false)}
                disabled={generating || selectedIds.size === 0}
                className={`px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <span>🖨️</span> Imprimir Seleccionados ({selectedIds.size})
                  </>
                )}
              </button>

              {/* Print All */}
              <button
                onClick={() => generatePDF(true)}
                disabled={generating || participants.length === 0}
                className={`px-6 py-3 bg-gradient-to-r ${colors.button} text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <span>📄</span> Imprimir Todos ({participants.length})
                  </>
                )}
              </button>

              {/* NFC Write Button */}
              {nfcSupported && (
                <button
                  onClick={startNfcWriteMode}
                  disabled={selectedIds.size === 0}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>📡</span> Grabar NFC ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* NFC Mode Modal - Usa el componente NFCWriter que SÍ FUNCIONA */}
        {nfcMode && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-cyan-500/50 max-w-2xl w-full p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                  <span className="text-3xl">📡</span> Grabador NFC de Gafetes
                </h2>
                <button
                  onClick={exitNfcMode}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progreso</span>
                  <span>{nfcQueue.filter(q => q.status === 'success').length} de {nfcQueue.length}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${(nfcQueue.filter(q => q.status === 'success').length / nfcQueue.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* DEBUG LOG - VISIBLE */}
              {nfcDebug && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 font-mono text-sm">🔍 {nfcDebug}</p>
                </div>
              )}

              {/* Si ya terminamos todos */}
              {nfcQueue.every(q => q.status === 'success') ? (
                <div className="p-6 rounded-xl mb-6 text-center bg-green-500/20 border border-green-500/50">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-xl font-bold text-green-300">¡Todos los gafetes han sido grabados!</p>
                </div>
              ) : (
                /* UI de NFC - COPIA de BadgePreview que SÍ funciona */
                <div className="p-6 rounded-xl mb-6 text-center bg-slate-700/50 border border-slate-600/50">
                  {nfcStatus === 'idle' && (
                    <>
                      <div className="text-6xl mb-4">📲</div>
                      <p className="text-xl font-bold text-cyan-300 mb-2">
                        {nfcQueue[currentNfcIndex]?.nombre}
                      </p>
                      <p className="text-slate-400 text-sm mb-4 font-mono">
                        {nfcQueue[currentNfcIndex]?.referralCode}
                      </p>
                      <button
                        onClick={handleWriteNFC}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30"
                      >
                        📱 Grabar Gafete NFC
                      </button>
                    </>
                  )}
                  
                  {nfcStatus === 'writing' && (
                    <div className="animate-pulse">
                      <div className="text-6xl mb-4">📡</div>
                      <p className="text-xl font-bold text-amber-300">Acerca el gafete NFC...</p>
                      <p className="text-slate-300 mt-2">Coloca la tarjeta en la parte trasera del dispositivo</p>
                      <p className="text-slate-500 text-sm mt-2">Mantén la tarjeta quieta hasta que termine</p>
                    </div>
                  )}
                  
                  {nfcStatus === 'success' && (
                    <>
                      <div className="text-6xl mb-4">✅</div>
                      <p className="text-xl font-bold text-green-300">¡Gafete grabado!</p>
                      <p className="text-amber-400 font-medium mt-2">⚠️ RETIRA LA TARJETA</p>
                      <p className="text-slate-400 text-sm mt-2">Continuando al siguiente...</p>
                    </>
                  )}
                  
                  {nfcStatus === 'error' && (
                    <>
                      <div className="text-6xl mb-4">❌</div>
                      <p className="text-xl font-bold text-red-300">Error</p>
                      <p className="text-slate-400 mt-2">{nfcError}</p>
                      <div className="flex gap-3 justify-center mt-4">
                        <button
                          onClick={handleWriteNFC}
                          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-all"
                        >
                          🔄 Reintentar
                        </button>
                        <button
                          onClick={() => {
                            const nextIndex = currentNfcIndex + 1;
                            if (nextIndex < nfcQueue.length) {
                              setCurrentNfcIndex(nextIndex);
                              setNfcStatus('idle');
                              setNfcError('');
                            }
                          }}
                          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all"
                        >
                          ⏭️ Saltar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Queue List */}
              <div className="max-h-40 overflow-y-auto space-y-2 mb-6 mt-6">
                {nfcQueue.map((item, idx) => (
                  <div 
                    key={item.userId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx === currentNfcIndex && !nfcQueue.every(q => q.status === 'success')
                        ? 'bg-cyan-500/20 border border-cyan-500/50' 
                        : item.status === 'success'
                        ? 'bg-green-500/10 border border-green-500/30'
                        : item.status === 'error'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : 'bg-slate-800/50 border border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {item.status === 'success' ? '✅' : 
                         item.status === 'error' ? '❌' : 
                         idx === currentNfcIndex ? '📲' : '⏳'}
                      </span>
                      <div>
                        <p className="font-medium text-white">{item.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.referralCode}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      item.status === 'success' ? 'text-green-400' :
                      item.status === 'error' ? 'text-red-400' :
                      idx === currentNfcIndex ? 'text-cyan-400' : 'text-slate-500'
                    }`}>
                      {item.status === 'success' ? 'Grabado' :
                       item.status === 'error' ? 'Error' :
                       idx === currentNfcIndex ? 'Actual' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={exitNfcMode}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* NFC Not Supported Warning */}
        {!nfcSupported && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-300">NFC no disponible</p>
              <p className="text-sm text-slate-400">
                {isIOS 
                  ? 'iOS no permite escribir NFC desde el navegador. Usa un dispositivo Android con Chrome para grabar gafetes NFC.'
                  : 'Tu navegador no soporta Web NFC. Usa Chrome en Android para grabar gafetes NFC.'}
              </p>
            </div>
          </div>
        )}

        {/* Participants Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className={`bg-gradient-to-br ${colors.bg} rounded-xl ${colors.border} border-2 p-12 text-center`}>
            <div className="text-6xl mb-4">🪪</div>
            <p className="text-slate-400 text-lg">No hay participantes registrados en este nivel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredParticipants.map((participant) => {
              const isSelected = selectedIds.has(participant.Usuario.id);
              const isStaff = participant.rol === 'TRAINER' || participant.rol === 'GAME CHANGER';
              return (
                <div
                  key={participant.id}
                  onClick={() => toggleSelect(participant.Usuario.id)}
                  className={`
                    relative cursor-pointer rounded-xl p-4 transition-all duration-200
                    ${isStaff 
                      ? isSelected 
                        ? 'bg-gradient-to-br from-red-900/50 to-slate-900/50 border-red-500/50 border-2 shadow-lg scale-[1.02]'
                        : 'bg-gradient-to-br from-red-900/30 to-slate-900/50 border border-red-500/30 hover:border-red-500/50'
                      : isSelected 
                        ? `bg-gradient-to-br ${colors.bg} ${colors.border} border-2 shadow-lg scale-[1.02]` 
                        : 'bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50'
                    }
                  `}
                >
                  {/* Selection indicator */}
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected 
                      ? isStaff 
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                        : `bg-gradient-to-r ${colors.button} text-white`
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </div>

                  {/* Role Badge for Staff */}
                  {isStaff && (
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        participant.rol === 'TRAINER' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-red-500/80 text-white'
                      }`}>
                        {participant.rol === 'TRAINER' ? '🎯 TRAINER' : '🔥 GC'}
                      </span>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={`w-16 h-16 rounded-full ${isStaff ? 'bg-red-500/20' : colors.accent} flex items-center justify-center text-2xl mb-3 mx-auto ${isStaff ? 'mt-6' : ''}`}>
                    {participant.Usuario.nombre?.charAt(0).toUpperCase() || '?'}
                  </div>

                  {/* Name */}
                  <h3 className={`font-bold text-center truncate ${isStaff ? 'text-red-300' : isSelected ? colors.text : 'text-white'}`}>
                    {participant.Usuario.nombre}
                  </h3>

                  {/* Email */}
                  <p className="text-slate-400 text-sm text-center truncate mt-1">
                    {participant.Usuario.email}
                  </p>

                  {/* Referral Code */}
                  {participant.Usuario.referralCode && (
                    <p className="text-slate-500 text-xs text-center mt-2 font-mono">
                      {participant.Usuario.referralCode}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-cyan-300 mb-3">📋 Instrucciones de Impresión</h3>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>El PDF genera gafetes con el <strong>frente</strong> (nombre y nivel) y <strong>reverso</strong> (código QR) en páginas separadas.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Para impresión <strong>duplex</strong>: Configura tu impresora para voltear por el borde corto.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Se generan <strong>8 gafetes por página</strong> (2 columnas x 4 filas).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Los gafetes incluyen el <strong>color institucional</strong> y <strong>nombre de la organización</strong>.</span>
            </li>
          </ul>

          {/* NFC Instructions */}
          <h3 className="text-lg font-bold text-cyan-300 mb-3 mt-6">📡 Instrucciones de Grabado NFC</h3>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span><strong>Requisitos:</strong> Navegador Chrome en dispositivo Android con NFC habilitado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Selecciona los participantes y presiona <strong>"Grabar NFC"</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Acerca cada gafete NFC al dispositivo cuando se indique. El sistema avanzará automáticamente al siguiente.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Los gafetes NFC grabarán la <strong>URL de perfil</strong> del participante y sus datos de identificación.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>Si hay error, puedes <strong>Reintentar</strong> o <strong>Saltar</strong> al siguiente gafete.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
