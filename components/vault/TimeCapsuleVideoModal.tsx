'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Sparkles, Download, Play, Loader2 } from 'lucide-react';

interface TimeCapsuleVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidencias: Array<{
    id: number;
    fotoUrl: string;
    descripcion: string;
    fecha: Date;
    rarity: string;
    highQuality?: boolean;
  }>;
}

export default function TimeCapsuleVideoModal({
  isOpen,
  onClose,
  evidencias
}: TimeCapsuleVideoModalProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    setGenerating(true);
    setProgress(0);
    setError(null);
    setVideoUrl(null);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);

      // Llamar al endpoint de generación
      const response = await fetch('/api/video/generate-time-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidencias: evidencias.map(ev => ({
            id: ev.id,
            fotoUrl: ev.fotoUrl,
            descripcion: ev.descripcion,
            fecha: ev.fecha,
            rarity: ev.rarity
          }))
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Error al generar video');
      }

      const data = await response.json();
      setProgress(100);
      setVideoUrl(data.videoUrl);

    } catch (err) {
      console.error('Error generando video:', err);
      setError('Hubo un error al generar tu Time Capsule. Intenta de nuevo.');
      setProgress(0);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `time-capsule-${new Date().toISOString().split('T')[0]}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!isOpen) return null;

  const highQualityCount = evidencias.filter(ev => ev.highQuality).length;
  const legendaryCount = evidencias.filter(ev => ev.rarity === 'LEGENDARY').length;
  const epicCount = evidencias.filter(ev => ev.rarity === 'EPIC').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-3xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-3xl shadow-2xl border border-purple-500/30 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white flex items-center gap-2">
                    Time Capsule
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </h2>
                  <p className="text-purple-100 mt-1">
                    La Evidencia de tu Transformación
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {!videoUrl && !generating && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                      <div className="text-3xl font-bold text-white">{evidencias.length}</div>
                      <div className="text-sm text-gray-400">Artefactos</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-xl p-4 text-center border border-yellow-500/30">
                      <div className="text-3xl font-bold text-yellow-500">{legendaryCount}</div>
                      <div className="text-sm text-yellow-300">Legendarios</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/30">
                      <div className="text-3xl font-bold text-purple-400">{epicCount}</div>
                      <div className="text-sm text-purple-300">Épicos</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-xl p-4 text-center border border-blue-500/30">
                      <div className="text-3xl font-bold text-blue-400">{highQualityCount}</div>
                      <div className="text-sm text-blue-300">Alta Calidad</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 mb-6 border border-purple-500/20">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      ¿Qué es Time Capsule?
                    </h3>
                    <p className="text-gray-300 leading-relaxed mb-4">
                      Tu viaje de transformación merece ser celebrado. Generaremos un video épico 
                      con tus mejores momentos capturados en The Quantum Archive.
                    </p>
                    <ul className="space-y-2 text-gray-400 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span>Selección automática de tus mejores evidencias</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span>Música épica y transiciones cinematográficas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span>Texto motivacional generado por IA</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span>Descarga en HD para compartir tu historia</span>
                      </li>
                    </ul>
                  </div>

                  {/* Requirements */}
                  {evidencias.length < 10 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
                      <p className="text-orange-300 text-sm">
                        ⚠️ Necesitas al menos <strong>10 evidencias aprobadas</strong> para generar tu Time Capsule. 
                        Actualmente tienes {evidencias.length}.
                      </p>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateVideo}
                    disabled={evidencias.length < 10}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                      evidencias.length >= 10
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-6 h-6" />
                    Generar Mi Time Capsule
                  </button>
                </>
              )}

              {/* Generating State */}
              {generating && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="inline-block mb-6"
                  >
                    <Loader2 className="w-16 h-16 text-purple-500" />
                  </motion.div>

                  <h3 className="text-2xl font-bold text-white mb-3">
                    Creando tu Time Capsule...
                  </h3>
                  <p className="text-gray-400 mb-6">
                    QUANTUM está curando tus mejores momentos
                  </p>

                  {/* Progress Bar */}
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                      <motion.div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-gray-500">{progress}%</p>
                  </div>

                  <div className="mt-8 space-y-2 text-sm text-gray-500">
                    <p>🎬 Seleccionando mejores evidencias...</p>
                    <p>🎵 Agregando música épica...</p>
                    <p>✨ Aplicando efectos cinematográficos...</p>
                  </div>
                </div>
              )}

              {/* Video Ready */}
              {videoUrl && !generating && (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="mb-6"
                  >
                    <div className="inline-block p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
                      <Video className="w-16 h-16 text-white" />
                    </div>
                  </motion.div>

                  <h3 className="text-3xl font-black text-white mb-3">
                    ¡Tu Time Capsule está lista! 🎉
                  </h3>
                  <p className="text-gray-400 mb-8">
                    La evidencia de tu transformación ha sido preservada
                  </p>

                  {/* Video Preview */}
                  <div className="bg-gray-800 rounded-xl overflow-hidden mb-6">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full"
                      poster="/placeholder-video.jpg"
                    >
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={handleDownload}
                      className="py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Descargar Video
                    </button>
                    <button
                      onClick={onClose}
                      className="py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={handleGenerateVideo}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
