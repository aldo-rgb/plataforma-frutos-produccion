'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountdownTimer } from './CountdownTimer';

interface DynamicPricingProps {
  basePrice: number;
  promoPrice?: number;
  promoEndDate?: Date | string;
  level: 'BASIC' | 'ADVANCED' | 'PL';
  showCountdown?: boolean;
  className?: string;
}

export function DynamicPricing({
  basePrice,
  promoPrice,
  promoEndDate,
  level,
  showCountdown = true,
  className = ''
}: DynamicPricingProps) {
  const [isPromoActive, setIsPromoActive] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(basePrice);

  useEffect(() => {
    if (promoPrice && promoEndDate) {
      const now = new Date();
      const end = new Date(promoEndDate);
      setIsPromoActive(now < end);
      setCurrentPrice(now < end ? promoPrice : basePrice);
    } else {
      setCurrentPrice(basePrice);
    }
  }, [promoPrice, promoEndDate, basePrice]);

  const discountPercent = promoPrice 
    ? Math.round(((basePrice - promoPrice) / basePrice) * 100)
    : 0;

  const handlePromoExpire = () => {
    setIsPromoActive(false);
    setCurrentPrice(basePrice);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Promo Badge */}
      {isPromoActive && discountPercent > 0 && (
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-3 -right-3 z-10"
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <Percent size={14} />
            -{discountPercent}%
          </div>
        </motion.div>
      )}

      {/* Price Display */}
      <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
        {/* Level Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {level === 'BASIC' ? '🌱' : level === 'ADVANCED' ? '⚡' : '👑'}
            </span>
            <span className="font-bold text-lg">{level}</span>
          </div>
          
          {isPromoActive && (
            <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
              PROMO ACTIVA
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          {isPromoActive && promoPrice && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 line-through text-lg">
                ${basePrice.toLocaleString('es-MX')}
              </span>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp size={16} />
                <span>Ahorras ${(basePrice - promoPrice).toLocaleString('es-MX')}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-baseline gap-2">
            <DollarSign size={32} className="text-cyan-400" />
            <motion.span
              key={currentPrice}
              initial={{ scale: 1.2, color: '#00F0FF' }}
              animate={{ scale: 1, color: '#FFFFFF' }}
              className="text-5xl font-bold"
            >
              {currentPrice.toLocaleString('es-MX')}
            </motion.span>
            <span className="text-slate-400 text-xl">MXN</span>
          </div>
        </div>

        {/* Countdown */}
        {showCountdown && isPromoActive && promoEndDate && (
          <div className="pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2 text-center">
              ⏰ Precio promocional termina en:
            </p>
            <CountdownTimer 
              targetDate={promoEndDate}
              variant="compact"
              onExpire={handlePromoExpire}
              showIcon={false}
              className="justify-center text-amber-300"
            />
          </div>
        )}

        {/* Features */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <ul className="space-y-2 text-sm text-slate-300">
            {level === 'BASIC' && (
              <>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Acceso completo</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Material digital</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Soporte básico</span>
                </li>
              </>
            )}
            {level === 'ADVANCED' && (
              <>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Todo lo de Básico</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Sesiones adicionales</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Material exclusivo</span>
                </li>
              </>
            )}
            {level === 'PL' && (
              <>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Todo lo de Avanzado</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Certificación</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Mentoría 1:1</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
