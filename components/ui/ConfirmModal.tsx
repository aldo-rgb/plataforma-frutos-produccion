'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'danger',
  icon
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeColors = {
    danger: {
      bg: 'from-red-900/90 to-red-800/90',
      border: 'border-red-500/50',
      icon: 'text-red-400',
      button: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
    },
    warning: {
      bg: 'from-yellow-900/90 to-yellow-800/90',
      border: 'border-yellow-500/50',
      icon: 'text-yellow-400',
      button: 'from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
    },
    info: {
      bg: 'from-blue-900/90 to-blue-800/90',
      border: 'border-blue-500/50',
      icon: 'text-blue-400',
      button: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
    }
  };

  const colors = typeColors[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`relative w-full max-w-md bg-gradient-to-br ${colors.bg} rounded-2xl shadow-2xl border-2 ${colors.border} overflow-hidden transform transition-all animate-scaleIn`}
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
            <div className={`w-16 h-16 rounded-full bg-black/30 flex items-center justify-center ${colors.icon}`}>
              {icon || <AlertTriangle size={32} />}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-200 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${colors.button} text-white rounded-xl transition-all font-bold shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
