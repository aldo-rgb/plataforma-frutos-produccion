'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import IdentityBadge, { UserLevel } from './IdentityBadge';
import EvolutionBar from './EvolutionBar';
import UpgradeToAdvancedWidget from './widgets/UpgradeToAdvancedWidget';
import BuddySystemWidget from './widgets/BuddySystemWidget';
import TribeManagementWidget from './widgets/TribeManagementWidget';
import ZonaEjecucionMiniWidget from './widgets/ZonaEjecucionMiniWidget';
import JoinVisionWidget from './widgets/JoinVisionWidget';
import GCCallWidget from './widgets/GCCallWidget';
import PersonalQRWidget from '../PersonalQRWidget';

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

  const { currentLevelInfo, tribeStats, isLoboSolitario, isDropped } = data;
  const level = currentLevelInfo.levelName;

  const handleUpgradeClick = () => {
    // Redirigir a la página de confirmación de upgrade a ADVANCED
    window.location.href = '/dashboard/upgrade-advanced';
  };

  return (
    <div className="space-y-4">
      {/* Identity Badge + Evolution Bar */}
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

        {/* ADVANCED: Mostrar BuddySystemWidget + ZonaEjecucionMini + GCCallWidget */}
        {level === 'ADVANCED' && (
          <>
            <BuddySystemWidget />
            <ZonaEjecucionMiniWidget />
            <GCCallWidget />
          </>
        )}

        {/* PL: Mostrar TribeManagementWidget + ZonaEjecucionMini + BuddySystemWidget (al final) */}
        {level === 'PL' && (
          <>
            <TribeManagementWidget 
              stats={tribeStats}
              onInviteClick={() => setShowQRModal(true)}
              tribeLogoUrl={data?.tribeLogoUrl}
              tribeName={data?.tribeName || data?.visionInfo?.nombre}
              tribeMission={data?.tribeMission}
            />
            <ZonaEjecucionMiniWidget />
            <BuddySystemWidget />
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
    </div>
  );
}
