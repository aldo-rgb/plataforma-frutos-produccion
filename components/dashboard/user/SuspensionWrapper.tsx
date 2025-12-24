'use client';

import { useEffect, useState } from 'react';
import SuspensionModal from './SuspensionModal';

interface SuspensionWrapperProps {
  children: React.ReactNode;
}

interface SuspensionStatus {
  suspended: boolean;
  missedCallsCount: number;
  maxMissedAllowed: number;
  extraLifeUsed: boolean;
  cycleEndDate?: string | null;
  enrollmentId?: string;
}

export default function SuspensionWrapper({ children }: SuspensionWrapperProps) {
  const [status, setStatus] = useState<SuspensionStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuspensionStatus();
  }, []);

  const checkSuspensionStatus = async () => {
    try {
      const res = await fetch('/api/user/suspension-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        
        // Mostrar modal automáticamente si está suspendido
        if (data.suspended) {
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error verificando suspensión:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <>{children}</>;
  }

  // Si no está suspendido, renderizar normal
  if (!status?.suspended) {
    return <>{children}</>;
  }

  // Si está suspendido, aplicar filtro de escala de grises
  return (
    <>
      {/* Wrapper con filtro de escala de grises */}
      <div className="relative">
        {/* Filtro de escala de grises */}
        <div className="grayscale opacity-50 pointer-events-none select-none">
          {children}
        </div>

        {/* Overlay con mensaje */}
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-red-950/90 backdrop-blur-sm border-2 border-red-500/50 rounded-2xl p-8 max-w-md shadow-2xl shadow-red-500/20">
            <div className="text-center">
              <div className="inline-block bg-red-500/20 p-4 rounded-full mb-4">
                <svg 
                  className="h-12 w-12 text-red-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Sistema Suspendido
              </h3>
              <p className="text-red-200 mb-6">
                Has alcanzado el límite de faltas en llamadas de disciplina
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="pointer-events-auto bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-400 hover:to-red-500 transition-all"
              >
                Ver Opciones de Recuperación
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de información */}
      {showModal && (
        <SuspensionModal
          missedCallsCount={status.missedCallsCount}
          maxMissedAllowed={status.maxMissedAllowed}
          extraLifeUsed={status.extraLifeUsed}
          cycleEndDate={status.cycleEndDate ? new Date(status.cycleEndDate) : null}
          enrollmentId={status.enrollmentId}
          onClose={() => setShowModal(false)}
          onPurchaseSuccess={() => checkSuspensionStatus()}
        />
      )}
    </>
  );
}
