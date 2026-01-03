'use client';

import { useEffect, useState } from 'react';

const COOLDOWN_KEY = 'quantum_identity_cooldown';
const COOLDOWN_DURATION = 10000; // 10 segundos de cooldown después de cerrar

export function useQuantumIdentityCheck() {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkQuantumIdentity();
  }, []);

  const checkQuantumIdentity = async () => {
    if (isChecking) return; // Evitar verificaciones duplicadas
    
    // Verificar si estamos en período de cooldown
    const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownUntil) {
      const cooldownTime = parseInt(cooldownUntil);
      if (Date.now() < cooldownTime) {
        console.log('🕒 En período de cooldown, no mostrar modal');
        setShouldShowModal(false);
        return;
      } else {
        // Cooldown expirado, limpiar
        localStorage.removeItem(COOLDOWN_KEY);
      }
    }
    
    setIsChecking(true);
    try {
      // Agregar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/quantum-identity/check?t=${timestamp}`, {
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.requiresIdentity) {
          setShouldShowModal(true);
          setUserInfo(data.userInfo);
        } else {
          setShouldShowModal(false);
          // Si ya no requiere identidad, limpiar cualquier cooldown
          localStorage.removeItem(COOLDOWN_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking quantum identity:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const closeModalWithCooldown = () => {
    setShouldShowModal(false);
    // Establecer cooldown para evitar que se reabra inmediatamente
    const cooldownUntil = Date.now() + COOLDOWN_DURATION;
    localStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString());
    console.log('🔒 Cooldown activado por 10 segundos');
  };

  return { 
    shouldShowModal, 
    setShouldShowModal, 
    userInfo, 
    checkQuantumIdentity,
    closeModalWithCooldown 
  };
}
