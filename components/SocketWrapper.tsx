'use client';

import { SessionProvider } from 'next-auth/react';
import SocketStatus from './SocketStatus';

export default function SocketWrapper() {
  return (
    <SessionProvider>
      <SocketStatus />
    </SessionProvider>
  );
}
