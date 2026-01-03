'use client';

import { useQuantumIdentityCheck } from '@/hooks/useQuantumIdentityCheck';
import QuantumIdentityModal from './QuantumIdentityModal';
import { usePathname } from 'next/navigation';

export function QuantumIdentityWrapper() {
  const { shouldShowModal, closeModalWithCooldown, userInfo } = useQuantumIdentityCheck();
  const pathname = usePathname();

  // Rutas donde NO debe aparecer el modal (procesos críticos que no deben interrumpirse)
  const excludedPaths = [
    '/dashboard/carta',           // Proceso de creación de carta (incluye wizard-v2)
    '/dashboard/objetivos',        // Configuración de objetivos
    '/dashboard/suscripcion',      // Proceso de pago
    '/dashboard/guia-de-inicio',   // Guía inicial
  ];

  // Verificar si estamos en una ruta excluida
  const isExcludedPath = excludedPaths.some(path => pathname?.startsWith(path));

  // Debug logs
  console.log('🔍 QuantumIdentityWrapper:', {
    pathname,
    isExcludedPath,
    shouldShowModal,
    hasUserInfo: !!userInfo
  });

  // No mostrar el modal si:
  // 1. No debe mostrarse según el check
  // 2. No hay info de usuario
  // 3. Estamos en una ruta excluida
  if (!shouldShowModal || !userInfo || isExcludedPath) return null;

  return (
    <QuantumIdentityModal
      isOpen={shouldShowModal}
      onClose={closeModalWithCooldown}
      userName={userInfo.nombre}
      userLevel={userInfo.nivel}
      userRank={userInfo.rango}
    />
  );
}
