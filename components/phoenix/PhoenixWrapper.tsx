'use client';

import { usePhoenix } from '@/contexts/PhoenixContext';
import { ZenView } from './ZenView';
import { ReactNode } from 'react';

export function PhoenixWrapper({ children }: { children: ReactNode }) {
  const { isPhoenixMode } = usePhoenix();

  // Si el modo Fénix está activo, solo mostrar ZenView
  if (isPhoenixMode) {
    return <ZenView />;
  }

  // Si no, mostrar el contenido normal del dashboard
  return <>{children}</>;
}
