'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Star, 
  Users, 
  Clock,
  CheckCircle,
  Loader2,
  CreditCard,
  Shield,
  Sparkles,
  TrendingUp,
  Calendar
} from 'lucide-react';
import Image from 'next/image';

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  profileImage?: string;
  PerfilMentor: {
    especialidad?: string;
    nivel?: string;
    biografia?: string;
    biografiaCorta?: string;
    calificacionPromedio: number;
    totalResenas: number;
    completedSessionsCount: number;
    precioBase: number;
    disponible: boolean;
  };
}

interface PrecioConfig {
  precio18Sesiones: number;
  currency: string;
}

export default function SeleccionarMentorPage() {
  const params = useParams();
  const router = useRouter();
  const visionId = parseInt(params.visionId as string);

  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [mentorSeleccionado, setMentorSeleccionado] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [precios, setPrecios] = useState<PrecioConfig | null>(null);
  const [metodoPago, setMetodoPago] = useState<'stripe' | 'paypal' | 'mercadopago'>('stripe');

  useEffect(() => {
    cargarMentores();
    cargarPrecios();
  }, [visionId]);

  const cargarMentores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/participante/mentores-disponibles?visionId=${visionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMentores(data.mentores || []);
      } else {
        console.error('Error al cargar mentores');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPrecios = async () => {
    try {
      const response = await fetch('/api/admin/precios');
      if (response.ok) {
        const data = await response.json();
        // Calculamos el precio para 18 sesiones basado en la tarifa por llamada
        const precioPorSesion = data.disciplina?.mxn?.llamada || 150;
        setPrecios({
          precio18Sesiones: precioPorSesion * 18,
          currency: 'MXN'
        });
      }
    } catch (error) {
      console.error('Error al cargar precios:', error);
      // Precio por defecto
      setPrecios({
        precio18Sesiones: 2700, // 150 * 18
        currency: 'MXN'
      });
    }
  };

  const seleccionarMentor = (mentor: Mentor) => {
    setMentorSeleccionado(mentor);
    setMostrarPago(true);
  };

  const procesarCompra = async () => {
    if (!mentorSeleccionado || !precios) return;

    setProcesando(true);

    try {
      // 1. Crear la orden de compra de paquete
      const ordenResponse = await fetch('/api/participante/crear-orden-paquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId,
          mentorId: mentorSeleccionado.id,
          cantidad: 18,
          precioTotal: precios.precio18Sesiones,
          metodoPago
        })
      });

      if (!ordenResponse.ok) {
        throw new Error('Error al crear la orden');
      }

      const ordenData = await ordenResponse.json();

      // 2. Iniciar proceso de pago según método seleccionado
      const pagoResponse = await fetch('/api/participante/procesar-pago-paquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenId: ordenData.ordenId,
          metodoPago,
          amount: precios.precio18Sesiones
        })
      });

      if (!pagoResponse.ok) {
        throw new Error('Error al procesar el pago');
      }

      const pagoData = await pagoResponse.json();

      // 3. Redirigir a pasarela de pago o confirmar
      if (pagoData.paymentUrl) {
        window.location.href = pagoData.paymentUrl;
      } else if (pagoData.success) {
        // Pago completado, redirigir al dashboard
        router.push(`/dashboard/participante?success=paquete-comprado&mentor=${mentorSeleccionado.nombre}`);
      }
    } catch (error) {
      console.error('Error al procesar compra:', error);
      alert('Error al procesar la compra. Por favor intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-purple-500 animate-spin" size={48} />
          <p className="text-slate-400 text-lg">Cargando mentores calificados...</p>
        </div>
      </div>
    );
  }

  if (mostrarPago && mentorSeleccionado && precios) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setMostrarPago(false)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Confirmar Compra</h1>
              <p className="text-slate-400">Paquete de 18 sesiones con tu mentor</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Resumen del Mentor */}
            <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-purple-400" size={24} />
                Tu Mentor Seleccionado
              </h2>

              <div className="flex items-center gap-4 mb-4">
                {mentorSeleccionado.profileImage ? (
                  <Image
                    src={mentorSeleccionado.profileImage}
                    alt={mentorSeleccionado.nombre}
                    width={80}
                    height={80}
                    className="rounded-full border-2 border-purple-500"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {mentorSeleccionado.nombre.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{mentorSeleccionado.nombre}</h3>
                  <p className="text-slate-400 text-sm">{mentorSeleccionado.PerfilMentor.especialidad || 'Mentor'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span className="text-white font-semibold">
                      {mentorSeleccionado.PerfilMentor.calificacionPromedio.toFixed(1)}
                    </span>
                    <span className="text-slate-400 text-sm">
                      ({mentorSeleccionado.PerfilMentor.totalResenas} reseñas)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="text-green-500" size={20} />
                  <span>18 sesiones de mentoría personalizada</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="text-blue-500" size={20} />
                  <span>Seguimiento continuo durante el programa</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="text-purple-500" size={20} />
                  <span>Horarios flexibles según disponibilidad</span>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="text-purple-400" size={24} />
                Método de Pago
              </h2>

              <div className="space-y-4 mb-6">
                {/* Stripe */}
                <button
                  onClick={() => setMetodoPago('stripe')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    metodoPago === 'stripe'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#635BFF] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">S</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">Tarjeta de Crédito/Débito</p>
                        <p className="text-slate-400 text-sm">Procesado por Stripe</p>
                      </div>
                    </div>
                    {metodoPago === 'stripe' && (
                      <CheckCircle className="text-purple-500" size={24} />
                    )}
                  </div>
                </button>

                {/* PayPal */}
                <button
                  onClick={() => setMetodoPago('paypal')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    metodoPago === 'paypal'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#003087] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">P</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">PayPal</p>
                        <p className="text-slate-400 text-sm">Pago rápido y seguro</p>
                      </div>
                    </div>
                    {metodoPago === 'paypal' && (
                      <CheckCircle className="text-blue-500" size={24} />
                    )}
                  </div>
                </button>

                {/* Mercado Pago */}
                <button
                  onClick={() => setMetodoPago('mercadopago')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    metodoPago === 'mercadopago'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#009EE3] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">MP</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">Mercado Pago</p>
                        <p className="text-slate-400 text-sm">Tarjeta o transferencia</p>
                      </div>
                    </div>
                    {metodoPago === 'mercadopago' && (
                      <CheckCircle className="text-cyan-500" size={24} />
                    )}
                  </div>
                </button>
              </div>

              {/* Resumen de Precio */}
              <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Paquete de 18 sesiones</span>
                  <span className="text-white font-semibold">
                    ${precios.precio18Sesiones.toLocaleString('es-MX')} {precios.currency}
                  </span>
                </div>
                <div className="border-t border-purple-500/30 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Total a pagar</span>
                  <span className="text-purple-400 font-bold text-2xl">
                    ${precios.precio18Sesiones.toLocaleString('es-MX')} {precios.currency}
                  </span>
                </div>
              </div>

              {/* Botón de Compra */}
              <button
                onClick={procesarCompra}
                disabled={procesando}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50"
              >
                {procesando ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    Proceder al Pago Seguro
                  </>
                )}
              </button>

              <p className="text-slate-400 text-xs text-center mt-4">
                <Shield className="inline mr-1" size={14} />
                Pago 100% seguro y encriptado
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-purple-500" size={32} />
            <h1 className="text-4xl font-bold text-white">Catálogo de Mentores Certificados</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Selecciona un mentor y adquiere tu paquete de 18 sesiones personalizadas
          </p>
        </div>

        {/* Beneficios */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
            <CheckCircle className="text-green-500 mb-2" size={24} />
            <h3 className="text-white font-semibold mb-1">Mentorías Personalizadas</h3>
            <p className="text-slate-400 text-sm">Acompañamiento uno a uno durante todo el programa</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <TrendingUp className="text-blue-500 mb-2" size={24} />
            <h3 className="text-white font-semibold mb-1">Seguimiento Continuo</h3>
            <p className="text-slate-400 text-sm">18 sesiones para asegurar tu progreso y éxito</p>
          </div>
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4">
            <Star className="text-yellow-500 mb-2" size={24} />
            <h3 className="text-white font-semibold mb-1">Mentores Certificados</h3>
            <p className="text-slate-400 text-sm">Expertos evaluados y con excelentes calificaciones</p>
          </div>
        </div>

        {/* Grid de Mentores */}
        {mentores.length === 0 ? (
          <div className="text-center py-12">
            <Users className="text-slate-600 mx-auto mb-4" size={64} />
            <p className="text-slate-400 text-lg">No hay mentores disponibles en este momento</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentores.map((mentor) => (
              <div
                key={mentor.id}
                className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:transform hover:scale-105"
              >
                {/* Header con Avatar */}
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 text-center">
                  {mentor.profileImage ? (
                    <Image
                      src={mentor.profileImage}
                      alt={mentor.nombre}
                      width={100}
                      height={100}
                      className="rounded-full border-4 border-white mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-purple-600 text-3xl font-bold mx-auto mb-3">
                      {mentor.nombre.charAt(0)}
                    </div>
                  )}
                  <h3 className="text-white font-bold text-xl">{mentor.nombre}</h3>
                  <p className="text-purple-100 text-sm">{mentor.PerfilMentor.especialidad || 'Mentor Certificado'}</p>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {/* Calificación */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={20} />
                      <span className="text-white font-bold text-lg">
                        {mentor.PerfilMentor.calificacionPromedio.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm">
                      ({mentor.PerfilMentor.totalResenas} reseñas)
                    </span>
                  </div>

                  {/* Biografía */}
                  {mentor.PerfilMentor.biografiaCorta && (
                    <p className="text-slate-300 text-sm mb-4 line-clamp-3">
                      {mentor.PerfilMentor.biografiaCorta}
                    </p>
                  )}

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <Users className="text-purple-400 mx-auto mb-1" size={20} />
                      <p className="text-white font-semibold">{mentor.PerfilMentor.completedSessionsCount}</p>
                      <p className="text-slate-400 text-xs">Sesiones</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <Shield className="text-green-400 mx-auto mb-1" size={20} />
                      <p className="text-white font-semibold">{mentor.PerfilMentor.nivel || 'SENIOR'}</p>
                      <p className="text-slate-400 text-xs">Nivel</p>
                    </div>
                  </div>

                  {/* Precio */}
                  {precios && (
                    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-3 mb-4 text-center">
                      <p className="text-slate-300 text-xs mb-1">Paquete 18 sesiones</p>
                      <p className="text-purple-400 font-bold text-2xl">
                        ${precios.precio18Sesiones.toLocaleString('es-MX')}
                      </p>
                      <p className="text-slate-400 text-xs">
                        (~${Math.round(precios.precio18Sesiones / 18).toLocaleString('es-MX')} por sesión)
                      </p>
                    </div>
                  )}

                  {/* Botón de Selección */}
                  <button
                    onClick={() => seleccionarMentor(mentor)}
                    disabled={!mentor.PerfilMentor.disponible}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {mentor.PerfilMentor.disponible ? (
                      <>
                        <CheckCircle size={20} />
                        Seleccionar Mentor
                      </>
                    ) : (
                      'No Disponible'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
