'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Clock, TrendingUp } from 'lucide-react';

interface RenewalOfferModalProps {
  userId: number;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function RenewalOfferModal({ userId, onAccept, onDecline }: RenewalOfferModalProps) {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkRenewalOffer();
  }, [userId]);

  const checkRenewalOffer = async () => {
    try {
      const res = await fetch('/api/subscriptions/renewal-offer');
      const data = await res.json();
      
      if (data.success && data.hasOffer) {
        setOffer(data.renewalOffer);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error checking renewal offer:', error);
    }
  };

  const handleResponse = async (accept: boolean) => {
    if (!offer) return;

    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/renewal-offer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalOfferId: offer.id,
          acceptOffer: accept
        })
      });

      const data = await res.json();

      if (data.success) {
        setIsVisible(false);
        if (accept && onAccept) onAccept();
        if (!accept && onDecline) onDecline();
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = () => {
    if (!offer) return 0;
    const now = new Date();
    const expires = new Date(offer.expiresAt);
    const diff = expires.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!isVisible || !offer) return null;

  const daysLeft = calculateDaysLeft();
  const savingsAmount = offer.originalPrice - offer.offeredPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-2xl shadow-2xl border-2 border-purple-500/50 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 animate-pulse" />
        
        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              ¡No Pierdas Tu Ritmo!
            </h2>
            
            <p className="text-purple-200 text-lg">
              {offer.message}
            </p>
          </div>

          {/* Offer Details */}
          <div className="bg-black/30 rounded-xl p-6 mb-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Precio Público</p>
                <p className="text-3xl font-bold text-gray-500 line-through">
                  ${offer.originalPrice.toLocaleString()} MXN
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-1">Tu Precio Especial</p>
                <p className="text-5xl font-bold text-white">
                  ${offer.offeredPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-700">
              <div className="text-center">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold text-2xl">{offer.discountPercent}% OFF</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Ahorras ${savingsAmount.toLocaleString()} MXN
                </p>
              </div>

              <div className="w-px h-12 bg-gray-700" />

              <div className="text-center">
                <div className="flex items-center gap-2 text-yellow-400 mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold text-2xl">{daysLeft} días</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Para aprovechar esta oferta
                </p>
              </div>
            </div>
          </div>

          {/* What You Keep */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-3">
              ✨ Mantén Todo Tu Progreso:
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Tu historial completo de evidencias y logros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Todos tus badges y medallas de veterano</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Carta F.R.U.T.O.S. y metas personales activas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Etiqueta "Ex-Miembro {offer.Subscription?.originalOrganization}"</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleResponse(true)}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Procesando...' : '¡Sí, Continuar Con 50% OFF!'}
            </button>
            
            <button
              onClick={() => handleResponse(false)}
              disabled={loading}
              className="px-6 py-4 rounded-xl font-medium text-gray-300 hover:bg-gray-800/50 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              No, Gracias
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-500 text-xs mt-4">
            Si no aprovechas esta oferta, tu cuenta pasará a modo gratuito al finalizar el ciclo.
            Podrás seguir usando tus metas en autogestión.
          </p>
        </div>
      </div>
    </div>
  );
}
