'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20',
      border: 'border-emerald-500/50',
      icon: <CheckCircle2 className="text-emerald-400" size={24} />,
      text: 'text-emerald-200'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
      border: 'border-red-500/50',
      icon: <XCircle className="text-red-400" size={24} />,
      text: 'text-red-200'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/50',
      icon: <AlertCircle className="text-amber-400" size={24} />,
      text: 'text-amber-200'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/50',
      icon: <AlertCircle className="text-blue-400" size={24} />,
      text: 'text-blue-200'
    }
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} border-2 ${style.border} rounded-2xl p-4 shadow-2xl backdrop-blur-sm animate-slideInRight flex items-center gap-4 min-w-[320px] max-w-md`}>
      <div className="flex-shrink-0">
        {style.icon}
      </div>
      <p className={`${style.text} font-medium flex-1`}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="text-gray-400 hover:text-white" size={18} />
      </button>
    </div>
  );
}
