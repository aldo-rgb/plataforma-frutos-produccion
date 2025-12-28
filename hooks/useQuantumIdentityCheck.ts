'use client';

import { useEffect, useState } from 'react';

export function useQuantumIdentityCheck() {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    checkQuantumIdentity();
  }, []);

  const checkQuantumIdentity = async () => {
    try {
      const res = await fetch('/api/quantum-identity/check');
      if (res.ok) {
        const data = await res.json();
        if (data.requiresIdentity) {
          setShouldShowModal(true);
          setUserInfo(data.userInfo);
        }
      }
    } catch (error) {
      console.error('Error checking quantum identity:', error);
    }
  };

  return { shouldShowModal, setShouldShowModal, userInfo };
}
