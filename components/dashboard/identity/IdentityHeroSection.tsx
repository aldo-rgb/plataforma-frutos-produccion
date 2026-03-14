'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, Award, TrendingUp, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import IdentityBadge, { UserLevel } from './IdentityBadge';
import EvolutionBar from './EvolutionBar';
import UpgradeToAdvancedWidget from './widgets/UpgradeToAdvancedWidget';
import BuddySystemWidget from './widgets/BuddySystemWidget';
import TribeManagementWidget from './widgets/TribeManagementWidget';
import ZonaEjecucionMiniWidget from './widgets/ZonaEjecucionMiniWidget';
import JoinVisionWidget from './widgets/JoinVisionWidget';
import GCCallWidget from './widgets/GCCallWidget';
import PersonalQRWidget from '../PersonalQRWidget';
import AmbassadorWalletMiniWidget from './widgets/AmbassadorWalletMiniWidget';

interface Invitee {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  isActive: boolean;
  createdAt: string;
  level: string;
  isGraduated: boolean;
  graduatedFromBasic: boolean;
  graduatedFromAdvanced: boolean;
}

interface DashboardStatsResponse {
  success: boolean;
  data: {
    userId: number;
    userName: string;
    userEmail: string;
    referralCode?: string;
    organizationId?: number | null;
    organizationName?: string;
    currentLevelInfo: {
      levelName: UserLevel;
      badgeAsset: string;
      nextMilestone: {
        name: string;
        deadline: string | null;
        isLocked: boolean;
        progressPercent: number;
        lockReason?: string;
        currentWeek?: number;
        totalWeeks?: number;
        hasPendingPLPayment?: boolean;
      } | null;
    };
    visionInfo: {
      id: number;
      nombre: string;
      startDate: string | null;
      endDate: string | null;
    } | null;
    buddyInfo: {
      id: number;
      nombre: string;
      apodo?: string;
      profileImage?: string | null;
      telefono?: string | null;
    } | null;
    tribeStats: {
      invitedCount: number;
      enrolledCount: number;
      graduatedCount?: number;
    } | null;
    tribeLogoUrl?: string | null;
    tribeMission?: string | null;
    tribeName?: string | null;
    isLoboSolitario: boolean;
    hasVision: boolean;
    isDropped?: boolean; // Indica si el usuario fue marcado como DROP
    isGraduated?: boolean; // Para mostrar entrenamientos en lugar de BuddySystem
  };
}

interface IdentityHeroSectionProps {
  // Datos opcionales que se pueden pasar desde el server component
  initialData?: DashboardStatsResponse['data'];
  // Datos de la carta para PromiseWidget
  cartaData?: {
    hasCompletedCarta: boolean;
    promises?: {
      finanzas?: string;
      relaciones?: string;
      salud?: string;
    };
    progress?: {
      finanzas?: number;
      relaciones?: number;
      salud?: number;
    };
  };
}

export default function IdentityHeroSection({ initialData, cartaData }: IdentityHeroSectionProps) {
  const [data, setData] = useState<DashboardStatsResponse['data'] | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInviteesModal, setShowInviteesModal] = useState(false);
  const [inviteesFilter, setInviteesFilter] = useState<'all' | 'graduated'>('all');
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loadingInvitees, setLoadingInvitees] = useState(false);

  const fetchInvitees = async () => {
    setLoadingInvitees(true);
    try {
      const res = await fetch('/api/me/my-invitees');
      const json = await res.json();
      if (json.success) {
        setInvitees(json.invitees);
      }
    } catch (error) {
      console.error('Error fetching invitees:', error);
    } finally {
      setLoadingInvitees(false);
    }
  };

  const handleEnrolledClick = () => {
    setInviteesFilter('all');
    setShowInviteesModal(true);
    fetchInvitees();
  };

  const handleGraduatedClick = () => {
    setInviteesFilter('graduated');
    setShowInviteesModal(true);
    fetchInvitees();
  };

  useEffect(() => {
    if (!initialData) {
      fetchDashboardStats();
    }
  }, [initialData]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/me/dashboard-stats');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-slate-800/50 rounded-2xl animate-pulse" />
        <div className="h-16 bg-slate-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { currentLevelInfo, tribeStats, isLoboSolitario, isDropped, isGraduated } = data;
  const level = currentLevelInfo.levelName;

  const handleUpgradeClick = () => {
    // Redirigir a la página de confirmación de upgrade a ADVANCED
    window.location.href = '/dashboard/upgrade-advanced';
  };

  return (
    <div className="space-y-4">
      {/* Identity Badge + Evolution Bar (ocultar ambos si ya está graduado) */}
      {!isGraduated && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <IdentityBadge 
            level={level} 
            userName={data.userName}
          />
          <EvolutionBar
            currentLevel={level}
            nextMilestone={currentLevelInfo.nextMilestone || undefined}
            onUpgradeClick={handleUpgradeClick}
            isDropped={isDropped}
          />
        </motion.div>
      )}

      {/* Level-Specific Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* BASIC: Mostrar solo GCCallWidget + UpgradeToAdvancedWidget (sin PromiseWidget) */}
        {/* Si el usuario está en DROP, NO mostrar el widget de upgrade */}
        {level === 'BASIC' && (
          <>
            <GCCallWidget />
            {!isDropped && currentLevelInfo.nextMilestone?.isLocked && (
              <UpgradeToAdvancedWidget
                advancedStartDate={currentLevelInfo.nextMilestone.deadline}
                onUpgradeClick={handleUpgradeClick}
              />
            )}
          </>
        )}

        {/* ADVANCED: Mostrar BuddySystemWidget o AmbassadorWalletMini (si graduado) + ZonaEjecucionMini + GCCallWidget */}
        {level === 'ADVANCED' && (
          <>
            {isGraduated ? <AmbassadorWalletMiniWidget /> : <BuddySystemWidget />}
            <ZonaEjecucionMiniWidget />
            <GCCallWidget />
          </>
        )}

        {/* PL: Mostrar TribeManagementWidget + ZonaEjecucionMini + BuddySystemWidget o AmbassadorWalletMini (si graduado) */}
        {level === 'PL' && (
          <>
            <TribeManagementWidget 
              stats={tribeStats}
              onInviteClick={() => setShowQRModal(true)}
              onEnrolledClick={handleEnrolledClick}
              onGraduatedClick={handleGraduatedClick}
              tribeLogoUrl={data?.tribeLogoUrl}
              tribeName={data?.tribeName || data?.visionInfo?.nombre}
              tribeMission={data?.tribeMission}
            />
            <ZonaEjecucionMiniWidget />
            {isGraduated ? <AmbassadorWalletMiniWidget /> : <BuddySystemWidget />}
          </>
        )}

        {/* LOBO_SOLITARIO: Mostrar ZonaEjecucionMini + JoinVisionWidget */}
        {isLoboSolitario && (
          <>
            <ZonaEjecucionMiniWidget />
            <JoinVisionWidget onJoinClick={handleUpgradeClick} />
          </>
        )}
      </div>

      {/* Modal de QR Personal */}
      <AnimatePresence>
        {showQRModal && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Mi QR Personal</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-4">
                <PersonalQRWidget
                  userName={data.userName}
                  userId={data.userId}
                  userEmail={data.userEmail || ''}
                  referralCode={data.referralCode}
                  organizationId={data.organizationId}
                  organizationName={data.organizationName}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Lista de Invitados */}
      <AnimatePresence>
        {showInviteesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  {inviteesFilter === 'all' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <Award className="w-5 h-5 text-purple-400" />
                  )}
                  <h3 className="text-lg font-semibold text-white">
                    {inviteesFilter === 'all' ? 'Mis Enrollados' : 'Mis Graduados'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowInviteesModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700">
                <button
                  onClick={() => setInviteesFilter('all')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    inviteesFilter === 'all'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({invitees.length})
                </button>
                <button
                  onClick={() => setInviteesFilter('graduated')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    inviteesFilter === 'graduated'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Graduados ({invitees.filter(i => i.isGraduated).length})
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingInvitees ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {(() => {
                      const filteredInvitees = inviteesFilter === 'graduated'
                        ? invitees.filter(i => i.isGraduated)
                        : invitees;

                      if (filteredInvitees.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">
                              {inviteesFilter === 'graduated'
                                ? 'Aún no tienes invitados graduados'
                                : 'Aún no has invitado a nadie'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {filteredInvitees.map((invitee) => (
                            <div
                              key={invitee.id}
                              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700"
                            >
                              {/* Avatar */}
                              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                                {invitee.imagen ? (
                                  <Image
                                    src={invitee.imagen}
                                    alt={invitee.nombre}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-400" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white truncate">{invitee.nombre}</p>
                                  {invitee.isGraduated && (
                                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate">{invitee.email}</p>
                              </div>

                              {/* Status */}
                              <div className="text-right flex-shrink-0">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  invitee.isGraduated
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : invitee.level === 'ADVANCED'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-cyan-500/20 text-cyan-300'
                                }`}>
                                  {invitee.isGraduated 
                                    ? 'Graduado'
                                    : invitee.level === 'ADVANCED'
                                    ? 'Avanzado'
                                    : 'Básico'
                                  }
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
