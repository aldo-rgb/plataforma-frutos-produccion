'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Crown,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileSignature,
  Shield,
  Sparkles,
  Star,
  Check,
  X,
  Search,
  Bell,
  UserPlus,
  BookOpen,
  Wallet,
  Shirt,
  GraduationCap,
  Heart,
  BookMarked,
  UtensilsCrossed,
  Sparkle,
  Scale,
  PartyPopper,
  LucideIcon,
  Pencil,
  Target,
} from 'lucide-react';

// Tipos
interface TribePromise {
  id: number;
  title: string;
  description: string;
}

interface CaptaincyAssignment {
  id: number;
  userId: number;
  userName: string;
  userImage: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REMOVED';
  acceptedAt: string | null;
}

interface Captaincy {
  roleType: string;
  name: string;
  description: string;
  mission: string;
  widgetType: string;
  widgetName: string;
  icon: string;
  maxCaptains: number;
  permissions: string[];
  captaincyId: number | null;
  isActive: boolean;
  assignments: CaptaincyAssignment[];
  confirmedCount: number;
  pendingCount: number;
}

interface TribeMember {
  id: number;
  nombre: string;
  profileImage: string | null;
  email: string;
}

interface UserAssignment {
  roleType: string;
  status: string;
  permissions: any;
}

interface PendingNotification {
  id: number;
  title: string;
  message: string;
  roleType: string;
  assignmentId: number;
  createdAt: string;
}

interface LegacyBuilderData {
  hasAccess: boolean;
  message?: string;
  userId: number;
  userName: string;
  isStaff: boolean;
  visionId: number;
  visionName: string;
  tribeMission: string | null;
  oathSigned: boolean;
  oathSignedAt: string | null;
  promises: TribePromise[];
  captaincies: Captaincy[];
  userAssignments: UserAssignment[];
  pendingNotifications: PendingNotification[];
  tribeMembers: TribeMember[];
}

// Mapeo de iconos por tipo de rol
const roleIcons: Record<string, LucideIcon> = {
  TRIBE_CAPTAIN: Crown,
  TRIBE_CO_CAPTAIN: Crown,
  TREASURER: Wallet,
  SHIRTS_LOGO: Shirt,
  CONTRIBUTION_BASIC: GraduationCap,
  CONTRIBUTION_ADVANCED: GraduationCap,
  COMMUNITY_SERVICE: Heart,
  BOOKS_MOVIES: BookMarked,
  FOOD: UtensilsCrossed,
  CLEANLINESS: Sparkle,
  CONTEXT_GUARDIAN: Scale,
  GRADUATION_CAPTAIN: PartyPopper,
};

export default function LegacyVisionBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const visionIdParam = searchParams.get('visionId');
  
  const [data, setData] = useState<LegacyBuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [signing, setSigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [nominating, setNominating] = useState(false);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  
  // Modal para detalles de nominación
  const [nominationModal, setNominationModal] = useState<{
    show: boolean;
    notification: PendingNotification | null;
  }>({ show: false, notification: null });

  // Modal para capturar la misión de la tribu
  const [missionModal, setMissionModal] = useState<{
    show: boolean;
    loading: boolean;
  }>({ show: false, loading: false });
  const [tribeMission, setTribeMission] = useState('');

  // Estado para editar misión existente
  const [editingMission, setEditingMission] = useState(false);
  const [editMissionText, setEditMissionText] = useState('');
  const [savingMission, setSavingMission] = useState(false);

  // Modal para crear campaña de Legacy Builder (COMMUNITY_SERVICE)
  const [campaignModal, setCampaignModal] = useState<{
    show: boolean;
    loading: boolean;
    existingCampaign: any | null;
    formData: {
      title: string;
      description: string;
      story: string;
      goalAmount: string;
      videoUrl: string;
    };
  }>({
    show: false,
    loading: false,
    existingCampaign: null,
    formData: {
      title: '',
      description: '',
      story: '',
      goalAmount: '50000',
      videoUrl: ''
    }
  });
  
  const promisesContainerRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, visionIdParam]);

  useEffect(() => {
    if (data?.oathSigned) {
      setCurrentPhase(2);
    }
  }, [data?.oathSigned]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = visionIdParam 
        ? `/api/legacy-vision-builder?visionId=${visionIdParam}`
        : '/api/legacy-vision-builder';
      const res = await fetch(url);
      const result = await res.json();

      if (res.ok) {
        setData(result);
        if (result.oathSigned) {
          setCurrentPhase(2);
        }
      } else {
        showToast(result.error || 'Error al cargar datos', 'error');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setScrolledToBottom(isAtBottom);
  };

  const handleSignOath = async () => {
    if (!signatureText.trim() || signatureText.trim().length < 3) {
      showToast('Por favor escribe tu nombre completo', 'error');
      return;
    }

    setSigning(true);
    try {
      const res = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign_oath',
          visionId: data?.visionId,
          signatureText: signatureText.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('🎉 ' + result.message, 'success');
        await fetchData();
        setCurrentPhase(2);
      } else {
        showToast(result.error || 'Error al firmar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSigning(false);
    }
  };

  const handleNominateCapitan = async (userId: number) => {
    if (!selectedRole) return;

    setNominating(true);
    try {
      const res = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'nominate_captain',
          visionId: data?.visionId,
          roleType: selectedRole,
          nominatedUserId: userId,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('✅ ' + result.message, 'success');
        await fetchData();
        setSelectedRole(null);
      } else {
        showToast(result.error || 'Error al nominar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setNominating(false);
    }
  };

  const handleRespondNomination = async (assignmentId: number, accept: boolean) => {
    setRespondingTo(assignmentId);
    try {
      const res = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_nomination',
          visionId: data?.visionId,
          assignmentId,
          accept,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast(accept ? '🎉 ' + result.message : result.message, accept ? 'success' : 'info');
        await fetchData();
      } else {
        showToast(result.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setRespondingTo(null);
    }
  };

  const handleRemoveCaptain = async (assignmentId: number) => {
    try {
      const res = await fetch(`/api/legacy-vision-builder?assignmentId=${assignmentId}&visionId=${data?.visionId}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (res.ok) {
        showToast('✅ ' + result.message, 'success');
        await fetchData();
      } else {
        showToast(result.error || 'Error', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  // Función para reclamar la capitanía de tribu - ahora abre modal para misión
  const handleClaimTribeCaptain = async () => {
    // Primero mostrar el modal para capturar la misión
    setMissionModal({ show: true, loading: false });
  };

  // Función para confirmar reclamación con misión
  const handleConfirmClaimWithMission = async () => {
    if (!tribeMission.trim()) {
      showToast('Por favor escribe la misión de tu tribu', 'error');
      return;
    }

    setMissionModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_tribe_captain',
          visionId: data?.visionId,
          tribeMission: tribeMission.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('👑 ' + result.message, 'success');
        setMissionModal({ show: false, loading: false });
        setTribeMission('');
        await fetchData();
      } else {
        showToast(result.error || 'Error al reclamar capitanía', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setMissionModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Función para guardar misión editada
  const handleSaveMission = async () => {
    if (!editMissionText.trim()) {
      showToast('La misión no puede estar vacía', 'error');
      return;
    }

    setSavingMission(true);
    try {
      const res = await fetch('/api/legacy-vision-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_mission',
          visionId: data?.visionId,
          tribeMission: editMissionText.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('✅ Misión actualizada', 'success');
        setEditingMission(false);
        await fetchData();
      } else {
        showToast(result.error || 'Error al guardar misión', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSavingMission(false);
    }
  };

  // Funciones para el modal de crear campaña (COMMUNITY_SERVICE)
  const handleOpenCampaignModal = async () => {
    setCampaignModal(prev => ({ ...prev, show: true, loading: true }));
    
    try {
      const res = await fetch(`/api/legacy-builder/campaigns/create?visionId=${data?.visionId}`);
      const result = await res.json();
      
      if (res.ok) {
        if (result.hasCampaign) {
          setCampaignModal(prev => ({
            ...prev,
            loading: false,
            existingCampaign: result.campaign
          }));
        } else {
          // Pre-llenar título con nombre de visión
          setCampaignModal(prev => ({
            ...prev,
            loading: false,
            existingCampaign: null,
            formData: {
              ...prev.formData,
              title: `Proyecto Comunitario ${data?.visionName || ''}`
            }
          }));
        }
      } else {
        showToast(result.error || 'Error al cargar datos', 'error');
        setCampaignModal(prev => ({ ...prev, show: false, loading: false }));
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
      setCampaignModal(prev => ({ ...prev, show: false, loading: false }));
    }
  };

  const handleCreateCampaign = async () => {
    const { title, description, story, goalAmount, videoUrl } = campaignModal.formData;
    
    if (!title.trim()) {
      showToast('El título es requerido', 'error');
      return;
    }
    
    if (!goalAmount || parseFloat(goalAmount) <= 0) {
      showToast('La meta debe ser mayor a 0', 'error');
      return;
    }

    setCampaignModal(prev => ({ ...prev, loading: true }));
    
    try {
      const res = await fetch('/api/legacy-builder/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          story: story.trim(),
          goalAmount: parseFloat(goalAmount),
          visionId: data?.visionId,
          videoUrl: videoUrl.trim() || null
        })
      });

      const result = await res.json();

      if (res.ok) {
        showToast('🎉 ' + result.message, 'success');
        setCampaignModal(prev => ({
          ...prev,
          loading: false,
          existingCampaign: result.campaign
        }));
      } else {
        showToast(result.error || 'Error al crear campaña', 'error');
        setCampaignModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
      setCampaignModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeCampaignModal = () => {
    setCampaignModal({
      show: false,
      loading: false,
      existingCampaign: null,
      formData: {
        title: '',
        description: '',
        story: '',
        goalAmount: '50000',
        videoUrl: ''
      }
    });
  };

  const filteredMembers = (data?.tribeMembers || []).filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!data?.hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Crown className="w-10 h-10 text-amber-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              Contenido Exclusivo
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Programa de Liderato</span>
            </div>
            
            <p className="text-slate-400 mb-6">
              {data?.message || 'Esta sección está disponible para participantes inscritos en Programa de Liderato que han completado el nivel Avanzado.'}
            </p>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400/30' 
              : toast.type === 'error'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400/30'
          } text-white`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
            ) : (
              <Bell className="w-6 h-6 flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
            <button 
              onClick={() => setToast({ ...toast, show: false })}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notificaciones Pendientes - Solo botón Detalles */}
      {data.pendingNotifications.length > 0 && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 space-y-2">
          {data.pendingNotifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl p-4 shadow-lg border border-yellow-400/30"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/30 rounded-lg">
                  <Crown className="w-5 h-5 text-yellow-200" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{notif.title}</h4>
                  <p className="text-yellow-100/80 text-xs mt-1 line-clamp-2">{notif.message}</p>
                  <button
                    onClick={() => setNominationModal({ show: true, notification: notif })}
                    className="mt-3 w-full px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Ver Detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles de Nominación */}
      {nominationModal.show && nominationModal.notification && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-yellow-600/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">¡Has sido nominado!</h2>
                    <p className="text-yellow-200 text-sm">Capitanía de la Tribu</p>
                  </div>
                </div>
                <button
                  onClick={() => setNominationModal({ show: false, notification: null })}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Rol asignado */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-yellow-400 mb-2">
                  {(() => {
                    const cap = data.captaincies.find(c => c.roleType === nominationModal.notification?.roleType);
                    return cap ? `${cap.icon} ${cap.name}` : nominationModal.notification?.roleType;
                  })()}
                </h3>
                <p className="text-gray-300 text-sm">
                  {(() => {
                    const cap = data.captaincies.find(c => c.roleType === nominationModal.notification?.roleType);
                    return cap?.mission || '';
                  })()}
                </p>
              </div>

              {/* Descripción detallada */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-yellow-400" />
                  ¿Qué implica este rol?
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {(() => {
                    const cap = data.captaincies.find(c => c.roleType === nominationModal.notification?.roleType);
                    return cap?.description || '';
                  })()}
                </p>
              </div>

              {/* Responsabilidades */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  Tu Compromiso
                </h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Asumir la responsabilidad de liderar esta área durante todo el programa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Coordinar con tu tribu para lograr los objetivos del rol</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Reportar avances y mantener comunicación activa</span>
                  </li>
                </ul>
              </div>

              {/* Pregunta */}
              <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-xl p-4 text-center">
                <p className="text-yellow-200 font-medium">
                  ¿Aceptas la responsabilidad ineludible de este cargo?
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await handleRespondNomination(nominationModal.notification!.assignmentId, true);
                    setNominationModal({ show: false, notification: null });
                  }}
                  disabled={respondingTo === nominationModal.notification?.assignmentId}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {respondingTo === nominationModal.notification?.assignmentId ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Acepto el Cargo
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await handleRespondNomination(nominationModal.notification!.assignmentId, false);
                    setNominationModal({ show: false, notification: null });
                  }}
                  disabled={respondingTo === nominationModal.notification?.assignmentId}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Capturar Misión de la Tribu */}
      {missionModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-amber-600/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">¡Estás a punto de ser Capitán!</h2>
                    <p className="text-amber-200 text-sm">Define la misión de tu tribu</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMissionModal({ show: false, loading: false });
                    setTribeMission('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Contexto */}
              <div className="bg-amber-900/30 border border-amber-600/30 rounded-xl p-4">
                <p className="text-amber-200 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>
                    La misión de la tribu es el propósito que los unirá durante todo el programa. 
                    Se mostrará en tu <strong>Legado Transformacional</strong>.
                  </span>
                </p>
              </div>

              {/* Campo de misión */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  ¿Cuál es la misión de tu tribu? *
                </label>
                <textarea
                  value={tribeMission}
                  onChange={(e) => setTribeMission(e.target.value)}
                  placeholder="Ej: Ser la tribu más unida y comprometida, generando un impacto positivo en nuestra comunidad..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                />
                <p className="text-gray-500 text-xs mt-1 text-right">
                  {tribeMission.length}/500 caracteres
                </p>
              </div>

              {/* Ejemplos */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-gray-400 text-xs font-medium mb-2">💡 Ejemplos de misiones:</p>
                <ul className="text-gray-500 text-xs space-y-1">
                  <li>• "Transformar vidas a través del servicio y la excelencia"</li>
                  <li>• "Construir un legado de integridad y liderazgo auténtico"</li>
                  <li>• "Inspirar el cambio positivo en nuestra comunidad"</li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmClaimWithMission}
                  disabled={missionModal.loading || !tribeMission.trim()}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {missionModal.loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-5 h-5" />
                      Reclamar Capitanía
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setMissionModal({ show: false, loading: false });
                    setTribeMission('');
                  }}
                  disabled={missionModal.loading}
                  className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear/Ver Campaña de Legacy Builder */}
      {campaignModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-pink-600/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {campaignModal.existingCampaign ? 'Tu Campaña de Servicio' : 'Crear Campaña Comunitaria'}
                    </h2>
                    <p className="text-pink-200 text-sm">Legacy Builder - Crowdfunding</p>
                  </div>
                </div>
                <button
                  onClick={closeCampaignModal}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {campaignModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                  <p className="text-gray-400">Cargando...</p>
                </div>
              ) : campaignModal.existingCampaign ? (
                /* Vista de Campaña Existente */
                <div className="space-y-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {campaignModal.existingCampaign.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaignModal.existingCampaign.status === 'ACTIVE' 
                          ? 'bg-green-900/50 text-green-400 border border-green-600/30'
                          : campaignModal.existingCampaign.status === 'DRAFT'
                          ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-600/30'
                          : 'bg-gray-800 text-gray-400 border border-gray-600'
                      }`}>
                        {campaignModal.existingCampaign.status === 'ACTIVE' ? '🟢 Activa' : 
                         campaignModal.existingCampaign.status === 'DRAFT' ? '📝 Borrador' : 
                         campaignModal.existingCampaign.status}
                      </span>
                    </div>

                    {/* Progreso financiero */}
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Recaudado</span>
                        <span className="text-white font-bold">
                          ${Number(campaignModal.existingCampaign.raisedAmount || 0).toLocaleString()} MXN
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, (Number(campaignModal.existingCampaign.raisedAmount || 0) / Number(campaignModal.existingCampaign.goalAmount)) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-500 text-xs">
                          {Math.round((Number(campaignModal.existingCampaign.raisedAmount || 0) / Number(campaignModal.existingCampaign.goalAmount)) * 100)}% completado
                        </span>
                        <span className="text-gray-400 text-sm">
                          Meta: ${Number(campaignModal.existingCampaign.goalAmount).toLocaleString()} MXN
                        </span>
                      </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-pink-400">
                          {campaignModal.existingCampaign._count?.donations || 0}
                        </p>
                        <p className="text-xs text-gray-500">Donaciones</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">
                          {campaignModal.existingCampaign._count?.members || 0}
                        </p>
                        <p className="text-xs text-gray-500">Miembros</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">
                          {campaignModal.existingCampaign._count?.expenses || 0}
                        </p>
                        <p className="text-xs text-gray-500">Gastos</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-900/20 border border-pink-600/30 rounded-xl p-4 text-center">
                    <p className="text-pink-200 text-sm">
                      🚀 Para gestionar tu campaña completa, visita el panel de Legacy Builder
                    </p>
                  </div>
                </div>
              ) : (
                /* Formulario para Crear Nueva Campaña */
                <div className="space-y-6">
                  <div className="bg-pink-900/20 border border-pink-600/30 rounded-xl p-4">
                    <p className="text-pink-200 text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Como Capitán de Comunitaria Grupal, puedes crear una campaña de crowdfunding para tu visión.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Título */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Título de la Campaña *
                      </label>
                      <input
                        type="text"
                        value={campaignModal.formData.title}
                        onChange={(e) => setCampaignModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, title: e.target.value }
                        }))}
                        placeholder="Ej: Apoyo a Casa Hogar San José"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                      />
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Descripción Breve
                      </label>
                      <textarea
                        value={campaignModal.formData.description}
                        onChange={(e) => setCampaignModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, description: e.target.value }
                        }))}
                        placeholder="¿Cuál es el propósito de esta campaña?"
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
                      />
                    </div>

                    {/* Historia */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Historia / Manifiesto
                      </label>
                      <textarea
                        value={campaignModal.formData.story}
                        onChange={(e) => setCampaignModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, story: e.target.value }
                        }))}
                        placeholder="Cuenta la historia detrás de este proyecto..."
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
                      />
                    </div>

                    {/* Meta Financiera */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Meta a Recaudar (MXN) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={campaignModal.formData.goalAmount}
                          onChange={(e) => setCampaignModal(prev => ({
                            ...prev,
                            formData: { ...prev.formData, goalAmount: e.target.value }
                          }))}
                          placeholder="50000"
                          min="1000"
                          className="w-full px-4 py-3 pl-8 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Mínimo $1,000 MXN</p>
                    </div>

                    {/* Video URL */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Video de Presentación (opcional)
                      </label>
                      <input
                        type="url"
                        value={campaignModal.formData.videoUrl}
                        onChange={(e) => setCampaignModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, videoUrl: e.target.value }
                        }))}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  {/* Botón de Crear */}
                  <button
                    onClick={handleCreateCampaign}
                    disabled={campaignModal.loading}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {campaignModal.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Heart className="w-5 h-5" />
                        Crear Campaña
                      </>
                    )}
                  </button>

                  <p className="text-gray-500 text-xs text-center">
                    La campaña se creará como borrador. Podrás editarla y publicarla después.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/tribal.svg')] opacity-10" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Legacy Vision Builder</h1>
            </div>
            <p className="text-yellow-200">
              {data.visionName} • Sistema de Capitanías de la Tribu
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {[
            { phase: 1, label: 'El Juramento', icon: FileSignature },
            { phase: 2, label: 'La Elección', icon: Users },
            { phase: 3, label: 'Poderes Activados', icon: Sparkles },
          ].map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = currentPhase === step.phase;
            const isCompleted = step.phase === 1 ? data.oathSigned : false;
            
            return (
              <div key={step.phase} className="flex items-center">
                <button
                  onClick={() => {
                    if (step.phase === 1 || data.oathSigned) {
                      setCurrentPhase(step.phase as 1 | 2 | 3);
                    }
                  }}
                  disabled={step.phase > 1 && !data.oathSigned}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-yellow-600 text-white'
                      : isCompleted
                        ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                  } ${step.phase > 1 && !data.oathSigned ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                  <span className="hidden md:inline text-sm font-medium">{step.label}</span>
                </button>
                {idx < 2 && (
                  <ChevronRight className="w-5 h-5 text-gray-600 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* FASE 1: EL JURAMENTO */}
        {currentPhase === 1 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600/30 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">El Juramento de la Tribu</h2>
                  <p className="text-purple-300/80 text-sm">
                    Las 16 Promesas de Sostenibilidad
                  </p>
                </div>
              </div>
            </div>

            {data.oathSigned ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  ¡Has firmado el Juramento!
                </h3>
                <p className="text-gray-400 mb-4">
                  Firmado el {new Date(data.oathSignedAt!).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <button
                  onClick={() => setCurrentPhase(2)}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Continuar a La Elección
                  <ChevronRight className="w-5 h-5 inline ml-2" />
                </button>
              </div>
            ) : (
              <>
                <div
                  ref={promisesContainerRef}
                  onScroll={handleScroll}
                  className="p-6 max-h-[400px] overflow-y-auto space-y-4"
                >
                  {data.promises.map((promise, idx) => (
                    <div
                      key={promise.id}
                      className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50"
                    >
                      <div className="w-10 h-10 bg-purple-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 font-bold">{idx + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{promise.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{promise.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-gray-800/50 border-t border-gray-700">
                  <div className={`transition-opacity duration-300 ${scrolledToBottom ? 'opacity-100' : 'opacity-50'}`}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Escribe tu nombre completo para firmar:
                    </label>
                    <input
                      type="text"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      disabled={!scrolledToBottom}
                      placeholder="Tu nombre completo..."
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    />
                    {!scrolledToBottom && (
                      <p className="text-yellow-500 text-sm mt-2">
                        ⚠️ Debes leer todas las promesas antes de firmar
                      </p>
                    )}
                    <button
                      onClick={handleSignOath}
                      disabled={!scrolledToBottom || signing || signatureText.trim().length < 3}
                      className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {signing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <FileSignature className="w-5 h-5" />
                          YO PROMETO SER MI PALABRA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* FASE 2: LA ELECCIÓN */}
        {currentPhase === 2 && (
          <div className="space-y-6">
            {/* Determinar si hay Capitán de Tribu */}
            {(() => {
              const tribeCaptainRole = data.captaincies.find(c => c.roleType === 'TRIBE_CAPTAIN');
              const tribeCoCaptainRole = data.captaincies.find(c => c.roleType === 'TRIBE_CO_CAPTAIN');
              const hasTribeCaptain = tribeCaptainRole?.assignments.some(a => a.status === 'ACCEPTED');
              const currentUserIsCaptain = tribeCaptainRole?.assignments.some(
                a => a.userId === data.userId && a.status === 'ACCEPTED'
              );
              const currentUserIsCoCaptain = tribeCoCaptainRole?.assignments.some(
                a => a.userId === data.userId && a.status === 'ACCEPTED'
              );
              const canAssign = data.isStaff || currentUserIsCaptain || currentUserIsCoCaptain;

              return (
                <>
                  {/* Banner de Reclamar Capitanía (si no hay capitán) */}
                  {!hasTribeCaptain && !data.isStaff && (
                    <div className="bg-gradient-to-r from-yellow-900/80 to-amber-900/80 rounded-2xl border-2 border-yellow-500/50 overflow-hidden animate-pulse-slow">
                      <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Crown className="w-10 h-10 text-yellow-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          ¡La Tribu Necesita un Líder!
                        </h2>
                        <p className="text-yellow-200/80 mb-6 max-w-md mx-auto">
                          Sé el primero en tomar el mando. Como Capitán de Tribu serás responsable de 
                          asignar las demás capitanías y liderar a tu equipo.
                        </p>
                        <button
                          onClick={() => handleClaimTribeCaptain()}
                          disabled={nominating}
                          className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold text-lg rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center gap-3 mx-auto"
                        >
                          {nominating ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <>
                              <Crown className="w-6 h-6" />
                              Reclamar Capitanía de Tribu
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sección de Misión de la Tribu (visible cuando hay capitán) */}
                  {hasTribeCaptain && (
                    <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/20 rounded-2xl border border-yellow-500/30 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 bg-yellow-500/20 rounded-xl flex-shrink-0">
                              <Target className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-white mb-1">Misión de la Tribu</h3>
                              <p className="text-yellow-200/60 text-sm mb-3">Tu legado transformacional</p>
                              
                              {editingMission ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editMissionText}
                                    onChange={(e) => setEditMissionText(e.target.value)}
                                    placeholder="Escribe la misión de tu tribu..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
                                  />
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs">{editMissionText.length}/500</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingMission(false);
                                          setEditMissionText('');
                                        }}
                                        disabled={savingMission}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={handleSaveMission}
                                        disabled={savingMission || editMissionText.trim().length < 10}
                                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                      >
                                        {savingMission ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Check className="w-4 h-4" />
                                        )}
                                        Guardar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {data.tribeMission ? (
                                    <p className="text-slate-200 leading-relaxed italic text-lg">
                                      "{data.tribeMission}"
                                    </p>
                                  ) : (
                                    <p className="text-gray-500 italic">
                                      No se ha definido la misión de la tribu
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Botón de editar - solo visible para el capitán */}
                          {currentUserIsCaptain && !editingMission && (
                            <button
                              onClick={() => {
                                setEditMissionText(data.tribeMission || '');
                                setEditingMission(true);
                              }}
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                              title="Editar misión"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Panel de Asignación (Staff o Capitán de Tribu) */}
                  {canAssign && (
                    <div className="bg-gray-900 rounded-2xl border border-yellow-600/30 overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 p-6 border-b border-yellow-600/30">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-yellow-600/30 rounded-xl">
                            <UserPlus className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">Panel de Asignación</h2>
                            <p className="text-yellow-300/80 text-sm">
                              {currentUserIsCaptain 
                                ? 'Como Capitán de Tribu, asigna los roles a tu equipo'
                                : 'Asigna capitanes a cada rol de la tribu'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        {/* Selector de Rol */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Selecciona el rol a asignar:
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {data.captaincies
                              .filter(cap => cap.roleType !== 'TRIBE_CAPTAIN') // El capitán ya está asignado
                              .map((cap) => {
                                const RoleIcon = roleIcons[cap.roleType] || Star;
                                const isFull = cap.confirmedCount + cap.pendingCount >= cap.maxCaptains;
                                const hasPending = cap.pendingCount > 0;
                                const hasConfirmed = cap.confirmedCount > 0;
                              
                                return (
                                  <button
                                    key={cap.roleType}
                                    onClick={() => setSelectedRole(selectedRole === cap.roleType ? null : cap.roleType)}
                                    disabled={isFull}
                                    className={`p-3 rounded-xl border transition-all text-left ${
                                      selectedRole === cap.roleType
                                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
                                        : isFull
                                          ? hasConfirmed 
                                            ? 'bg-green-900/20 border-green-700 text-green-400 cursor-not-allowed'
                                            : 'bg-yellow-900/20 border-yellow-700 text-yellow-400 cursor-not-allowed'
                                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <RoleIcon className="w-4 h-4" />
                                      <span className="text-xs font-medium truncate">{cap.name}</span>
                                    </div>
                                    {hasConfirmed && (
                                      <div className="text-xs mt-1 text-green-400 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Confirmado
                                      </div>
                                    )}
                                    {hasPending && !hasConfirmed && (
                                      <div className="text-xs mt-1 text-yellow-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Pendiente
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* Buscador de Miembros */}
                        {selectedRole && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar miembro de la tribu..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-yellow-500"
                              />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {filteredMembers.map((member) => {
                                // Check if member is already assigned to this role
                                const selectedCap = data.captaincies.find(c => c.roleType === selectedRole);
                                const isAssigned = selectedCap?.assignments.some(
                                  a => a.userId === member.id && ['PENDING', 'ACCEPTED'].includes(a.status)
                                );

                                return (
                                  <button
                                    key={member.id}
                                    onClick={() => !isAssigned && handleNominateCapitan(member.id)}
                                    disabled={nominating || isAssigned}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                      isAssigned
                                        ? 'bg-gray-800/50 border border-gray-700 cursor-not-allowed'
                                        : 'bg-gray-800 border border-gray-700 hover:border-yellow-600 hover:bg-gray-800/80'
                                    }`}
                                  >
                                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                                      {member.profileImage ? (
                                        <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Users className="w-5 h-5 text-gray-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 text-left">
                                      <p className="text-white font-medium">{member.nombre}</p>
                                      <p className="text-gray-500 text-xs">{member.email}</p>
                                    </div>
                                    {isAssigned ? (
                                      <span className="text-xs text-gray-500">Ya asignado</span>
                                    ) : nominating ? (
                                      <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-gray-600" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mensaje para participantes sin permisos */}
                  {!canAssign && hasTribeCaptain && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 text-center">
                      <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-300 mb-2">
                        El Capitán de Tribu Asigna los Roles
                      </h3>
                      <p className="text-gray-500 text-sm">
                        El Capitán de Tribu es quien designa las capitanías. 
                        Espera a que te sea asignado un rol o contacta a tu capitán.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Tabla de Capitanías */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-600/30 rounded-xl">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Capitanías de la Tribu</h2>
                    <p className="text-amber-300/80 text-sm">
                      Estado actual de los roles asignados
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-800">
                {data.captaincies.map((cap) => {
                  const RoleIcon = roleIcons[cap.roleType] || Star;
                  
                  return (
                    <div key={cap.roleType} className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Info del Rol */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-600/30 to-amber-600/30 rounded-xl flex items-center justify-center">
                            <RoleIcon className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                              <span className="text-xl">{cap.icon}</span>
                              {cap.name}
                            </h3>
                            <p className="text-gray-500 text-sm">{cap.mission}</p>
                          </div>
                        </div>

                        {/* Capitanes Asignados */}
                        <div className="flex flex-wrap gap-2">
                          {cap.assignments.filter(a => ['PENDING', 'ACCEPTED'].includes(a.status)).length === 0 ? (
                            <span className="text-gray-500 text-sm italic">Sin asignar</span>
                          ) : (
                            cap.assignments
                              .filter(a => ['PENDING', 'ACCEPTED'].includes(a.status))
                              .map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                    assignment.status === 'ACCEPTED'
                                      ? 'bg-green-600/10 border-green-600/30'
                                      : 'bg-gray-800 border-gray-700'
                                  }`}
                                >
                                  <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                                    {assignment.userImage ? (
                                      <img src={assignment.userImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Users className="w-4 h-4 text-gray-500 m-auto mt-2" />
                                    )}
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    assignment.status === 'ACCEPTED' ? 'text-green-400' : 'text-gray-400'
                                  }`}>
                                    {assignment.userName}
                                  </span>
                                  {assignment.status === 'PENDING' && (
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                  )}
                                  {assignment.status === 'ACCEPTED' && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  )}
                                  {/* Botón remover - visible para Staff, Capitán o Co-Capitán de Tribu */}
                                  {(data.isStaff || 
                                    data.captaincies.find(c => c.roleType === 'TRIBE_CAPTAIN')?.assignments.some(a => a.userId === data.userId && a.status === 'ACCEPTED') ||
                                    data.captaincies.find(c => c.roleType === 'TRIBE_CO_CAPTAIN')?.assignments.some(a => a.userId === data.userId && a.status === 'ACCEPTED')
                                  ) && (
                                    <button
                                      onClick={() => handleRemoveCaptain(assignment.id)}
                                      className="p-1 hover:bg-red-600/20 rounded transition-colors"
                                      title="Remover"
                                    >
                                      <X className="w-4 h-4 text-red-400" />
                                    </button>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FASE 3: PODERES ACTIVADOS */}
        {currentPhase === 3 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600/30 rounded-xl">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Poderes Activados</h2>
                  <p className="text-purple-300/80 text-sm">
                    Tus widgets y herramientas especiales
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {data.userAssignments.filter(a => a.status === 'ACCEPTED').length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    Aún no tienes roles asignados
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Cuando seas nominado y aceptes un cargo, aquí aparecerán tus herramientas especiales.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    // Verificar si el usuario es Capitán o Co-Capitán de Tribu
                    const isTribeCaptainOrCoCaptain = data.userAssignments.some(
                      a => a.status === 'ACCEPTED' && 
                      (a.roleType === 'TRIBE_CAPTAIN' || a.roleType === 'TRIBE_CO_CAPTAIN')
                    );
                    
                    // Si es Capitán/Co-Capitán, mostrar TODAS las capitanías
                    // Si no, mostrar solo las asignadas
                    const captainciesToShow = isTribeCaptainOrCoCaptain 
                      ? data.captaincies.filter(c => c.roleType !== 'TRIBE_CAPTAIN' && c.roleType !== 'TRIBE_CO_CAPTAIN')
                      : data.userAssignments
                          .filter(a => a.status === 'ACCEPTED')
                          .map(a => data.captaincies.find(c => c.roleType === a.roleType))
                          .filter(Boolean);
                    
                    return captainciesToShow.map((cap) => {
                      if (!cap) return null;
                      
                      const RoleIcon = roleIcons[cap.roleType] || Star;
                      
                      return (
                        <div
                          key={cap.roleType}
                          className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-600/30"
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-purple-600/30 rounded-xl flex items-center justify-center">
                              <RoleIcon className="w-7 h-7 text-purple-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{cap.name}</h3>
                              <p className="text-purple-400 text-sm">{cap.widgetName}</p>
                            </div>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-4">
                            {cap.description}
                          </p>

                          <button
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            onClick={() => {
                              if (cap.roleType === 'COMMUNITY_SERVICE') {
                                // Redirigir a Legacy Forge - Democracia Cuántica
                                router.push(`/dashboard/legacy-forge?visionId=${data.visionId}`);
                              } else if (cap.roleType === 'SHIRTS_LOGO') {
                                // Redirigir a Identity Lab - Logos y Playeras
                                router.push(`/dashboard/identity-lab?visionId=${data.visionId}`);
                              } else if (['FOOD', 'GRADUATION_CAPTAIN', 'BOOKS_MOVIES', 'CLEANLINESS', 'CONTEXT_GUARDIAN', 'CONTRIBUTION_BASIC', 'CONTRIBUTION_ADVANCED', 'TREASURER'].includes(cap.roleType)) {
                                // Redirigir a widget genérico de capitanías con votaciones
                                router.push(`/dashboard/captaincy-widget?visionId=${data.visionId}&roleType=${cap.roleType}`);
                              } else {
                                showToast('Widget en desarrollo', 'info');
                              }
                            }}
                          >
                            <Sparkles className="w-5 h-5" />
                            {cap.roleType === 'COMMUNITY_SERVICE' ? 'Legacy Forge' : 
                             cap.roleType === 'SHIRTS_LOGO' ? 'Identity Lab' : 
                             ['FOOD', 'GRADUATION_CAPTAIN', 'BOOKS_MOVIES', 'CLEANLINESS', 'CONTEXT_GUARDIAN', 'CONTRIBUTION_BASIC', 'CONTRIBUTION_ADVANCED', 'TREASURER'].includes(cap.roleType) ? 'Abrir Widget' : 'Próximamente'}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
