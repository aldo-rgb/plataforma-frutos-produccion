'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  UserPlus, 
  Sparkles,
  Phone,
  Star,
  X,
  Check,
  MessageSquare,
  CalendarPlus,
  RefreshCw,
  CheckCircle2,
  Pencil,
  AlertCircle,
  Camera,
  Upload,
  Music,
  FileText,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PostEntrenoScheduleModal from './PostEntrenoScheduleModal';

interface Squad {
  id: string;
  name: string;
  level: string;
  membersCount: number;
  maxSize: number;
  members?: SquadMember[];
}

interface SquadMember {
  id: string;
  odId: number;
  user: {
    id: number;
    nombre: string;
    imagen: string | null;
    email: string;
    telefono?: string | null;
  };
  joinedAt: string;
  scheduledTime?: string | null;
  assignedByGC?: boolean;
  enrollment?: {
    id: number;
    attendanceStatus: string | null;
    level: string;
  } | null;
  nextCall?: {
    scheduledDate: string;
    scheduledTime: string;
  } | null;
}

interface AvailableSlot {
  time: string;
  isOccupied: boolean;
  participantName?: string;
}

interface SquadStats {
  totalSquads: number;
  totalMembers: number;
  membersWithoutCall: number;
  todayCalls: number;
  completedToday: number;
}

interface CallLogForm {
  participantId: number;
  participantName: string;
  completed: boolean | null;
  rating: number;
  notes: string;
}

interface TodayCallStatus {
  status: 'completed' | 'pending_retry' | null;
  attempts: number;
  lastAttempt?: string;
  rating?: number | null;
}

interface TrainingInfo {
  currentDay: number | null;
  totalDays: number;
  isStaffCallDay: boolean;
  staffCallDays: number[];
  level: string;
  showInDashboard?: boolean;
}

interface LegacyCaptureForm {
  participantId: number;
  participantName: string;
  participantImage: string | null;
  visionId: number | null;
  trainingLevel: 'BASIC' | 'ADVANCED' | 'PL';
  // Campos BÁSICO (3 fotos)
  photoWithGCUrl: string;
  photoWithSquadUrl: string;
  photoBlueWallUrl: string;
  // Campos AVANZADO (fotos + canción + contrato)
  lullabyTitle: string;
  lullabyArtist: string;
  contractPhotoUrl: string;
  contractDeclaration: string;
  // Campos PL (fotos + canción PL + salón + manta)
  plLullabyTitle: string;
  plLullabyArtist: string;
  photoSalonUrl: string;
  photoMantaUrl: string;
}

export default function SquadManagerWidget() {
  const [stats, setStats] = useState<SquadStats>({
    totalSquads: 0,
    totalMembers: 0,
    membersWithoutCall: 0,
    todayCalls: 0,
    completedToday: 0
  });
  const [squads, setSquads] = useState<Squad[]>([]);
  const [allMembers, setAllMembers] = useState<SquadMember[]>([]);
  const [memberSchedules, setMemberSchedules] = useState<Record<number, string>>({});
  const [todayCallStatus, setTodayCallStatus] = useState<Record<number, TodayCallStatus>>({});
  const [trainingInfo, setTrainingInfo] = useState<TrainingInfo | null>(null);
  const [needsAdvancedSquad, setNeedsAdvancedSquad] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal de registro de llamada
  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState<CallLogForm>({
    participantId: 0,
    participantName: '',
    completed: null,
    rating: 0,
    notes: ''
  });
  const [savingCall, setSavingCall] = useState(false);
  
  // Estado para el modal de agendar llamadas
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [assigningSchedule, setAssigningSchedule] = useState(false);

  // Estado para editar nombre del átomo
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Estado para marcar DROP
  const [markingDrop, setMarkingDrop] = useState(false);
  const [showDropConfirm, setShowDropConfirm] = useState(false);
  const [dropReason, setDropReason] = useState('');
  const [newAtomName, setNewAtomName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  // Estado para el modal de Post Entreno
  const [showPostEntrenoModal, setShowPostEntrenoModal] = useState(false);

  // Estado para crear nuevo átomo
  const [showCreateAtomModal, setShowCreateAtomModal] = useState(false);
  const [newAtomLevel, setNewAtomLevel] = useState<'BASIC' | 'ADVANCED' | 'PL'>('ADVANCED');
  const [creatingAtom, setCreatingAtom] = useState(false);

  // Estado para el modal de Legacy Capture
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [legacyForm, setLegacyForm] = useState<LegacyCaptureForm | null>(null);
  const [savingLegacy, setSavingLegacy] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Estado para Toast notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Detectar parámetro de URL para abrir modal de Post-Entreno
  const searchParams = useSearchParams();
  
  useEffect(() => {
    loadData();
  }, []);

  // Efecto para abrir modal de Post-Entreno si viene en URL
  useEffect(() => {
    if (searchParams.get('openPostEntreno') === 'true' && squads.length > 0 && !loading) {
      setShowPostEntrenoModal(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, squads, loading]);

  const loadData = async () => {
    try {
      // Cargar squads CON miembros
      const squadsRes = await fetch('/api/squads?includeMembers=true');
      if (squadsRes.ok) {
        const squadsData = await squadsRes.json();
        console.log('📦 Squads data:', squadsData);
        if (squadsData.success && squadsData.squads) {
          setSquads(squadsData.squads);
          const totalMembers = squadsData.squads.reduce((sum: number, s: Squad) => sum + s.membersCount, 0);
          
          // Combinar todos los miembros de todos los squads
          const members: SquadMember[] = [];
          squadsData.squads.forEach((squad: Squad) => {
            console.log('📦 Squad members:', squad.name, squad.members?.length, squad.members);
            if (squad.members) {
              members.push(...squad.members);
            }
          });
          console.log('📦 All members:', members.length, members);
          setAllMembers(members);
          
          setStats(prev => ({
            ...prev,
            totalSquads: squadsData.squads.length,
            totalMembers
          }));
        }
      }

      // Cargar estadísticas de llamadas del GC
      const statsRes = await fetch('/api/gc-calls/my-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          // Guardar horarios de los participantes
          if (statsData.memberSchedules) {
            setMemberSchedules(statsData.memberSchedules);
          }
          // Guardar estado de llamadas del día
          if (statsData.todayCallStatus) {
            setTodayCallStatus(statsData.todayCallStatus);
          }
          // Guardar información del entrenamiento
          if (statsData.trainingInfo) {
            setTrainingInfo(statsData.trainingInfo);
          }
          // Guardar si necesita crear squad de Avanzado
          setNeedsAdvancedSquad(statsData.needsAdvancedSquad || false);
          
          setStats(prev => ({
            ...prev,
            membersWithoutCall: statsData.stats?.membersWithoutCall || 0,
            todayCalls: statsData.stats?.todayCalls || 0,
            completedToday: statsData.stats?.completedToday || 0
          }));
        }
      }
    } catch (error) {
      console.error('Error loading squad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const openCallModal = (member: SquadMember) => {
    setCallForm({
      participantId: member.user.id,
      participantName: member.user.nombre,
      completed: null,
      rating: 0,
      notes: ''
    });
    setShowCallModal(true);
  };

  const openScheduleModal = async () => {
    setShowScheduleModal(true);
    setSelectedMember(null);
    await loadAvailableSlots();
  };

  const openRenameModal = () => {
    if (squads.length > 0) {
      setNewAtomName(squads[0].name);
    }
    setShowRenameModal(true);
  };

  const saveAtomName = async () => {
    if (!newAtomName.trim() || squads.length === 0) return;
    
    setSavingName(true);
    try {
      console.log('🔧 Guardando nombre del átomo:', {
        squadId: squads[0].id,
        newName: newAtomName.trim(),
      });
      
      const res = await fetch(`/api/squads/${squads[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAtomName.trim() }),
      });
      
      const data = await res.json();
      console.log('🔧 Respuesta del servidor:', data);
      
      if (res.ok && data.success) {
        // Actualizar el nombre localmente
        setSquads(prev => prev.map((s, idx) => 
          idx === 0 ? { ...s, name: newAtomName.trim() } : s
        ));
        setShowRenameModal(false);
        showNotification('Nombre guardado exitosamente', 'success');
      } else {
        console.error('Error del servidor:', data.error);
        showNotification(data.error || 'Error al guardar el nombre', 'error');
      }
    } catch (error) {
      console.error('Error saving atom name:', error);
      showNotification('Error de conexión', 'error');
    } finally {
      setSavingName(false);
    }
  };

  // Función para crear nuevo átomo
  const handleCreateNewAtom = async () => {
    setCreatingAtom(true);
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newAtomLevel === 'ADVANCED' ? 'Mi Átomo Avanzado' : 'Mi Átomo PL',
          level: newAtomLevel 
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateAtomModal(false);
        showNotification(`Átomo de ${newAtomLevel === 'ADVANCED' ? 'Avanzado' : 'PL'} creado exitosamente`, 'success');
        // Recargar datos para mostrar el nuevo squad
        await loadData();
      } else {
        showNotification(data.error || 'Error al crear el átomo', 'error');
      }
    } catch (error) {
      console.error('Error creating atom:', error);
      showNotification('Error de conexión', 'error');
    } finally {
      setCreatingAtom(false);
    }
  };

  // Verificar si necesita crear átomo para el nivel actual
  const needsNewAtomForLevel = () => {
    // Usar el flag que viene del API (más confiable)
    if (needsAdvancedSquad) return true;
    
    // Fallback: verificar localmente
    if (!trainingInfo) return false;
    const currentLevel = trainingInfo.level;
    const hasSquadForLevel = squads.some(s => s.level === currentLevel);
    return !hasSquadForLevel && squads.length > 0;
  };

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch('/api/gc-calls/available-times');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAvailableSlots(data.availableSlots || []);
        }
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAssignSchedule = async (time: string) => {
    if (!selectedMember) return;
    
    setAssigningSchedule(true);
    try {
      const res = await fetch('/api/gc-calls/assign-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedMember.user.id,
          time: time,
        }),
      });
      
      const data = await res.json();
      console.log('📞 Assign response:', data);
      
      if (data.success) {
        // Recargar los slots y datos
        await loadAvailableSlots();
        await loadData();
        setSelectedMember(null);
        showNotification('Horario asignado exitosamente', 'success');
      } else {
        console.error('Error:', data.error, data.details);
        showNotification(data.error || 'Error al asignar horario', 'error');
      }
    } catch (error) {
      console.error('Error assigning schedule:', error);
      showNotification('Error de conexión al asignar horario', 'error');
    } finally {
      setAssigningSchedule(false);
    }
  };

  const handleSaveCallLog = async () => {
    if (callForm.completed === null) return;
    
    setSavingCall(true);
    try {
      const res = await fetch('/api/gc-calls/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: callForm.participantId,
          completed: callForm.completed,
          potentialRating: callForm.rating || null,
          notes: callForm.notes || null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCallModal(false);
        loadData(); // Recargar datos
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error saving call log:', error);
    } finally {
      setSavingCall(false);
    }
  };

  // Función para marcar participante como DROP
  const handleMarkDrop = async () => {
    if (!callForm.participantId) return;
    
    // Buscar el miembro para obtener su id de SmallGroupMember
    const member = allMembers.find(m => m.user.id === callForm.participantId);
    if (!member) return;

    setMarkingDrop(true);
    try {
      const res = await fetch('/api/game-changer/mark-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          reason: dropReason || 'Abandonó el entrenamiento'
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCallModal(false);
        setShowDropConfirm(false);
        setDropReason('');
        loadData(); // Recargar datos
        showNotification('Participante marcado como DROP', 'success');
      } else {
        console.error('Error:', data.error);
        showNotification(data.error || 'Error al marcar como DROP', 'error');
      }
    } catch (error) {
      console.error('Error marking drop:', error);
      showNotification('Error al marcar como DROP', 'error');
    } finally {
      setMarkingDrop(false);
    }
  };

  // Función para abrir el modal de Legacy
  const openLegacyModal = (member: SquadMember) => {
    // Determinar el nivel basado en trainingInfo o squad
    const level = (trainingInfo?.level as 'BASIC' | 'ADVANCED' | 'PL') || 'BASIC';
    
    // Obtener el visionId del squad del miembro
    const squad = squads.find(s => s.members?.some(m => m.id === member.id));
    
    setLegacyForm({
      participantId: member.user.id,
      participantName: member.user.nombre,
      participantImage: member.user.imagen,
      visionId: squad ? parseInt(squad.id.split('-')[0]) : null, // Extraer visionId del squadId si está en formato "visionId-..."
      trainingLevel: level,
      // Campos BÁSICO
      photoWithGCUrl: '',
      photoWithSquadUrl: '',
      photoBlueWallUrl: '',
      // Campos AVANZADO
      lullabyTitle: '',
      lullabyArtist: '',
      contractPhotoUrl: '',
      contractDeclaration: '',
      // Campos PL
      plLullabyTitle: '',
      plLullabyArtist: '',
      photoSalonUrl: '',
      photoMantaUrl: '',
    });
    setShowLegacyModal(true);
    
    // Cargar datos existentes del legacy si los hay
    loadExistingLegacy(member.user.id);
  };

  // Cargar datos existentes del legacy
  const loadExistingLegacy = async (participantId: number) => {
    try {
      const res = await fetch(`/api/legacy-capture?participantId=${participantId}`);
      if (res.ok) {
        const data = await res.json();
        // Si hay datos existentes, actualizar el formulario
        if (data.visiones) {
          const visionConCaptura = data.visiones.find((v: any) => 
            v.participantes?.some((p: any) => p.id === participantId && p.captureId)
          );
          if (visionConCaptura) {
            const participante = visionConCaptura.participantes.find((p: any) => p.id === participantId);
            if (participante && participante.captureId) {
              // Cargar detalles de la captura existente
              const captureRes = await fetch(`/api/legacy-capture/${participante.captureId}`);
              if (captureRes.ok) {
                const captureData = await captureRes.json();
                if (captureData.success && captureData.capture) {
                  const c = captureData.capture;
                  setLegacyForm(prev => prev ? {
                    ...prev,
                    visionId: visionConCaptura.visionId,
                    // Campos BÁSICO
                    photoWithGCUrl: c.photoWithGCUrl || '',
                    photoWithSquadUrl: c.photoWithSquadUrl || '',
                    photoBlueWallUrl: c.photoBlueWallUrl || '',
                    // Campos AVANZADO
                    lullabyTitle: c.lullabyTitle || '',
                    lullabyArtist: c.lullabyArtist || '',
                    contractPhotoUrl: c.contractPhotoUrl || '',
                    contractDeclaration: c.contractDeclaration || '',
                    // Campos PL
                    plLullabyTitle: c.plLullabyTitle || '',
                    plLullabyArtist: c.plLullabyArtist || '',
                    photoSalonUrl: c.photoSalonUrl || '',
                    photoMantaUrl: c.photoMantaUrl || '',
                  } : null);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing legacy:', error);
    }
  };

  // Subir imagen para legacy
  const handleLegacyImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof LegacyCaptureForm
  ) => {
    const file = e.target.files?.[0];
    if (!file || !legacyForm) return;

    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'legacy');
      formData.append('participantId', legacyForm.participantId.toString());
      formData.append('photoType', field.replace('Url', '').replace('photo', '').toLowerCase());

      const res = await fetch('/api/quantum-album/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.photoUrl) {
        setLegacyForm({
          ...legacyForm,
          [field]: result.photoUrl,
        });
        showNotification('Imagen subida exitosamente', 'success');
      } else {
        showNotification(result.error || 'Error al subir imagen', 'error');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      showNotification('Error al subir la imagen', 'error');
    } finally {
      setUploadingField(null);
    }
  };

  // Guardar legacy
  const handleSaveLegacy = async () => {
    if (!legacyForm) return;

    setSavingLegacy(true);
    try {
      const res = await fetch('/api/legacy-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: legacyForm.visionId,
          participantId: legacyForm.participantId,
          trainingLevel: legacyForm.trainingLevel,
          // Campos BÁSICO
          photoWithGCUrl: legacyForm.photoWithGCUrl || null,
          photoWithSquadUrl: legacyForm.photoWithSquadUrl || null,
          photoBlueWallUrl: legacyForm.photoBlueWallUrl || null,
          // Campos AVANZADO
          lullabyTitle: legacyForm.lullabyTitle || null,
          lullabyArtist: legacyForm.lullabyArtist || null,
          contractPhotoUrl: legacyForm.contractPhotoUrl || null,
          contractDeclaration: legacyForm.contractDeclaration || null,
          // Campos PL
          plLullabyTitle: legacyForm.plLullabyTitle || null,
          plLullabyArtist: legacyForm.plLullabyArtist || null,
          photoSalonUrl: legacyForm.photoSalonUrl || null,
          photoMantaUrl: legacyForm.photoMantaUrl || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowLegacyModal(false);
        setLegacyForm(null);
        showNotification('Legacy guardado exitosamente', 'success');
      } else {
        showNotification(data.error || 'Error al guardar el legacy', 'error');
      }
    } catch (error) {
      console.error('Error saving legacy:', error);
      showNotification('Error al guardar el legacy', 'error');
    } finally {
      setSavingLegacy(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/2"></div>
            <div className="h-20 bg-white/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si el entrenamiento terminó hace más de 7 días y no hay squads, no mostrar
  // PERO si no hay squads, mostrar la opción de crear uno
  if (trainingInfo && trainingInfo.showInDashboard === false && squads.length === 0) {
    return null;
  }

  // Si no hay squads, mostrar la opción de crear átomo
  if (squads.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <CardTitle className="text-lg text-white">Mi Átomo</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Gestiona tu grupo de participantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-dashed border-indigo-500/30 rounded-lg p-6 text-center">
            <UserPlus className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">Crea tu primer Átomo</h4>
            <p className="text-sm text-gray-400 mb-4">
              Organiza a tus participantes en grupos pequeños para un mejor seguimiento
            </p>
            <Link href="/dashboard/game-changer/squads">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Crear Átomo
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">
                  {squads.length > 0 ? squads[0].name : 'Mi Átomo'}
                </CardTitle>
                {squads.length > 0 && (
                  <button
                    onClick={openRenameModal}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    title="Editar nombre"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>
              <CardDescription className="text-gray-400">Gestiona tus grupos y llamadas</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Banner de día de entrenamiento */}
        {trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay >= 1 && trainingInfo.currentDay <= trainingInfo.totalDays && (
          <div className={`rounded-lg p-3 ${
            trainingInfo.isStaffCallDay 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' 
              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${trainingInfo.isStaffCallDay ? 'text-amber-400' : 'text-blue-400'}`} />
                <span className="text-sm font-medium text-white">
                  Día {trainingInfo.currentDay} de {trainingInfo.totalDays}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    trainingInfo.level === 'ADVANCED' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {trainingInfo.level === 'ADVANCED' ? 'Avanzado' : 'Básico'}
                </Badge>
              </div>
              {trainingInfo.isStaffCallDay ? (
                <span className="text-xs text-amber-300 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Día de llamadas
                </span>
              ) : (
                <span className="text-xs text-blue-300">
                  {trainingInfo.currentDay === 1 ? 'Día de llegada' : 'Sin llamadas'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mensaje cuando entrenamiento terminó */}
        {trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay > trainingInfo.totalDays && (
          <div className="rounded-lg p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Entrenamiento completado</span>
              <span className="text-xs text-purple-300 ml-auto">Llamadas Post-Entreno activas</span>
            </div>
          </div>
        )}

        {/* Banner para crear nuevo átomo cuando cambia de nivel */}
        {needsNewAtomForLevel() && trainingInfo && (
          <div className="rounded-lg p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    ¡Inicia el entrenamiento {trainingInfo.level === 'ADVANCED' ? 'Avanzado' : 'PL'}!
                  </p>
                  <p className="text-xs text-amber-200/70">
                    Crea un nuevo átomo para este nivel
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setNewAtomLevel(trainingInfo.level as 'ADVANCED' | 'PL');
                  setShowCreateAtomModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Átomo
              </Button>
            </div>
          </div>
        )}

        {/* Stats rápidas - Solo mostrar si es día de llamadas o entrenamiento terminó */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.totalMembers}</p>
            <p className="text-xs text-gray-400">Miembros</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.completedToday}</p>
            <p className="text-xs text-gray-400">Hoy ✓</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.totalMembers - stats.completedToday}</p>
            <p className="text-xs text-gray-400">Pendientes</p>
          </div>
        </div>

        {/* Lista de participantes con horario */}
        {allMembers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Tus Participantes
            </h4>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {allMembers.map((member) => {
                const schedule = memberSchedules[member.user.id];
                const callStatus = todayCallStatus[member.user.id];
                const isCompleted = callStatus?.status === 'completed';
                const needsRetry = callStatus?.status === 'pending_retry';
                const isDrop = member.enrollment?.attendanceStatus === 'DROP';
                
                return (
                  <div 
                    key={member.id}
                    className={`rounded-lg p-3 transition-colors ${
                      isDrop 
                        ? 'bg-gray-800/50 opacity-60 grayscale border-l-2 border-gray-500' 
                        : `bg-white/5 hover:bg-white/10 ${
                            isCompleted ? 'border-l-2 border-emerald-500' : 
                            needsRetry ? 'border-l-2 border-amber-500' : ''
                          }`
                    }`}
                  >
                    {/* Layout móvil: nombre y teléfono arriba, botón abajo */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {member.user.imagen ? (
                            <img 
                              src={member.user.imagen} 
                              alt={member.user.nombre}
                              className={`w-10 h-10 rounded-full object-cover ${isDrop ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-base font-medium">
                              {member.user.nombre?.charAt(0) || '?'}
                            </div>
                          )}
                          {/* Indicador de estado */}
                          {isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isCompleted && !isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {needsRetry && !isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <RefreshCw className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isDrop ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {member.user.nombre}
                            {isDrop && (
                              <span className="text-xs text-gray-500 ml-1 no-underline">(DROP)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {isDrop ? (
                              <span className="text-gray-500">Abandonó</span>
                            ) : schedule ? (
                              formatTime(schedule)
                            ) : (
                              'Sin horario'
                            )}
                            {isCompleted && callStatus?.rating && (
                              <span className="ml-2 inline-flex items-center text-amber-400">
                                <Star className="w-3 h-3 mr-0.5 fill-amber-400" />
                                {callStatus.rating}
                              </span>
                            )}
                          </p>
                        </div>
                        {/* Teléfono y botón en la derecha */}
                        {!isDrop && (
                          <div className="flex items-center gap-2 shrink-0">
                            {member.user.telefono && (
                              <a 
                                href={`tel:${member.user.telefono}`}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-mono"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{member.user.telefono}</span>
                              </a>
                            )}
                            <Button
                              size="sm"
                              onClick={() => openCallModal(member)}
                              className={`text-xs px-2 py-1.5 h-auto ${
                                isCompleted 
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30' 
                                  : needsRetry
                                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5 mr-1" />
                              Registrar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openLegacyModal(member)}
                              className="text-xs px-2 py-1.5 h-auto bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30"
                            >
                              <Camera className="w-3.5 h-3.5 mr-1" />
                              Legacy
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : stats.totalSquads > 0 ? (
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin participantes</p>
            <p className="text-xs text-gray-500">Agrega miembros a tu átomo</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-dashed border-indigo-500/30 rounded-lg p-6 text-center">
            <UserPlus className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">Crea tu primer Átomo</h4>
            <p className="text-sm text-gray-400 mb-4">
              Organiza a tus participantes en grupos pequeños para un mejor seguimiento
            </p>
            <Link href="/dashboard/game-changer/squads">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Crear Átomo
              </Button>
            </Link>
          </div>
        )}

        {/* Botones de acción */}
        {stats.totalSquads > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Link href="/dashboard/game-changer/squads" className="block">
              <Button variant="outline" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs px-2">
                <UserPlus className="w-4 h-4 mr-1" />
                Miembros
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs px-2"
              onClick={openScheduleModal}
            >
              <Phone className="w-4 h-4 mr-1" />
              Agendar
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs px-2"
              onClick={() => setShowPostEntrenoModal(true)}
            >
              <CalendarPlus className="w-4 h-4 mr-1" />
              Post Entreno
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal de Renombrar Átomo */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">Nombre del Átomo</h3>
              </div>
              <button
                onClick={() => setShowRenameModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <input
                type="text"
                value={newAtomName}
                onChange={(e) => setNewAtomName(e.target.value)}
                placeholder="Nombre de tu átomo"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                maxLength={30}
              />
              <p className="text-xs text-slate-500 mt-2">
                Máximo 30 caracteres
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameModal(false)}
                className="flex-1 border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveAtomName}
                disabled={!newAtomName.trim() || savingName}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              >
                {savingName ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Crear Nuevo Átomo */}
      {showCreateAtomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Crear Nuevo Átomo</h3>
              </div>
              <button
                onClick={() => setShowCreateAtomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                <p className="text-sm text-amber-200">
                  Vas a crear un átomo para el nivel <strong>{newAtomLevel === 'ADVANCED' ? 'Avanzado' : 'PL'}</strong>.
                </p>
                <p className="text-xs text-amber-200/70 mt-1">
                  Podrás agregar participantes después de crearlo.
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Se creará con el nombre &quot;Mi Átomo {newAtomLevel === 'ADVANCED' ? 'Avanzado' : 'PL'}&quot;. 
                Puedes editarlo después.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateAtomModal(false)}
                className="flex-1 border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNewAtom}
                disabled={creatingAtom}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {creatingAtom ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crear Átomo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Llamada */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Registrar Llamada</h3>
                <p className="text-sm text-slate-400">{callForm.participantName}</p>
              </div>
              <button
                onClick={() => setShowCallModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* ¿Se realizó la llamada? */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  ¿Se realizó la llamada?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCallForm(prev => ({ ...prev, completed: true }))}
                    className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      callForm.completed === true
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Sí
                  </button>
                  <button
                    onClick={() => setCallForm(prev => ({ ...prev, completed: false }))}
                    className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      callForm.completed === false
                        ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    No
                  </button>
                </div>
              </div>

              {/* Calificación de potencial */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Posibilidad de avanzar
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setCallForm(prev => ({ ...prev, rating: star }))}
                      className={`p-2 rounded-lg transition-all ${
                        callForm.rating >= star
                          ? 'text-amber-400'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className={`w-8 h-8 ${callForm.rating >= star ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center text-slate-500 mt-1">
                  {callForm.rating === 0 && 'Selecciona una calificación'}
                  {callForm.rating === 1 && 'Muy baja probabilidad'}
                  {callForm.rating === 2 && 'Baja probabilidad'}
                  {callForm.rating === 3 && 'Probabilidad media'}
                  {callForm.rating === 4 && 'Alta probabilidad'}
                  {callForm.rating === 5 && 'Totalmente listo para avanzar'}
                </p>
              </div>

              {/* Comentarios */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comentarios <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={callForm.notes}
                  onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Escribe tus observaciones sobre la llamada (mínimo 20 palabras)..."
                  className={`w-full p-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 text-sm resize-none focus:outline-none ${
                    callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length < 20
                      ? 'border-slate-700 focus:border-amber-500/50'
                      : 'border-emerald-500/50 focus:border-emerald-500/70'
                  }`}
                  rows={4}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length >= 20 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length} / 20 palabras mínimo
                  </p>
                  {callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length >= 20 && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Botón para marcar como DROP */}
              {!showDropConfirm ? (
                <button
                  onClick={() => setShowDropConfirm(true)}
                  className="w-full p-3 rounded-xl flex items-center justify-center gap-2 bg-gray-800/50 text-gray-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 border border-gray-700/50 transition-all text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  Abandonó el entrenamiento
                </button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-3">
                  <p className="text-sm text-red-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ¿Confirmar que abandonó el entrenamiento?
                  </p>
                  <input
                    type="text"
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    placeholder="Razón (opcional)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowDropConfirm(false); setDropReason(''); }}
                      className="flex-1 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleMarkDrop}
                      disabled={markingDrop}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs"
                    >
                      {markingDrop ? 'Marcando...' : 'Confirmar DROP'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Button
                onClick={() => { setShowCallModal(false); setShowDropConfirm(false); setDropReason(''); }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCallLog}
                disabled={
                  callForm.completed === null || 
                  savingCall || 
                  callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length < 20
                }
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCall ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendar Llamadas - Diseño Mejorado */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-500/10 relative">
            {/* Header con gradiente */}
            <div className="p-5 border-b border-slate-800/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <CalendarPlus className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Agendar Llamadas</h3>
                    <p className="text-xs text-slate-400">Asigna horarios a tus participantes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Paso 1: Seleccionar participante */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-sm font-medium text-slate-300">Selecciona un participante</span>
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {allMembers.map((member) => {
                    const schedule = memberSchedules[member.user.id];
                    const isSelected = selectedMember?.user.id === member.user.id;
                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10'
                            : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.user.imagen ? (
                            <img 
                              src={member.user.imagen} 
                              alt={member.user.nombre}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-slate-700">
                              {member.user.nombre?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-sm font-medium text-white">{member.user.nombre}</span>
                        </div>
                        {schedule ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                            {formatTime(schedule)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                            Sin horario
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Seleccionar horario */}
              {selectedMember && (
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="text-sm font-medium text-slate-300">
                      Horario para <span className="text-purple-400 font-semibold">{selectedMember.user.nombre}</span>
                    </span>
                  </div>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8 bg-slate-800/30 rounded-xl">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-xs text-slate-400 mt-2">Cargando horarios...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No tienes horarios configurados</p>
                      <Link href="/dashboard/game-changer/calls">
                        <Button size="sm" className="mt-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30">
                          Configurar disponibilidad
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const isCurrentUser = memberSchedules[selectedMember.user.id] === slot.time;
                        const isOccupied = slot.isOccupied && !isCurrentUser;
                        
                        return (
                          <button
                            key={slot.time}
                            onClick={() => !isOccupied && handleAssignSchedule(slot.time)}
                            disabled={isOccupied || assigningSchedule}
                            className={`p-2.5 rounded-xl text-center transition-all relative ${
                              isCurrentUser
                                ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                : isOccupied
                                ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800/50 text-white hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500/30 border border-slate-700/50'
                            }`}
                          >
                            <p className={`text-sm font-mono font-medium ${isOccupied ? 'line-through' : ''}`}>
                              {formatTime(slot.time)}
                            </p>
                            {isOccupied && slot.participantName && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{slot.participantName}</p>
                            )}
                            {isCurrentUser && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
              <Button
                onClick={() => setShowScheduleModal(false)}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800"
                disabled={assigningSchedule}
              >
                Cerrar
              </Button>
            </div>

            {/* Overlay de loading */}
            {assigningSchedule && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-white mt-3">Asignando horario...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Post Entreno */}
      {showPostEntrenoModal && squads.length > 0 && (
        <PostEntrenoScheduleModal
          isOpen={showPostEntrenoModal}
          onClose={() => setShowPostEntrenoModal(false)}
          squadId={squads[0]?.id}
          squadName={squads[0]?.name || 'Mi Átomo'}
          members={allMembers.map(m => ({
            odId: m.user.id,
            odName: m.user.nombre,
            odImage: m.user.imagen
          }))}
          onScheduled={() => {
            loadData(); // Recargar datos después de agendar
          }}
        />
      )}

      {/* Modal de Legacy Capture */}
      {showLegacyModal && legacyForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-pink-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  {legacyForm.participantImage ? (
                    <img 
                      src={legacyForm.participantImage} 
                      alt={legacyForm.participantName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Legacy Capture</h3>
                  <p className="text-sm text-pink-300">{legacyForm.participantName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    legacyForm.trainingLevel === 'BASIC' ? 'bg-blue-500/20 text-blue-300' :
                    legacyForm.trainingLevel === 'ADVANCED' ? 'bg-purple-500/20 text-purple-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {legacyForm.trainingLevel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLegacyModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* ========== CAMPOS BÁSICO (3 fotos) ========== */}
              {legacyForm.trainingLevel === 'BASIC' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    Fotos del Entrenamiento Básico
                  </h4>

                  {/* Foto con GC */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">📸 Foto con Game Changer</label>
                    {legacyForm.photoWithGCUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithGCUrl} alt="Foto con GC" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithGCUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithGCUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithGCUrl' ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Foto con Squad */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">👥 Foto con Squad/Átomo</label>
                    {legacyForm.photoWithSquadUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithSquadUrl} alt="Foto con Squad" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithSquadUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithSquadUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithSquadUrl' ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Foto Pared Azul */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">🔵 Foto en Pared Azul</label>
                    {legacyForm.photoBlueWallUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoBlueWallUrl} alt="Pared Azul" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoBlueWallUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoBlueWallUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoBlueWallUrl' ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* ========== CAMPOS AVANZADO (fotos + canción + contrato) ========== */}
              {legacyForm.trainingLevel === 'ADVANCED' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Legacy Entrenamiento Avanzado
                  </h4>

                  {/* Foto con GC */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">📸 Foto con Game Changer</label>
                    {legacyForm.photoWithGCUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithGCUrl} alt="Foto con GC" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithGCUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithGCUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithGCUrl' ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Foto con Squad */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">👥 Foto con Squad/Átomo</label>
                    {legacyForm.photoWithSquadUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithSquadUrl} alt="Foto con Squad" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithSquadUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithSquadUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithSquadUrl' ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Canción de Cuna */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
                      <Music className="w-3 h-3" /> Canción de Cuna
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Título de la canción"
                        value={legacyForm.lullabyTitle}
                        onChange={(e) => setLegacyForm({...legacyForm, lullabyTitle: e.target.value})}
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Artista"
                        value={legacyForm.lullabyArtist}
                        onChange={(e) => setLegacyForm({...legacyForm, lullabyArtist: e.target.value})}
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Foto del Contrato */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Foto del Contrato
                    </label>
                    {legacyForm.contractPhotoUrl ? (
                      <div className="relative">
                        <img src={legacyForm.contractPhotoUrl} alt="Contrato" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, contractPhotoUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'contractPhotoUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'contractPhotoUrl' ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Declaración */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">📝 Declaración del Participante</label>
                    <textarea
                      placeholder='Escribe la declaración "Yo soy..."'
                      value={legacyForm.contractDeclaration}
                      onChange={(e) => setLegacyForm({...legacyForm, contractDeclaration: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ========== CAMPOS PL (fotos + canción PL + salón + manta) ========== */}
              {legacyForm.trainingLevel === 'PL' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Legacy Programa de Liderazgo
                  </h4>

                  {/* Foto con GC */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">📸 Foto con Game Changer</label>
                    {legacyForm.photoWithGCUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithGCUrl} alt="Foto con GC" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithGCUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithGCUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithGCUrl' ? <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Foto con Squad */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">👥 Foto con Squad/Átomo</label>
                    {legacyForm.photoWithSquadUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoWithSquadUrl} alt="Foto con Squad" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoWithSquadUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoWithSquadUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoWithSquadUrl' ? <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Canción de Cuna PL */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
                      <Music className="w-3 h-3" /> Canción de Cuna (PL)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Título de la canción"
                        value={legacyForm.plLullabyTitle}
                        onChange={(e) => setLegacyForm({...legacyForm, plLullabyTitle: e.target.value})}
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                      />
                      <input
                        type="text"
                        placeholder="Artista"
                        value={legacyForm.plLullabyArtist}
                        onChange={(e) => setLegacyForm({...legacyForm, plLullabyArtist: e.target.value})}
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  {/* Foto del Salón */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">🏫 Foto del Salón</label>
                    {legacyForm.photoSalonUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoSalonUrl} alt="Salón" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoSalonUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoSalonUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoSalonUrl' ? <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>

                  {/* Foto de la Manta */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <label className="text-xs text-slate-400 mb-2 block">🧣 Foto de la Manta</label>
                    {legacyForm.photoMantaUrl ? (
                      <div className="relative">
                        <img src={legacyForm.photoMantaUrl} alt="Manta" className="w-full h-32 object-cover rounded-lg"/>
                        <button onClick={() => setLegacyForm({...legacyForm, photoMantaUrl: ''})} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLegacyImageUpload(e, 'photoMantaUrl')} disabled={uploadingField !== null}/>
                        {uploadingField === 'photoMantaUrl' ? <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" /> : <><Upload className="w-6 h-6 text-slate-500 mb-1" /><span className="text-xs text-slate-500">Subir foto</span></>}
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowLegacyModal(false)}
                className="flex-1 border-slate-700 hover:bg-slate-800"
                disabled={savingLegacy}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveLegacy}
                className={`flex-1 text-white ${
                  legacyForm.trainingLevel === 'BASIC' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600' :
                  legacyForm.trainingLevel === 'ADVANCED' ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' :
                  'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                }`}
                disabled={savingLegacy || uploadingField !== null}
              >
                {savingLegacy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Guardar Legacy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in">
          <div className={`rounded-lg shadow-2xl p-4 flex items-center gap-3 ${
            toastType === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toastType === 'success' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toastMessage}</span>
            <button 
              onClick={() => setShowToast(false)}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
