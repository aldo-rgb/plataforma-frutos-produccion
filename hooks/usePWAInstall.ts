'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  promptInstall: () => Promise<boolean>;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
  showDesktopInstructions: boolean;
  setShowDesktopInstructions: (show: boolean) => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showDesktopInstructions, setShowDesktopInstructions] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada como PWA
    const checkIfInstalled = () => {
      if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;
        setIsInstalled(isStandalone || isIOSStandalone);
      }
    };

    // Detectar plataforma
    const detectPlatform = () => {
      if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || 
          (userAgent.includes('mac') && 'ontouchend' in document);
        const isAndroidDevice = /android/.test(userAgent);
        const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile/.test(userAgent);
        
        setIsIOS(isIOSDevice);
        setIsAndroid(isAndroidDevice);
        setIsMobile(isMobileDevice);
        
        // En iOS y Android siempre mostrar como "instalable"
        if (isIOSDevice || isAndroidDevice) {
          setIsInstallable(true);
        }
      }
    };

    // Escuchar el evento beforeinstallprompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevenir que Chrome muestre el banner automático
      e.preventDefault();
      // Guardar el evento para usarlo después
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Escuchar cuando la app es instalada
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    checkIfInstalled();
    detectPlatform();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Escuchar cambios en display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    // Si es iOS, mostrar instrucciones
    if (isIOS) {
      setShowIOSInstructions(true);
      return false;
    }

    // Si tenemos el prompt nativo, usarlo
    if (deferredPrompt) {
      try {
        // Mostrar el prompt de instalación nativo
        await deferredPrompt.prompt();
        
        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('PWA instalada exitosamente');
          setDeferredPrompt(null);
          setIsInstallable(false);
          return true;
        } else {
          console.log('Instalación rechazada por el usuario');
          return false;
        }
      } catch (error) {
        console.error('Error al instalar PWA:', error);
        return false;
      }
    }

    // Si es Android sin prompt, mostrar instrucciones de Chrome
    if (isAndroid) {
      setShowDesktopInstructions(true);
      return false;
    }

    // Para desktop, mostrar instrucciones
    setShowDesktopInstructions(true);
    return false;
  }, [deferredPrompt, isIOS, isAndroid]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    promptInstall,
    showIOSInstructions,
    setShowIOSInstructions,
    showDesktopInstructions,
    setShowDesktopInstructions,
  };
}
