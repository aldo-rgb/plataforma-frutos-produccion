'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';

interface SecurityGateProps {
  rol: string;
  suscripcion: string;
  children: React.ReactNode;
}

export function SecurityGate({ rol, suscripcion, children }: SecurityGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  // Lógica de Permisos
  const esStaff = ['ADMIN', 'MENTOR', 'COORDINADOR', 'GAME_CHANGER'].includes(rol);
  const esActivo = suscripcion === 'ACTIVO' || suscripcion === 'PRUEBA';
  
  // Rutas permitidas para usuarios inactivos (para que puedan pagar o configurar perfil)
  const rutasPermitidas = [
    '/dashboard/suscripcion',
    '/dashboard/perfil' // Opcional, por si necesitan cerrar sesión o cambiar datos
  ];

  useEffect(() => {
    // Si es Staff o tiene suscripción activa, pase libre.
    if (esStaff || esActivo) {
      setIsChecking(false);
      return;
    }

    // Si NO es staff y NO está activo:
    // Verificamos si ya está en una ruta permitida para evitar bucles
    const estaEnRutaPermitida = rutasPermitidas.some(ruta => pathname?.startsWith(ruta));

    if (!estaEnRutaPermitida) {
      // BLOQUEO: Redirigir a suscripción
      router.push('/dashboard/suscripcion');
    } else {
      // Ya está donde debe estar
      setIsChecking(false);
    }
  }, [pathname, esStaff, esActivo, router]);

  // Mientras verifica, mostramos un estado de carga limpio para evitar "flasheos" de contenido prohibido
  if (isChecking) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Lock className="h-10 w-10 mb-4 animate-pulse text-blue-500" />
        <p>Verificando credenciales cuánticas...</p>
      </div>
    );
  }

  // Si pasa las validaciones, renderizamos el contenido (los children)
  return <>{children}</>;
}
