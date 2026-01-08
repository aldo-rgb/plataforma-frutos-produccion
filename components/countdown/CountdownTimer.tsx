'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  targetDate: Date | string;
  variant?: 'default' | 'fomo' | 'compact';
  onExpire?: () => void;
  showIcon?: boolean;
  className?: string;
}

export function CountdownTimer({ 
  targetDate, 
  variant = 'default',
  onExpire,
  showIcon = true,
  className = ''
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (timeLeft.expired) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 ${className}`}>
        <Clock size={20} />
        <span className="font-medium">Expirado</span>
      </div>
    );
  }

  // Variant: Compact
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showIcon && <Clock size={18} className="text-amber-400" />}
        <span className="font-mono text-sm">
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    );
  }

  // Variant: FOMO (Fear of Missing Out)
  if (variant === 'fomo') {
    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;
    const isCritical = timeLeft.days === 0 && timeLeft.hours < 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 ${className}`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 ${
          isCritical 
            ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' 
            : isUrgent
            ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20'
            : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10'
        }`} />
        
        {/* Animated border */}
        <div className={`absolute inset-0 rounded-2xl border-2 ${
          isCritical 
            ? 'border-red-500/50 animate-pulse' 
            : isUrgent
            ? 'border-amber-500/50'
            : 'border-cyan-500/30'
        }`} />

        <div className="relative">
          {/* Icon */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {isCritical ? (
              <Flame size={32} className="text-red-500 animate-pulse" />
            ) : isUrgent ? (
              <Zap size={32} className="text-amber-500" />
            ) : (
              <Clock size={32} className="text-cyan-500" />
            )}
            <h3 className={`text-xl font-bold ${
              isCritical 
                ? 'text-red-400' 
                : isUrgent 
                ? 'text-amber-400' 
                : 'text-cyan-400'
            }`}>
              {isCritical ? '¡ÚLTIMA HORA!' : isUrgent ? '¡Tiempo Limitado!' : 'Oferta Especial'}
            </h3>
          </div>

          {/* Countdown Grid */}
          <div className="grid grid-cols-4 gap-3">
            <TimeUnit value={timeLeft.days} label="Días" urgent={isCritical} />
            <TimeUnit value={timeLeft.hours} label="Horas" urgent={isCritical} />
            <TimeUnit value={timeLeft.minutes} label="Minutos" urgent={isCritical} />
            <TimeUnit value={timeLeft.seconds} label="Segundos" urgent={isCritical} />
          </div>

          {/* Urgency Message */}
          {isUrgent && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-center mt-4 font-medium ${
                isCritical ? 'text-red-300' : 'text-amber-300'
              }`}
            >
              {isCritical 
                ? '⚠️ ¡Los precios suben en menos de 1 hora!' 
                : '⏰ ¡Aprovecha antes de que termine!'}
            </motion.p>
          )}
        </div>
      </motion.div>
    );
  }

  // Variant: Default
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {showIcon && (
        <Clock size={24} className="text-cyan-400" />
      )}
      <div className="flex gap-2">
        <TimeUnit value={timeLeft.days} label="d" />
        <span className="text-slate-500">:</span>
        <TimeUnit value={timeLeft.hours} label="h" />
        <span className="text-slate-500">:</span>
        <TimeUnit value={timeLeft.minutes} label="m" />
        <span className="text-slate-500">:</span>
        <TimeUnit value={timeLeft.seconds} label="s" />
      </div>
    </div>
  );
}

function TimeUnit({ 
  value, 
  label, 
  urgent = false 
}: { 
  value: number; 
  label: string; 
  urgent?: boolean;
}) {
  return (
    <div className="text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`text-3xl font-bold font-mono ${
            urgent 
              ? 'text-red-400' 
              : 'text-cyan-400'
          }`}
        >
          {String(value).padStart(2, '0')}
        </motion.div>
      </AnimatePresence>
      <div className="text-xs text-slate-400 uppercase mt-1">
        {label}
      </div>
    </div>
  );
}
