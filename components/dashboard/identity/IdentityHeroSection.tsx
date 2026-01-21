'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import IdentityBadge, { UserLevel } from './IdentityBadge';
import EvolutionBar from './EvolutionBar';
import UpgradeToAdvancedWidget from './widgets/UpgradeToAdvancedWidget';
import BuddySystemWidget from './widgets/BuddySystemWidget';
import TribeManagementWidget from './widgets/TribeManagementWidget';
import PromiseWidget from './widgets/PromiseWidget';
import JoinVisionWidget from './widgets/JoinVisionWidget';
import GCCallWidget from './widgets/GCCallWidget';

interface DashboardStatsResponse {
  success: boolean;
  data: {
    userId: number;
    userName: string;
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
  };
}

export default function IdentityHeroSection({ initialData, cartaData }: IdentityHeroSectionProps) {
  const [data, setData] = useState<DashboardStatsResponse['data'] | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

        {/* ADVANCED: Mostrar BuddySystemWidget + PromiseWidget + GCCallWidget */}
        {level === 'ADVANCED' && (
          <>
            <BuddySystemWidget />
            <PromiseWidget 
              hasCompletedCarta={cartaData?.hasCompletedCarta}
              promises={cartaData?.promises}
            />
            <GCCallWidget />
          </>
        )}

        {/* PL: Mostrar TribeManagementWidget + PromiseWidget */}
        {level === 'PL' && (
          <>
            <TribeManagementWidget 
              stats={tribeStats}
              onInviteClick={() => {
                // Abrir modal de QR o compartir link
              }}
            />
            <PromiseWidget 
              hasCompletedCarta={cartaData?.hasCompletedCarta}
              promises={cartaData?.promises}
            />
          </>
        )}

        {/* LOBO_SOLITARIO: Mostrar JoinVisionWidget + PromiseWidget */}
        {isLoboSolitario && (
          <>
            <PromiseWidget 
              hasCompletedCarta={cartaData?.hasCompletedCarta}
              promises={cartaData?.promises}
            />
            <JoinVisionWidget onJoinClick={handleUpgradeClick} />
          </>
        )}
      </div>
    </div>
  );
}
