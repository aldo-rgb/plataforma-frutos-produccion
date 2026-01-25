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
      const res = await fetch(`/api/legacy-vision-builder?assignmentId=${assignmentId}`, {
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

  const filteredMembers = data?.tribeMembers.filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!data?.hasAccess) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-100 mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-400">
              {data?.message || 'Necesitas ser participante de PL con asistencia marcada para acceder.'}
            </p>
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

      {/* Notificaciones Pendientes */}
      {data.pendingNotifications.length > 0 && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 space-y-2">
          {data.pendingNotifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-gradient-to-r from-yellow-600/90 to-amber-600/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-yellow-400/30"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/30 rounded-lg">
                  <Crown className="w-5 h-5 text-yellow-200" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white text-sm">{notif.title}</h4>
                  <p className="text-yellow-100/80 text-xs mt-1">{notif.message}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleRespondNomination(notif.assignmentId, true)}
                      disabled={respondingTo === notif.assignmentId}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {respondingTo === notif.assignmentId ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Acepto el Cargo'
                      )}
                    </button>
                    <button
                      onClick={() => handleRespondNomination(notif.assignmentId, false)}
                      disabled={respondingTo === notif.assignmentId}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            {/* Panel de Asignación (Solo Staff) */}
            {data.isStaff && (
              <div className="bg-gray-900 rounded-2xl border border-yellow-600/30 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 p-6 border-b border-yellow-600/30">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-600/30 rounded-xl">
                      <UserPlus className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Panel de Asignación</h2>
                      <p className="text-yellow-300/80 text-sm">
                        Asigna capitanes a cada rol de la tribu
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
                      {data.captaincies.map((cap) => {
                        const RoleIcon = roleIcons[cap.roleType] || Star;
                        const isFull = cap.confirmedCount + cap.pendingCount >= cap.maxCaptains;
                        
                        return (
                          <button
                            key={cap.roleType}
                            onClick={() => setSelectedRole(selectedRole === cap.roleType ? null : cap.roleType)}
                            disabled={isFull}
                            className={`p-3 rounded-xl border transition-all text-left ${
                              selectedRole === cap.roleType
                                ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
                                : isFull
                                  ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <RoleIcon className="w-4 h-4" />
                              <span className="text-xs font-medium truncate">{cap.name}</span>
                            </div>
                            <div className="text-xs mt-1 opacity-70">
                              {cap.confirmedCount}/{cap.maxCaptains}
                              {cap.pendingCount > 0 && ` (+${cap.pendingCount} pendiente)`}
                            </div>
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
                                  {data.isStaff && (
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
                  {data.userAssignments
                    .filter(a => a.status === 'ACCEPTED')
                    .map((assignment) => {
                      const cap = data.captaincies.find(c => c.roleType === assignment.roleType);
                      if (!cap) return null;
                      
                      const RoleIcon = roleIcons[cap.roleType] || Star;
                      
                      return (
                        <div
                          key={assignment.roleType}
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
                              // TODO: Navegar al widget específico
                              showToast('Widget en desarrollo', 'info');
                            }}
                          >
                            <Sparkles className="w-5 h-5" />
                            Abrir Widget
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
