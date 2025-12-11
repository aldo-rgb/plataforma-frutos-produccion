'use client';

import { useState } from 'react';
import { ArrowLeft, User, Star, Coins, CreditCard, CheckCircle2, Wallet, Globe, Smartphone } from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA: MENTORES Y TARIFAS (EN PESOS MEXICANOS) ---
const MENTORES = [
  {
    id: 1,
    nombre: 'Roberto Martínez',
    especialidad: 'Finanzas y Estrategia',
    rating: 4.9,
    precioDinero: 1000, // MXN
    precioPuntos: 500,  // QP
    imagen: 'bg-blue-500',
  },
  {
    id: 2,
    nombre: 'Ana Sofía Guerra',
    especialidad: 'Liderazgo y Relaciones',
    rating: 5.0,
    precioDinero: 900,  // MXN
    precioPuntos: 450,  // QP
    imagen: 'bg-purple-500',
  },
  {
    id: 3,
    nombre: 'Carlos Rueda',
    especialidad: 'Salud y Alto Rendimiento',
    rating: 4.8,
    precioDinero: 800,  // MXN
    precioPuntos: 400,  // QP
    imagen: 'bg-emerald-500',
  },
];

const MI_SALDO_PUNTOS = 480; 

export default function SolicitarMentoriaPage() {
  const [mentorSeleccionado, setMentorSeleccionado] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'PUNTOS' | 'DINERO'>('DINERO');
  const [step, setStep] = useState<'SELECCION' | 'PAGO' | 'CONFIRMACION'>('SELECCION');
  const [gatewayUsado, setGatewayUsado] = useState<string>(''); 

  const mentor = MENTORES.find(m => m.id === mentorSeleccionado);

  const handlePagoPuntos = () => {
    setGatewayUsado('Puntos Cuánticos');
    setStep('CONFIRMACION');
  };

  const handlePagoGateway = (gateway: string) => {
    setGatewayUsado(gateway);
    // Simulación de proceso
    setTimeout(() => {
        setStep('CONFIRMACION');
    }, 1000);
  };

  const puedePagarConPuntos = mentor ? MI_SALDO_PUNTOS >= mentor.precioPuntos : false;

  // Formateador de moneda MXN
  const formatoMXN = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <User className="text-blue-500" size={32} />
          Solicitar Mentoría 1:1
        </h1>
      </div>

      {/* --- PASO 1: SELECCIÓN DE MENTOR --- */}
      {step === 'SELECCION' && (
        <div className="grid md:grid-cols-3 gap-6">
          {MENTORES.map((m) => (
            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-all flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full ${m.imagen} flex items-center justify-center text-white font-bold`}>
                  {m.nombre.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{m.nombre}</h3>
                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                    <Star size={12} fill="currentColor" />
                    <span>{m.rating}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mb-6 flex-1">{m.especialidad}</p>
              
              <div className="bg-slate-950 rounded-lg p-3 mb-6 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-2"><CreditCard size={14}/> Inversión</span>
                  <span className="text-white font-bold">{formatoMXN(m.precioDinero)} MXN</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2">
                  <span className="text-slate-400 flex items-center gap-2"><Coins size={14}/> Puntos</span>
                  <span className="text-blue-400 font-bold">{m.precioPuntos} QP</span>
                </div>
              </div>

              <button 
                onClick={() => { setMentorSeleccionado(m.id); setStep('PAGO'); }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold transition-colors"
              >
                Agendar Sesión
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- PASO 2: PASARELA DE PAGO --- */}
      {step === 'PAGO' && mentor && (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Método de Pago</h2>
          
          {/* Selector TIPO DE PAGO */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
                onClick={() => setMetodoPago('DINERO')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    metodoPago === 'DINERO' ? 'bg-emerald-900/20 border-emerald-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
            >
                <CreditCard size={24} className={metodoPago === 'DINERO' ? 'text-emerald-400' : ''} />
                <span className="font-bold">Pago en Efectivo (MXN)</span>
            </button>

            <button 
                onClick={() => setMetodoPago('PUNTOS')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    metodoPago === 'PUNTOS' ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
            >
                <Coins size={24} className={metodoPago === 'PUNTOS' ? 'text-blue-400' : ''} />
                <span className="font-bold">Usar Puntos QP</span>
            </button>
          </div>

          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-8">
             {/* OPCIÓN PUNTOS */}
             {metodoPago === 'PUNTOS' && (
                <div className="text-center space-y-4">
                    <p className="text-slate-400">Costo de la sesión:</p>
                    <p className="text-4xl font-bold text-blue-400">{mentor.precioPuntos} QP</p>
                    <p className="text-sm text-slate-500">Tu saldo: {MI_SALDO_PUNTOS} QP</p>
                    
                    {!puedePagarConPuntos && (
                        <div className="bg-red-900/20 text-red-400 p-2 rounded text-sm mt-2">
                            Saldo insuficiente.
                        </div>
                    )}

                    <button 
                        onClick={handlePagoPuntos}
                        disabled={!puedePagarConPuntos}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg mt-4"
                    >
                        Canjear Puntos
                    </button>
                </div>
             )}

             {/* OPCIÓN DINERO (MXN) */}
             {metodoPago === 'DINERO' && (
                <div className="space-y-4">
                    <div className="text-center mb-6">
                        <p className="text-slate-400">Total a pagar:</p>
                        <p className="text-4xl font-bold text-emerald-400">{formatoMXN(mentor.precioDinero)} MXN</p>
                    </div>

                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecciona pasarela:</p>
                    
                    {/* PAYPAL */}
                    <button 
                        onClick={() => handlePagoGateway('PAYPAL')}
                        className="w-full bg-[#003087] hover:bg-[#00256b] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Globe size={20} /> Pagar con PayPal
                    </button>

                    {/* STRIPE */}
                    <button 
                        onClick={() => handlePagoGateway('STRIPE')}
                        className="w-full bg-[#635BFF] hover:bg-[#534be0] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <CreditCard size={20} /> Pagar con Tarjeta
                    </button>

                    {/* MERCADO PAGO */}
                    <button 
                        onClick={() => handlePagoGateway('MERCADO PAGO')}
                        className="w-full bg-[#009EE3] hover:bg-[#0089c4] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Smartphone size={20} /> Mercado Pago
                    </button>
                </div>
             )}
          </div>

          <button 
            onClick={() => setStep('SELECCION')}
            className="w-full text-slate-400 hover:text-white text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* --- PASO 3: CONFIRMACIÓN --- */}
      {step === 'CONFIRMACION' && (
        <div className="max-w-md mx-auto text-center py-12 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">¡Pago Exitoso!</h2>
          <p className="text-slate-400 mb-8">
            Tu sesión con <strong>{mentor?.nombre}</strong> está confirmada.
          </p>
          
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8 text-left">
            <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-500">Plataforma</span>
                <span className="text-white font-medium">{gatewayUsado}</span>
            </div>
            <div className="flex justify-between py-2 pt-4">
                <span className="text-slate-500">Total Pagado</span>
                <span className="text-green-400 font-bold text-xl">
                    {gatewayUsado === 'Puntos Cuánticos' ? `${mentor?.precioPuntos} QP` : formatoMXN(mentor?.precioDinero || 0)}
                </span>
            </div>
          </div>

          <Link 
            href="/dashboard"
            className="bg-white text-slate-900 font-bold py-3 px-8 rounded-full hover:bg-slate-200 transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      )}

    </div>
  );
}