'use client';

import { useQuantumIdentityCheck } from '@/hooks/useQuantumIdentityCheck';
import QuantumIdentityModal from './QuantumIdentityModal';

export function QuantumIdentityWrapper() {
  const { shouldShowModal, setShouldShowModal, userInfo } = useQuantumIdentityCheck();

  if (!shouldShowModal || !userInfo) return null;

  return (
    <QuantumIdentityModal
      isOpen={shouldShowModal}
      onClose={() => setShouldShowModal(false)}
      userName={userInfo.nombre}
      userLevel={userInfo.nivel}
      userRank={userInfo.rango}
    />
  );
}
