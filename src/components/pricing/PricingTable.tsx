'use client';

import { useState } from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { PRICING_TIERS } from '@/src/types/pricing';

interface PricingTableProps {
  onSelectPlan?: (plan: 'ANNUAL_STANDARD' | 'ANNUAL_PREMIUM' | 'MONTHLY_STANDARD' | 'MONTHLY_PREMIUM') => void;
  showPostVisionDiscount?: boolean;
}

export default function PricingTable({ onSelectPlan, showPostVisionDiscount = false }: PricingTableProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const handleSelectPlan = (tierId: string) => {
    const planMap = {
      'standard-monthly': 'MONTHLY_STANDARD',
      'standard-annual': 'ANNUAL_STANDARD',
      'premium-monthly': 'MONTHLY_PREMIUM',
      'premium-annual': 'ANNUAL_PREMIUM',
    } as const;

    const planKey = `${tierId}-${billingPeriod}` as keyof typeof planMap;
    const plan = planMap[planKey];
    
    if (plan && onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">
          Elige tu <span className="text-purple-400">Plan de Transformación</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Invierte en tu futuro. Menos de lo que cuesta un café al día.
        </p>

        {/* Toggle Mensual/Anual */}
        <div className="inline-flex items-center bg-gray-800/50 rounded-full p-1.5 border border-gray-700">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'annual'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Anual
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
              Ahorra hasta 32%
            </span>
          </button>
        </div>

        {showPostVisionDiscount && (
          <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-bold">¡Oferta Especial Ex-Alumno!</span>
            </div>
            <p className="text-gray-300 text-sm">
              Como graduado de tu Visión, obtén <strong className="text-white">50% de descuento</strong> en tu primer año anual.
            </p>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {PRICING_TIERS.map((tier) => {
          const isHighlighted = tier.highlighted;
          const price = billingPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
          const savings = billingPeriod === 'annual' ? tier.annualSavings : 0;
          const postVisionPrice = showPostVisionDiscount && billingPeriod === 'annual' 
            ? Math.round(price * 0.5) 
            : null;

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                isHighlighted
                  ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-2 border-purple-500 shadow-2xl shadow-purple-500/20 scale-105'
                  : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`px-4 py-1 rounded-full text-sm font-bold ${
                    isHighlighted
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                  }`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Tier Name */}
              <div className="flex items-center gap-3 mb-4">
                {tier.id === 'premium' ? (
                  <Zap className="w-8 h-8 text-yellow-400" />
                ) : (
                  <Check className="w-8 h-8 text-green-400" />
                )}
                <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-6">
                {postVisionPrice ? (
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-gray-500 line-through text-2xl">${price}</span>
                      <span className="text-5xl font-bold text-white">${postVisionPrice}</span>
                      <span className="text-gray-400">MXN</span>
                    </div>
                    <p className="text-purple-400 text-sm font-medium">
                      ¡50% OFF primer año! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">${price}</span>
                    <span className="text-gray-400">MXN</span>
                    <span className="text-gray-500">
                      /{billingPeriod === 'monthly' ? 'mes' : 'año'}
                    </span>
                  </div>
                )}

                {billingPeriod === 'monthly' && (
                  <p className="text-gray-500 text-sm mt-1">
                    ${tier.monthlyPrice * 12} MXN al año
                  </p>
                )}

                {savings > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                    <Sparkles className="w-4 h-4" />
                    Ahorras ${savings} ({tier.discountPercent}%)
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(tier.id)}
                className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all mb-6 ${
                  isHighlighted
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Comenzar Ahora
              </button>

              {/* Features */}
              <div className="space-y-3">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Subtext */}
              {billingPeriod === 'monthly' && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-gray-500 text-xs text-center">
                    💡 <strong>Tip:</strong> Paga anual y ahorra ${tier.annualSavings} MXN
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Copy */}
      <div className="mt-12 text-center">
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">
          🔒 <strong>Garantía de Satisfacción:</strong> Si en los primeros 30 días no ves resultados, 
          te devolvemos tu dinero sin preguntas.
        </p>
      </div>
    </div>
  );
}
