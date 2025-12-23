'use client';

interface SecurityGateProps {
  rol: string;
  suscripcion: string;
  children: React.ReactNode;
}

export function SecurityGate({ rol, suscripcion, children }: SecurityGateProps) {
  // La validación de suscripción ya NO se hace aquí
  // Se validará SOLO cuando el usuario PARTICIPANTE intente enviar su carta a revisión
  // Staff y otros roles tienen acceso libre siempre
  
  // Renderizamos directamente el contenido sin bloqueos
  return <>{children}</>;
}
