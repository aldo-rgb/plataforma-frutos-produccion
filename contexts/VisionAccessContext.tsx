'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type VisionLevel = 'BASIC' | 'ADVANCED' | 'PL' | 'FULL';

interface AccessibleModules {
  carta: boolean;
  metas: boolean;
  tareas: boolean;
  evidencias: boolean;
  llamadasMentor: boolean;
  quantum: boolean;
  disciplina: boolean;
  ranking: boolean;
  all: boolean;
}

interface LockedMessages {
  tareas: string;
  evidencias: string;
  carta: string;
  metas: string;
  quantum: string;
  llamadasMentor: string;
  disciplina: string;
  ranking: string;
}

interface VisionAccessContextType {
  isLoading: boolean;
  isVisionUser: boolean;
  isLoboSolitario: boolean;
  currentLevel: VisionLevel;
  completedLevels: string[];
  hasFullAccess: boolean;
  accessibleModules: AccessibleModules;
  lockedMessages: LockedMessages;
  visionName?: string;
  canAccess: (module: keyof AccessibleModules) => boolean;
  getLockedMessage: (module: keyof LockedMessages) => string;
  refreshAccess: () => Promise<void>;
}

const defaultAccessibleModules: AccessibleModules = {
  carta: true,
  metas: true,
  tareas: true,
  evidencias: true,
  llamadasMentor: true,
  quantum: true,
  disciplina: true,
  ranking: true,
  all: true
};

const defaultLockedMessages: LockedMessages = {
  tareas: '🔒 Disponible al registrarte en PL (Program Leadership)',
  evidencias: '🔒 Disponible al registrarte en PL (Program Leadership)',
  carta: '🔒 Disponible al registrarte en AVANZADO',
  metas: '🔒 Disponible al registrarte en AVANZADO',
  quantum: '', // Siempre disponible
  llamadasMentor: '', // Siempre disponible
  disciplina: '🔒 Disponible al registrarte en PL (Program Leadership)',
  ranking: '', // Siempre disponible
};

const VisionAccessContext = createContext<VisionAccessContextType | undefined>(undefined);

export function VisionAccessProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisionUser, setIsVisionUser] = useState(false);
  const [isLoboSolitario, setIsLoboSolitario] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<VisionLevel>('FULL');
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [hasFullAccess, setHasFullAccess] = useState(true);
  const [accessibleModules, setAccessibleModules] = useState<AccessibleModules>(defaultAccessibleModules);
  const [lockedMessages, setLockedMessages] = useState<LockedMessages>(defaultLockedMessages);
  const [visionName, setVisionName] = useState<string>();

  const fetchAccessLevel = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/user/vision-level');
      const data = await res.json();

      if (res.ok && data.success) {
        setIsVisionUser(data.isVisionUser || false);
        setIsLoboSolitario(data.isLoboSolitario || false);
        setCurrentLevel(data.currentLevel || 'FULL');
        setCompletedLevels(data.completedLevels || []);
        setHasFullAccess(data.hasFullAccess || false);
        setAccessibleModules(data.accessibleModules || defaultAccessibleModules);
        setLockedMessages(data.lockedMessages || defaultLockedMessages);
        setVisionName(data.visionName);
      }
    } catch (error) {
      console.error('Error fetching vision access:', error);
      // En caso de error, dar acceso completo por seguridad
      setHasFullAccess(true);
      setAccessibleModules(defaultAccessibleModules);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessLevel();
  }, []);

  const canAccess = (module: keyof AccessibleModules): boolean => {
    if (isLoboSolitario || hasFullAccess) return true;
    return accessibleModules[module] ?? false;
  };

  const getLockedMessage = (module: keyof LockedMessages): string => {
    return lockedMessages[module] || '🔒 Módulo no disponible en tu nivel actual';
  };

  return (
    <VisionAccessContext.Provider
      value={{
        isLoading,
        isVisionUser,
        isLoboSolitario,
        currentLevel,
        completedLevels,
        hasFullAccess,
        accessibleModules,
        lockedMessages,
        visionName,
        canAccess,
        getLockedMessage,
        refreshAccess: fetchAccessLevel
      }}
    >
      {children}
    </VisionAccessContext.Provider>
  );
}

export function useVisionAccess() {
  const context = useContext(VisionAccessContext);
  if (context === undefined) {
    throw new Error('useVisionAccess must be used within a VisionAccessProvider');
  }
  return context;
}

// Hook simplificado para verificar acceso rápido
export function useCanAccess(module: keyof AccessibleModules): boolean {
  const { canAccess, isLoading, isLoboSolitario, hasFullAccess } = useVisionAccess();
  
  // Durante la carga o si es lobo solitario, permitir acceso
  if (isLoading || isLoboSolitario || hasFullAccess) return true;
  
  return canAccess(module);
}
