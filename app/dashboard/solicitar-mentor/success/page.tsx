'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MentorApplicationSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Verificar que el pago se haya procesado correctamente
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch('/api/mentor/application/check');
        const data = await response.json();

        if (data.application?.status === 'PENDING') {
          setStatus('success');
        } else {
          // Si aún está en DRAFT, esperar un poco más
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Procesando tu pago...
          </h2>
          <p className="text-gray-600">
            Estamos confirmando tu transacción. Esto puede tomar unos segundos.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Hubo un problema
          </h2>
          <p className="text-gray-600 mb-8">
            No pudimos verificar tu pago. Por favor, contacta a soporte si crees que esto es un error.
          </p>
          <Link
            href="/dashboard/configuracion"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Volver a Configuración
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Pago Confirmado! 🎉
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            Tu solicitud para ser mentor ha sido enviada exitosamente
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">¿Qué sigue?</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-semibold text-sm">
                1
              </span>
              <span>
                <strong>Revisión de tu solicitud:</strong> Nuestro equipo revisará tu perfil y experiencia (1-3 días hábiles)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-semibold text-sm">
                2
              </span>
              <span>
                <strong>Notificación:</strong> Recibirás un correo con la decisión y próximos pasos
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-semibold text-sm">
                3
              </span>
              <span>
                <strong>Activación:</strong> Si eres aprobado, tendrás acceso inmediato a tu panel de mentor
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Mientras esperas</h4>
              <p className="text-sm text-amber-800">
                Prepara tu disponibilidad y piensa en cómo estructurarás tus primeras sesiones. 
                Te enviaremos recursos para nuevos mentores una vez aprobado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-lg"
          >
            Ir al Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/configuracion"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Ver Configuración
          </Link>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Tienes preguntas? Escríbenos a <a href="mailto:soporte@frutos.com" className="text-purple-600 hover:underline">soporte@frutos.com</a>
        </p>
      </div>
    </div>
  );
}
