// components/SocketStatus.tsx
'use client';

import { useSocket } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';
import { Wifi, WifiOff } from 'lucide-react';

export default function SocketStatus() {
  const { data: session } = useSession();
  const { isConnected, transport } = useSocket(session?.user?.id?.toString());

  if (!session?.user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border backdrop-blur-sm transition-all ${
        isConnected 
          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        {isConnected ? (
          <Wifi className="w-4 h-4 animate-pulse" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-xs font-medium">
          {isConnected ? `En línea (${transport})` : 'Desconectado'}
        </span>
      </div>
    </div>
  );
}
