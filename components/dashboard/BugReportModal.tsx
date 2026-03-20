'use client';

import { useState, useRef } from 'react';
import { X, Bug, Upload, Send, Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  userId?: number;
}

export default function BugReportModal({ isOpen, onClose, userName, userEmail, userId }: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede ser mayor a 5MB');
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshot(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Por favor describe el error');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Subir imagen si existe
      let screenshotUrl = null;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('file', screenshotFile);
        formData.append('folder', 'bug-reports');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          screenshotUrl = uploadData.url;
        }
      }

      // Crear el reporte
      const reportData = {
        description,
        screenshotUrl,
        userName: userName || 'Usuario Anónimo',
        userEmail: userEmail || '',
        userId: userId || null,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (!res.ok) {
        throw new Error('Error al enviar el reporte');
      }

      // El WhatsApp se envía automáticamente desde el servidor
      setSubmitted(true);
      
      // Reset después de 2 segundos
      setTimeout(() => {
        setDescription('');
        setScreenshot(null);
        setScreenshotFile(null);
        setSubmitted(false);
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error submitting bug report:', err);
      setError('Error al enviar el reporte. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-red-900/20 to-orange-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Bug className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reportar Error</h3>
                <p className="text-xs text-slate-400">Ayúdanos a mejorar la plataforma</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">¡Reporte Enviado!</h4>
                <p className="text-slate-400">Gracias por ayudarnos a mejorar.</p>
              </div>
            ) : (
              <>
                {/* Descripción */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Describe el error *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="¿Qué pasó? ¿Qué esperabas que pasara? ¿Qué pasos seguiste?"
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none h-32"
                  />
                </div>

                {/* Screenshot */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Captura de pantalla (opcional)
                  </label>
                  
                  {screenshot ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-600">
                      <img src={screenshot} alt="Screenshot" className="w-full max-h-48 object-cover" />
                      <button
                        onClick={removeScreenshot}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-6 border-2 border-dashed border-slate-600 rounded-xl hover:border-slate-500 transition flex flex-col items-center gap-2 text-slate-400 hover:text-slate-300"
                    >
                      <Camera className="w-8 h-8" />
                      <span className="text-sm">Haz clic para subir una imagen</span>
                      <span className="text-xs text-slate-500">PNG, JPG hasta 5MB</span>
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Info */}
                <div className="mb-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-400">
                    📍 Página actual: <span className="text-slate-300">{typeof window !== 'undefined' ? window.location.pathname : ''}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    👤 Usuario: <span className="text-slate-300">{userName || 'Anónimo'}</span>
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !description.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Reporte
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
