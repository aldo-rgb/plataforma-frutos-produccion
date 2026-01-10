'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Sparkles
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
  const [conflictData, setConflictData] = useState<{
    currentGroup: { id: string; name: string; leaderName: string };
    user: { id: number; nombre: string; };
    referralCode?: string;
  } | null>(null);
  
  // Vibration helper
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

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
        // Try to get existing squad
        const res = await fetch(`/api/squads?visionId=${selectedVisionId}&level=${selectedLevel}`);
        const data = await res.json();
        
        if (data.success && data.squads?.length > 0) {
          // Find my squad (as leader)
          const mySquad = data.squads.find((s: Squad) => s.leader?.id === session?.user?.id);
          if (mySquad) {
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
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: parseInt(selectedVisionId),
          level: selectedLevel,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setSquad(data.squad);
        return data.squad;
      }
      return null;
    } catch (err) {
      console.error('Error creating squad:', err);
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
          <p>Cargando Quantum Squads...</p>
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
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Quantum Squads</CardTitle>
              <CardDescription className="text-white/70">
                Selecciona una Visión para armar tu escuadrón
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white"
                value={selectedVisionId}
                onChange={(e) => setSelectedVisionId(e.target.value)}
              >
                <option value="" className="text-gray-900">Seleccionar Visión...</option>
                {visions.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">
                    {v.nombre}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                {['BASIC', 'ADVANCED', 'PL'].map((lvl) => (
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

              {selectedVisionId && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={() => router.push(`/dashboard/game-changer/squads?visionId=${selectedVisionId}&level=${selectedLevel}`)}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Iniciar Squad Builder
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
              {squad?.name || 'Mi Escuadrón'}
            </h1>
            <p className="text-xs text-white/60">
              {selectedLevel === 'BASIC' ? 'Básico' : selectedLevel === 'ADVANCED' ? 'Avanzado' : 'PL'}
            </p>
          </div>

          <div className="flex items-center gap-1 text-white">
            <Users className="w-5 h-5" />
            <span className="font-mono font-bold">
              {squad?.membersCount || members.length}/{squad?.maxSize || 10}
            </span>
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
                <h3 className="text-xl font-bold mb-2">¡Robo de Jugador!</h3>
                <p className="text-white/90 mb-4">
                  <strong>{conflictData.user.nombre}</strong> está en el escuadrón de{' '}
                  <strong>{conflictData.currentGroup.leaderName}</strong>
                </p>
                <p className="text-sm text-white/70 mb-6">
                  ¿Quieres moverlo a tu escuadrón?
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
                    ¡Robarlo!
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
            Miembros del Escuadrón
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
                        Robado
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
              placeholder="Código de referido..."
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
              onClick={() => {/* TODO: Implement QR scanner */}}
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
                ⚠️ Escuadrón lleno - Inicia uno nuevo para seguir agregando
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
