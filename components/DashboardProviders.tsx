'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

interface DashboardProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

export default function DashboardProviders({ children, session }: DashboardProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
