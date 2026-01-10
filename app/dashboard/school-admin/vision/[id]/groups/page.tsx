'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronDown,
  GripVertical,
  Loader2,
  Eye,
  Crown,
  Ghost,
  ArrowLeft,
  Zap,
  Grid3X3,
  LayoutList
} from 'lucide-react';

interface Member {
  id: string;
  user: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  joinedAt: string;
}

interface Squad {
  id: string;
  name: string;
  level: string;
  maxSize: number;
  isActive: boolean;
  leader: {
    id: number;
    nombre: string;
    imagen?: string;
  };
  members: Member[];
  _count?: {
    members: number;
  };
}

interface Orphan {
  enrollmentId: number;
  userId: number;
  level: string;
  user: {
    id: number;
    nombre: string;
    imagen?: string;
    telefono?: string;
  };
}

interface Stats {
  totalParticipants: number;
  assignedToGroups: number;
  orphans: number;
  groups: Array<{
    id: string;
    name: string;
    leaderName: string;
    membersCount: number;
    maxSize: number;
  }>;
}

type ViewMode = 'grid' | 'list';

export default function VisionGroupsGodModePage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const visionId = params.id as string;
  const levelParam = searchParams.get('level') || 'BASIC';
  
  // States
  const [stats, setStats] = useState<Stats | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>(levelParam);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());
  const [draggedOrphan, setDraggedOrphan] = useState<Orphan | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch stats and orphans in parallel
      const [statsRes, orphansRes, squadsRes] = await Promise.all([
        fetch(`/api/squads/vision/${visionId}/stats?level=${selectedLevel}`),
        fetch(`/api/squads/vision/${visionId}/orphans?level=${selectedLevel}`),
        fetch(`/api/squads?visionId=${visionId}&level=${selectedLevel}&includeMembers=true`),
      ]);

      const [statsData, orphansData, squadsData] = await Promise.all([
        statsRes.json(),
        orphansRes.json(),
        squadsRes.json(),
      ]);

      if (statsData.success) {
        setStats(statsData);
      }
      
      if (orphansData.success) {
        setOrphans(orphansData.orphans || []);
      }
      
      if (squadsData.success) {
        setSquads(squadsData.squads || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [visionId, selectedLevel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle squad expansion
  const toggleSquad = (squadId: string) => {
    setExpandedSquads(prev => {
      const next = new Set(prev);
      if (next.has(squadId)) {
        next.delete(squadId);
      } else {
        next.add(squadId);
      }
      return next;
    });
  };

  // Assign orphan to squad
  const assignOrphan = async (orphan: Orphan, squadId: string) => {
    setAssigning(squadId);
    
    try {
      const res = await fetch('/api/squads/assign-orphan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId,
          userId: orphan.userId,
          enrollmentId: orphan.enrollmentId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from orphans list
        setOrphans(prev => prev.filter(o => o.userId !== orphan.userId));
        
        // Update squad member count
        setSquads(prev => prev.map(s => {
          if (s.id === squadId) {
            return {
              ...s,
              members: [...(s.members || []), {
                id: data.member.id,
                user: orphan.user,
                joinedAt: new Date().toISOString(),
              }],
              _count: {
                members: (s._count?.members || s.members?.length || 0) + 1,
              },
            };
          }
          return s;
        }));

        // Update stats
        if (stats) {
          setStats({
            ...stats,
            orphans: stats.orphans - 1,
            assignedToGroups: stats.assignedToGroups + 1,
          });
        }
      } else {
        setError(data.error || 'Error al asignar');
      }
    } catch (err) {
      console.error('Error assigning orphan:', err);
      setError('Error de conexión');
    } finally {
      setAssigning(null);
      setDraggedOrphan(null);
    }
  };

  // Drag handlers
  const handleDragStart = (orphan: Orphan) => {
    setDraggedOrphan(orphan);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, squadId: string) => {
    e.preventDefault();
    if (draggedOrphan) {
      assignOrphan(draggedOrphan, squadId);
    }
  };

  // Filter orphans by search
  const filteredOrphans = orphans.filter(o =>
    o.user.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Cargando God Mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  God Mode - Escuadrones
                </h1>
                <p className="text-sm text-gray-500">
                  Visión #{visionId} • {selectedLevel === 'BASIC' ? 'Básico' : selectedLevel === 'ADVANCED' ? 'Avanzado' : 'PL'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Level Selector */}
              <div className="flex rounded-lg border overflow-hidden">
                {['BASIC', 'ADVANCED', 'PL'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      selectedLevel === lvl
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {lvl === 'BASIC' ? 'Básico' : lvl === 'ADVANCED' ? 'Avanzado' : 'PL'}
                  </button>
                ))}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                >
                  <LayoutList className="w-5 h-5" />
                </button>
              </div>
              
              {/* Refresh */}
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
                <p className="text-xs text-gray-500">Total Participantes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.assignedToGroups}</p>
                <p className="text-xs text-gray-500">En Escuadrones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{stats.orphans}</p>
                <p className="text-xs text-gray-500">Huérfanos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.groups?.length || squads.length}</p>
                <p className="text-xs text-gray-500">Escuadrones</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Orphans Sidebar */}
          <div className="w-80 shrink-0">
            <Card className="sticky top-32">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ghost className="w-5 h-5 text-orange-500" />
                  Huérfanos ({filteredOrphans.length})
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {filteredOrphans.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Ghost className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay huérfanos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOrphans.map((orphan) => (
                      <div
                        key={orphan.userId}
                        draggable
                        onDragStart={() => handleDragStart(orphan)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 cursor-grab hover:bg-orange-100 transition-colors"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-medium text-sm">
                          {orphan.user.imagen ? (
                            <img 
                              src={orphan.user.imagen} 
                              alt={orphan.user.nombre}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            orphan.user.nombre?.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{orphan.user.nombre}</p>
                          {orphan.user.telefono && (
                            <p className="text-xs text-gray-500">{orphan.user.telefono}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Squads Grid */}
          <div className="flex-1">
            {squads.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay escuadrones</p>
                <p className="text-sm">Los Game Changers crearán escuadrones durante la visión</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'space-y-4'
              }>
                {squads.map((squad) => {
                  const memberCount = squad._count?.members || squad.members?.length || 0;
                  const isExpanded = expandedSquads.has(squad.id);
                  const isFull = memberCount >= squad.maxSize;
                  
                  return (
                    <Card
                      key={squad.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, squad.id)}
                      className={`transition-all ${
                        draggedOrphan && !isFull
                          ? 'ring-2 ring-purple-400 ring-offset-2'
                          : ''
                      } ${assigning === squad.id ? 'opacity-50' : ''}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                              {squad.leader.imagen ? (
                                <img 
                                  src={squad.leader.imagen} 
                                  alt={squad.leader.nombre}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <Crown className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{squad.name || 'Sin nombre'}</p>
                              <p className="text-xs text-gray-500">{squad.leader.nombre}</p>
                            </div>
                          </div>
                          <Badge variant={isFull ? 'destructive' : 'secondary'}>
                            {memberCount}/{squad.maxSize}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Progress bar */}
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full transition-all ${
                              isFull ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`}
                            style={{ width: `${(memberCount / squad.maxSize) * 100}%` }}
                          />
                        </div>
                        
                        {/* Members list */}
                        <button
                          onClick={() => toggleSquad(squad.id)}
                          className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700"
                        >
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {memberCount} miembros
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && squad.members && (
                          <div className="mt-3 space-y-1">
                            {squad.members.map((member, idx) => (
                              <div 
                                key={member.id}
                                className="flex items-center gap-2 p-2 rounded bg-gray-50 text-sm"
                              >
                                <span className="text-gray-400 font-mono text-xs">#{idx + 1}</span>
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                  {member.user.imagen ? (
                                    <img 
                                      src={member.user.imagen} 
                                      alt={member.user.nombre}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    member.user.nombre?.charAt(0)
                                  )}
                                </div>
                                <span className="truncate flex-1">{member.user.nombre}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Quick assign button for mobile */}
                        {draggedOrphan && !isFull && (
                          <Button
                            className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                            onClick={() => assignOrphan(draggedOrphan, squad.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Asignar aquí
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
