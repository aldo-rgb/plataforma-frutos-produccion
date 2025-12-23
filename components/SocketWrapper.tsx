'use client';

import { SessionProvider } from 'next-auth/react';
import SocketStatus from './SocketStatus';
import NotificacionesRealtime from './NotificacionesRealtime';

export default function SocketWrapper() {
  return (
    <SessionProvider>
      <SocketStatus />
      <NotificacionesRealtime />
    </SessionProvider>
  );
}
