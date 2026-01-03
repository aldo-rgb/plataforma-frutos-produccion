'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PricingTable from '@/src/components/pricing/PricingTable';
import RenewalOfferModal from '@/src/components/pricing/RenewalOfferModal';
import { useSession } from 'next-auth/react';

export default function PricingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (plan: string) => {
    if (!session?.user?.id) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      const data = await res.json();

      if (data.success) {
        // Redirigir a checkout/pago
        router.push(`/checkout?subscriptionId=${data.subscription.id}`);
      } else {
        alert(data.error || 'Error al crear suscripción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      {/* Hero Section */}
      <div className="pt-20 pb-8 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          Transforma Tu Vida,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Un Día a la Vez
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto px-4">
          Únete a miles de personas que ya están construyendo la vida que siempre soñaron
        </p>
      </div>

      {/* Pricing Table */}
      <PricingTable 
        onSelectPlan={handleSelectPlan}
        showPostVisionDiscount={false}
      />

      {/* Renewal Offer Modal (si aplica) */}
      {session?.user?.id && (
        <RenewalOfferModal 
          userId={parseInt(session.user.id)}
          onAccept={() => router.push('/dashboard')}
          onDecline={() => router.push('/dashboard')}
        />
      )}

      {/* Social Proof */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            ¿Por qué eligen Plataforma Frutos?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">92%</div>
              <p className="text-gray-300">Tasa de éxito en completar metas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">5,000+</div>
              <p className="text-gray-300">Vidas transformadas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">4.9/5</div>
              <p className="text-gray-300">Calificación promedio</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-white mb-8 text-center">
          Preguntas Frecuentes
        </h3>
        
        <div className="space-y-4">
          <details className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <summary className="text-white font-bold cursor-pointer">
              ¿Puedo cambiar de plan después?
            </summary>
            <p className="text-gray-400 mt-4">
              Sí, puedes actualizar de Standard a Premium en cualquier momento. 
              El cambio es instantáneo y solo pagas la diferencia prorrateada.
            </p>
          </details>

          <details className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <summary className="text-white font-bold cursor-pointer">
              ¿Qué incluye el plan gratuito?
            </summary>
            <p className="text-gray-400 mt-4">
              El plan gratuito te permite crear tu Carta F.R.U.T.O.S. y gestionar tus metas 
              de forma autónoma. Para accountability diario y validación de IA, necesitas Standard o Premium.
            </p>
          </details>

          <details className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <summary className="text-white font-bold cursor-pointer">
              ¿Hay garantía de devolución?
            </summary>
            <p className="text-gray-400 mt-4">
              Sí. Si en los primeros 30 días no ves resultados tangibles, 
              te devolvemos tu dinero sin hacer preguntas. Tu inversión está protegida.
            </p>
          </details>

          <details className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <summary className="text-white font-bold cursor-pointer">
              ¿Cómo funcionan las licencias escolares?
            </summary>
            <p className="text-gray-400 mt-4">
              Las escuelas pueden comprar licencias en lote con precios especiales. 
              Las licencias duran lo que dura tu ciclo de visión. Al finalizar, 
              se te ofrece un 50% de descuento para continuar de forma individual.
            </p>
          </details>
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h3 className="text-3xl font-bold text-white mb-4">
          ¿Listo para empezar tu transformación?
        </h3>
        <p className="text-gray-400 mb-8">
          Únete hoy y recibe acceso inmediato a todas las herramientas
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
        >
          Ver Planes
        </button>
      </div>
    </div>
  );
}
