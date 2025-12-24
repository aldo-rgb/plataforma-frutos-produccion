'use client';

import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function AlertModal({
  isOpen,
  onClose,
  message,
  type = 'info'
}: AlertModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-close after 3 seconds for success messages
      if (type === 'success') {
        const timer = setTimeout(() => {
          onClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: <CheckCircle size={32} />,
      bg: 'from-green-900/90 to-green-800/90',
      border: 'border-green-500/50',
      iconColor: 'text-green-400',
      title: '¡Éxito!'
    },
    error: {
      icon: <XCircle size={32} />,
      bg: 'from-red-900/90 to-red-800/90',
      border: 'border-red-500/50',
      iconColor: 'text-red-400',
      title: 'Error'
    },
    info: {
      icon: <Info size={32} />,
      bg: 'from-blue-900/90 to-blue-800/90',
      border: 'border-blue-500/50',
      iconColor: 'text-blue-400',
      title: 'Información'
    }
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`relative w-full max-w-md bg-gradient-to-br ${config.bg} rounded-2xl shadow-2xl border-2 ${config.border} overflow-hidden transform transition-all animate-scaleIn`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full bg-black/30 flex items-center justify-center ${config.iconColor}`}>
              {config.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            {config.title}
          </h2>

          {/* Message */}
          <p className="text-gray-200 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Action */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all font-medium"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
