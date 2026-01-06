'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { procesarPagoSimulado } from '../../actions/pagos';
import { CreditCard, Building2, User, Check, Calculator, ShieldCheck, X, Globe, Smartphone, CheckCircle2, Loader2, ArrowRight, Zap, Star, Users, Crown, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import TheTetherModal from '@/components/modals/TheTetherModal';
import PendingOrdersWidget from '@/components/lobo-solitario/PendingOrdersWidget';

export default function SuscripcionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // ESTADOS
  const [tipoCliente, setTipoCliente] = useState<'INDIVIDUAL' | 'CENTRO'>('INDIVIDUAL');
  const [planIndividual, setPlanIndividual] = useState<'FREE' | 'STANDARD' | 'QUANTUM'>('STANDARD'); 
  const [frecuencia, setFrecuencia] = useState<'BIMESTRAL' | 'ANUAL'>('ANUAL');
  
  // ESTADOS CHECKOUT
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'RESUMEN' | 'PAGO' | 'PROCESANDO' | 'EXITO'>('RESUMEN');
  
  // ESTADO DE SUSCRIPCIÓN - Ahora se obtiene del usuario
  const [planActual, setPlanActual] = useState<string | null>(null);
  const [estadoSuscripcion, setEstadoSuscripcion] = useState<'INACTIVO' | 'ACTIVO'>('INACTIVO');
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [cargandoPlan, setCargandoPlan] = useState(true);
  const [paidBySchool, setPaidBySchool] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loboSolitario, setLoboSolitario] = useState(false);
  const [loboSolitarioInfo, setLoboSolitarioInfo] = useState<any>(null);
  
  // Estado para cambio de mentor (Lobo Solitario)
  const [mentorFaltas, setMentorFaltas] = useState<any>(null);
  const [cargandoFaltas, setCargandoFaltas] = useState(false);
  const [solicitandoCambio, setSolicitandoCambio] = useState(false);
  
  // ESTADO DEL MODAL THE TETHER
  const [showTetherModal, setShowTetherModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // PRECIOS DINÁMICOS
  const [precioLicenciaInstitucional, setPrecioLicenciaInstitucional] = useState(135);
  const [monedaInstitucional, setMonedaInstitucional] = useState<'MXN' | 'USD'>('MXN');
  
  // Estados para precios dinámicos de planes
  const [preciosPlanes, setPreciosPlanes] = useState({
    standard: { 
      bimestral: 2000, 
      anual: 10000 
    },
    premium: { 
      bimestral: 4000, 
      anual: 25000 
    }
  });
  const [cargandoPrecios, setCargandoPrecios] = useState(true);

  // Cargar plan actual del usuario
  useEffect(() => {
    const cargarPlanActual = async () => {
      try {
        const res = await fetch('/api/user/current-plan');
        if (res.ok) {
          const data = await res.json();
          console.log('Plan data received:', data); // Debug
          setPlanActual(data.plan || 'FREE');
          setEstadoSuscripcion(data.activo ? 'ACTIVO' : 'INACTIVO');
          setPaidBySchool(data.paidBySchool || false);
          setSchoolInfo(data.organization || null);
          setLoboSolitario(data.loboSolitario || false);
          setLoboSolitarioInfo(data.loboSolitarioInfo || null);
          
          // Si es Lobo Solitario, verificar faltas del mentor
          if (data.loboSolitario) {
            verificarFaltasMentor();
          }
        }
      } catch (error) {
        console.error('Error cargando plan:', error);
      } finally {
        setCargandoPlan(false);
      }
    };
    
    cargarPlanActual();
  }, []);

  // Cargar precios desde el administrador
  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const res = await fetch('/api/admin/precios');
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Precios cargados desde admin:', data);
          
          // Detectar moneda basada en timezone
          let detectedMoneda: 'MXN' | 'USD' = 'MXN';
          try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone && !timezone.includes('America/')) {
              detectedMoneda = 'USD';
            }
          } catch (e) {
            // Usar MXN por defecto
          }
          
          setMonedaInstitucional(detectedMoneda);
          
          // Actualizar precios de planes
          const moneda = detectedMoneda.toLowerCase();
          setPreciosPlanes({
            standard: {
              bimestral: data.standard?.[moneda]?.bimestral || 2000,
              anual: data.standard?.[moneda]?.anual || 10000
            },
            premium: {
              bimestral: data.premium?.[moneda]?.bimestral || 4000,
              anual: data.premium?.[moneda]?.anual || 25000
            }
          });
          
          // Precio institucional
          const precioLicencia = detectedMoneda === 'MXN' 
            ? data.institucional?.mxn?.licencia || 2400
            : data.institucional?.usd?.licencia || 150;
          
          setPrecioLicenciaInstitucional(precioLicencia);
        }
      } catch (error) {
        console.error('Error cargando precios:', error);
      } finally {
        setCargandoPrecios(false);
      }
    };
    
    cargarPrecios();
  }, []);

  // PRECIOS (ahora usando valores dinámicos)
  const PRECIOS = {
      standard: { 
        bimestral: preciosPlanes.standard.bimestral, 
        anual: preciosPlanes.standard.anual 
      },
      quantum: { 
        bimestral: preciosPlanes.premium.bimestral, 
        anual: preciosPlanes.premium.anual 
      },
      centro: { participante: precioLicenciaInstitucional }
  };

  const [numParticipantes, setNumParticipantes] = useState(50);

  // Función para verificar faltas del mentor
  const verificarFaltasMentor = async () => {
    setCargandoFaltas(true);
    try {
      const res = await fetch('/api/lobo-solitario/verificar-faltas-mentor');
      if (res.ok) {
        const data = await res.json();
        setMentorFaltas(data);
        console.log('📊 Faltas del mentor:', data);
      }
    } catch (error) {
      console.error('Error verificando faltas:', error);
    } finally {
      setCargandoFaltas(false);
    }
  };

  // Función para solicitar cambio de mentor
  const solicitarCambioMentor = async () => {
    if (!confirm('¿Estás seguro de que deseas cambiar de mentor? Se cancelarán todas tus sesiones pendientes y deberás reagendar con un nuevo mentor.')) {
      return;
    }

    setSolicitandoCambio(true);
    try {
      const res = await fetch('/api/lobo-solitario/solicitar-cambio-mentor', { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.message}\n\nSesiones canceladas: ${data.canceledSessions}`);
        
        // Redirigir a seleccionar nuevo mentor
        router.push('/dashboard/lobo-solitario/seleccionar-mentor?cambio=true');
      } else {
        const error = await res.json();
        alert(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error solicitando cambio:', error);
      alert('Error al procesar la solicitud. Intenta nuevamente.');
    } finally {
      setSolicitandoCambio(false);
    }
  };

  // CÁLCULO DINÁMICO
  const calcularTotal = () => {
      if (tipoCliente === 'CENTRO') {
          return numParticipantes * PRECIOS.centro.participante;
      }
      // Individual
      const tarifas = planIndividual === 'STANDARD' ? PRECIOS.standard : PRECIOS.quantum;
      return frecuencia === 'BIMESTRAL' ? tarifas.bimestral : tarifas.anual;
  };

  const totalPagar = calcularTotal();

  const formatoMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  
  const formatoPrecio = (val: number, usarMonedaInstitucional = false) => {
    if (usarMonedaInstitucional && tipoCliente === 'CENTRO') {
      return monedaInstitucional === 'MXN' 
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
        : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    return formatoMXN(val);
  };

  // HANDLERS
  const iniciarProceso = () => {
    // Si es plan institucional, redirigir a la página de contratación
    if (tipoCliente === 'CENTRO') {
      router.push('/dashboard/suscripcion/contratar-institucional');
    } else if (planIndividual === 'STANDARD' || planIndividual === 'QUANTUM') {
      // Para Standard y Premium (Quantum), ir a seleccionar mentor
      router.push(`/dashboard/lobo-solitario/seleccionar-mentor?plan=${planIndividual}&frecuencia=${frecuencia}`);
    } else {
      // Plan FREE o cualquier otro
      setCheckoutStep('RESUMEN');
      setShowCheckout(true);
    }
  };
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
          planNombre = planIndividual === 'STANDARD' ? 'Standard' : 'Premium';
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

  // HANDLERS DEL MODAL THE TETHER
  const handleConfirmFree = async () => {
    try {
      console.log('🔄 Iniciando activación de plan FREE...');
      
      // Activar plan FREE y auto-aprobar carta
      const res = await fetch('/api/user/activate-free-tier', { method: 'POST' });
      
      if (!res.ok) {
        console.error('❌ Error en la respuesta:', res.status, res.statusText);
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
        setErrorMessage(errorData.error || 'Error al activar el plan. Por favor intenta de nuevo.');
        setShowErrorModal(true);
        setShowTetherModal(false);
        return;
      }
      
      const data = await res.json();
      console.log('✅ Respuesta del servidor:', data);
      
      // Cerrar modal primero
      setShowTetherModal(false);
      
      if (data.cartaAprobada) {
        console.log('📝 Carta aprobada, redirigiendo a resumen...');
        // Usar window.location para forzar la navegación
        window.location.href = '/dashboard/carta/resumen';
      } else {
        console.log('📝 No hay carta, redirigiendo a wizard...');
        window.location.href = '/dashboard/carta/wizard-v2';
      }
    } catch (error) {
      console.error('❌ Error en handleConfirmFree:', error);
      setErrorMessage('Error al procesar la solicitud. Por favor intenta de nuevo.');
      setShowErrorModal(true);
      setShowTetherModal(false);
    }
  };

  const handleUpgradeStandard = () => {
    // Usuario decidió actualizar al plan Standard
    setShowTetherModal(false);
    setPlanIndividual('STANDARD');
    // Iniciar proceso de checkout para Standard
    setTimeout(() => {
      iniciarProceso();
    }, 300);
  };

  // Obtener información del plan actual
  const getPlanInfo = (plan: string) => {
    switch(plan) {
      case 'FREE':
        return { nombre: 'Básico', icon: '🆓', color: 'emerald', descripcion: 'Plan gratuito de autogestión' };
      case 'STANDARD':
        return { nombre: 'Standard', icon: '⭐', color: 'blue', descripcion: 'Transformación cuantica con mentor' };
      case 'PREMIUM':
      case 'QUANTUM':
        return { nombre: 'Premium', icon: '⚡', color: 'purple', descripcion: 'Máxima transformación con acompañamiento VIP' };
      default:
        return { nombre: 'Sin Plan', icon: '❓', color: 'gray', descripcion: 'No tienes un plan activo' };
    }
  };

  if (cargandoPlan || cargandoPrecios) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">
            {cargandoPlan ? 'Cargando tu membresía...' : 'Cargando precios...'}
          </p>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo(planActual || 'FREE');

  // Si el usuario tiene plan activo STANDARD o PREMIUM, mostrar pantalla de membresía
  if (estadoSuscripcion === 'ACTIVO' && (planActual === 'STANDARD' || planActual === 'PREMIUM' || planActual === 'QUANTUM')) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
        {/* QUANTUM BACKGROUND GRID */}
        <div className="fixed inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* HEADER */}
        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-300">Membresía Activa</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3 tracking-wider uppercase" style={{ fontFamily: 'Orbitron, Montserrat, sans-serif' }}>
            <Crown className={`text-${planInfo.color}-400`} size={40} style={{ filter: `drop-shadow(0 0 8px rgba(0, 240, 255, 0.6))` }} />
            Mi Membresía
          </h1>
          <p className="text-slate-400 text-lg">Gestiona tu plan y accede a todos los beneficios</p>
        </div>

        {/* TARJETA PRINCIPAL DE MEMBRESÍA */}
        <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/30 to-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="text-7xl">{planInfo.icon}</div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-white uppercase tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Plan {planInfo.nombre}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                    ACTIVO
                  </span>
                </div>
                <p className="text-slate-300 text-lg">{planInfo.descripcion}</p>
              </div>
            </div>
          </div>

          {/* Información de pago por escuela */}
          {paidBySchool && schoolInfo && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 mb-6">
              <div className="flex items-center gap-4">
                {schoolInfo.logo && (
                  <img 
                    src={schoolInfo.logo} 
                    alt={schoolInfo.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/50"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-1">Membresía institucional pagada por</p>
                  <p className="text-xl font-bold text-white">{schoolInfo.name}</p>
                </div>
                <Building2 className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          )}

          {/* BENEFICIOS DEL PLAN */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white">Mentor Quantum AI</h3>
              </div>
              <p className="text-sm text-slate-400">Experto dedicado que te acompaña en cada paso</p>
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white">Puntos Cuánticos</h3>
              </div>
              <p className="text-sm text-slate-400">Gamificación y recompensas por tu progreso</p>
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-white">Dashboard de Tareas</h3>
              </div>
              <p className="text-sm text-slate-400">Gestiona tus objetivos y avances</p>
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">Wizard de Planeación</h3>
              </div>
              <p className="text-sm text-slate-400">Crea tus Objetivos personalizados</p>
            </div>

            {(planActual === 'PREMIUM' || planActual === 'QUANTUM') && (
              <>
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white">Acompañamiento VIP</h3>
                  </div>
                  <p className="text-sm text-slate-400">Seguimiento directo con tu mentor</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-pink-400" />
                    <h3 className="font-bold text-white">Máxima Aceleración</h3>
                  </div>
                  <p className="text-sm text-slate-400">Revisión inmediata de tareas</p>
                </div>
              </>
            )}
          </div>

          {/* ACCIONES */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/dashboard"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-3 uppercase tracking-wide"
            >
              <ArrowRight className="w-5 h-5" />
              Ir al Dashboard
            </Link>
            
            {planActual === 'STANDARD' && (
              <button
                onClick={() => router.push('/dashboard/lobo-solitario/seleccionar-mentor?plan=PREMIUM&frecuencia=ANUAL')}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-yellow-500/50 flex items-center justify-center gap-3 uppercase tracking-wide"
              >
                <Crown className="w-5 h-5" />
                Upgrade a Premium
              </button>
            )}
          </div>
        </div>

        {/* INFORMACIÓN ADICIONAL */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Información de tu Plan
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Estado</span>
              <span className="text-green-400 font-semibold">✓ Activo</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
              <span className="text-slate-400">Tipo de Plan</span>
              <span className="text-white font-semibold">{planInfo.nombre}</span>
            </div>
            {!paidBySchool && (
              <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400">Tipo de Membresía</span>
                <span className="text-white font-semibold">Individual (Lobo Solitario)</span>
              </div>
            )}
            {loboSolitario && loboSolitarioInfo && (
              <>
                <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                  <span className="text-slate-400">Sesiones Restantes</span>
                  <span className="text-cyan-400 font-semibold">{loboSolitarioInfo.remainingSessions} de {loboSolitarioInfo.totalSessions}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                  <span className="text-slate-400">Frecuencia</span>
                  <span className="text-white font-semibold">{loboSolitarioInfo.frecuencia === 'ANUAL' ? 'Anual' : 'Bimestral'}</span>
                </div>
                {loboSolitarioInfo.expiresAt && (
                  <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Expira</span>
                    <span className="text-white font-semibold">{new Date(loboSolitarioInfo.expiresAt).toLocaleDateString('es-MX')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* BANNER DE CAMBIO DE MENTOR - Solo para Lobo Solitario */}
        {loboSolitario && mentorFaltas && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              Gestión de Mentor
            </h3>
            
            {mentorFaltas.mentor && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-slate-800/30 rounded-lg">
                {mentorFaltas.mentor.profileImage && (
                  <img 
                    src={mentorFaltas.mentor.profileImage} 
                    alt={mentorFaltas.mentor.nombre}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-600"
                  />
                )}
                <div>
                  <p className="text-white font-semibold">{mentorFaltas.mentor.nombre}</p>
                  <p className="text-slate-400 text-xs">Tu mentor actual</p>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400">Faltas registradas</span>
                <span className={`font-semibold ${mentorFaltas.totalFaltas >= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {mentorFaltas.totalFaltas} falta{mentorFaltas.totalFaltas !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {mentorFaltas.puedesCambiarMentor ? (
              <div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-red-300 font-semibold text-sm">Puedes solicitar cambio de mentor</p>
                      <p className="text-red-400/80 text-xs mt-1">
                        Tu mentor ha faltado {mentorFaltas.totalFaltas} veces. Tienes derecho a cambiar de mentor y reagendar tus sesiones restantes.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={solicitarCambioMentor}
                  disabled={solicitandoCambio}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {solicitandoCambio ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Users size={18} />
                      Solicitar Cambio de Mentor
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs text-center">
                  Se requieren al menos 2 faltas confirmadas para solicitar cambio de mentor.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative">
      
      {/* QUANTUM BACKGROUND GRID */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* HEADER */}
      <div className="mb-10 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3 tracking-wider uppercase" style={{ fontFamily: 'Orbitron, Montserrat, sans-serif' }}>
          <ShieldCheck className="text-cyan-400" size={40} style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.6))' }} />
          Elige tu Plan de Transformación
        </h1>
        <p className="text-slate-400 text-lg">Todos los planes incluyen <span className="text-blue-400 font-semibold">mentor Quantum AI</span> dedicado a tu transformación</p>
      </div>

      {/* BANNER DE MEMBRESÍA ACTUAL - Solo mostrar si tiene plan pagado */}
      {planActual && planActual !== 'FREE' && estadoSuscripcion === 'ACTIVO' && (
        <div className={`max-w-4xl mx-auto mb-10 bg-gradient-to-r from-${planInfo.color}-900/30 to-${planInfo.color}-800/20 border border-${planInfo.color}-500/30 rounded-2xl p-6 shadow-xl`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{planInfo.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className={`text-${planInfo.color}-400`} size={20} />
                  <h3 className="text-xl font-bold text-white">Plan Actual: {planInfo.nombre}</h3>
                </div>
                <p className="text-slate-300 text-sm">{planInfo.descripcion}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Estado</p>
              <span className={`px-4 py-2 rounded-full text-sm font-bold bg-green-600 text-white`}>
                ✓ Plan Activo
              </span>
            </div>
          </div>
          
          {/* Mostrar si está pagado por escuela */}
          {paidBySchool && schoolInfo && (
            <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700">
              {schoolInfo.logo && (
                <img 
                  src={schoolInfo.logo} 
                  alt={schoolInfo.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                />
              )}
              <div>
                <p className="text-xs text-slate-400">Membresía pagada por</p>
                <p className="text-base font-bold text-white">{schoolInfo.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WIDGET DE ÓRDENES PENDIENTES */}
      <PendingOrdersWidget />

      {/* BANNER ESPECIAL - Usuario con visión pero sin plan de pago activo */}
      {(!planActual || planActual === 'FREE') && schoolInfo && (
        <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            {schoolInfo.logo && (
              <img 
                src={schoolInfo.logo} 
                alt={schoolInfo.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-white">Miembro de {schoolInfo.name}</h3>
              <p className="text-slate-300 text-sm">Tu institución te da acceso a la plataforma</p>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700">
            <p className="text-sm text-slate-300">
              💡 <span className="font-semibold">Tip:</span> Habla con tu coordinador sobre activar un plan premium 
              para desbloquear todas las funciones de transformación cuántica.
            </p>
          </div>
        </div>
      )}

      {/* CTA DE UPGRADE */}
      {planActual === 'FREE' && (
        <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp className="text-purple-400" size={28} />
              <h3 className="text-2xl font-bold text-white">¡Desbloquea Todo tu Potencial!</h3>
            </div>
            <p className="text-slate-300 mb-4">
              Actualmente estás en el Plan Básico. Actualiza para obtener mentor personal, 
              puntos cuánticos, y aceleración de tu transformación.
            </p>
            <div className="flex justify-center gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center flex-1 max-w-xs">
                <div className="text-2xl mb-1">⭐</div>
                <p className="text-sm text-white font-semibold mb-1">Standard</p>
                <p className="text-xs text-slate-400">Mentor + Gamificación</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center flex-1 max-w-xs">
                <div className="text-2xl mb-1">⚡</div>
                <p className="text-sm text-white font-semibold mb-1">Premium</p>
                <p className="text-xs text-slate-400">Acompañamiento VIP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {planActual === 'STANDARD' && (
        <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="text-yellow-400" size={28} />
              <h3 className="text-2xl font-bold text-white">¿Listo para el Siguiente Nivel?</h3>
            </div>
            <p className="text-slate-300 mb-4">
              Actualiza a Premium ⚡ y obtén acompañamiento VIP con máxima transformación
            </p>
          </div>
        </div>
      )}

      {/* VISTA 1: SELECCIÓN DE PLANES (Si no está activo) */}
      {estadoSuscripcion === 'INACTIVO' && (
        <>
            {/* 1. SELECTOR TIPO CLIENTE - Quantum Style */}
            <div className="flex justify-center mb-12">
                <div 
                  className="p-1 rounded-full border flex relative"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                    <button 
                      onClick={() => setTipoCliente('INDIVIDUAL')} 
                      className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                        tipoCliente === 'INDIVIDUAL' 
                          ? 'text-slate-900' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                      style={tipoCliente === 'INDIVIDUAL' ? {
                        background: 'linear-gradient(135deg, #00F0FF, #0ea5e9)',
                        boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
                        fontFamily: 'Montserrat, sans-serif'
                      } : {}}
                    >
                        <User size={18} /> Individual
                    </button>
                    <button 
                      onClick={() => setTipoCliente('CENTRO')} 
                      className={`px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                        tipoCliente === 'CENTRO' 
                          ? 'text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                      style={tipoCliente === 'CENTRO' ? {
                        background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
                        fontFamily: 'Montserrat, sans-serif'
                      } : {}}
                    >
                        <Building2 size={18} /> Para Centros
                    </button>
                </div>
            </div>

            {/* --- CONTENIDO INDIVIDUAL --- */}
            {tipoCliente === 'INDIVIDUAL' && (
                <div className="max-w-5xl mx-auto animate-in fade-in zoom-in duration-300">
                    
                    {/* Toggle Frecuencia - Quantum Style */}
                    <div className="flex justify-center items-center mb-8 gap-4">
                        <span 
                          className={`cursor-pointer font-bold transition-all ${
                            frecuencia === 'BIMESTRAL' 
                              ? 'text-cyan-400' 
                              : 'text-slate-500 hover:text-slate-400'
                          }`}
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif',
                            textShadow: frecuencia === 'BIMESTRAL' ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none'
                          }}
                          onClick={() => setFrecuencia('BIMESTRAL')}
                        >
                          Bimestral
                        </span>
                        
                        <div 
                          className="relative inline-flex items-center cursor-pointer" 
                          onClick={() => setFrecuencia(frecuencia === 'BIMESTRAL' ? 'ANUAL' : 'BIMESTRAL')}
                        >
                            <div 
                              className={`w-14 h-7 rounded-full transition-all ${
                                frecuencia === 'ANUAL' 
                                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                                  : 'bg-slate-700'
                              }`}
                              style={{
                                boxShadow: frecuencia === 'ANUAL' 
                                  ? '0 0 10px rgba(0, 240, 255, 0.4)' 
                                  : 'none'
                              }}
                            ></div>
                            <div className={`absolute top-1 left-1 bg-white rounded-full h-5 w-5 transition-transform shadow-lg ${frecuencia === 'ANUAL' ? 'translate-x-7' : ''}`}></div>
                        </div>

                        <span 
                          className={`cursor-pointer font-bold flex items-center gap-2 transition-all ${
                            frecuencia === 'ANUAL' 
                              ? 'text-cyan-400' 
                              : 'text-slate-500 hover:text-slate-400'
                          }`}
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif',
                            textShadow: frecuencia === 'ANUAL' ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none'
                          }}
                          onClick={() => setFrecuencia('ANUAL')}
                        >
                            Anual <span className="text-[10px] bg-cyan-500 text-slate-900 px-2 py-0.5 rounded-full font-bold" style={{ boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)' }}>AHORRA 20%</span>
                        </span>
                    </div>

                    {/* Tarjetas Comparativas - 3 Columnas */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        
                        {/* PLAN FREE / AUTOGESTIÓN - Ghost Appearance */}
                        <div 
                          className={`relative p-6 rounded-2xl border transition-all cursor-pointer ${
                            planIndividual === 'FREE' 
                              ? 'border-emerald-500 shadow-2xl shadow-emerald-900/20 transform scale-105 z-10' 
                              : 'border-slate-700 opacity-80 hover:opacity-90'
                          }`}
                          style={{
                            background: planIndividual === 'FREE' 
                              ? 'rgba(21, 27, 38, 0.7)' 
                              : 'rgba(15, 23, 42, 0.5)',
                            backdropFilter: 'blur(8px)'
                          }}
                          onClick={() => setPlanIndividual('FREE')}
                        >
                            
                            <h3 className="text-2xl font-bold text-slate-300 mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>Básico</h3>
                            <p className="text-slate-500 text-sm mb-6">Para quienes tienen disciplina de acero</p>
                            <div className="text-5xl font-bold text-slate-400 mb-6" style={{ fontFamily: 'Roboto Mono, monospace', letterSpacing: '-0.02em' }}>
                                $0
                                <span className="text-sm text-slate-600 font-normal"> / mes</span>
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-slate-500"/> Acceso al Wizard de Planeación</li>
                                <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-slate-500"/> Dashboard de Tareas</li>
                                <li className="flex gap-3 text-slate-300 text-sm font-bold"><Zap size={16} className="text-slate-500"/> Autorización Inmediata (Sin Mentor)</li>
                                <li className="flex gap-3 text-slate-600 text-sm line-through"><X size={16} className="text-slate-700"/> Sin Puntos Cuánticos</li>
                                <li className="flex gap-3 text-slate-600 text-sm line-through"><X size={16} className="text-slate-700"/> Sin Revisión de Evidencias</li>
                                <li className="flex gap-3 text-slate-600 text-sm line-through"><X size={16} className="text-slate-700"/> Sin Llamadas de Disciplina</li>
                            </ul>

                            <button 
                              className={`w-full py-3 rounded-xl font-bold transition-all ${
                                planIndividual === 'FREE' 
                                  ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600' 
                                  : 'bg-transparent border border-slate-700 text-slate-500 hover:border-slate-600'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (planIndividual === 'FREE') {
                                  // Abrir el modal The Tether antes de confirmar
                                  setShowTetherModal(true);
                                }
                              }}
                            >
                              {planIndividual === 'FREE' ? 'CONTINUAR GRATIS' : 'SELECCIONAR'}
                            </button>
                        </div>
                        
                        {/* PLAN STANDARD - Quantum Hero Card */}
                        <div 
                          className={`relative p-6 rounded-2xl border transition-all cursor-pointer ${
                            planIndividual === 'STANDARD' 
                              ? 'transform scale-105 z-20' 
                              : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{
                            background: 'rgba(21, 27, 38, 0.7)',
                            backdropFilter: 'blur(10px)',
                            border: planIndividual === 'STANDARD' ? '1px solid #00F0FF' : '1px solid #334155',
                            boxShadow: planIndividual === 'STANDARD' 
                              ? '0 0 15px rgba(0, 240, 255, 0.3), 0 0 30px rgba(0, 240, 255, 0.1)' 
                              : 'none'
                          }}
                          onClick={() => setPlanIndividual('STANDARD')}
                        >
                            <div className="absolute top-0 right-0 bg-cyan-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>POPULAR</div>
                            
                            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>Standard</h3>
                            <p className="text-cyan-300 text-sm mb-6">Transformación cuántica con mentor dedicado</p>
                            <div className="mb-6">
                                <div className="text-5xl font-bold text-cyan-400" style={{ 
                                  fontFamily: 'Roboto Mono, monospace', 
                                  letterSpacing: '-0.02em',
                                  textShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
                                }}>
                                    {formatoMXN(frecuencia === 'BIMESTRAL' ? PRECIOS.standard.bimestral : PRECIOS.standard.anual)}
                                    <span className="text-sm text-slate-400 font-normal"> MXN / {frecuencia.toLowerCase()}</span>
                                </div>
                                {frecuencia === 'ANUAL' && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Costo bimestral: {formatoMXN(PRECIOS.standard.bimestral)} MXN
                                    </p>
                                )}
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> Acceso 24/7 Plataforma</li>
                                <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> Obtencion de Objetivos AI</li>
                                <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> Mentor Quantum AI</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> 🎯 Mentor Personal Asignado</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> 📞 2 Sesiones Semanales</li>
                                <li className="flex gap-3 text-white text-sm"><Check size={16} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))' }}/> Retroalimentación Experta</li>
                            </ul>

                            <button 
                              className={`w-full py-3 rounded-xl font-bold transition-all ${
                                planIndividual === 'STANDARD' 
                                  ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400' 
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                              style={{
                                boxShadow: planIndividual === 'STANDARD' 
                                  ? '0 0 15px rgba(0, 240, 255, 0.4)' 
                                  : 'none'
                              }}
                              onClick={iniciarProceso}
                            >
                                {planIndividual === 'STANDARD' ? 'ELEGIR STANDARD' : 'SELECCIONAR'}
                            </button>
                        </div>

                        {/* PLAN PREMIUM (anteriormente QUANTUM) - Gold VIP */}
                        <div 
                          className={`relative p-6 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                            planIndividual === 'QUANTUM' 
                              ? 'transform scale-105 z-10' 
                              : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{
                            background: 'rgba(21, 27, 38, 0.7)',
                            backdropFilter: 'blur(10px)',
                            border: planIndividual === 'QUANTUM' ? '1px solid #FFD700' : '1px solid #334155',
                            boxShadow: planIndividual === 'QUANTUM' 
                              ? '0 0 15px rgba(255, 215, 0, 0.3), 0 0 30px rgba(255, 215, 0, 0.1)' 
                              : 'none'
                          }}
                          onClick={() => setPlanIndividual('QUANTUM')}
                        >
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>⭐ RECOMENDADO</div>
                            
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ 
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}>
                              Premium <Zap size={20} className="text-yellow-500 fill-current"/>
                            </h3>
                            <p className="text-yellow-200 text-sm mb-6">Máxima transformación con acompañamiento VIP</p>
                            <div className="mb-6">
                                <div className="text-5xl font-bold text-yellow-400" style={{ 
                                  fontFamily: 'Roboto Mono, monospace', 
                                  letterSpacing: '-0.02em',
                                  textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                                }}>
                                    {formatoMXN(frecuencia === 'BIMESTRAL' ? PRECIOS.quantum.bimestral : PRECIOS.quantum.anual)}
                                    <span className="text-sm text-slate-400 font-normal"> MXN / {frecuencia.toLowerCase()}</span>
                                </div>
                                {frecuencia === 'ANUAL' && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Costo bimestral: {formatoMXN(PRECIOS.quantum.bimestral)} MXN
                                    </p>
                                )}
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-3 text-yellow-200 text-sm font-bold"><Star size={16} className="text-yellow-500 fill-current" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> Todo lo de Standard</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> 🏆 Mentor Elite Asignado</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> 📞 2 Sesiones 1:1 / Semana</li>
                                <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-yellow-500" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> 💬 Chat Directo con Mentor</li>
                                <li className="flex gap-3 text-white text-sm"><Check size={16} className="text-yellow-500" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> Revisión Inmediata de Tareas</li>
                                <li className="flex gap-3 text-white text-sm"><Check size={16} className="text-yellow-500" style={{ filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.5))' }}/> Prioridad en Soporte</li>
                            </ul>

                            <button 
                              className={`w-full py-3 rounded-xl font-bold transition-all ${
                                planIndividual === 'QUANTUM' 
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 hover:from-yellow-400 hover:to-orange-400' 
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                              style={{
                                boxShadow: planIndividual === 'QUANTUM' 
                                  ? '0 0 15px rgba(255, 215, 0, 0.4)' 
                                  : 'none'
                              }}
                              onClick={iniciarProceso}
                            >
                                {planIndividual === 'QUANTUM' ? '⚡ ELEGIR PREMIUM' : 'SELECCIONAR'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* --- CONTENIDO CENTROS --- */}
            {tipoCliente === 'CENTRO' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                    <div 
                      className="border rounded-2xl p-8 relative overflow-hidden shadow-2xl"
                      style={{
                        background: 'rgba(21, 27, 38, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)'
                      }}
                    >
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl" style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>B2B / INSTITUCIONAL</div>
                        
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>Plan Institucional</h2>
                                <p className="text-purple-200 mb-6">Licenciamiento por volumen para tu Centro.</p>
                                
                                {/* Calculadora */}
                                <div 
                                  className="p-6 rounded-xl border mb-6"
                                  style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    backdropFilter: 'blur(5px)'
                                  }}
                                >
                                    <label className="block text-purple-300 text-xs font-bold uppercase mb-3 flex items-center gap-2"><Calculator size={14}/> Número de Participantes</label>
                                    <input 
                                      type="range" 
                                      min="10" 
                                      max="500" 
                                      step="10" 
                                      value={numParticipantes} 
                                      onChange={(e) => setNumParticipantes(Number(e.target.value))} 
                                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mb-4"
                                      style={{ accentColor: '#a855f7' }}
                                    />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>{numParticipantes} Participantes</span>
                                        <span className="text-purple-400 font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{formatoPrecio(PRECIOS.centro.participante, true)} / Usuario</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-6 border-t border-purple-500/20 pt-4">
                                    <span className="text-xl text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Total Anual:</span>
                                    <span 
                                      className="text-4xl text-purple-400 font-bold" 
                                      style={{ 
                                        fontFamily: 'Roboto Mono, monospace',
                                        textShadow: '0 0 10px rgba(168, 85, 247, 0.3)'
                                      }}
                                    >
                                      {formatoPrecio(totalPagar, true)}
                                    </span>
                                </div>

                                <button 
                                  onClick={iniciarProceso} 
                                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                  style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}
                                >
                                    <Building2 size={20} /> CONTRATAR AHORA
                                </button>
                            </div>

                            <div 
                              className="space-y-6 p-6 rounded-xl border"
                              style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                backdropFilter: 'blur(5px)'
                              }}
                            >
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Star size={18} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Nivel Incluido: Standard
                                </h3>
                                <p className="text-xs text-slate-400">Cada estudiante obtiene acceso completo con mentor.</p>
                                
                                <div className="mt-4 pt-4 border-t border-purple-500/20">
                                    <h4 className="text-purple-400 text-xs font-bold uppercase mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>Panel Administrativo</h4>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Monitor de progreso global</li>
                                        <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Gestión de licencias activa</li>
                                        <li className="flex gap-3 text-white text-sm font-semibold"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Reportes de comunidad</li>
                                        <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> 🎯 Mentor asignado por estudiante</li>
                                        <li className="flex gap-3 text-white text-sm font-bold"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Administrador de 📞 Sesiones 1:1 semanales</li>
                                        <li className="flex gap-3 text-slate-300 text-sm"><Check size={16} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' }}/> Retroalimentación personalizada</li>
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
                Tienes acceso total a {tipoCliente === 'INDIVIDUAL' ? 'tu transformación cuántica' : 'la gestión de tu Centro'}.
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
        <div className="fixed inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
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
                                        {tipoCliente === 'CENTRO' ? 'Institucional / Centro' : (planIndividual === 'STANDARD' ? 'Standard' : 'Premium')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {tipoCliente === 'CENTRO' ? `${numParticipantes} Licencias` : `Pago ${frecuencia.toLowerCase()}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">{tipoCliente === 'CENTRO' ? formatoPrecio(totalPagar, true) : formatoMXN(totalPagar)}</p>
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

      {/* Modal The Tether - Retención para Plan Gratuito */}
      <TheTetherModal
        isOpen={showTetherModal}
        onClose={() => setShowTetherModal(false)}
        onConfirmFree={handleConfirmFree}
        onUpgradeStandard={handleUpgradeStandard}
      />

      {/* Modal de Error Personalizado */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setShowErrorModal(false)}
          />
          <div className="relative bg-gradient-to-b from-red-950/90 to-slate-950/90 border-2 border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-900/30">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Error al activar el plan</h3>
              <p className="text-slate-300 mb-6">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
