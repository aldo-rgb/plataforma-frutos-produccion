'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PhoenixContextType {
  isPhoenixMode: boolean;
  phoenixSessionId: number | null;
  activatePhoenix: (reason?: string) => Promise<void>;
  exitPhoenix: () => Promise<void>;
  isLoading: boolean;
}

const PhoenixContext = createContext<PhoenixContextType | undefined>(undefined);

export function PhoenixProvider({ children }: { children: ReactNode }) {
  const [isPhoenixMode, setIsPhoenixMode] = useState(false);
  const [phoenixSessionId, setPhoenixSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for active Phoenix session on mount
  useEffect(() => {
    checkPhoenixStatus();
  }, []);

  const checkPhoenixStatus = async () => {
    try {
      const response = await fetch('/api/phoenix/status');
      const data = await response.json();
      
      if (data.isActive) {
        setIsPhoenixMode(true);
        setPhoenixSessionId(data.session.id);
      }
    } catch (error) {
      console.error('Error checking Phoenix status:', error);
    }
  };

  const activatePhoenix = async (reason?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/phoenix/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ triggerReason: reason })
      });

      const data = await response.json();

      if (data.success) {
        setIsPhoenixMode(true);
        setPhoenixSessionId(data.phoenixSessionId);
        
        // Store in sessionStorage for persistence across navigation
        sessionStorage.setItem('phoenixMode', 'true');
        sessionStorage.setItem('phoenixSessionId', data.phoenixSessionId.toString());
      }
    } catch (error) {
      console.error('Error activating Phoenix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exitPhoenix = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/phoenix/exit', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setIsPhoenixMode(false);
        setPhoenixSessionId(null);
        sessionStorage.removeItem('phoenixMode');
        sessionStorage.removeItem('phoenixSessionId');
      }
    } catch (error) {
      console.error('Error exiting Phoenix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhoenixContext.Provider
      value={{
        isPhoenixMode,
        phoenixSessionId,
        activatePhoenix,
        exitPhoenix,
        isLoading
      }}
    >
      {children}
    </PhoenixContext.Provider>
  );
}

export function usePhoenix() {
  const context = useContext(PhoenixContext);
  if (context === undefined) {
    throw new Error('usePhoenix must be used within a PhoenixProvider');
  }
  return context;
}
