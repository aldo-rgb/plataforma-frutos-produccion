'use client';

import { SessionProvider } from 'next-auth/react';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
