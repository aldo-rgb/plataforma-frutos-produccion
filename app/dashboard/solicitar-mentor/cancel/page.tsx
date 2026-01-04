'use client';

import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function MentorApplicationCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <XCircle className="w-12 h-12 text-amber-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Proceso Cancelado
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            No se completó el pago de tu solicitud para ser mentor
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">¿Qué sucedió?</h3>
          <p className="text-gray-700 mb-4">
            El proceso de pago fue cancelado o no se pudo completar. 
            No se realizó ningún cargo a tu tarjeta.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Tu solicitud no fue enviada
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              No se realizó ningún cargo
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Puedes intentar nuevamente cuando estés listo
            </li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">Recuerda</h4>
              <p className="text-sm text-purple-800">
                La afiliación de mentor tiene un costo anual de <strong>$999 MXN</strong> que incluye:
                revisión de perfil, capacitación inicial y acceso a herramientas de mentoría.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard/solicitar-mentor"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Intentar Nuevamente
          </Link>
          <Link
            href="/dashboard/configuracion"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Configuración
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-center">¿Necesitas ayuda?</h4>
          <p className="text-center text-sm text-gray-600 mb-4">
            Si tuviste problemas técnicos o tienes preguntas sobre el proceso de aplicación
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="mailto:soporte@frutos.com" className="text-purple-600 hover:underline">
              Enviar correo
            </a>
            <span className="text-gray-300">|</span>
            <Link href="/dashboard" className="text-purple-600 hover:underline">
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
