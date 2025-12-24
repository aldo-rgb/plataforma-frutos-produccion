'use client';

import { useState } from 'react';
import { Check, Lock, Building2, X, Loader2 } from 'lucide-react';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (tier: 'FREE' | 'STANDARD' | 'PREMIUM') => Promise<void>;
  userEmail?: string;
}

export default function PlanSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectPlan,
  userEmail 
}: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'STANDARD' | 'PREMIUM' | null>(null);
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [licenseCode, setLicenseCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const plans = [
    {
      tier: 'FREE' as const,
      name: 'FREE',
      price: '$0',
      period: 'para siempre',
      color: 'from-slate-600 to-slate-700',
      borderColor: 'border-slate-600',
      features: [
        'Auto-aprobación instantánea',
        'Sin mentor asignado',
        'Acceso a Carta F.R.U.T.O.S.',
        'Mentor IA ilimitado',
        '0 Puntos de Compromiso',
        'Sin ranking ni competencia'
      ],
      limitations: [
        'Sin revisión por mentor',
        'Sin acceso a sesiones',
        'Sin programa intensivo'
      ]
    },
    {
      tier: 'STANDARD' as const,
      name: 'STANDARD',
      price: '$1,200',
      period: '/mes',
      color: 'from-purple-600 to-pink-600',
      borderColor: 'border-purple-500',
      badge: 'Más Popular',
      features: [
        'Mentor personal asignado',
        'Revisión de carta + evidencias',
        'Gana Puntos de Compromiso',
        'Acceso al Programa Intensivo',
        'Ranking global',
        'Muro de la Excelencia',
        'Tienda de recompensas'
      ],
      limitations: []
    },
    {
      tier: 'PREMIUM' as const,
      name: 'PREMIUM',
      price: '$5,000',
      period: '/mes',
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500',
      badge: 'Elite',
      features: [
        'Todo lo de STANDARD +',
        '2 sesiones de coaching 1:1/mes',
        'Prioridad en revisiones',
        'Acceso a mentores top',
        'Soporte prioritario',
        'Comunidad exclusiva'
      ],
      limitations: []
    }
  ];

  const handleRedeemLicense = async () => {
    if (!licenseCode.trim()) {
      setError('Ingresa un código de licencia');
      return;
    }

    setIsRedeeming(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/redeem-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: licenseCode.trim().toUpperCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al canjear código');
      }

      setSuccess(data.message || 'Licencia activada exitosamente');
      
      // Esperar 1.5 segundos y recargar
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error al canjear código');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSelectPlan = async (tier: 'FREE' | 'STANDARD' | 'PREMIUM') => {
    if (tier === 'FREE') {
      // FREE: Auto-aprobar inmediatamente
      await onSelectPlan(tier);
    } else {
      // STANDARD/PREMIUM: Redirigir a página de pago
      window.location.href = '/dashboard/suscripcion';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl max-w-6xl w-full border border-slate-700 shadow-2xl relative my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              Elige tu Plan 🚀
            </h2>
            <p className="text-slate-300">
              Selecciona el plan que mejor se adapte a tus objetivos
            </p>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative bg-slate-800 rounded-xl border-2 ${
                selectedPlan === plan.tier 
                  ? plan.borderColor 
                  : 'border-slate-700'
              } p-6 hover:border-slate-600 transition-all cursor-pointer`}
              onClick={() => setSelectedPlan(plan.tier)}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r ${plan.color} px-4 py-1 rounded-full text-white text-sm font-bold shadow-lg`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan Name */}
              <div className="text-center mb-4 mt-2">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                    {plan.price}
                  </span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Limitations (solo FREE) */}
              {plan.limitations.length > 0 && (
                <ul className="space-y-2 mb-6 pt-4 border-t border-slate-700">
                  {plan.limitations.map((limitation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-500 text-sm">
                      <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectPlan(plan.tier);
                }}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  plan.tier === 'FREE'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg hover:scale-105`
                }`}
              >
                {plan.tier === 'FREE' ? 'Comenzar Gratis' : `Seleccionar ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* License Code Section */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">
                ¿Tienes un código de licencia institucional?
              </h3>
            </div>
            
            {!showLicenseInput ? (
              <button
                onClick={() => setShowLicenseInput(true)}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Canjear código de escuela/empresa →
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                    placeholder="Ej: TEC-2025, EMPRESA-ABC"
                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    disabled={isRedeeming}
                  />
                  <button
                    onClick={handleRedeemLicense}
                    disabled={isRedeeming || !licenseCode.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Canjeando...
                      </>
                    ) : (
                      'Canjear'
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                    ✅ {success}
                  </div>
                )}

                <p className="text-slate-400 text-sm">
                  Si tu escuela o empresa te proporcionó un código, ingrésalo aquí para activar tu cuenta sin costo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            ¿Necesitas ayuda? Contacta a soporte@frutos.com
          </p>
        </div>
      </div>
    </div>
  );
}
