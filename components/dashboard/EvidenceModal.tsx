'use client';

import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Check, AlertCircle, Sparkles } from 'lucide-react';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, description: string) => Promise<void>;
  task: {
    id: number;
    accionId: number;
    metaId: number;
    title: string;
    areaType: string;
    evidenceUrl?: string | null;
    evidenceStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  } | null;
}

export default function EvidenceModal({ isOpen, onClose, onSubmit, task }: EvidenceModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar con evidencia existente cuando se abre el modal
  useState(() => {
    if (isOpen && task?.evidenceUrl) {
      setPreviewUrl(task.evidenceUrl);
      setIsEditingExisting(true);
    }
  });

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !task) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(selectedFile, description);
      
      // Mostrar animación de éxito
      setUploadSuccess(true);
      
      // Esperar un poco para que se vea la animación
      setTimeout(() => {
        setUploadSuccess(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setDescription('');
        setIsSubmitting(false);
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la evidencia');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescription('');
    setError(null);
    setUploadSuccess(false);
    setIsSubmitting(false);
    setIsEditingExisting(false);
    onClose();
  };

  // Mostrar solo visualización si la evidencia ya fue aprobada
  const isApproved = task?.evidenceStatus === 'APPROVED';

  if (!isOpen || !task) return null;

  // Animación de éxito
  if (uploadSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="bg-gradient-to-br from-[#1a1b1f] to-[#252836] rounded-3xl p-10 max-w-md w-full border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icono animado */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-12 h-12 text-emerald-400 stroke-[3]" />
                </div>
              </div>
              <Sparkles className="w-7 h-7 text-emerald-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '3s' }} />
              <Sparkles className="w-5 h-5 text-emerald-300 absolute -bottom-1 -left-1 animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">¡Evidencia Enviada!</h3>
              <div className="h-1 w-20 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full mx-auto"></div>
            </div>

            {/* Mensaje */}
            <p className="text-gray-300 text-base leading-relaxed">
              Tu mentor revisará la evidencia pronto y recibirás una notificación cuando sea aprobada.
            </p>

            {/* Info adicional */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 w-full">
              <p className="text-sm text-emerald-200">
                💡 Mientras tanto, puedes seguir trabajando en otras tareas
              </p>
            </div>

            {/* Auto-close indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>Esta ventana se cerrará automáticamente</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1a1b1f] rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isApproved ? '✅ Evidencia Aprobada' : isEditingExisting ? 'Cambiar Evidencia' : 'Subir Evidencia'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{task.title}</p>
            {isApproved && (
              <p className="text-xs text-emerald-500 mt-1">✨ Esta evidencia ha sido aprobada por tu mentor</p>
            )}
            {!isApproved && isEditingExisting && task.evidenceStatus === 'PENDING' && (
              <p className="text-xs text-yellow-500 mt-1">⚠️ Evidencia en revisión - Puedes cambiarla antes de que sea aprobada</p>
            )}
            {!isApproved && isEditingExisting && task.evidenceStatus === 'REJECTED' && (
              <p className="text-xs text-red-500 mt-1">❌ Evidencia rechazada - Sube una nueva</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Drag & Drop Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Foto de evidencia *</label>
            <div
              onDragOver={!isApproved ? handleDragOver : undefined}
              onDragLeave={!isApproved ? handleDragLeave : undefined}
              onDrop={!isApproved ? handleDrop : undefined}
              onClick={!isApproved ? () => fileInputRef.current?.click() : undefined}
              className={`
                relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
                ${isApproved 
                  ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                  : 'cursor-pointer'
                }
                ${!isApproved && isDragging 
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                  : !isApproved && previewUrl
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : !isApproved
                      ? 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900/70'
                      : ''
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-white">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{selectedFile?.name || 'Evidencia subida'}</span>
                    </div>
                    {isApproved && (
                      <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check size={14} />
                        Aprobada
                      </div>
                    )}
                  </div>
                  {!isApproved && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setIsEditingExisting(false);
                      }}
                      className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cambiar foto
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-500/20' : 'bg-gray-800'} transition-colors`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {isDragging ? '¡Suelta la imagen aquí!' : 'Arrastra una imagen o haz clic para seleccionar'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG o GIF hasta 5MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {!isApproved && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setDescription(e.target.value);
                  }
                }}
                placeholder="¿Qué hiciste? ¿Qué lograste? Cuéntale a tu mentor..."
                className="w-full h-24 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none transition-all"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {description.length}/500 caracteres
                </span>
              </div>
            </div>
          )}

          {/* Info Box */}
          {!isApproved && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">
                    {isEditingExisting ? 'Reemplazarás la evidencia anterior' : 'Tu mentor revisará esta evidencia'}
                  </p>
                  <p className="text-blue-300/80">
                    {isEditingExisting 
                      ? 'La nueva evidencia será revisada nuevamente por tu mentor.'
                      : 'Una vez aprobada, la tarea se marcará como completada automáticamente.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-200">
                  <p className="font-medium mb-1">
                    ✅ Evidencia Aprobada
                  </p>
                  <p className="text-emerald-300/80">
                    Tu mentor ha aprobado esta evidencia. La tarea está completada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10 bg-gray-900/30 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            {isApproved ? 'Cerrar' : 'Cancelar'}
          </button>
          {!isApproved && (
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Subiendo...</span>
                </span>
              ) : (
                isEditingExisting ? 'Cambiar evidencia' : 'Enviar evidencia'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
