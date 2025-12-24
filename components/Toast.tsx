'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

interface DetailedToast extends ToastProps {
  details?: {
    created?: number;
    existing?: number;
    pending?: number;
    total?: number;
    pendingEmails?: string[];
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<DetailedToast & { id: number }>>([]);

  const showToast = (toast: Omit<DetailedToast, 'onClose'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id, onClose: () => removeToast(id) }]);
    
    const duration = toast.duration || 5000;
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { showToast, toasts };
}

export function Toast({ message, type, details, onClose }: DetailedToast) {
  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-400" />,
    error: <XCircle className="w-6 h-6 text-red-400" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-400" />,
    info: <Info className="w-6 h-6 text-blue-400" />
  };

  const colors = {
    success: 'from-green-500/20 to-green-600/10 border-green-500/50',
    error: 'from-red-500/20 to-red-600/10 border-red-500/50',
    warning: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50',
    info: 'from-blue-500/20 to-blue-600/10 border-blue-500/50'
  };

  return (
    <div className={`bg-gradient-to-r ${colors[type]} border backdrop-blur-xl rounded-lg shadow-2xl p-4 min-w-[350px] max-w-[450px] animate-slide-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        
        <div className="flex-1">
          <p className="text-white font-semibold mb-1">{message}</p>
          
          {details && (
            <div className="mt-3 space-y-2 text-sm">
              {details.created !== undefined && details.created > 0 && (
                <div className="bg-black/20 rounded p-2">
                  <p className="text-green-300 font-medium">🆕 Cuentas nuevas: {details.created}</p>
                  <p className="text-gray-400 text-xs mt-1">Contraseña temporal: <span className="font-mono text-purple-300">Frutos2025!</span></p>
                  <p className="text-gray-400 text-xs">Deberán cambiarla al primer login</p>
                </div>
              )}
              
              {details.existing !== undefined && details.existing > 0 && (
                <div className="bg-black/20 rounded p-2">
                  <p className="text-blue-300">👤 Ya existentes: {details.existing}</p>
                </div>
              )}
              
              {details.pending !== undefined && details.pending > 0 && (
                <div className="bg-black/20 rounded p-2">
                  <p className="text-yellow-300 font-medium">⏳ Cambios pendientes: {details.pending}</p>
                  <p className="text-gray-400 text-xs mt-1">Usuarios en otra organización</p>
                  <p className="text-gray-400 text-xs">Deben aceptar desde su dashboard</p>
                  {details.pendingEmails && details.pendingEmails.length > 0 && (
                    <div className="mt-2 max-h-20 overflow-y-auto">
                      {details.pendingEmails.map((email, i) => (
                        <p key={i} className="text-xs text-gray-300 font-mono">📧 {email}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {details.total !== undefined && (
                <div className="bg-purple-500/20 rounded p-2 mt-2">
                  <p className="text-purple-200 font-semibold">✨ Total agregados: {details.total}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts }: { toasts: Array<DetailedToast & { id: number }> }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
}
