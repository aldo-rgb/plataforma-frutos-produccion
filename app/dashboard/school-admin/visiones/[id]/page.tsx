'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  UserPlus,
  Trash2,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  Edit,
  Key,
  Copy,
  Eye,
  Download,
  Calendar,
  Clock,
  QrCode,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  startDate: string | null;
  endDate: string | null;
  maxParticipantes: number | null;
  licensesAllocated: number;
  organizationId: number;
  Coordinador?: {
    id: number;
    nombre: string;
    email: string;
  };
  _count: {
    Participantes: number;
    GameChangers: number;
  };
}

interface Participante {
  id: number;
  participanteId: number;
  gameChangerId: number | null;
  Usuario_VisionParticipante_participanteIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    tier: string;
    assignedMentorId: number | null;
    Usuario_Usuario_assignedMentorIdToUsuario: {
      id: number;
      nombre: string;
      email: string;
      imagen: string | null;
    } | null;
    CartaFrutos: {
      id: number;
      estado: string;
    }[];
    LicenseAssignment_LicenseAssignment_userIdToUsuario: {
      id: number;
      licenseCode: string;
      activatedAt: Date | null;
      assignedAt: Date;
      expiresAt: Date | null;
    }[];
  };
  Usuario_VisionParticipante_gameChangerIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
  } | null;
  createdAt: string;
}

interface GameChanger {
  id: number;
  gameChangerId: number;
  Usuario_VisionGameChanger_gameChangerIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    tier: string;
    assignedMentorId: number | null;
    Usuario_Usuario_assignedMentorIdToUsuario: {
      id: number;
      nombre: string;
      email: string;
      imagen: string | null;
    } | null;
    LicenseAssignment_LicenseAssignment_userIdToUsuario: {
      id: number;
      licenseCode: string;
      activatedAt: Date | null;
      assignedAt: Date;
      expiresAt: Date | null;
    }[];
  };
  createdAt: string;
}

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  isActive: boolean;
  tieneHorarios: boolean;
  perfilMentor?: any;
}

interface MentorAsignado {
  id: number;
  mentorId: number;
  precioDisciplina: number;
  precioBase: number;
  esLider: boolean;
  costoTotal: number;
  Usuario_VisionMentor_mentorIdToUsuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
    rol: string;
    PerfilMentor: {
      precioDisciplina: number;
      precioBase: number;
      especialidad?: string;
      calificacionPromedio?: number;
    } | null;
  };
  createdAt: string;
}

interface CicloInfo {
  semanas: number;
  llamadasDisciplina: number;
  diasTotales: number;
}

interface Producto {
  id: number;
  name: string;
  levelType: 'BASIC' | 'ADVANCED' | 'PL';
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  plWeekend1StartDate: string | null;
  plWeekend1EndDate: string | null;
  plWeekend2StartDate: string | null;
  plWeekend2EndDate: string | null;
  plWeekend3StartDate: string | null;
  plWeekend3EndDate: string | null;
  Trainer: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
  } | null;
  Coordinator: {
    id: number;
    nombre: string;
    email: string;
  } | null;
}

export default function VisionDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const visionId = params.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [gameChangers, setGameChangers] = useState<GameChanger[]>([]);
  const [mentoresAsignados, setMentoresAsignados] = useState<MentorAsignado[]>([]);
  const [cicloInfo, setCicloInfo] = useState<CicloInfo | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mentoresDisponibles, setMentoresDisponibles] = useState<Mentor[]>([]);
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [selectedGameChanger, setSelectedGameChanger] = useState<GameChanger | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [emailProcessing, setEmailProcessing] = useState(false);
  const [teamEmailProcessing, setTeamEmailProcessing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assigningMentorId, setAssigningMentorId] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [randomAssigning, setRandomAssigning] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  const [showRandomAssignModal, setShowRandomAssignModal] = useState(false);
  const [showGameChangerModal, setShowGameChangerModal] = useState(false);
  const [selectedParticipanteForGC, setSelectedParticipanteForGC] = useState<Participante | null>(null);
  const [assigningGameChanger, setAssigningGameChanger] = useState(false);
  const [showMentorChangeModal, setShowMentorChangeModal] = useState(false);
  const [mentorChangeData, setMentorChangeData] = useState<{
    userId: number;
    userType: string;
    userName: string;
    action: 'remove' | 'change';
    scheduledCalls: number;
    remainingWeeks: number;
  } | null>(null);
  const [showExtendDateModal, setShowExtendDateModal] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [extendingDate, setExtendingDate] = useState(false);
  const [showEditAreasModal, setShowEditAreasModal] = useState(false);
  const [areasConfigLocked, setAreasConfigLocked] = useState(false);
  const [areasConfig, setAreasConfig] = useState({
    forceFinanzasArea: true,
    forceRelacionesArea: true,
    forceTalentosArea: true,
    forceSaludArea: true,
    forcePazMentalArea: true,
    forceOcioArea: true,
    forceTransformationArea: true,
    transformationGuestsTarget: 4,
    forceCommunityServiceArea: true,
  });
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false);
  const [editPhoneData, setEditPhoneData] = useState<{
    userId: number;
    userName: string;
    currentPhone: string | null;
  } | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showMentoresPrivadosModal, setShowMentoresPrivadosModal] = useState(false);
  const [lideres, setLideres] = useState<any[]>([]);
  const [loadingLideres, setLoadingLideres] = useState(false);
  const [loadingMentores, setLoadingMentores] = useState(false);
  const [asignandoMentor, setAsignandoMentor] = useState<number | null>(null);
  const [showReplaceMentorModal, setShowReplaceMentorModal] = useState(false);
  const [mentorToReplace, setMentorToReplace] = useState<{id: number, nombre: string} | null>(null);
  const [selectedReplacementMentor, setSelectedReplacementMentor] = useState<number | null>(null);
  const [replacingMentor, setReplacingMentor] = useState(false);
  const { showToast, toasts } = useToast();

  useEffect(() => {
    if (session?.user?.rol === 'SCHOOL_ADMIN') {
      fetchVisionDetails();
      fetchCredits();
      fetchMentores();
    }
  }, [session, visionId]);

  const fetchVisionDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();

      if (data.success) {
        console.log('Vision data:', data.vision);
        console.log('StartDate:', data.vision.startDate);
        console.log('EndDate:', data.vision.endDate);
        setVision(data.vision);
        setParticipantes(data.participantes);
        setGameChangers(data.gameChangers || []);
        setMentoresAsignados(data.mentoresAsignados || []);
        setCicloInfo(data.cicloInfo || null);
        setProductos(data.productos || []);
        
        // Debug: Ver los datos de productos
        console.log('📦 Productos recibidos:', data.productos);
        if (data.productos?.length > 0) {
          const plProduct = data.productos.find((p: any) => p.levelType === 'PL');
          if (plProduct) {
            console.log('👑 Producto PL completo:', plProduct);
          }
        }
        
        // Cargar configuración de áreas
        setAreasConfig({
          forceFinanzasArea: data.vision.forceFinanzasArea ?? true,
          forceRelacionesArea: data.vision.forceRelacionesArea ?? true,
          forceTalentosArea: data.vision.forceTalentosArea ?? true,
          forceSaludArea: data.vision.forceSaludArea ?? true,
          forcePazMentalArea: data.vision.forcePazMentalArea ?? true,
          forceOcioArea: data.vision.forceOcioArea ?? true,
          forceTransformationArea: data.vision.forceTransformationArea ?? true,
          transformationGuestsTarget: data.vision.transformationGuestsTarget ?? 4,
          forceCommunityServiceArea: data.vision.forceCommunityServiceArea ?? true,
        });

        // Verificar si hay participantes con cartas activas
        const hasActiveParticipants = data.participantes?.some((p: any) => 
          p.Usuario_VisionParticipante_participanteIdToUsuario?.CartaFrutos?.some((c: any) => c.estado !== 'BORRADOR')
        );
        setAreasConfigLocked(hasActiveParticipants || false);
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setAvailableCredits(data.stats.availableCredits || 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchMentores = async () => {
    setLoadingMentores(true);
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/mentores`);
      const data = await res.json();
      
      if (res.ok) {
        setMentoresAsignados(data.mentoresAsignados || []);
        setMentoresDisponibles(data.mentoresDisponibles || []);
      }
    } catch (error) {
      console.error('Error fetching mentores:', error);
    } finally {
      setLoadingMentores(false);
    }
  };

  const fetchLideres = async () => {
    if (!session?.user) return;

    setLoadingLideres(true);
    try {
      const response = await fetch('/api/school-admin/lideres');

      if (!response.ok) throw new Error('Error al cargar líderes');

      const data = await response.json();
      
      // Filtrar solo líderes con horarios configurados
      const lideresConHorarios = (data.lideres || []).filter((lider: any) => 
        lider.perfilCompleto && lider.tieneHorarios
      );
      
      setLideres(lideresConHorarios);
    } catch (error) {
      console.error('Error al cargar líderes:', error);
      showToast({
        message: 'Error al cargar los líderes disponibles',
        type: 'error'
      });
    } finally {
      setLoadingLideres(false);
    }
  };

  const asignarMentorPrivado = async (mentorId: number) => {
    setAsignandoMentor(mentorId);
    try {
      const response = await fetch(
        `/api/school-admin/visiones/${visionId}/mentores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mentorId,
            asignadoPorId: session?.user?.id
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Error al asignar mentor');
      }

      const data = await response.json();

      showToast({
        message: 'Mentor privado asignado exitosamente',
        type: 'success'
      });
      setShowMentoresPrivadosModal(false);
      fetchVisionDetails();
      fetchMentores();
    } catch (error: any) {
      console.error('Error:', error);
      showToast({
        message: error.message || 'Error al asignar mentor',
        type: 'error'
      });
    } finally {
      setAsignandoMentor(null);
    }
  };

  const handleAsignarMentor = async (mentorId: number) => {
    try {
      setAssigningMentorId(mentorId);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mentorId,
          asignadoPorId: session?.user?.id
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddMentorModal(false);
        fetchMentores();
        showToast({
          message: 'Mentor asignado exitosamente',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar mentor',
          type: data.requiresConfig ? 'warning' : 'error',
          duration: data.requiresConfig ? 6000 : 4000
        });
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      showToast({
        message: 'Error al asignar mentor',
        type: 'error'
      });
    } finally {
      setAssigningMentorId(null);
    }
  };

  const handleRemoverMentor = async (mentorId: number, mentorNombre: string) => {
    // Abrir modal para seleccionar mentor de reemplazo
    setMentorToReplace({ id: mentorId, nombre: mentorNombre });
    setSelectedReplacementMentor(null);
    setShowReplaceMentorModal(true);
  };

  const handleConfirmReplaceMentor = async () => {
    if (!mentorToReplace || !selectedReplacementMentor) return;

    try {
      setReplacingMentor(true);

      const res = await fetch(`/api/school-admin/visiones/${visionId}/replace-mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldMentorId: mentorToReplace.id,
          newMentorId: selectedReplacementMentor
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast({
          message: `✅ ${data.message}. ${data.canceledSessions} sesiones canceladas.`,
          type: 'success',
          duration: 6000
        });
        
        // Cerrar modal y refrescar datos
        setShowReplaceMentorModal(false);
        setMentorToReplace(null);
        setSelectedReplacementMentor(null);
        fetchMentores();
      } else {
        showToast({
          message: data.error || 'Error al reemplazar mentor',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error replacing mentor:', error);
      showToast({
        message: 'Error al reemplazar mentor',
        type: 'error'
      });
    } finally {
      setReplacingMentor(false);
    }
  };

  const handleToggleUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const allUsersWithoutLicense = [
      ...participantes.filter(p => !p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode).map(p => p.Usuario_VisionParticipante_participanteIdToUsuario.id),
      ...gameChangers.filter(gc => !gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode).map(gc => gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id)
    ];
    
    if (selectedUsers.size === allUsersWithoutLicense.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(allUsersWithoutLicense));
    }
  };

  const handleBulkAssignLicenses = async () => {
    if (selectedUsers.size === 0) return;
    
    if (selectedUsers.size > availableCredits) {
      showToast({
        message: `No tienes suficientes licencias. Necesitas ${selectedUsers.size} pero solo tienes ${availableCredits} disponibles.`,
        type: 'error',
        duration: 6000
      });
      return;
    }

    setBulkAssigning(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const userId of Array.from(selectedUsers)) {
      try {
        const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participanteId: userId }),
        });

        const data = await res.json();
        
        if (data.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${data.error}`);
        }
      } catch (error) {
        errorCount++;
        errors.push('Error de conexión');
      }
    }

    setBulkAssigning(false);
    setSelectedUsers(new Set());
    setShowBulkAssignModal(false);
    
    await fetchVisionDetails();
    await fetchCredits();

    if (successCount > 0) {
      showToast({
        message: `${successCount} licencia(s) asignada(s) exitosamente${errorCount > 0 ? `. ${errorCount} falló/fallaron.` : ''}`,
        type: successCount > 0 && errorCount === 0 ? 'success' : 'warning',
        duration: 6000
      });
    } else {
      showToast({
        message: 'No se pudo asignar ninguna licencia',
        type: 'error',
        duration: 5000
      });
    }
  };

  const handleOpenAssignMentorModal = async (userId: number, userType: string, userName: string, hasLicense: boolean, hasMentor: boolean = false) => {
    // Validar que tenga licencia
    if (!hasLicense) {
      showToast({
        message: 'El usuario debe tener una licencia asignada antes de poder asignar un mentor',
        type: 'error',
        duration: 5000
      });
      return;
    }

    // Si ya tiene mentor, verificar impacto del cambio
    if (hasMentor) {
      try {
        const checkRes = await fetch(`/api/school-admin/visiones/${visionId}/check-mentor-impact?userId=${userId}&userType=${userType}`);
        const checkData = await checkRes.json();

        if (checkData.hasScheduledCalls) {
          setMentorChangeData({
            userId,
            userType,
            userName,
            action: 'change',
            scheduledCalls: checkData.scheduledCalls,
            remainingWeeks: checkData.remainingWeeks
          });
          setShowMentorChangeModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking mentor impact:', error);
      }
    }
    
    // Redirigir a la página de asignación de mentor
    router.push(`/dashboard/school-admin/visiones/${visionId}/asignar-mentor/${userId}`);
  };

  const handleRemoverMentorDeUsuario = async (userId: number, userType: string, userName?: string) => {
    try {
      // Verificar si tiene llamadas programadas
      const checkRes = await fetch(`/api/school-admin/visiones/${visionId}/check-mentor-impact?userId=${userId}&userType=${userType}`);
      const checkData = await checkRes.json();

      if (checkData.hasScheduledCalls) {
        // Mostrar modal de confirmación
        setMentorChangeData({
          userId,
          userType,
          userName: userName || 'Usuario',
          action: 'remove',
          scheduledCalls: checkData.scheduledCalls,
          remainingWeeks: checkData.remainingWeeks
        });
        setShowMentorChangeModal(true);
      } else {
        // No tiene llamadas, remover directamente
        await confirmRemoveMentor(userId, userType);
      }
    } catch (error) {
      console.error('Error checking mentor impact:', error);
      showToast({
        message: 'Error al verificar el impacto del cambio',
        type: 'error'
      });
    }
  };

  const confirmRemoveMentor = async (userId: number, userType: string) => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-mentor?userId=${userId}&userType=${userType}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchVisionDetails();
        setShowMentorChangeModal(false);
        showToast({
          message: 'Mentor removido. Se notificó al usuario.',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al remover mentor',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error removing mentor from user:', error);
      showToast({
        message: 'Error al remover mentor',
        type: 'error'
      });
    }
  };

  const handleAsignacionAleatoria = async () => {
    try {
      setRandomAssigning(true);
      setShowRandomAssignModal(false);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-mentors-random`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.success) {
        fetchVisionDetails();
        showToast({
          message: `${data.assigned} mentor(es) asignado(s) exitosamente`,
          type: 'success',
          duration: 5000
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar mentores',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error assigning mentors randomly:', error);
      showToast({
        message: 'Error al asignar mentores',
        type: 'error'
      });
    } finally {
      setRandomAssigning(false);
    }
  };

  const handleExtendDate = async () => {
    if (!newEndDate) {
      showToast({
        message: 'Debes seleccionar una fecha',
        type: 'error'
      });
      return;
    }

    try {
      setExtendingDate(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/extend-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEndDate }),
      });

      const data = await res.json();

      if (data.success) {
        setShowExtendDateModal(false);
        setNewEndDate('');
        fetchVisionDetails();
        
        const { results } = data;
        let message = `Visión extendida exitosamente. ${results.extendedUsers} usuario(s) actualizado(s).`;
        
        if (results.scheduledCalls > 0) {
          message += ` Se agendaron ${results.scheduledCalls} llamada(s) automáticamente.`;
        }
        
        if (results.usersNeedingReschedule.length > 0) {
          message += ` ${results.usersNeedingReschedule.length} usuario(s) necesitan reagendar manualmente.`;
        }
        
        showToast({
          message,
          type: results.usersNeedingReschedule.length > 0 ? 'warning' : 'success',
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error al extender fecha',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error extending date:', error);
      showToast({
        message: 'Error al extender fecha',
        type: 'error'
      });
    } finally {
      setExtendingDate(false);
    }
  };

  // Asignar Game Changer a Participante
  const handleAssignGameChanger = async (participanteId: number, gameChangerId: number | null) => {
    try {
      setAssigningGameChanger(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-gamechanger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteId, gameChangerId }),
      });

      const data = await res.json();

      if (data.success) {
        setShowGameChangerModal(false);
        setSelectedParticipanteForGC(null);
        fetchVisionDetails();
        showToast({
          message: gameChangerId ? 'Game Changer asignado exitosamente' : 'Game Changer removido',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar Game Changer',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error assigning game changer:', error);
      showToast({
        message: 'Error al asignar Game Changer',
        type: 'error'
      });
    } finally {
      setAssigningGameChanger(false);
    }
  };

  // Asignación aleatoria de mentores y game changers
  const handleRandomAssignment = async () => {
    try {
      setRandomAssigning(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/random-assign`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setShowRandomAssignModal(false);
        fetchVisionDetails();
        
        const { details } = data;
        let message = `Asignación completada: ${details.mentorAssignments} mentor(es) y ${details.gameChangerAssignments} game changer(s) asignados.`;
        
        if (details.errors && details.errors.length > 0) {
          message += ` ${details.errors.length} error(es) encontrado(s).`;
        }

        showToast({
          message,
          type: details.errors && details.errors.length > 0 ? 'warning' : 'success',
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error en la asignación aleatoria',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error in random assignment:', error);
      showToast({
        message: 'Error en la asignación aleatoria',
        type: 'error'
      });
    } finally {
      setRandomAssigning(false);
    }
  };

  // Alta masiva por correo
  const handleAddEmails = async () => {
    if (!emailInput.trim()) return;
    setEmailProcessing(true);
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setEmailInput('');
        fetchVisionDetails();
        
        showToast({
          message: 'Operación completada',
          type: 'success',
          details: {
            created: data.newUsersCreated || 0,
            existing: data.existingUsersAdded || 0,
            pending: data.pendingChanges || 0,
            total: data.total || 0,
            pendingEmails: data.pendingEmails || []
          },
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error al agregar participantes',
          type: 'error'
        });
      }
    } catch (error) {
      showToast({
        message: 'Error al agregar participantes',
        type: 'error'
      });
    } finally {
      setEmailProcessing(false);
    }
  };

  // Alta masiva de Game Changers por correo
  const handleAddTeam = async () => {
    if (!teamEmailInput.trim()) return;
    setTeamEmailProcessing(true);
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-gamechangers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: teamEmailInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddTeamModal(false);
        setTeamEmailInput('');
        fetchVisionDetails();
        
        showToast({
          message: 'Team agregado exitosamente',
          type: 'success',
          details: {
            created: data.newUsersCreated || 0,
            existing: data.existingUsersAdded || 0,
            pending: data.pendingChanges || 0,
            total: data.total || 0,
            pendingEmails: data.pendingEmails || []
          },
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error al agregar game changers',
          type: 'error'
        });
      }
    } catch (error) {
      showToast({
        message: 'Error al agregar game changers',
        type: 'error'
      });
    } finally {
      setTeamEmailProcessing(false);
    }
  };

  const handleAssignLicense = async () => {
    if (!selectedParticipante && !selectedGameChanger) return;

    if (availableCredits < 1) {
      showToast({
        message: 'No tienes licencias disponibles',
        type: 'warning',
        duration: 4000
      });
      return;
    }

    try {
      setProcessing(true);
      const userId = selectedParticipante 
        ? selectedParticipante.participanteId 
        : selectedGameChanger?.gameChangerId;

      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participanteId: userId 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAssignModal(false);
        setSelectedParticipante(null);
        setSelectedGameChanger(null);
        fetchVisionDetails();
        fetchCredits();
        
        showToast({
          message: `Licencia asignada: ${data.licenseCode}`,
          type: 'success',
          duration: 6000
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar licencia',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error assigning license:', error);
      showToast({
        message: 'Error al asignar licencia',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveParticipante = async (participanteRelationId: number) => {
    if (!confirm('¿Estás seguro de eliminar este participante? Si tiene licencia asignada, será cancelada automáticamente.')) return;

    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/remove-participante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteRelationId }),
      });

      const data = await res.json();

      if (data.success) {
        fetchVisionDetails();
        fetchCredits(); // Actualizar créditos disponibles
        showToast({
          message: data.message || 'Participante eliminado',
          type: 'success',
          duration: 5000
        });
      } else {
        showToast({
          message: data.error || 'Error al eliminar participante',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error removing participante:', error);
      showToast({
        message: 'Error al eliminar participante',
        type: 'error'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      message: 'Código copiado al portapapeles',
      type: 'success',
      duration: 2000
    });
  };

  const handleOpenEditPhone = (userId: number, userName: string, currentPhone: string | null) => {
    setEditPhoneData({ userId, userName, currentPhone });
    setNewPhone(currentPhone || '');
    setShowEditPhoneModal(true);
  };

  const handleSavePhone = async () => {
    if (!editPhoneData) return;
    
    setSavingPhone(true);
    try {
      const res = await fetch(`/api/usuarios/${editPhoneData.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telefono: newPhone.trim() || null
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowEditPhoneModal(false);
        setEditPhoneData(null);
        setNewPhone('');
        fetchVisionDetails();
        showToast({
          message: 'Teléfono actualizado correctamente',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al actualizar teléfono',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating phone:', error);
      showToast({
        message: 'Error al actualizar teléfono',
        type: 'error'
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const toggleCodeVisibility = (code: string) => {
    const newVisible = new Set(visibleCodes);
    if (newVisible.has(code)) {
      newVisible.delete(code);
    } else {
      newVisible.add(code);
    }
    setVisibleCodes(newVisible);
  };

  const handleUpdateAreasConfig = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(areasConfig),
      });

      const data = await res.json();

      if (data.success) {
        setShowEditAreasModal(false);
        fetchVisionDetails();
        showToast({
          message: 'Configuración de áreas actualizada exitosamente',
          type: 'success'
        });
      } else {
        // Si hay participantes con cartas activas, mostrar mensaje detallado
        if (data.participantesAfectados) {
          showToast({
            message: data.details || data.error,
            type: 'warning',
            duration: 8000
          });
        } else {
          showToast({
            message: data.error || 'Error al actualizar configuración',
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error updating areas config:', error);
      showToast({
        message: 'Error al actualizar configuración',
        type: 'error'
      });
    }
  };

  const participantesWithLicense = participantes.filter(p => 
    p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode
  );
  const participantesWithoutLicense = participantes.filter(p => 
    !p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode
  );
  const gameChangersWithLicense = gameChangers.filter(gc => 
    gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode
  );
  const gameChangersWithoutLicense = gameChangers.filter(gc => 
    !gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode
  );
  const totalWithLicense = participantesWithLicense.length + gameChangersWithLicense.length;
  const totalWithoutLicense = participantesWithoutLicense.length + gameChangersWithoutLicense.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <LoadingSpinner message="Cargando Visión..." size="lg" />
      </div>
    );
  }

  if (!vision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl">Visión no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <ToastContainer toasts={toasts} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/school-admin/visiones"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="text-slate-400" size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{vision.nombre}</h1>
            {vision.descripcion && (
              <p className="text-slate-400">{vision.descripcion}</p>
            )}
          </div>
        </div>

        {/* Sección de Entrenamientos Configurados */}
        {productos.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900/80 via-indigo-950/30 to-slate-900/80 rounded-xl border border-indigo-500/20 overflow-hidden backdrop-blur-sm">
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 px-6 py-4 border-b border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Calendar className="text-indigo-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Entrenamientos Configurados
                        <span className="text-sm font-normal text-indigo-400 ml-2">
                          ({productos.length})
                        </span>
                      </h3>
                      <p className="text-xs text-indigo-300/70 mt-0.5">
                        Programación de entrenamientos básico, avanzado y programa de liderato
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {productos.map((producto) => {
                    // Debug: Ver fechas de PL específicamente
                    if (producto.levelType === 'PL') {
                      console.log('🔍 Renderizando PL:', {
                        plWeekend1StartDate: producto.plWeekend1StartDate,
                        plWeekend1EndDate: producto.plWeekend1EndDate,
                        plWeekend2StartDate: producto.plWeekend2StartDate,
                        plWeekend2EndDate: producto.plWeekend2EndDate,
                        plWeekend3StartDate: producto.plWeekend3StartDate,
                        plWeekend3EndDate: producto.plWeekend3EndDate,
                      });
                    }
                    
                    const levelConfig = {
                      BASIC: { 
                        emoji: '🌱', 
                        label: 'Entrenamiento Básico',
                        sublabel: 'Visión Prueba - Básico',
                        bgGradient: 'from-emerald-900/30 to-green-900/20',
                        borderColor: 'border-emerald-500/30',
                        iconBg: 'bg-emerald-500/20',
                        iconColor: 'text-emerald-400',
                        textColor: 'text-emerald-400'
                      },
                      ADVANCED: { 
                        emoji: '🔥', 
                        label: 'Entrenamiento Avanzado',
                        sublabel: 'Visión Prueba - Avanzado',
                        bgGradient: 'from-orange-900/30 to-red-900/20',
                        borderColor: 'border-orange-500/30',
                        iconBg: 'bg-orange-500/20',
                        iconColor: 'text-orange-400',
                        textColor: 'text-orange-400'
                      },
                      PL: { 
                        emoji: '👑', 
                        label: 'Programa Liderato',
                        sublabel: 'Visión Prueba - Liderato',
                        bgGradient: 'from-purple-900/30 to-pink-900/20',
                        borderColor: 'border-purple-500/30',
                        iconBg: 'bg-purple-500/20',
                        iconColor: 'text-purple-400',
                        textColor: 'text-purple-400'
                      }
                    };
                    
                    const config = levelConfig[producto.levelType] || levelConfig.BASIC;
                    
                    return (
                      <div 
                        key={producto.id}
                        className={`bg-gradient-to-br ${config.bgGradient} rounded-lg border ${config.borderColor} overflow-hidden hover:border-opacity-60 transition-all`}
                      >
                        {/* Header con emoji y título */}
                        <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-700/50">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{config.emoji}</span>
                            <div className="flex-1">
                              <h4 className="text-white font-bold text-sm">{config.label}</h4>
                              <p className="text-slate-400 text-xs">{config.sublabel}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Contenido */}
                        <div className="p-4 space-y-3">
                          {/* Fechas - Mostrar fines de semana para PL */}
                          {producto.levelType === 'PL' ? (
                            // Programa Liderato: Mostrar los 3 fines de semana
                            <div className="space-y-2">
                              {/* Fin de Semana 1 */}
                              {(producto.plWeekend1StartDate || producto.plWeekend1EndDate) && (
                                <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                                  <p className="text-xs font-semibold text-purple-300 mb-1">Fin de Semana 1</p>
                                  <div className="flex items-center gap-2">
                                    <Calendar className={`${config.iconColor} shrink-0`} size={14} />
                                    <span className="text-xs text-white">
                                      {producto.plWeekend1StartDate && new Date(producto.plWeekend1StartDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short'
                                      })}
                                      {producto.plWeekend1EndDate && ` - ${new Date(producto.plWeekend1EndDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Fin de Semana 2 */}
                              {(producto.plWeekend2StartDate || producto.plWeekend2EndDate) && (
                                <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                                  <p className="text-xs font-semibold text-purple-300 mb-1">Fin de Semana 2</p>
                                  <div className="flex items-center gap-2">
                                    <Calendar className={`${config.iconColor} shrink-0`} size={14} />
                                    <span className="text-xs text-white">
                                      {producto.plWeekend2StartDate && new Date(producto.plWeekend2StartDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short'
                                      })}
                                      {producto.plWeekend2EndDate && ` - ${new Date(producto.plWeekend2EndDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Fin de Semana 3 */}
                              {(producto.plWeekend3StartDate || producto.plWeekend3EndDate) && (
                                <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                                  <p className="text-xs font-semibold text-purple-300 mb-1">Fin de Semana 3</p>
                                  <div className="flex items-center gap-2">
                                    <Calendar className={`${config.iconColor} shrink-0`} size={14} />
                                    <span className="text-xs text-white">
                                      {producto.plWeekend3StartDate && new Date(producto.plWeekend3StartDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short'
                                      })}
                                      {producto.plWeekend3EndDate && ` - ${new Date(producto.plWeekend3EndDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Básico y Avanzado: Mostrar fechas normales
                            <div className="space-y-2">
                              {producto.startDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className={`${config.iconColor} shrink-0`} size={16} />
                                  <div className="flex-1">
                                    <span className="text-xs text-slate-400">Inicio:</span>
                                    <span className="text-sm text-white font-semibold ml-2">
                                      {new Date(producto.startDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {producto.endDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className={`${config.iconColor} shrink-0`} size={16} />
                                  <div className="flex-1">
                                    <span className="text-xs text-slate-400">Fin:</span>
                                    <span className="text-sm text-white font-semibold ml-2">
                                      {new Date(producto.endDate).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Entrenador(es) */}
                          {producto.levelType === 'PL' && producto.plTrainers && producto.plTrainers.length > 0 ? (
                            <div className="border-t border-slate-700/50 pt-3">
                              <p className="text-xs text-slate-400 mb-3">Entrenadores:</p>
                              <div className="space-y-3">
                                {producto.plTrainers.map((trainer: any, index: number) => (
                                  <div key={trainer.id} className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                    <p className="text-xs text-purple-300 font-semibold mb-2">
                                      Fin de Semana {index + 1} {index === 2 && '(Graduación)'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                      {trainer.imagen ? (
                                        <img 
                                          src={trainer.imagen} 
                                          alt={trainer.nombre}
                                          className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-white font-bold border-2 border-purple-500/30">
                                          {trainer.nombre.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-semibold truncate">{trainer.nombre}</p>
                                        <p className="text-xs text-purple-300 truncate">{trainer.email}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : producto.Trainer ? (
                            <div className="border-t border-slate-700/50 pt-3">
                              <div className="flex items-center gap-3">
                                {producto.Trainer.imagen ? (
                                  <img 
                                    src={producto.Trainer.imagen} 
                                    alt={producto.Trainer.nombre}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center text-white text-sm font-bold border-2 border-slate-700`}>
                                    {producto.Trainer.nombre.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-400">Entrenador:</p>
                                  <p className="text-sm text-white font-semibold truncate">
                                    {producto.Trainer.nombre}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          
                          {/* Ubicación */}
                          {producto.location && (
                            <div className="flex items-start gap-2 pt-2 border-t border-slate-700/50">
                              <MapPin className={`${config.iconColor} shrink-0 mt-0.5`} size={14} />
                              <div className="flex-1">
                                <p className="text-xs text-slate-400">Impacto Cuántico Monterrey</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Información del Coordinador */}
        {vision.Coordinador && (
          <div className="flex items-center gap-2 mb-8">
            <span className="text-sm text-purple-400 font-medium">Coordinador:</span>
            <span className="text-sm text-white">{vision.Coordinador.nombre}</span>
            <span className="text-sm text-slate-500">({vision.Coordinador.email})</span>
          </div>
        )}
        
        {/* Botones de Acción - Organizado por grupos */}
        <div className="flex flex-col gap-3">
          {/* Fila 1: Configuración y Gestión */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowEditAreasModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/30"
            >
              <Edit size={18} />
              Configurar Áreas
            </button>
            <button
              onClick={() => setShowExtendDateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/30"
            >
              <Calendar size={18} />
              Extender Fecha
            </button>
            <button
              onClick={() => setShowRandomAssignModal(true)}
              disabled={randomAssigning || (participantes.length === 0 && gameChangers.length === 0)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <Users size={18} />
              {randomAssigning ? 'Asignando...' : 'Asignación Aleatoria'}
            </button>
          </div>
          
          {/* Fila 2: Agregar Participantes */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/30"
            >
              <QrCode size={18} />
              Generar QR
            </button>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-cyan-500/30"
            >
              <Users size={18} />
              Agregar Game Changer
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/30"
            >
              <UserPlus size={18} />
              Agregar Participante
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {vision._count.Participantes}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes</p>
            {vision.maxParticipantes && (
              <p className="text-xs text-slate-500 mt-1">
                Límite: {vision.maxParticipantes}
              </p>
            )}
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {vision._count.GameChangers}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Team (GC)</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {totalWithLicense}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Con Licencia</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="text-red-400" size={24} />
              <span className="text-3xl font-bold text-red-400">
                {totalWithoutLicense}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Sin Licencia</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {availableCredits}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Licencias Disponibles</p>
          </div>
        </div>

        {/* Gestión de Mentores */}
        <div className="mb-8 bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl p-4">
                  <Users className="text-white" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Gestión de Mentores
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Asigna y administra los mentores para esta visión
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="bg-cyan-500/10 p-3 rounded-lg shrink-0">
                  <UserPlus className="text-cyan-400 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">Administra mentores de forma detallada</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Accede a la página de asignación de mentores para gestionar mentores profesionales y privados, 
                    ver disponibilidad de espacios, calcular costos del ciclo y más.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push(`/dashboard/school-admin/visiones/asignacion/${visionId}`)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                      <Users size={20} />
                      Contratar Mentores Calificados
                      <ArrowRight size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setShowMentoresPrivadosModal(true);
                        fetchLideres();
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                      <UserPlus size={20} />
                      Asignar Mentores Privados
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 💼 MENTORES PROFESIONALES CONTRATADOS */}
            {mentoresAsignados.filter(m => m.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'MENTOR').length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-500/30 overflow-hidden">
                <div className="bg-cyan-950/40 px-4 py-3 border-b border-cyan-500/20">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-2xl">💼</span>
                    Mentores Profesionales Contratados
                    <span className="text-sm font-normal text-cyan-400">
                      ({mentoresAsignados.filter(m => m.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'MENTOR').length})
                    </span>
                  </h3>
                  <p className="text-xs text-cyan-300/70 mt-1">
                    Mentores del marketplace asignados a esta visión
                  </p>
                </div>
                
                <div className="p-4 space-y-3">
                  {mentoresAsignados
                    .filter(mentor => mentor.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'MENTOR')
                    .map((mentor) => {
                      const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
                      const perfilMentor = usuario?.PerfilMentor;
                      
                      return (
                        <div 
                          key={`mentor-${mentor.id}`}
                          className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {usuario?.imagen ? (
                                <img 
                                  src={usuario.imagen} 
                                  alt={usuario.nombre}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/50"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'M'}
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-white font-bold">{usuario?.nombre}</h4>
                                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs font-medium">
                                    PROFESIONAL
                                  </span>
                                </div>
                                
                                <p className="text-sm text-slate-400 mt-0.5">{usuario?.email}</p>
                                
                                <div className="flex items-center gap-4 mt-2">
                                  {perfilMentor?.especialidad && (
                                    <div className="flex items-center gap-1 text-xs text-cyan-400">
                                      <span>🎯</span>
                                      <span>{perfilMentor.especialidad}</span>
                                    </div>
                                  )}
                                  
                                  {perfilMentor?.calificacionPromedio && (
                                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                                      <span>⭐</span>
                                      <span>{perfilMentor.calificacionPromedio.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoverMentor(mentor.mentorId, usuario?.nombre || 'Mentor')}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20"
                            >
                              Desasignar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 👑 MENTORES PRIVADOS (LIDER) */}
            {mentoresAsignados.filter(m => m.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'LIDER').length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-xl border border-emerald-500/30 overflow-hidden">
                <div className="bg-emerald-950/40 px-4 py-3 border-b border-emerald-500/20">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-2xl">👑</span>
                    Mentores Privados de la Organización
                    <span className="text-sm font-normal text-emerald-400">
                      ({mentoresAsignados.filter(m => m.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'LIDER').length})
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-300/70 mt-1">
                    Mentores internos de tu organización (sin costo adicional)
                  </p>
                </div>
                
                <div className="p-4 space-y-3">
                  {mentoresAsignados
                    .filter(mentor => mentor.Usuario_VisionMentor_mentorIdToUsuario?.rol === 'LIDER')
                    .map((mentor) => {
                      const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
                      const perfilMentor = usuario?.PerfilMentor;
                      
                      return (
                        <div 
                          key={`lider-${mentor.id}`}
                          className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {usuario?.imagen ? (
                                <img 
                                  src={usuario.imagen} 
                                  alt={usuario.nombre}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'L'}
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-white font-bold">{usuario?.nombre}</h4>
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs font-medium">
                                    INTERNO
                                  </span>
                                </div>
                                
                                <p className="text-sm text-slate-400 mt-0.5">{usuario?.email}</p>
                                
                                <div className="flex items-center gap-4 mt-2">
                                  {perfilMentor?.especialidad && (
                                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                                      <span>🎯</span>
                                      <span>{perfilMentor.especialidad}</span>
                                    </div>
                                  )}
                                  
                                  {perfilMentor?.calificacionPromedio && (
                                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                                      <span>⭐</span>
                                      <span>{perfilMentor.calificacionPromedio.toFixed(1)}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                                    <span>✅</span>
                                    <span>Sin costo adicional</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoverMentor(mentor.mentorId, usuario?.nombre || 'Mentor')}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20"
                            >
                              Desasignar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Reemplazo de Mentor */}
        {showReplaceMentorModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 z-10">
                <h3 className="text-2xl font-bold text-white mb-2">
                  ⚠️ Reemplazar Mentor
                </h3>
                <p className="text-slate-300">
                  Desasignando a <span className="font-semibold text-red-400">{mentorToReplace?.nombre}</span>
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Advertencia */}
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-red-400 font-bold mb-2">Consecuencias de esta acción:</h4>
                      <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                        <li>Se cancelarán TODAS las sesiones programadas del mentor con estudiantes de esta visión</li>
                        <li>Los estudiantes recibirán una notificación del cambio</li>
                        <li>Los estudiantes deberán reagendar con el nuevo mentor</li>
                        <li>El paquete de llamadas contratado permanecerá intacto</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Selección de nuevo mentor */}
                <div>
                  <h4 className="text-white font-bold mb-3">Selecciona el mentor de reemplazo:</h4>
                  
                  {loadingMentores ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
                      <p className="text-slate-400 mt-2">Cargando mentores disponibles...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {mentoresAsignados
                        .filter(m => m.mentorId !== mentorToReplace?.id)
                        .map((mentor) => {
                          const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
                          const perfilMentor = usuario?.PerfilMentor;
                          const isSelected = selectedReplacementMentor === mentor.mentorId;
                          
                          return (
                            <button
                              key={mentor.id}
                              onClick={() => setSelectedReplacementMentor(mentor.mentorId)}
                              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-500/10'
                                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {usuario?.imagen ? (
                                  <img
                                    src={usuario.imagen}
                                    alt={usuario.nombre}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                    {usuario?.nombre?.charAt(0)?.toUpperCase() || 'M'}
                                  </div>
                                )}
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-white font-semibold">{usuario?.nombre}</h5>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      usuario?.rol === 'LIDER'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-cyan-500/20 text-cyan-300'
                                    }`}>
                                      {usuario?.rol === 'LIDER' ? 'INTERNO' : 'PROFESIONAL'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-400">{usuario?.email}</p>
                                  
                                  {perfilMentor?.especialidad && (
                                    <p className="text-xs text-cyan-400 mt-1">
                                      🎯 {perfilMentor.especialidad}
                                    </p>
                                  )}
                                </div>
                                
                                {isSelected && (
                                  <div className="text-cyan-400">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      
                      {mentoresAsignados.filter(m => m.mentorId !== mentorToReplace?.id).length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <p>No hay otros mentores asignados a esta visión.</p>
                          <p className="text-sm mt-2">Primero debes contratar o asignar otro mentor.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowReplaceMentorModal(false);
                    setMentorToReplace(null);
                    setSelectedReplacementMentor(null);
                  }}
                  disabled={replacingMentor}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReplaceMentor}
                  disabled={!selectedReplacementMentor || replacingMentor}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replacingMentor ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Reemplazando...
                    </span>
                  ) : (
                    'Confirmar Reemplazo'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participantes List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Participantes</h2>
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">
                  {selectedUsers.size} seleccionado(s)
                </span>
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  disabled={availableCredits < selectedUsers.size}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  <Key size={16} />
                  Asignar {selectedUsers.size} Licencia(s)
                </button>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {participantes.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay participantes</p>
              <p className="text-slate-500 text-sm mb-6">
                Agrega participantes a esta visión para gestionar sus licencias
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                <UserPlus size={20} />
                Agregar Primer Participante
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size > 0 && selectedUsers.size === participantes.filter(p => !p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode).length + gameChangers.filter(gc => !gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode).length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Participante
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Mentor Asignado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Game Changer
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Estado Licencia
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {participantes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center">
                        {!p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(p.Usuario_VisionParticipante_participanteIdToUsuario.id)}
                            onChange={() => handleToggleUser(p.Usuario_VisionParticipante_participanteIdToUsuario.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{p.Usuario_VisionParticipante_participanteIdToUsuario.nombre}</p>
                          <p className="text-xs text-slate-500">{p.Usuario_VisionParticipante_participanteIdToUsuario.email}</p>
                          {p.Usuario_VisionParticipante_participanteIdToUsuario.telefono && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              {p.Usuario_VisionParticipante_participanteIdToUsuario.telefono}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          p.Usuario_VisionParticipante_participanteIdToUsuario.tier === 'PREMIUM'
                            ? 'bg-purple-900/20 text-purple-400 border border-purple-600'
                            : 'bg-cyan-900/20 text-cyan-400 border border-cyan-600'
                        }`}>
                          {p.Usuario_VisionParticipante_participanteIdToUsuario.tier || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Usuario_VisionParticipante_participanteIdToUsuario.Usuario_Usuario_assignedMentorIdToUsuario ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-400">
                              {p.Usuario_VisionParticipante_participanteIdToUsuario.Usuario_Usuario_assignedMentorIdToUsuario.nombre}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenAssignMentorModal(p.Usuario_VisionParticipante_participanteIdToUsuario.id, 'PARTICIPANTE', p.Usuario_VisionParticipante_participanteIdToUsuario.nombre, !!p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode, true)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                <Users size={12} />
                                Cambiar
                              </button>
                              <button
                                onClick={() => handleRemoverMentorDeUsuario(p.Usuario_VisionParticipante_participanteIdToUsuario.id, 'PARTICIPANTE', p.Usuario_VisionParticipante_participanteIdToUsuario.nombre)}
                                className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                                title="Remover mentor"
                              >
                                <XCircle size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignMentorModal(p.Usuario_VisionParticipante_participanteIdToUsuario.id, 'PARTICIPANTE', p.Usuario_VisionParticipante_participanteIdToUsuario.nombre, !!p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Users size={14} />
                            Asignar Mentor
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Usuario_VisionParticipante_gameChangerIdToUsuario ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-cyan-400 font-medium">
                              {p.Usuario_VisionParticipante_gameChangerIdToUsuario.nombre}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedParticipanteForGC(p);
                                  setShowGameChangerModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                <Users size={12} />
                                Cambiar
                              </button>
                              <button
                                onClick={() => handleAssignGameChanger(p.Usuario_VisionParticipante_participanteIdToUsuario.id, null)}
                                className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                                title="Remover game changer"
                              >
                                <XCircle size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedParticipanteForGC(p);
                              setShowGameChangerModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Users size={14} />
                            Asignar GC
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode ? (
                          p.Usuario_VisionParticipante_participanteIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].activatedAt ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs font-medium">
                              <CheckCircle size={14} />
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/20 text-amber-400 border border-amber-600 rounded-full text-xs font-medium">
                              <Clock size={14} />
                              Pendiente
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 border border-red-600 rounded-full text-xs font-medium">
                            <XCircle size={14} />
                            Sin licencia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <code className="px-3 py-1.5 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 font-mono font-semibold tracking-wide">
                              {p.Usuario_VisionParticipante_participanteIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].licenseCode}
                            </code>
                            <button
                              onClick={() => copyToClipboard(p.Usuario_VisionParticipante_participanteIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].licenseCode)}
                              className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all"
                              title="Copiar código"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditPhone(p.Usuario_VisionParticipante_participanteIdToUsuario.id, p.Usuario_VisionParticipante_participanteIdToUsuario.nombre, p.Usuario_VisionParticipante_participanteIdToUsuario.telefono)}
                            className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors"
                            title="Editar teléfono"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          </button>
                          {!p.Usuario_VisionParticipante_participanteIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode && (
                            <button
                              onClick={() => {
                                setSelectedParticipante(p);
                                setShowAssignModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Key size={14} />
                              Asignar Licencia
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveParticipante(p.id)}
                            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Game Changers (Team) List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Team (Game Changers)</h2>
          </div>

          {gameChangers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay game changers</p>
              <p className="text-slate-500 text-sm mb-6">
                Agrega game changers (equipo) a esta visión
              </p>
              <button
                onClick={() => setShowAddTeamModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Users size={20} />
                Agregar Primer Game Changer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase w-12">
                      {/* Espacio para checkbox */}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Game Changer
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Mentor Asignado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Estado Licencia
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gameChangers.map((gc) => (
                    <tr key={gc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center">
                        {!gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id)}
                            onChange={() => handleToggleUser(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre}</p>
                          <p className="text-xs text-slate-500">{gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.email}</p>
                          {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.telefono && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.telefono}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.tier === 'PREMIUM'
                            ? 'bg-purple-900/20 text-purple-400 border border-purple-600'
                            : 'bg-cyan-900/20 text-cyan-400 border border-cyan-600'
                        }`}>
                          {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.tier || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.Usuario_Usuario_assignedMentorIdToUsuario ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-400">
                              {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.Usuario_Usuario_assignedMentorIdToUsuario.nombre}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenAssignMentorModal(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id, 'GAMECHANGER', gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre, !!gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode, true)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                <Users size={12} />
                                Cambiar
                              </button>
                              <button
                                onClick={() => handleRemoverMentorDeUsuario(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id, 'GAMECHANGER', gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre)}
                                className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                                title="Remover mentor"
                              >
                                <XCircle size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignMentorModal(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id, 'GAMECHANGER', gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre, !!gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Users size={14} />
                            Asignar Mentor
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode ? (
                          gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].activatedAt ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs font-medium">
                              <CheckCircle size={14} />
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/20 text-amber-400 border border-amber-600 rounded-full text-xs font-medium">
                              <Clock size={14} />
                              Pendiente
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 border border-red-600 rounded-full text-xs font-medium">
                            <XCircle size={14} />
                            Sin licencia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <code className="px-3 py-1.5 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 font-mono font-semibold tracking-wide">
                              {gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].licenseCode}
                            </code>
                            <button
                              onClick={() => copyToClipboard(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.LicenseAssignment_LicenseAssignment_userIdToUsuario[0].licenseCode)}
                              className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all"
                              title="Copiar código"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditPhone(gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id, gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre, gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.telefono)}
                            className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors"
                            title="Editar teléfono"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          </button>
                          {!gc.Usuario_VisionGameChanger_gameChangerIdToUsuario?.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0]?.licenseCode && (
                            <button
                              onClick={() => {
                                setSelectedGameChanger(gc);
                                setShowAssignModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Key size={14} />
                              Asignar Licencia
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveParticipante(gc.id)}
                            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Add Mentor Modal */}
      {showAddMentorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-2">
              Asignar Mentor de Disciplina
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Selecciona un mentor activo con horarios configurados para llamadas de disciplina
            </p>

            {mentoresDisponibles.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <p className="text-slate-300 text-lg mb-2">No hay mentores disponibles</p>
                <p className="text-slate-500 text-sm">
                  Todos los mentores activos ya están asignados o no tienen horarios de disciplina configurados
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {mentoresDisponibles.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {mentor.imagen ? (
                        <img
                          src={mentor.imagen}
                          alt={mentor.nombre}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                          {mentor.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{mentor.nombre}</p>
                        <p className="text-xs text-slate-400">{mentor.email}</p>
                        {!mentor.tieneHorarios && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle size={12} className="text-amber-500" />
                            <span className="text-xs text-amber-500">Sin horarios de disciplina configurados</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAsignarMentor(mentor.id)}
                      disabled={!mentor.tieneHorarios || assigningMentorId === mentor.id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      {!mentor.tieneHorarios ? 'No disponible' : assigningMentorId === mentor.id ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddMentorModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participante Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Agregar Participante
            </h2>

            <div className="mb-4">
              <textarea
                className="w-full min-h-[120px] bg-slate-800 border border-slate-700 rounded-lg text-white p-3 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="Ingresa uno o varios correos, separados por coma o salto de línea"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">Se crearán cuentas nuevas para los correos que no existan. Contraseña temporal: <span className="font-mono">Quantum123</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmailInput('');
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEmails}
                disabled={emailProcessing || !emailInput.trim()}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {emailProcessing ? 'Agregando...' : 'Agregar Participantes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team (Game Changers) Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Agregar Team (Game Changers)
            </h2>

            <div className="mb-4">
              <textarea
                className="w-full min-h-[120px] bg-slate-800 border border-slate-700 rounded-lg text-white p-3 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                placeholder="Ingresa uno o varios correos de Game Changers, separados por coma o salto de línea"
                value={teamEmailInput}
                onChange={e => setTeamEmailInput(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">Se crearán cuentas Game Changer para los correos que no existan. Contraseña temporal: <span className="font-mono">Quantum123</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAddTeamModal(false);
                  setTeamEmailInput('');
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTeam}
                disabled={teamEmailProcessing || !teamEmailInput.trim()}
                className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {teamEmailProcessing ? 'Agregando...' : 'Agregar Game Changers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignModal && (selectedParticipante || selectedGameChanger) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Asignar Licencia
            </h2>

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">
                {selectedParticipante ? 'Participante:' : 'Game Changer:'}
              </p>
              <p className="font-semibold text-white">
                {selectedParticipante?.Usuario_VisionParticipante_participanteIdToUsuario.nombre || selectedGameChanger?.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre}
              </p>
              <p className="text-sm text-slate-400">
                {selectedParticipante?.Usuario_VisionParticipante_participanteIdToUsuario.email || selectedGameChanger?.Usuario_VisionGameChanger_gameChangerIdToUsuario.email}
              </p>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Licencias disponibles:</span>
                <span className="text-2xl font-bold text-cyan-400">{availableCredits}</span>
              </div>
            </div>

            {availableCredits < 1 && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm">
                    No tienes licencias disponibles. Compra más licencias primero.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedParticipante(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignLicense}
                disabled={availableCredits < 1 || processing}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {processing ? 'Asignando...' : 'Asignar Licencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Licenses Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Asignar Licencias Masivamente
            </h2>

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300">Usuarios seleccionados:</span>
                <span className="text-2xl font-bold text-cyan-400">{selectedUsers.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Licencias disponibles:</span>
                <span className="text-2xl font-bold text-emerald-400">{availableCredits}</span>
              </div>
            </div>

            {selectedUsers.size > availableCredits && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm">
                    No tienes suficientes licencias. Necesitas {selectedUsers.size} pero solo tienes {availableCredits} disponibles.
                  </p>
                </div>
              </div>
            )}

            {selectedUsers.size <= availableCredits && (
              <div className="bg-cyan-900/20 border border-cyan-600 rounded-lg p-4 mb-6">
                <p className="text-sm text-cyan-300">
                  Se asignarán <span className="font-bold">{selectedUsers.size} licencia(s) PREMIUM</span> a los usuarios seleccionados.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                disabled={bulkAssigning}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkAssignLicenses}
                disabled={selectedUsers.size > availableCredits || bulkAssigning}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {bulkAssigning ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" size={16} />
                    Asignando...
                  </span>
                ) : (
                  'Confirmar Asignación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Asignación Aleatoria */}
      {showRandomAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-indigo-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-full mx-auto mb-6">
              <Users size={32} className="text-indigo-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Asignación Aleatoria
            </h2>
            
            <p className="text-slate-300 text-center mb-6 leading-relaxed">
              ¿Asignar mentores aleatoriamente a todos los participantes y game changers con licencia?
            </p>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-amber-400 mb-1">Importante:</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>• Los usuarios que ya tienen mentor asignado no serán afectados</li>
                    <li>• Solo se asignarán usuarios con licencia activa</li>
                    <li>• Los mentores serán distribuidos equitativamente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRandomAssignModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignacionAleatoria}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-indigo-500/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cambio de Mentor */}
      {showMentorChangeModal && mentorChangeData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-amber-600/20 rounded-full mx-auto mb-6">
              <AlertCircle size={32} className="text-amber-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              {mentorChangeData.action === 'remove' ? 'Remover Mentor' : 'Cambiar Mentor'}
            </h2>
            
            <p className="text-slate-300 text-center mb-6 leading-relaxed">
              <span className="font-semibold text-white">{mentorChangeData.userName}</span> tiene llamadas de disciplina programadas.
            </p>
            
            <div className="bg-slate-800/50 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-amber-400 mb-2">Impacto en el ciclo:</p>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span><strong className="text-white">{mentorChangeData.scheduledCalls}</strong> llamada(s) programada(s) serán canceladas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <span><strong className="text-white">{mentorChangeData.remainingWeeks}</strong> semana(s) pendiente(s) del ciclo</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
                <p className="text-sm text-indigo-300 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    El usuario será notificado para que reagende sus llamadas con {mentorChangeData.action === 'remove' ? 'su nuevo' : 'el nuevo'} mentor asignado.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowMentorChangeModal(false);
                  setMentorChangeData(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (mentorChangeData.action === 'remove') {
                    confirmRemoveMentor(mentorChangeData.userId, mentorChangeData.userType);
                  } else {
                    setShowMentorChangeModal(false);
                    router.push(`/dashboard/school-admin/visiones/${visionId}/asignar-mentor/${mentorChangeData.userId}`);
                  }
                }}
                className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-amber-500/20"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Extender Fecha */}
      {showExtendDateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-600/20 rounded-full mx-auto mb-6">
              <Calendar size={32} className="text-emerald-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Extender Fecha de Visión
            </h2>
            
            <p className="text-slate-300 text-center mb-6 leading-relaxed">
              Al extender la fecha, el sistema actualizará automáticamente los programas de todos los usuarios e intentará agendar las llamadas adicionales.
            </p>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-200 font-semibold mb-1">Límite de extensión</p>
                  <p className="text-amber-100/80">
                    La fecha solo puede extenderse hasta 30 días después de la fecha original de finalización.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-4 mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nueva Fecha de Finalización
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">
                <AlertCircle size={12} className="inline mr-1" />
                Los usuarios serán notificados si hay conflictos de horario
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowExtendDateModal(false);
                  setNewEndDate('');
                }}
                disabled={extendingDate}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtendDate}
                disabled={extendingDate || !newEndDate}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg shadow-emerald-500/20"
              >
                {extendingDate ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Extender'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Áreas */}
      {showEditAreasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mx-auto mb-6">
              <Users size={32} className="text-purple-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Configurar Áreas Obligatorias
            </h2>
            
            <p className="text-slate-300 text-center mb-6 leading-relaxed">
              Estas áreas serán obligatorias para todos los participantes en el Wizard de Carta F.R.U.T.O.S.
            </p>

            {areasConfigLocked && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-amber-400 font-semibold text-sm mb-1">
                      ⚠️ Configuración Bloqueada
                    </h3>
                    <p className="text-amber-200/80 text-sm leading-relaxed">
                      No se pueden modificar las áreas porque hay participantes que ya iniciaron su ciclo con el wizard. 
                      Cambiar la configuración ahora podría afectar su progreso.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Área de Finanzas */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      💰 Finanzas
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Declaración y meta de abundancia financiera
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={areasConfigLocked}
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceFinanzasArea: !areasConfig.forceFinanzasArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-centers rounded-full transition-colors ${
                      areasConfig.forceFinanzasArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    } ${areasConfigLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceFinanzasArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Relaciones */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      ❤️ Relaciones
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Construcción de vínculos genuinos y significativos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceRelacionesArea: !areasConfig.forceRelacionesArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceRelacionesArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceRelacionesArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Talentos */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      🎨 Talentos
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Desarrollo de habilidades y creatividad personal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceTalentosArea: !areasConfig.forceTalentosArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceTalentosArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceTalentosArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Salud */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      💪 Salud
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Cuidado del bienestar físico y energía vital
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceSaludArea: !areasConfig.forceSaludArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceSaludArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceSaludArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Paz Mental */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      🧘 Paz Mental
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Cultivo de serenidad y equilibrio emocional
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forcePazMentalArea: !areasConfig.forcePazMentalArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forcePazMentalArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forcePazMentalArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Ocio */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      🎮 Ocio
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Disfrute consciente y tiempo de descanso
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceOcioArea: !areasConfig.forceOcioArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceOcioArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceOcioArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Área de Servicio a Transformación */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      🎯 Servicio a Transformación (Invitados)
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Los participantes deberán invitar personas al programa
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceTransformationArea: !areasConfig.forceTransformationArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceTransformationArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceTransformationArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {areasConfig.forceTransformationArea && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Meta de invitados efectivos *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={areasConfig.transformationGuestsTarget}
                      onChange={(e) =>
                        setAreasConfig({
                          ...areasConfig,
                          transformationGuestsTarget: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-amber-400 text-xs mt-2 flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <span>
                        Esto creará <strong>{areasConfig.transformationGuestsTarget} tareas bloqueadas</strong> en el Wizard.
                        Los primeros {Math.ceil(areasConfig.transformationGuestsTarget / 2)} invitados deberán completarse antes de la mitad del ciclo.
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Área de Servicio Comunitario */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-white flex items-center gap-2">
                      🤝 Servicio Comunitario
                    </label>
                    <p className="text-slate-400 text-sm mt-1">
                      Los participantes deberán definir acciones de servicio a su comunidad
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreasConfig({
                        ...areasConfig,
                        forceCommunityServiceArea: !areasConfig.forceCommunityServiceArea,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      areasConfig.forceCommunityServiceArea
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        areasConfig.forceCommunityServiceArea
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setShowEditAreasModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                {areasConfigLocked ? 'Cerrar' : 'Cancelar'}
              </button>
              {!areasConfigLocked && (
                <button
                  onClick={handleUpdateAreasConfig}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-purple-500/20"
                >
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asignar Game Changer */}
      {showGameChangerModal && selectedParticipanteForGC && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-cyan-600/20 rounded-full mx-auto mb-6">
              <Users size={32} className="text-cyan-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Asignar Game Changer
            </h2>
            
            <p className="text-slate-300 text-center mb-6">
              Selecciona un Game Changer para <strong>{selectedParticipanteForGC.Usuario_VisionParticipante_participanteIdToUsuario.nombre}</strong>
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
              {gameChangers.map((gc) => (
                <button
                  key={gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id}
                  onClick={() => handleAssignGameChanger(selectedParticipanteForGC.Usuario_VisionParticipante_participanteIdToUsuario.id, gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id)}
                  disabled={assigningGameChanger}
                  className="w-full p-4 bg-slate-800/50 hover:bg-cyan-600/20 border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.nombre}</p>
                      <p className="text-xs text-slate-400">{gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.email}</p>
                    </div>
                    {selectedParticipanteForGC.gameChangerId === gc.Usuario_VisionGameChanger_gameChangerIdToUsuario.id && (
                      <CheckCircle className="text-green-400" size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGameChangerModal(false);
                  setSelectedParticipanteForGC(null);
                }}
                disabled={assigningGameChanger}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Asignación Aleatoria */}
      {showRandomAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-200">
            {/* Icon Header */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto shadow-lg shadow-indigo-500/50 rotate-3 hover:rotate-0 transition-transform duration-300">
                <Users size={36} className="text-white" />
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-bold text-white text-center mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Asignación Aleatoria
            </h2>
            
            {/* Description */}
            <p className="text-slate-300 text-center mb-6 leading-relaxed text-base">
              Se asignarán <span className="font-semibold text-indigo-400">aleatoriamente</span> mentores y game changers a todos los participantes que no tengan asignación.
            </p>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-5 mb-6 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mt-0.5">
                  <AlertCircle className="text-indigo-400" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-indigo-200 font-medium mb-1">
                    Requisitos para la asignación:
                  </p>
                  <ul className="text-sm text-indigo-300/90 space-y-1 list-disc list-inside">
                    <li>Los mentores deben tener horarios configurados</li>
                    <li>Los game changers deben estar agregados a la visión</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRandomAssignModal(false)}
                disabled={randomAssigning}
                className="flex-1 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all duration-200 border border-slate-700 hover:border-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleRandomAssignment}
                disabled={randomAssigning}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {randomAssigning ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Asignando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Teléfono */}
      {showEditPhoneModal && editPhoneData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-blue-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mx-auto mb-6">
              <svg className="text-blue-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Editar Teléfono
            </h2>
            
            <p className="text-slate-300 text-center mb-6">
              Actualiza el teléfono de <strong>{editPhoneData.userName}</strong>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Número de Teléfono
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-400 mt-2">
                Incluye el código de país para mejor formato
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditPhoneModal(false);
                  setEditPhoneData(null);
                  setNewPhone('');
                }}
                disabled={savingPhone}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {savingPhone ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Remoción de Mentor */}
      {showMentorChangeModal && mentorChangeData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mx-auto mb-6">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              ⚠️ Confirmar Remoción de Mentor
            </h2>
            
            <p className="text-slate-300 text-center mb-6">
              Estás a punto de remover el mentor asignado a <strong className="text-white">{mentorChangeData.userName}</strong>
            </p>

            {/* Banner de advertencia sobre impacto */}
            <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/20 p-3 rounded-lg shrink-0">
                  <AlertCircle className="text-amber-400 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-400 mb-2">
                    Impacto en Llamadas de Mentoría
                  </h3>
                  <div className="text-slate-300 space-y-2 text-sm leading-relaxed">
                    <p><strong className="text-white">Al remover este mentor:</strong></p>
                    <ul className="list-disc list-inside space-y-1.5 ml-2 text-slate-300">
                      <li>
                        <strong className="text-amber-400">Todas las llamadas agendadas</strong> entre el mentor y el participante serán <strong className="text-red-400">canceladas automáticamente</strong>
                      </li>
                      <li>
                        El <strong className="text-cyan-400">participante recibirá una notificación</strong> informándole del cambio
                      </li>
                      <li>
                        El participante deberá <strong className="text-purple-400">reagendar sus sesiones de mentoría</strong> con el nuevo mentor asignado
                      </li>
                      <li>
                        Se recomienda <strong className="text-emerald-400">comunicar este cambio con anticipación</strong> para minimizar interrupciones
                      </li>
                    </ul>

                    {mentorChangeData.scheduledCalls > 0 && (
                      <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <p className="text-red-300 font-semibold flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <span>
                            Este mentor tiene <strong className="text-red-400">{mentorChangeData.scheduledCalls} llamada(s) programada(s)</strong> que serán canceladas
                          </span>
                        </p>
                        <p className="text-red-400 text-xs mt-2">
                          Semanas restantes del ciclo: <strong>{mentorChangeData.remainingWeeks}</strong>
                        </p>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                      <p className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-cyan-400 shrink-0">💡</span>
                        <span>
                          <strong className="text-white">Sugerencia:</strong> Asegúrate de tener un nuevo mentor listo para asignar inmediatamente después de esta remoción.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMentorChangeModal(false);
                  setMentorChangeData(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (mentorChangeData) {
                    await confirmRemoveMentor(mentorChangeData.userId, mentorChangeData.userType);
                  }
                }}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                <span>Confirmar Remoción</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Code */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-pink-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center w-16 h-16 bg-pink-600/20 rounded-full mx-auto mb-6">
              <QrCode className="text-pink-400" size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              QR de Registro Automático
            </h2>
            
            <p className="text-slate-300 text-center mb-6">
              Genera un código QR para que los usuarios se registren automáticamente en <strong>{vision?.nombre}</strong>
            </p>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-2">¿Cómo funciona?</p>
                  <ul className="space-y-1 list-disc list-inside text-blue-300/90">
                    <li>Los usuarios escanean el QR o acceden al link</li>
                    <li>Se registran con correo, contraseña y teléfono (WhatsApp)</li>
                    <li>Se asignan automáticamente a esta visión</li>
                    <li>Reciben una licencia en estado "Pendiente"</li>
                    <li>El límite de registros está relacionado con las licencias disponibles</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Registros actuales</p>
                <p className="text-2xl font-bold text-white">{vision?._count?.Participantes || 0}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Límite de visión</p>
                <p className="text-2xl font-bold text-pink-400">{vision?.maxParticipantes || 'Sin límite'}</p>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="mb-6">
                <div className="bg-white p-6 rounded-xl mb-4 flex items-center justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-slate-400 text-sm mb-2">Link de registro:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/registro/${vision?.id}`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/registro/${vision?.id}`);
                        showToast({ message: 'Link copiado', type: 'success' });
                      }}
                      className="p-2 bg-pink-600 hover:bg-pink-700 text-white rounded transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCodeUrl;
                    link.download = `qr-registro-${vision?.nombre?.replace(/\s+/g, '-')}.png`;
                    link.click();
                  }}
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>Descargar QR</span>
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setQrCodeUrl('');
                }}
                disabled={generatingQR}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
              {!qrCodeUrl && (
                <button
                  onClick={async () => {
                    try {
                      setGeneratingQR(true);
                      const res = await fetch(`/api/visiones/${visionId}/generate-qr`, {
                        method: 'POST',
                      });
                      const data = await res.json();
                      
                      if (data.success) {
                        setQrCodeUrl(data.qrCodeUrl);
                        showToast({ message: 'QR generado exitosamente', type: 'success' });
                      } else {
                        showToast({ message: data.error || 'Error al generar QR', type: 'error' });
                      }
                    } catch (error) {
                      showToast({ message: 'Error al generar QR', type: 'error' });
                    } finally {
                      setGeneratingQR(false);
                    }
                  }}
                  disabled={generatingQR}
                  className="flex-1 px-4 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {generatingQR ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <QrCode size={18} />
                      <span>Generar QR</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignar Mentores Privados */}
      {showMentoresPrivadosModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-3">
                  <UserPlus className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Asignar Mentores Privados</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Selecciona líderes de tu organización para asignarlos como mentores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMentoresPrivadosModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {loadingLideres ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-purple-400" size={48} />
              </div>
            ) : lideres.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="mx-auto text-slate-600 mb-4" size={64} />
                <p className="text-slate-400 text-lg mb-2">No hay mentores privados disponibles</p>
                <p className="text-slate-500 text-sm">
                  Agrega usuarios con rol Mentor/Lider en tu organización para poder asignarlos como mentores privados
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lideres.map((lider) => {
                  const yaAsignado = mentoresAsignados.some(
                    m => m.mentorId === lider.id
                  );
                  const estaAsignando = asignandoMentor === lider.id;

                  return (
                    <div
                      key={lider.id}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {lider.profileImage ? (
                          <img
                            src={lider.profileImage}
                            alt={lider.nombre}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                            {lider.nombre?.charAt(0)?.toUpperCase() || 'L'}
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            {lider.nombre}
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                              👑 LÍDER
                            </span>
                          </h3>
                          <p className="text-slate-400 text-sm">{lider.email}</p>
                          {lider.totalMentorados > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {lider.totalMentorados} participante(s) activo(s)
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        {yaAsignado ? (
                          <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium flex items-center gap-2">
                            <CheckCircle size={16} />
                            Ya asignado
                          </span>
                        ) : (
                          <button
                            onClick={() => asignarMentorPrivado(lider.id)}
                            disabled={estaAsignando}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                          >
                            {estaAsignando ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Asignando...
                              </>
                            ) : (
                              <>
                                <UserPlus size={16} />
                                Asignar
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowMentoresPrivadosModal(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
