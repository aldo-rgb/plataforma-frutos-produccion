'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { procesarPagoSimulado } from '@/app/actions/pagos';
import { CreditCard, Building2, User, Check, Calculator, ShieldCheck, X, Globe, Smartphone, CheckCircle2, Loader2, ArrowRight, Zap, Star, Users } from 'lucide-react';
import Link from 'next/link';

export default function SuscripcionPage() {
  const router = useRouter();
  
  // ESTADOS
  const [tipoCliente, setTipoCliente] = useState<'INDIVIDUAL' | 'CENTRO'>('INDIVIDUAL');
  const [planIndividual, setPlanIndividual] = useState<'STANDARD' | 'QUANTUM'>('STANDARD'); 
  const [frecuencia, setFrecuencia] = useState<'MENSUAL' | 'ANUAL'>('ANUAL');
  
  // ESTADOS CHECKOUT
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'RESUMEN' | 'PAGO' | 'PROCESANDO' | 'EXITO'>('RESUMEN');
  
  // ESTADO DE SUSCRIPCIÓN (Simulado)
  const [estadoSuscripcion, setEstadoSuscripcion] = useState<'INACTIVO' | 'ACTIVO'>('INACTIVO');
  const [errorPago, setErrorPago] = useState<string | null>(null);

  // MOCK DATA
  const PRECIOS = {
      standard: { mensual: 150, anual: 1200 },
      quantum: { mensual: 500, anual: 5000 },
      centro: { participante: 800 } // Precio por participante
  };

  const [numParticipantes, setNumParticipantes] = useState(50);

  // CÁLCULO DINÁMICO
  const calcularTotal = () => {
      if (tipoCliente === 'CENTRO') {
          return numParticipantes * PRECIOS.centro.participante;
      }
      // Individual
      const tarifas = planIndividual === 'STANDARD' ? PRECIOS.standard : PRECIOS.quantum;
      return frecuencia === 'MENSUAL' ? tarifas.mensual : tarifas.anual;
  };

  const totalPagar = calcularTotal();

  const formatoMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  // HANDLERS
  const iniciarProceso = () => { setCheckoutStep('RESUMEN'); setShowCheckout(true); };
  const irAPago = () => { setCheckoutStep('PAGO'); };
  
  const procesarPago = async () => {
      setCheckoutStep('PROCESANDO');
      setErrorPago(null);

      // Determinar plan y monto
      let planNombre = '';
      let monto = 0;

      if (tipoCliente === 'CENTRO') {
          planNombre = `Institucional (${numParticipantes} participantes)`;
          monto = totalPagar;
      } else {
          planNombre = planIndividual === 'STANDARD' ? 'Standard' : 'Salto Cuántico';
          monto = totalPagar;
      }

      // Llamar al Server Action
      const resultado = await procesarPagoSimulado(planNombre, monto);

      if (resultado.success) {
          setCheckoutStep('EXITO');
          setEstadoSuscripcion('ACTIVO');
          
          // Esperar 2 segundos y redirigir
          setTimeout(() => {
              router.refresh(); // Revalidar datos del servidor
              router.push('/dashboard'); // Redirigir al dashboard
          }, 2000);
      } else {
          setErrorPago(resultado.error || 'Error desconocido');
          setCheckoutStep('PAGO'); // Volver a mostrar opciones de pago
      }
  };

  const cerrarCheckout = () => setShowCheckout(false);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative">
      
      {/* HEADER */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          <ShieldCheck className="text-blue-500" size={40} />
          Elige tu Nivel de Impacto
        </h1>
        <p className="text-slate-400">Planes diseñados para líderes y centros de transformación.</p>
      </div>

      {/* VISTA 1: SELECCIÓN DE PLANES (Si no está activo) */}
      {estadoSuscripcion === 'INACTIVO' && (
        <>
            {/* 1. SELECTOR TIPO CLIENTE */}
            <div className="flex justify-center mb-12">
                <div className="bg-slate-900 p-1 rounded-full border border-slate-800 flex relative">
                    <button onClick={() => setTipoCliente('INDIVIDUAL')} className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${tipoCliente === 'INDIVIDUAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <User size={18} /> Individual
                    </button>
                    <button onClick={() => setTipoCliente('CENTRO')} className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${tipoCliente === 'CENTRO' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Building2 size={18} /> Para Centros
                    </button>
                </div>
            </div>

            {/* --- CONTENIDO INDIVIDUAL --- */}
            {tipoCliente === 'INDIVIDUAL' && (
                <div className="max-w-5xl mx-auto animate-in fade-in zoom-in duration-300">
                    
                    {/* Toggle Frecuencia */}
                    <div className="flex justify-center mb-8 gap-4">
                        <span className={`cursor-pointer font-bold ${frecuencia === 'MENSUAL' ? 'text-white' : 'text-slate-500'}`} onClick={() => setFrecuencia('MENSUAL')}>Mensual</span>
                        
                        <div className="relative inline-flex items-center cursor-pointer" onClick={() => setFrecuencia(frecuencia === 'MENSUAL' ? 'ANUAL' : 'MENSUAL')}>
                            <div className={`w-14 h-7 rounded-full peer-focus:outline-none ring-4 ring-blue-800/20 rounded-full peer dark:bg-gray-700 transition-colors ${frecuencia === 'ANUAL' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                            <div className={`absolute top-1 left-1 bg-white border-gray-300 border rounded-full h-5 w-5 transition-transform ${frecuencia === 'ANUAL' ? 'translate-x-7' : ''}`}></div>
                        </div>

                        <span className={`cursor-pointer font-bold flex items-center gap-2 ${frecuencia === 'ANUAL' ? 'text-white' : 'text-slate-500'}`} onClick={() => setFrecuencia('ANUAL')}>
                            Anual <span className="text-[10px] bg-emerald-500 text-slate-900 px-2 rounded-full">AHORRA 20%</span>
                        </span>
                    </div>

                    {/* Tarjetas Comparativas */}
                    <div className="grid md:grid-cols-2 gap-8">
                        
                        {/* PLAN STANDARD */}
                        <div className={`relative p-8 rounded-2xl border transition-all cursor-pointer ${planIndividual === 'STANDARD' ? 'bg-slate-900 border-blue-500 shadow-2xl shadow-blue-900/20 transform scale-105 z-10' : 'bg-slate-950 border-slate-800 opacity-80 hover:opacity-100'}`} onClick={() => setPlanIndividual('STANDARD')}>
                            <h3 className="text-2xl font-bold text-white mb-2">Standard</h3>
                            <p className="text-slate-400 text-sm mb-6">Autogestión y acceso total al sistema.</p>
                            <div className="text-4xl font-bold text-white mb-6">
                                {formatoMXN(frecuencia === 'MENSUAL' ? PRECIOS.standard.mensual : PRECIOS.standard.anual)}
                                <span className="text-sm text-slate-500 font-normal"> / {frecuencia.toLowerCase()}</span>
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-blue-500"/> Acceso 24/7 Plataforma</li>
                                <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-blue-500"/> Carta F.R.U.T.O.S. Digital</li>
                                <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-blue-500"/> Tienda de Recompensas</li>
                                <li className="flex gap-3 text-slate-500 text-sm line-through decoration-slate-600"><X size={16}/> Mentor Asignado</li>
                                <li className="flex gap-3 text-slate-500 text-sm line-through decoration-slate-600"><X size={16}/> Coaching 1:1 Mensual</li>
                            </ul>

                            <button className={`w-full py-3 rounded-xl font-bold transition-colors ${planIndividual === 'STANDARD' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-400'}`} onClick={iniciarProceso}>
                                {planIndividual === 'STANDARD' ? 'ELEGIR STANDARD' : 'SELECCIONAR'}
                            </button>
                        </div>

                        {/* PLAN SALTO CUÁNTICO */}
                        <div className={`relative p-8 rounded-2xl border transition-all cursor-pointer overflow-hidden ${planIndividual === 'QUANTUM' ? 'bg-slate-900 border-yellow-500 shadow-2xl shadow-yellow-900/20 transform scale-105 z-10' : 'bg-slate-950 border-slate-800 opacity-80 hover:opacity-100'}`} onClick={() => setPlanIndividual('QUANTUM')}>
                            <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMENDADO</div>
                            
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">Salto Cuántico <Zap size={20} className="text-yellow-500 fill-current"/></h3>
                            <p className="text-slate-400 text-sm mb-6">Acompañamiento total para resultados acelerados.</p>
                            <div className="text-4xl font-bold text-white mb-6">
                                {formatoMXN(frecuencia === 'MENSUAL' ? PRECIOS.quantum.mensual : PRECIOS.quantum.anual)}
                                <span className="text-sm text-slate-500 font-normal"> / {frecuencia.toLowerCase()}</span>
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500"/> Todo lo de Standard</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500"/> Mentor Personal Asignado</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500"/> 1 Llamada Coaching / Mes</li>
                                <li className="flex gap-3 text-white text-sm"><Check size={16} className="text-yellow-500"/> Prioridad en Soporte</li>
                            </ul>

                            <button className={`w-full py-3 rounded-xl font-bold transition-colors ${planIndividual === 'QUANTUM' ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' : 'bg-slate-800 text-slate-400'}`} onClick={iniciarProceso}>
                                {planIndividual === 'QUANTUM' ? 'DAR EL SALTO' : 'SELECCIONAR'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* --- CONTENIDO CENTROS --- */}
            {tipoCliente === 'CENTRO' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl shadow-purple-900/20">
                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">B2B / INSTITUCIONAL</div>
                        
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Plan Institucional</h2>
                                <p className="text-slate-400 mb-6">Licenciamiento por volumen para tu Centro.</p>
                                
                                {/* Calculadora */}
                                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
                                    <label className="block text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2"><Calculator size={14}/> Número de Participantes</label>
                                    <input type="range" min="10" max="500" step="10" value={numParticipantes} onChange={(e) => setNumParticipantes(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mb-4"/>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white font-bold">{numParticipantes} Participantes</span>
                                        <span className="text-purple-400 font-bold">{formatoMXN(PRECIOS.centro.participante)} / anual</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-6 border-t border-slate-800 pt-4">
                                    <span className="text-xl text-white font-bold">Total Anual:</span>
                                    <span className="text-4xl text-purple-400 font-bold">{formatoMXN(totalPagar)}</span>
                                </div>

                                <button onClick={iniciarProceso} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20">
                                    <Building2 size={20} /> CONTRATAR AHORA
                                </button>
                            </div>

                            <div className="space-y-6 bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Star size={18} className="text-purple-500"/> Nivel Incluido: Salto Cuántico*
                                </h3>
                                <p className="text-xs text-slate-400">Tu comunidad obtiene beneficios avanzados.</p>
                                
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <h4 className="text-purple-400 text-xs font-bold uppercase mb-3">Panel Cuántico Administrativo</h4>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-purple-500"/> Monitor de progreso global</li>
                                        <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-purple-500"/> Gestión de licencias activa</li>
                                        <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-purple-500"/> Reportes de comunidad</li>
                                        <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-purple-500"/> Mentor Personal Asignado</li>
                                        <li className="flex gap-3 text-slate-500 text-sm items-start"><X size={16} className="mt-0.5 shrink-0"/> <span className="italic text-xs">Llamada de Coaching 1:1 (Opcional)</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* VISTA 2: SUSCRIPCIÓN ACTIVA */}
      {estadoSuscripcion === 'ACTIVO' && !showCheckout && (
        <div className="max-w-3xl mx-auto text-center py-12 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/10">
                <CheckCircle2 className="text-green-500" size={48} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">¡Membresía Activa!</h2>
            <p className="text-slate-400 text-lg mb-8">
                Tienes acceso total a {tipoCliente === 'INDIVIDUAL' ? 'tu transformación personal' : 'la gestión de tu Centro'}.
            </p>
            
            <div className="flex gap-4 justify-center">
                <Link href="/dashboard" className="bg-white text-slate-900 font-bold py-3 px-8 rounded-full hover:bg-slate-200 transition-colors">
                    Ir al Dashboard
                </Link>
                {tipoCliente === 'CENTRO' && (
                    <button className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-500 transition-colors flex items-center gap-2">
                        <Users size={18}/> Gestionar Participantes
                    </button>
                )}
            </div>
        </div>
      )}

      {/* --- MODAL CHECKOUT --- */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {checkoutStep === 'RESUMEN' ? 'Confirmar Inversión' : checkoutStep === 'PAGO' ? 'Pasarela de Pago' : checkoutStep === 'EXITO' ? '¡Todo Listo!' : 'Procesando...'}
                    </h2>
                    {checkoutStep !== 'PROCESANDO' && checkoutStep !== 'EXITO' && (
                        <button onClick={cerrarCheckout} className="text-slate-400 hover:text-white"><X size={24}/></button>
                    )}
                </div>

                <div className="p-6">
                    {checkoutStep === 'RESUMEN' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <div>
                                    <p className="text-sm text-slate-400 uppercase font-bold">Plan Seleccionado</p>
                                    <p className="text-white font-bold text-lg">
                                        {tipoCliente === 'CENTRO' ? 'Institucional / Centro' : (planIndividual === 'STANDARD' ? 'Standard' : 'Salto Cuántico')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {tipoCliente === 'CENTRO' ? `${numParticipantes} Licencias` : `Pago ${frecuencia.toLowerCase()}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">{formatoMXN(totalPagar)}</p>
                                </div>
                            </div>
                            <button onClick={irAPago} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                                PAGAR AHORA <ArrowRight size={20}/>
                            </button>
                        </div>
                    )}

                    {checkoutStep === 'PAGO' && (
                        <div className="space-y-3">
                            <p className="text-center text-slate-400 text-sm mb-4">Selecciona pasarela segura:</p>
                            
                            {errorPago && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                                    <p className="text-red-400 text-sm text-center">{errorPago}</p>
                                </div>
                            )}
                            
                            <button onClick={procesarPago} className="w-full bg-[#635BFF] hover:bg-[#534be0] text-white py-3 rounded-lg font-bold flex justify-center gap-2"><CreditCard/> Stripe</button>
                            <button onClick={procesarPago} className="w-full bg-[#003087] hover:bg-[#00256b] text-white py-3 rounded-lg font-bold flex justify-center gap-2"><Globe/> PayPal</button>
                            <button onClick={procesarPago} className="w-full bg-[#009EE3] hover:bg-[#0089c4] text-white py-3 rounded-lg font-bold flex justify-center gap-2"><Smartphone/> Mercado Pago</button>
                        </div>
                    )}

                    {checkoutStep === 'PROCESANDO' && (
                        <div className="text-center py-8"><Loader2 size={48} className="text-blue-500 animate-spin mx-auto mb-4"/><p className="text-white font-bold">Asegurando tu lugar...</p></div>
                    )}

                    {checkoutStep === 'EXITO' && (
                        <div className="text-center py-8">
                            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4"/>
                            <h3 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h3>
                            <p className="text-slate-400 mb-2">Tu suscripción ha sido activada.</p>
                            <p className="text-sm text-slate-500 mb-6">+500 Puntos Cuánticos de bienvenida ⚡</p>
                            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Redirigiendo al dashboard...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
