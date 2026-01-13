'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Users, 
  UserPlus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  QrCode,
  Smartphone,
  Shield,
  ArrowLeft,
  Loader2,
  Crown,
  Sparkles,
  Camera,
  ImageIcon
} from 'lucide-react';

interface Member {
  id: string;
  user: {
    id: number;
    nombre: string;
    imagen?: string;
    email?: string;
  };
  wasMoved?: boolean;
  isExisting?: boolean;
}

interface Squad {
  id: string;
  name: string;
  level: string;
  maxSize: number;
  membersCount: number;
  members?: Member[];
  leader?: {
    id: number;
    nombre: string;
    imagen?: string;
  };
}

interface Vision {
  id: number;
  nombre: string;
  assignedLevels?: string[]; // Niveles asignados al GC para esta visión
}

interface OrgInfo {
  name: string;
  logoUrl: string | null;
}

type ScannerMode = 'idle' | 'scanning' | 'processing';

export default function SquadBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const visionId = searchParams.get('visionId');
  const level = searchParams.get('level') || 'BASIC';
  
  // States
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [selectedVisionId, setSelectedVisionId] = useState<string>(visionId || '');
  const [selectedLevel, setSelectedLevel] = useState<string>(level);
  const [loading, setLoading] = useState(true);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('idle');
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<{name: string; success: boolean} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [conflictData, setConflictData] = useState<{
    currentGroup: { id: string; name: string; leaderName: string };
    user: { id: number; nombre: string; };
    referralCode?: string;
  } | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo>({ name: '', logoUrl: null });
  
  // Vibration helper
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Load organization info
  useEffect(() => {
    const fetchOrgInfo = async () => {
      try {
        // Obtener la organización del usuario directamente
        const res = await fetch('/api/organization/me');
        if (res.ok) {
          const org = await res.json();
          console.log('🏢 Org data:', org);
          if (org && org.name) {
            setOrgInfo({
              name: org.name || '',
              logoUrl: org.logoUrl || null,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching org info:', err);
      }
    };
    fetchOrgInfo();
  }, []);

  // Load available visions
  useEffect(() => {
    const fetchVisions = async () => {
      try {
        const res = await fetch('/api/vision/available');
        if (res.ok) {
          const data = await res.json();
          setVisions(data.visions || []);
        }
      } catch (err) {
        console.error('Error fetching visions:', err);
      }
    };
    fetchVisions();
  }, []);

  // Load or create squad when vision/level changes
  useEffect(() => {
    if (!selectedVisionId) {
      setLoading(false);
      return;
    }

    const fetchOrCreateSquad = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to get existing squad with members
        const res = await fetch(`/api/squads?visionId=${selectedVisionId}&level=${selectedLevel}&includeMembers=true`);
        const data = await res.json();
        
        console.log('📦 Squad data:', data);
        
        if (data.success && data.squads?.length > 0) {
          // Find my squad (as leader)
          const mySquad = data.squads.find((s: Squad) => s.leader?.id === session?.user?.id);
          if (mySquad) {
            console.log('✅ My squad found:', mySquad);
            setSquad(mySquad);
            setMembers(mySquad.members || []);
          } else {
            // No squad yet, will create on first scan
            setSquad(null);
            setMembers([]);
          }
        } else {
          setSquad(null);
          setMembers([]);
        }
      } catch (err) {
        console.error('Error fetching squad:', err);
        setError('Error al cargar escuadrón');
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateSquad();
  }, [selectedVisionId, selectedLevel, session?.user?.id]);

  // Create squad if doesn't exist
  const ensureSquad = async (): Promise<Squad | null> => {
    if (squad) return squad;
    
    try {
      console.log('Creating squad with:', { visionId: selectedVisionId, level: selectedLevel });
      
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: parseInt(selectedVisionId),
          level: selectedLevel,
        }),
      });
      
      const data = await res.json();
      console.log('Squad creation response:', data);
      
      if (data.success) {
        setSquad(data.squad);
        return data.squad;
      } else {
        // Mostrar el error específico del servidor
        setError(data.error || 'Error al crear escuadrón');
        return null;
      }
    } catch (err) {
      console.error('Error creating squad:', err);
      setError('Error de conexión al crear escuadrón');
      return null;
    }
  };

  // Add member by code
  const addMemberByCode = async (code: string, force: boolean = false) => {
    setScannerMode('processing');
    setError(null);
    setConflictData(null);
    
    try {
      // Ensure we have a squad
      const currentSquad = await ensureSquad();
      if (!currentSquad) {
        setError('No se pudo crear el escuadrón');
        vibrate([200, 100, 200]); // Error pattern
        return;
      }

      const res = await fetch(`/api/squads/${currentSquad.id}/add-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: code,
          forceMove: force,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.code === 'ALREADY_IN_GROUP' && data.conflictData) {
          setConflictData({
            ...data.conflictData,
            referralCode: code,
          });
          vibrate([100, 50, 100]); // Attention pattern
        } else if (data.code === 'GROUP_FULL') {
          setError('¡Grupo lleno! Inicia un nuevo escuadrón.');
          vibrate([200, 100, 200]);
        } else {
          setError(data.error || 'Error al agregar');
          vibrate([200, 100, 200]);
        }
        return;
      }

      // Success!
      vibrate(50); // Success vibration
      setLastScanned({ name: data.member.user.nombre, success: true });
      
      // Update members list
      if (!data.member.isExisting) {
        setMembers(prev => [...prev, data.member]);
      }
      
      // Update squad stats
      if (data.squadStats) {
        setSquad(prev => prev ? {
          ...prev,
          membersCount: data.squadStats.membersCount,
        } : null);
      }

      // Clear success message after 2s
      setTimeout(() => setLastScanned(null), 2000);
      
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Error de conexión');
      vibrate([200, 100, 200]);
    } finally {
      setScannerMode('idle');
      setManualCode('');
    }
  };

  // Handle force move (steal player)
  const handleForceMove = async () => {
    if (!conflictData?.referralCode) return;
    await addMemberByCode(conflictData.referralCode, true);
    setConflictData(null);
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    if (!squad) return;

    try {
      const res = await fetch(`/api/squads/${squad.id}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        setSquad(prev => prev ? {
          ...prev,
          membersCount: Math.max(0, prev.membersCount - 1),
        } : null);
        vibrate(30);
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      addMemberByCode(manualCode.trim());
    }
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Cargando Átomos...</p>
        </div>
      </div>
    );
  }

  // No vision selected
  if (!selectedVisionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-4">
        <div className="max-w-lg mx-auto pt-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader className="text-center">
              {orgInfo.logoUrl ? (
                <img 
                  src={orgInfo.logoUrl} 
                  alt={orgInfo.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              )}
              <CardTitle className="text-2xl text-white">{orgInfo.name ? `${orgInfo.name} Átomos` : 'Átomos'}</CardTitle>
              <CardDescription className="text-white/70">
                Selecciona una Visión para armar tu Átomo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white"
                value={selectedVisionId}
                onChange={(e) => {
                  const newVisionId = e.target.value;
                  setSelectedVisionId(newVisionId);
                  // Auto-seleccionar el primer nivel disponible para esta visión
                  if (newVisionId) {
                    const vision = visions.find(v => v.id.toString() === newVisionId);
                    const levels = vision?.assignedLevels || ['BASIC'];
                    const levelOrder = ['BASIC', 'ADVANCED', 'PL'];
                    const firstAvailable = levelOrder.find(l => levels.includes(l)) || 'BASIC';
                    setSelectedLevel(firstAvailable);
                  }
                }}
              >
                <option value="" className="text-gray-900">Seleccionar Visión...</option>
                {visions.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">
                    {v.nombre}
                  </option>
                ))}
              </select>

              {(() => {
                // Si no hay visión seleccionada, no mostrar botones de nivel
                if (!selectedVisionId) {
                  return null;
                }
                
                // Obtener los niveles asignados para la visión seleccionada
                const selectedVision = visions.find(v => v.id.toString() === selectedVisionId);
                const availableLevels = selectedVision?.assignedLevels || [];
                
                // Si no hay niveles asignados, no mostrar nada
                if (availableLevels.length === 0) {
                  return (
                    <div className="text-center text-amber-400 text-sm p-3 bg-amber-500/10 rounded-lg">
                      No tienes niveles asignados para esta visión
                    </div>
                  );
                }
                
                const levelOrder = ['BASIC', 'ADVANCED', 'PL'];
                const sortedLevels = levelOrder.filter(l => availableLevels.includes(l));
                
                return (
                  <div className={`grid gap-2 ${sortedLevels.length === 1 ? 'grid-cols-1' : sortedLevels.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {sortedLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all ${
                          selectedLevel === lvl
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {lvl === 'BASIC' ? 'Básico' : lvl === 'ADVANCED' ? 'Avanzado' : 'PL'}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {selectedVisionId && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={() => router.push(`/dashboard/game-changer/squads?visionId=${selectedVisionId}&level=${selectedLevel}`)}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Iniciar Átomo Builder
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              {squad?.name || 'Mi Átomo'}
            </h1>
            <p className="text-xs text-white/60">
              {selectedLevel === 'BASIC' ? 'Básico' : selectedLevel === 'ADVANCED' ? 'Avanzado' : 'PL'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white">
              <Users className="w-5 h-5" />
              <span className="font-mono font-bold">
                {squad?.membersCount || members.length}/{squad?.maxSize || 10}
              </span>
            </div>
            
            {/* Botón Terminar */}
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/gamechanger')}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Listo
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 pb-32">
        {/* Success Toast */}
        {lastScanned && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg animate-bounce ${
            lastScanned.success ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <div className="flex items-center gap-2 text-white font-medium">
              {lastScanned.success ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {lastScanned.name} {lastScanned.success ? '¡agregado!' : 'error'}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Conflict Modal (Player Stealing) */}
        {conflictData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <Card className="w-full max-w-sm bg-gradient-to-br from-orange-500 to-red-600 border-none">
              <CardContent className="p-6 text-center text-white">
                <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                <h3 className="text-xl font-bold mb-2">¡Cambio de Jugador!</h3>
                <p className="text-white/90 mb-4">
                  <strong>{conflictData.user.nombre}</strong> está en el Átomo de{' '}
                  <strong>{conflictData.currentGroup.leaderName}</strong>
                </p>
                <p className="text-sm text-white/70 mb-6">
                  ¿Quieres transferirlo a tu Átomo?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    onClick={() => setConflictData(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold"
                    onClick={handleForceMove}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    ¡Transferirlo!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3 mb-6">
          <h2 className="text-white/80 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Miembros del Átomo
          </h2>
          
          {members.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Escanea participantes para agregarlos</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/10"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {member.user.imagen ? (
                      <img 
                        src={member.user.imagen} 
                        alt={member.user.nombre}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      member.user.nombre?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {member.user.nombre}
                    </p>
                    {member.wasMoved && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                        <Zap className="w-3 h-3 mr-1" />
                        Transferido
                      </Badge>
                    )}
                  </div>
                  <span className="text-white/40 font-mono text-sm">
                    #{index + 1}
                  </span>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Scanner Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent pt-8 pb-6 px-4">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Manual Code Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Código de participante..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 uppercase"
              disabled={scannerMode === 'processing'}
            />
            <Button
              type="submit"
              disabled={!manualCode.trim() || scannerMode === 'processing'}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {scannerMode === 'processing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </Button>
          </form>

          {/* Scanner Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setShowQRScanner(true)}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear QR
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => {/* TODO: Implement NFC */}}
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Leer NFC
            </Button>
          </div>

          {/* Squad Full Warning */}
          {squad && squad.membersCount >= squad.maxSize && (
            <div className="text-center py-2 px-4 rounded-lg bg-orange-500/20 border border-orange-500/50">
              <p className="text-orange-300 text-sm font-medium">
                ⚠️ Átomo lleno - Inicia uno nuevo para seguir agregando
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal 
          onScan={(code) => {
            setShowQRScanner(false);
            addMemberByCode(code);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}

// Componente de Scanner QR con fallback para iOS
function QRScannerModal({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar cámara
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    setError(null);
    try {
      // Esperar a que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const scanner = new Html5Qrcode('qr-reader-modal');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Éxito - vibrar y callback
          if (navigator.vibrate) navigator.vibrate(100);
          stopCamera();
          onScan(decodedText);
        },
        () => {} // Ignorar errores de frames sin QR
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      // En iOS/Safari sin HTTPS, mostrar opción de archivo
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('https')) {
        setError('No se pudo acceder a la cámara. Usa la opción de foto.');
        setMode('file');
      } else {
        setError('Error al iniciar cámara: ' + (err.message || 'Error desconocido'));
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setIsScanning(false);
  };

  // Manejar selección de archivo/foto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode('qr-file-scanner');
      const result = await scanner.scanFile(file, true);
      
      if (navigator.vibrate) navigator.vibrate(100);
      onScan(result);
    } catch (err) {
      console.error('QR scan error:', err);
      setError('No se encontró un código QR válido en la imagen');
    } finally {
      setProcessingFile(false);
      // Limpiar input para permitir re-selección del mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h2 className="text-white text-lg font-semibold">Escanear Código QR</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2 p-4">
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('camera')}
          className={mode === 'camera' ? 'bg-purple-600' : 'bg-white/10 border-white/20 text-white'}
        >
          <Camera className="w-4 h-4 mr-2" />
          Cámara
        </Button>
        <Button
          variant={mode === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { stopCamera(); setMode('file'); }}
          className={mode === 'file' ? 'bg-purple-600' : 'bg-white/10 border-white/20 text-white'}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Foto
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {mode === 'camera' ? (
          <div className="w-full max-w-sm">
            {/* Camera viewer */}
            <div 
              id="qr-reader-modal" 
              className="w-full rounded-2xl overflow-hidden bg-slate-900"
              style={{ minHeight: '300px' }}
            />
            
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
            
            {!isScanning && !error && (
              <div className="mt-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                <p className="text-white/70 text-sm mt-2">Iniciando cámara...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm text-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              id="qr-file-input"
            />
            
            {/* Div oculto para el scanner de archivo */}
            <div id="qr-file-scanner" className="hidden" />

            {/* Photo capture button */}
            <label 
              htmlFor="qr-file-input"
              className="block cursor-pointer"
            >
              <div className="w-48 h-48 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-dashed border-purple-400/50 flex flex-col items-center justify-center hover:border-purple-400 transition-colors">
                {processingFile ? (
                  <>
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <p className="text-white/70 text-sm mt-3">Analizando...</p>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-purple-400" />
                    <p className="text-white text-sm mt-3 font-medium">Tomar Foto</p>
                    <p className="text-white/50 text-xs mt-1">o seleccionar imagen</p>
                  </>
                )}
              </div>
            </label>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <p className="text-white/50 text-xs mt-6">
              📱 En iPhone: toca para abrir la cámara y toma una foto del código QR
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
