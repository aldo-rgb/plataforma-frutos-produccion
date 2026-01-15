'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SlideToConfirmProps {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function SlideToConfirm({
  onConfirm,
  label = 'Desliza para confirmar',
  confirmLabel = '¡Confirmado!',
  disabled = false,
  loading = false
}: SlideToConfirmProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  const [containerWidth, setContainerWidth] = useState(0);
  const buttonWidth = 64; // w-16 = 64px
  const threshold = containerWidth - buttonWidth - 8; // 8px de padding

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  // Calcular progreso (0 a 1)
  const progress = useTransform(x, [0, threshold], [0, 1]);
  
  // Colores dinámicos basados en progreso
  const backgroundColor = useTransform(
    progress,
    [0, 0.5, 1],
    ['rgba(30, 41, 59, 0.8)', 'rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.6)']
  );
  
  const borderColor = useTransform(
    progress,
    [0, 0.5, 1],
    ['rgba(100, 116, 139, 0.5)', 'rgba(34, 197, 94, 0.5)', 'rgba(34, 197, 94, 0.8)']
  );

  const triggerConfetti = () => {
    // Explosión central
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#39FF14', '#00FF00', '#7CFC00', '#ADFF2F', '#32CD32']
    });

    // Explosiones laterales
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#39FF14', '#FFD700', '#FF6B6B']
      });
    }, 100);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#39FF14', '#FFD700', '#FF6B6B']
      });
    }, 100);

    // Vibración haptic si está disponible
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
  };

  const handleDragEnd = async () => {
    setIsDragging(false);
    
    if (x.get() >= threshold * 0.9) {
      // Completar el slide
      animate(x, threshold, { duration: 0.2 });
      setIsConfirmed(true);
      triggerConfetti();
      
      // Esperar un momento para el efecto visual
      setTimeout(async () => {
        await onConfirm();
      }, 500);
    } else {
      // Regresar al inicio
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  if (loading) {
    return (
      <div className="relative w-full h-16 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-bold">Finalizando...</span>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative w-full h-16 rounded-2xl bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-2 border-green-500 flex items-center justify-center"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="flex items-center gap-3 text-green-400"
        >
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-bold text-lg">{confirmLabel}</span>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-16 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor,
        border: '2px solid',
        borderColor
      }}
    >
      {/* Texto de fondo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span 
          className="text-slate-400 font-semibold flex items-center gap-2"
          style={{
            opacity: useTransform(progress, [0, 0.5], [1, 0])
          }}
        >
          <span>{label}</span>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </motion.span>
      </div>

      {/* Botón deslizable */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: threshold }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`absolute left-1 top-1 w-14 h-14 rounded-xl flex items-center justify-center transition-shadow ${
          disabled 
            ? 'bg-slate-600 cursor-not-allowed' 
            : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
        }`}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        >
          <ChevronRight className={`w-8 h-8 ${disabled ? 'text-slate-400' : 'text-white'}`} />
        </motion.div>
      </motion.div>

      {/* Indicador de progreso */}
      <motion.div
        className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl"
        style={{
          width: useTransform(x, [0, threshold], ['0%', '100%'])
        }}
      />
    </motion.div>
  );
}
