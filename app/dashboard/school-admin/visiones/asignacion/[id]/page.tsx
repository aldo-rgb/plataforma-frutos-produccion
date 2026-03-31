'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Trash2, 
  AlertTriangle,
  Calculator,
  Wallet,
  TrendingUp,
  DollarSign,
  Calendar,
  Phone,
  Sparkles,
  Shield,
  Zap,
  Info
} from 'lucide-react';

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  profileImage: string | null;
  rol: string;
  isActive: boolean;
  PerfilMentor?: {
    precioDisciplina?: number;
    precioBase?: number;
  };
  CallAvailability?: Array<{
    availableSlots: number;
    bookedSlots: number;
  }>;
}

interface MentorAsignado {
  id: number;
  visionId: number;
  mentorId: number;
  assignedAt: Date;
  precioDisciplina: number;
  precioBase: number;
  esLider: boolean;
  costoTotal: number;
  Usuario_VisionMentor_mentorIdToUsuario: Mentor;
}

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  organizationId: number;
  Organization?: {
    name: string;
  };
  _count?: {
    VisionParticipante?: number;
    VisionGameChanger?: number;
    VisionMentor?: number;
  };
}

interface CicloInfo {
  semanas: number;
  llamadasDisciplina: number;
  diasTotales: number;
}

interface BudgetCalculation {
  totalStudents: number;
  weeksPerStudent: number;
  callsPerWeek: number;
  totalCallsPerStudent: number;
  mentorRate: number;
  costPerStudent: number;
  grandTotal: number;
  escrowRequired: number;
}

interface WalletInfo {
  balance: number;
  availableForUse: number;
  netPayment: number;
}

export default function AsignacionMentoresPage() {
  const params = useParams();
  const router = useRouter();
  const visionId = parseInt(params.id as string);

  // Obtener parámetro de retorno
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const returnParam = searchParams.get('returnTo');
      if (returnParam) {
        setReturnTo(decodeURIComponent(returnParam));
      }
    }
  }, []);

  const [vision, setVision] = useState<Vision | null>(null);
  const [cicloInfo, setCicloInfo] = useState<CicloInfo | null>(null);
  const [participantesAsistieron, setParticipantesAsistieron] = useState<number>(0);
  const [mentoresAsignados, setMentoresAsignados] = useState<MentorAsignado[]>([]);
  const [mentoresDisponibles, setMentoresDisponibles] = useState<Mentor[]>([]);
  const [lideresDisponibles, setLideresDisponibles] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [mentorToRemove, setMentorToRemove] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  
  // 🎯 TICKET 1: Calculadora de Presupuesto
  const [showCalculator, setShowCalculator] = useState(true);
  const [showMentorCatalog, setShowMentorCatalog] = useState(false);
  const [numStudents, setNumStudents] = useState(1);
  const [selectedMentorRate, setSelectedMentorRate] = useState(90);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [selectedMentorStudents, setSelectedMentorStudents] = useState<{ [mentorId: number]: number }>({});
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const MAX_STUDENTS_PER_MENTOR = 5;

  useEffect(() => {
    if (visionId) {
      fetchData();
    }
  }, [visionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Ejecutar las 3 llamadas en paralelo para mejor rendimiento
      const [visionRes, mentoresRes, walletRes] = await Promise.all([
        fetch(`/api/school-admin/visiones/${visionId}`),
        fetch(`/api/school-admin/visiones/${visionId}/mentores`),
        fetch('/api/school-admin/wallet')
      ]);

      if (visionRes.ok) {
        const data = await visionRes.json();
        setVision(data.vision);
        setCicloInfo(data.cicloInfo);
        setParticipantesAsistieron(data.participantesAsistieron || 0);
        // No setear mentoresAsignados aquí, se hará con mentoresRes
      }

      if (mentoresRes.ok) {
        const data = await mentoresRes.json();
        setMentoresAsignados(data.mentoresAsignados || []);
        setMentoresDisponibles(data.mentoresDisponibles || []);
        setLideresDisponibles(data.lideresDisponibles || []);
      }

      if (walletRes.ok) {
        const data = await walletRes.json();
        setWalletInfo(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarMentor = async (mentorId: number) => {
    setAssigning(mentorId);
    try {
      const response = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId }),
      });

      if (response.ok) {
        await fetchData();
        
        // Si hay una URL de retorno, redirigir después de asignar
        if (returnTo) {
          setTimeout(() => {
            router.push(returnTo);
          }, 500); // Pequeño delay para que se vea el cambio
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Error al asignar mentor');
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      alert('Error al asignar mentor');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoverMentor = async () => {
    if (!mentorToRemove) return;

    setRemoving(true);
    try {
      const response = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: mentorToRemove }),
      });

      if (response.ok) {
        await fetchData();
        setShowRemoveModal(false);
        setMentorToRemove(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al remover mentor');
      }
    } catch (error) {
      console.error('Error removing mentor:', error);
      alert('Error al remover mentor');
    } finally {
      setRemoving(false);
    }
  };

  // 🎯 Procesar Pago y crear orden
  const handleProcessPayment = async () => {
    if (Object.keys(selectedMentorStudents).length === 0) {
      alert('Por favor selecciona al menos un mentor y asigna estudiantes');
      return;
    }

    setProcessingPayment(true);

    try {
      const budgetCalc = calculateBudget();
      
      console.log('💰 Budget calculado:', budgetCalc);
      
      // Preparar datos de mentores seleccionados
      const mentorAssignments = Object.entries(selectedMentorStudents)
        .filter(([_, count]) => count > 0)
        .map(([mentorId, studentCount]) => {
          const mentor = mentoresDisponibles.find(m => m.id === parseInt(mentorId));
          return {
            mentorId: parseInt(mentorId),
            mentorName: mentor?.nombre || '',
            studentCount,
            ratePerCall: mentor?.PerfilMentor?.precioDisciplina || 90,
            totalCost: studentCount * budgetCalc.totalCallsPerStudent * (mentor?.PerfilMentor?.precioDisciplina || 90)
          };
        });

      const walletDeduction = useWalletBalance ? (walletInfo?.balance || 0) : 0;
      const netPaymentAmount = budgetCalc.walletDeduction > 0 && useWalletBalance 
        ? budgetCalc.grandTotal - walletDeduction 
        : budgetCalc.grandTotal;

      const payload = {
        visionId: parseInt(params.id as string),
        totalAmount: budgetCalc.grandTotal,
        totalStudents: budgetCalc.totalStudents,
        totalCallsPerStudent: budgetCalc.totalCallsPerStudent, // Llamadas por estudiante del ciclo
        mentorAssignments,
        useWalletBalance,
        walletDeduction,
        netPayment: netPaymentAmount,
      };

      console.log('📦 Enviando payload:', payload);

      // Crear orden de pago
      const response = await fetch(`/api/school-admin/visiones/${params.id}/create-payment-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Redirigir a la página de pago específica para visiones
        router.push(`/dashboard/school-admin/visiones/payment?orderId=${data.orderId}`);
      } else {
        console.error('Error en respuesta:', data);
        alert(`Error: ${data.error || 'Error al crear la orden de pago'}${data.message ? '\n' + data.message : ''}`);
      }
    } catch (error) {
      console.error('Error procesando pago:', error);
      alert('Error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const calculateSlotStatus = (mentor: Mentor) => {
    const availability = mentor.CallAvailability?.[0];
    if (!availability) return { available: 0, total: 0, percentage: 0 };

    const total = availability.availableSlots;
    const booked = availability.bookedSlots;
    const available = total - booked;
    const percentage = total > 0 ? (available / total) * 100 : 0;

    return { available, total, percentage };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // 🎯 TICKET 1: Cálculo de Presupuesto
  const calculateBudget = (): BudgetCalculation => {
    const weeksPerStudent = cicloInfo?.semanas || 16;
    const callsPerWeek = 2;
    // Usar llamadas reales del ciclo en lugar de valor hardcodeado
    const totalCallsPerStudent = cicloInfo?.llamadasDisciplina || (weeksPerStudent * callsPerWeek);
    
    // Calculate total across all mentors with assigned students
    let grandTotal = 0;
    let totalStudents = 0;
    
    Object.entries(selectedMentorStudents).forEach(([mentorId, studentCount]) => {
      if (studentCount > 0) {
        const mentor = mentoresDisponibles.find(m => m.id === parseInt(mentorId));
        const mentorRate = mentor?.PerfilMentor?.precioDisciplina || 90;
        const costForThisMentor = totalCallsPerStudent * mentorRate * studentCount;
        grandTotal += costForThisMentor;
        totalStudents += studentCount;
      }
    });
    
    const escrowRequired = grandTotal;
    const averageRate = totalStudents > 0 ? grandTotal / (totalCallsPerStudent * totalStudents) : selectedMentorRate;
    const costPerStudent = totalStudents > 0 ? grandTotal / totalStudents : 0;

    return {
      totalStudents,
      weeksPerStudent,
      callsPerWeek,
      totalCallsPerStudent,
      mentorRate: Math.round(averageRate),
      costPerStudent,
      grandTotal,
      escrowRequired,
    };
  };

  const budget = calculateBudget();
  const costoTotalMentores = mentoresAsignados.reduce((acc, m) => acc + (m.costoTotal || 0), 0);

  const netPayment = walletInfo && useWalletBalance
    ? Math.max(0, budget.grandTotal - walletInfo.balance)
    : budget.grandTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#00F0FF]/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#00F0FF] animate-spin"></div>
            <Sparkles className="w-10 h-10 text-[#00F0FF] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-[#00F0FF] text-lg font-medium animate-pulse">
            Inicializando Sistema Quantum...
          </p>
          <p className="text-slate-400 text-sm mt-2">Cargando información del ciclo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* ⚛️ QUANTUM HEADER */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/school-admin/visiones/${visionId}`)}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-[#00F0FF] transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Volver al HUD Principal</span>
          </button>

          <div className="relative bg-gradient-to-br from-[#151B26]/90 to-[#0B0E11]/90 backdrop-blur-xl rounded-2xl border border-[#00F0FF]/20 p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#7B2CBF]/5 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF] to-[#7B2CBF] rounded-xl blur-lg opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-[#00F0FF] to-[#7B2CBF] rounded-xl p-4">
                    <Calculator className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-[#FFD700] bg-clip-text text-transparent">
                    Paquetes de LLamadas de Mentoria
                  </h1>
                  <p className="text-slate-300 mt-1">
                    <span className="text-[#00F0FF] font-semibold">{vision?.nombre}</span> 
                    <span className="text-slate-500 mx-2">•</span>
                    <span className="text-slate-400">{vision?.Organization?.name}</span>
                  </p>
                </div>
              </div>

              {cicloInfo && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/10 to-transparent rounded-xl blur group-hover:blur-md transition-all"></div>
                    <div className="relative bg-[#151B26]/50 backdrop-blur border border-[#00F0FF]/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-[#00F0FF]" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Duración</p>
                          <p className="text-2xl font-bold text-white">{cicloInfo.semanas} <span className="text-sm text-slate-400">sem</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#7B2CBF]/10 to-transparent rounded-xl blur group-hover:blur-md transition-all"></div>
                    <div className="relative bg-[#151B26]/50 backdrop-blur border border-[#7B2CBF]/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-6 h-6 text-[#9D4EDD]" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Llamadas</p>
                          <p className="text-2xl font-bold text-white">{cicloInfo.llamadasDisciplina} <span className="text-sm text-slate-400">total</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/10 to-transparent rounded-xl blur group-hover:blur-md transition-all"></div>
                    <div className="relative bg-[#151B26]/50 backdrop-blur border border-[#FFD700]/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-[#FFD700]" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Participantes</p>
                          <p className="text-2xl font-bold text-white">{participantesAsistieron} <span className="text-sm text-slate-400">asistieron</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/10 to-transparent rounded-xl blur group-hover:blur-md transition-all"></div>
                    <div className="relative bg-[#151B26]/50 backdrop-blur border border-[#00FF94]/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-[#00FF94]" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Costo Actual</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(costoTotalMentores)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎯 CALCULADORA DE PRESUPUESTO */}
        {showCalculator && (
          <div className="mb-8">
            <div className="relative bg-gradient-to-br from-[#151B26]/90 to-[#0B0E11]/90 backdrop-blur-xl rounded-2xl border border-[#7B2CBF]/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B2CBF]/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] rounded-lg blur opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] rounded-lg p-3">
                        <Calculator className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Calculadora de Presupuesto</h2>
                      <p className="text-sm text-slate-400">Configure su inversión en el programa</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCalculator(false)}
                    className="text-slate-400 hover:text-white transition-colors text-3xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* INPUT SECTION */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-slate-300 mb-3">
                        <UserPlus className="w-4 h-4 inline mr-2 text-[#7B2CBF]" />
                        Contratar Mentores Calificados
                      </label>
                      <button
                        onClick={() => setShowMentorCatalog(true)}
                        className="w-full bg-gradient-to-r from-[#7B2CBF] to-[#9D4EDD] hover:from-[#9D4EDD] hover:to-[#7B2CBF] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-[#7B2CBF]/30 hover:shadow-[#9D4EDD]/50 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span>Seleccionar Mentores Certificados</span>
                      </button>
                      
                      {/* Resumen de mentores seleccionados */}
                      {Object.entries(selectedMentorStudents).some(([_, count]) => count > 0) && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#00F0FF]" />
                              Resumen de Selección
                            </h3>
                            <span className="text-xs text-slate-400">
                              {Object.keys(selectedMentorStudents).filter(id => selectedMentorStudents[parseInt(id)] > 0).length} mentor(es)
                            </span>
                          </div>
                          
                          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {Object.entries(selectedMentorStudents).map(([mentorId, studentCount]) => {
                              if (studentCount === 0) return null;
                              const mentor = mentoresDisponibles.find(m => m.id === parseInt(mentorId));
                              if (!mentor) return null;
                              const mentorRate = mentor.PerfilMentor?.precioDisciplina || 90;
                              const totalSesiones = studentCount * (budget.totalCallsPerStudent || 32);
                              const costoTotal = totalSesiones * mentorRate;
                              
                              return (
                                <div key={mentorId} className="relative p-4 bg-gradient-to-br from-[#7B2CBF]/10 to-[#9D4EDD]/10 border border-[#7B2CBF]/30 rounded-xl shadow-lg">
                                  {/* Botón eliminar */}
                                  <button
                                    onClick={() => {
                                      const newStudents = { ...selectedMentorStudents };
                                      delete newStudents[parseInt(mentorId)];
                                      setSelectedMentorStudents(newStudents);
                                    }}
                                    className="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors hover:bg-red-500/10 p-1 rounded-lg"
                                    title="Eliminar mentor"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  
                                  {/* Header con foto y nombre */}
                                  <div className="flex items-start gap-3 mb-3">
                                    {mentor.imagen ? (
                                      <img
                                        src={mentor.imagen}
                                        alt={mentor.nombre}
                                        className="w-12 h-12 rounded-xl object-cover border-2 border-[#7B2CBF]"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] flex items-center justify-center border-2 border-[#7B2CBF]">
                                        <span className="text-white font-bold text-lg">
                                          {mentor.nombre.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 pr-6">
                                      <div className="text-base font-bold text-white mb-1">{mentor.nombre}</div>
                                      <div className="text-xs text-slate-400">{mentor.email}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Información detallada */}
                                  <div className="space-y-2 pl-15">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Alumnos asignados:
                                      </span>
                                      <span className="text-white font-semibold">{studentCount}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        Total de sesiones:
                                      </span>
                                      <span className="text-white font-semibold">
                                        {totalSesiones} llamadas
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        Tarifa por llamada:
                                      </span>
                                      <span className="text-[#FFD700] font-semibold">
                                        {formatCurrency(mentorRate)}
                                      </span>
                                    </div>
                                    
                                    {/* Desglose del cálculo */}
                                    <div className="mt-3 pt-3 border-t border-[#7B2CBF]/30">
                                      <div className="text-xs text-slate-500 mb-2">
                                        {studentCount} alumno{studentCount !== 1 ? 's' : ''} × {budget.totalCallsPerStudent || 32} llamadas × {formatCurrency(mentorRate)}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-300">Subtotal:</span>
                                        <span className="text-lg font-bold text-[#00FF94] flex items-center gap-1">
                                          <Zap className="w-4 h-4" />
                                          {formatCurrency(costoTotal)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Resumen total */}
                          <div className="mt-4 p-4 bg-gradient-to-r from-[#00F0FF]/10 to-[#7B2CBF]/10 border-2 border-[#00F0FF]/30 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Inversión total</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7B2CBF] bg-clip-text text-transparent">
                                  {formatCurrency(budget.grandTotal)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Total sesiones</p>
                                <p className="text-lg font-bold text-white">
                                  {Object.entries(selectedMentorStudents).reduce((total, [mentorId, studentCount]) => {
                                    return total + (studentCount * (budget.totalCallsPerStudent || 32));
                                  }, 0)} llamadas
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {walletInfo && walletInfo.balance > 0 && (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/10 to-transparent rounded-xl blur"></div>
                        <div className="relative bg-[#0B0E11]/50 border border-[#00FF94]/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-5 h-5 text-[#00FF94]" />
                              <span className="text-sm text-slate-300">Saldo a Favor</span>
                            </div>
                            <span className="text-lg font-bold text-[#00FF94]">
                              {formatCurrency(walletInfo.balance)}
                            </span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useWalletBalance}
                              onChange={(e) => setUseWalletBalance(e.target.checked)}
                              className="w-4 h-4 accent-[#00FF94]"
                            />
                            <span className="text-sm text-slate-400">Usar saldo disponible</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RESULTS SECTION */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 to-[#7B2CBF]/5 rounded-xl blur-xl"></div>
                    <div className="relative bg-[#0B0E11]/80 border border-[#00F0FF]/20 rounded-xl p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-[#00F0FF]" />
                        <h3 className="text-lg font-bold text-white">Desglose de Costos</h3>
                      </div>

                      {/* Mentores con alumnos asignados */}
                      {Object.entries(selectedMentorStudents).some(([_, count]) => count > 0) && (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <UserPlus className="w-4 h-4 text-[#9D4EDD]" />
                            <span className="text-xs text-slate-400 font-medium">Mentores Asignados:</span>
                          </div>
                          {Object.entries(selectedMentorStudents).map(([mentorId, studentCount]) => {
                            if (studentCount === 0) return null;
                            const mentor = mentoresDisponibles.find(m => m.id === parseInt(mentorId));
                            if (!mentor) return null;
                            const mentorRate = mentor.PerfilMentor?.precioDisciplina || 90;
                            const totalForMentor = budget.totalCallsPerStudent * mentorRate * studentCount;
                            
                            return (
                              <div key={mentorId} className="p-3 bg-[#7B2CBF]/10 border border-[#7B2CBF]/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  {mentor.imagen ? (
                                    <img
                                      src={mentor.imagen}
                                      alt={mentor.nombre}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">
                                        {mentor.nombre.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">{mentor.nombre}</div>
                                    <div className="text-xs text-slate-400">
                                      {studentCount} alumno{studentCount !== 1 ? 's' : ''} × {formatCurrency(mentorRate)}/llamada
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-[#FFD700]">
                                      {formatCurrency(totalForMentor)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                          <span className="text-slate-400 text-sm">Semanas por alumno</span>
                          <span className="text-white font-medium">{budget.weeksPerStudent}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                          <span className="text-slate-400 text-sm">Llamadas por semana</span>
                          <span className="text-white font-medium">{budget.callsPerWeek}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                          <span className="text-slate-400 text-sm">Total llamadas/alumno</span>
                          <span className="text-[#00F0FF] font-bold">{budget.totalCallsPerStudent}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                          <span className="text-slate-400 text-sm">Costo por alumno</span>
                          <span className="text-white font-bold">{formatCurrency(budget.costPerStudent)}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t-2 border-[#00F0FF]/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-300">Costo Total</span>
                          <span className="text-2xl font-bold text-white">{formatCurrency(budget.grandTotal)}</span>
                        </div>
                        {walletInfo && useWalletBalance && walletInfo.balance > 0 && (
                          <>
                            <div className="flex justify-between items-center text-sm text-[#00FF94] mb-2">
                              <span>- Saldo a Favor</span>
                              <span>-{formatCurrency(Math.min(walletInfo.balance, budget.grandTotal))}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                              <span className="text-lg text-slate-300">A Pagar Ahora</span>
                              <span className="text-3xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7B2CBF] bg-clip-text text-transparent">
                                {formatCurrency(netPayment)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 bg-[#7B2CBF]/10 border border-[#7B2CBF]/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-[#9D4EDD] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-slate-300 font-medium mb-1">Bóveda de Protección (Escrow)</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              El dinero se deposita en una cuenta segura. Los mentores cobran solo por llamadas completadas. 
                              Al final del ciclo, recuperas automáticamente los creditos no utilizados para usarlos en el siguiente ciclo.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleProcessPayment}
                        disabled={processingPayment}
                        className="w-full mt-6 bg-gradient-to-r from-[#7B2CBF] to-[#9D4EDD] hover:from-[#9D4EDD] hover:to-[#7B2CBF] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-[#7B2CBF]/30 hover:shadow-[#9D4EDD]/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {processingPayment ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              <span>Procesar Pago ({formatCurrency(netPayment)})</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-xl p-4">
                  <Info className="w-5 h-5 text-[#00F0FF] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <strong className="text-[#00F0FF]">Sistema de Pago Justo:</strong> Los mentores reciben su pago semanalmente, 
                    solo por las llamadas que realmente realizaron. Si un alumno abandona, recuperas el dinero no usado automáticamente 
                    en tu Billetera Organizacional para el siguiente ciclo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-[#151B26] border border-[#FF2A6D]/30 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2A6D]/10 to-transparent rounded-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#FF2A6D]/20 rounded-xl p-3">
                  <AlertTriangle className="w-6 h-6 text-[#FF2A6D]" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar Eliminación</h3>
              </div>

              <p className="text-slate-300 mb-6">
                ¿Estás seguro de que deseas remover este mentor de la visión? Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setMentorToRemove(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
                  disabled={removing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRemoverMentor}
                  disabled={removing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF2A6D] to-[#FF1744] hover:shadow-lg hover:shadow-[#FF2A6D]/50 text-white rounded-xl transition-all disabled:opacity-50"
                >
                  {removing ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MODAL: Catálogo de Mentores Certificados */}
      {showMentorCatalog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0E11] border border-[#00F0FF]/20 rounded-2xl w-full max-w-7xl h-[95vh] overflow-hidden shadow-2xl shadow-[#00F0FF]/20 flex flex-col">
            {/* Header compacto */}
            <div className="bg-gradient-to-r from-[#7B2CBF] to-[#9D4EDD] px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Catálogo de Mentores Certificados
                  </h2>
                  <div className="flex items-center gap-6 mt-2 text-sm text-white/90">
                    <span>Visión: <strong>{vision?.nombre || 'Cargando...'}</strong></span>
                    <span>•</span>
                    <span>{(vision?._count?.VisionParticipante || 0) + (vision?._count?.VisionGameChanger || 0)} participantes</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowMentorCatalog(false)}
                  className="text-white/80 hover:text-white transition-colors text-3xl leading-none ml-4"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body con grid de mentores */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentoresDisponibles.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No hay mentores disponibles</p>
                  </div>
                ) : (
                  mentoresDisponibles.map((mentor) => {
                    const tarifaDisciplina = mentor.PerfilMentor?.precioDisciplina || 90;
                    const currentStudents = selectedMentorStudents[mentor.id] || 0;
                    
                    // Información de disponibilidad del mentor
                    const availabilityInfo = (mentor as any).availabilityInfo || {
                      maxClients: 10,
                      currentClients: 0,
                      availableSlots: 10,
                      percentage: 0,
                    };
                    
                    // El máximo de alumnos es el menor entre MAX_STUDENTS_PER_MENTOR y los espacios disponibles
                    const maxForThisMentor = Math.min(MAX_STUDENTS_PER_MENTOR, availabilityInfo.availableSlots);
                    
                    // Datos reales de confiabilidad del mentor
                    const strikes = mentor.accumulatedMissedCalls || 0;
                    const maxStrikes = 5;
                    const confiabilidad = ((maxStrikes - strikes) / maxStrikes) * 100;
                    
                    // Rating promedio del mentor (calificaciones de estudiantes)
                    const ratingPromedio = mentor.PerfilMentor?.calificacionPromedio || 0;
                    const totalResenas = mentor.PerfilMentor?.totalResenas || 0;
                    
                    return (
                      <div
                        key={mentor.id}
                        className={`bg-slate-800 rounded-xl border overflow-hidden transition-all hover:shadow-xl ${
                          currentStudents > 0
                            ? 'border-[#7B2CBF] ring-2 ring-[#7B2CBF]/30 shadow-lg shadow-[#7B2CBF]/20'
                            : 'border-slate-700 hover:border-[#7B2CBF]/50'
                        }`}
                      >
                        {/* Header con foto de fondo */}
                        <div className="relative h-40 bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD]">
                          {/* Badge de alumnos asignados */}
                          {currentStudents > 0 && (
                            <div className="absolute top-3 left-3 z-10">
                              <span className="bg-gradient-to-r from-[#00FF94] to-[#00D4FF] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                <Users className="w-3 h-3" />
                                {currentStudents} asignado{currentStudents !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          
                          {/* Foto de perfil superpuesta */}
                          <div className="absolute -bottom-12 left-6">
                            {(mentor.imagen || mentor.profileImage) ? (
                              <img
                                src={mentor.profileImage || mentor.imagen}
                                alt={mentor.nombre}
                                className="w-24 h-24 rounded-full border-4 border-slate-800 object-cover shadow-xl"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] flex items-center justify-center shadow-xl">
                                <span className="text-white font-bold text-3xl">
                                  {mentor.nombre.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Badge de rating */}
                          <div className="absolute top-3 right-3">
                            <span className="bg-gradient-to-r from-[#FFD700] to-[#FFC300] text-[#0B0E11] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                              <Sparkles className="w-3 h-3" />
                              {ratingPromedio > 0 ? ratingPromedio.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="pt-16 px-6 pb-6">
                          <h3 className="text-xl font-bold text-white mb-1">{mentor.nombre}</h3>
                          <p className="text-slate-400 text-sm mb-3">{mentor.email}</p>
                          
                          {/* Estrellas de calificación */}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Sparkles
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(ratingPromedio) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-400">
                              {ratingPromedio > 0 ? `${ratingPromedio.toFixed(1)} (${totalResenas} reseñas)` : 'Sin calificaciones'}
                            </span>
                          </div>

                          {/* Stats en grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg">
                            {/* Confiabilidad */}
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-2">
                                <Shield className={`w-3 h-3 ${
                                  confiabilidad >= 80 ? 'text-[#00FF94]' : 
                                  confiabilidad >= 60 ? 'text-yellow-400' : 'text-orange-400'
                                }`} />
                                Confiabilidad
                              </div>
                              <div className="mb-1">
                                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      confiabilidad >= 80 ? 'bg-[#00FF94]' : 
                                      confiabilidad >= 60 ? 'bg-yellow-400' : 'bg-orange-400'
                                    }`}
                                    style={{ width: `${confiabilidad}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-white font-bold text-sm">{confiabilidad}%</div>
                              <div className="text-xs text-slate-500">{strikes}/5 strikes</div>
                            </div>
                            
                            {/* Sesiones */}
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-2">
                                <Phone className="w-3 h-3" />
                                Sesiones
                              </div>
                              <div className="text-white font-bold text-lg">
                                {currentStudents > 0 ? currentStudents * (budget.totalCallsPerStudent || 32) : 0}
                              </div>
                              <div className="text-xs text-slate-500">llamadas</div>
                            </div>
                          </div>

                          {/* Precio por llamada destacado */}
                          <div className="mb-4 p-3 bg-gradient-to-r from-[#FFD700]/20 to-[#FFC300]/20 border border-[#FFD700]/50 rounded-lg">
                            <p className="text-slate-400 text-xs mb-1">Precio por llamada</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-[#FFD700]">
                                {formatCurrency(tarifaDisciplina)}
                              </span>
                              <span className="text-slate-400 text-sm">/ sesión</span>
                            </div>
                          </div>

                          {/* 🆕 Indicador de espacios disponibles */}
                          <div className="mb-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-slate-400 text-xs">Espacios disponibles</p>
                              <span className={`text-xs font-bold ${
                                availabilityInfo.availableSlots === 0 ? 'text-red-400' :
                                availabilityInfo.availableSlots <= 2 ? 'text-yellow-400' :
                                'text-[#00FF94]'
                              }`}>
                                {availabilityInfo.availableSlots} de {availabilityInfo.maxClients}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  availabilityInfo.percentage >= 90 ? 'bg-red-500' :
                                  availabilityInfo.percentage >= 70 ? 'bg-yellow-500' :
                                  'bg-[#00FF94]'
                                }`}
                                style={{ width: `${availabilityInfo.percentage}%` }}
                              />
                            </div>
                            {availabilityInfo.availableSlots === 0 && (
                              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Sin espacios disponibles
                              </p>
                            )}
                          </div>

                          {/* Control de alumnos */}
                          <div className="mb-4">
                            <label className="text-xs text-slate-400 mb-2 block">Asignar alumnos:</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newValue = Math.max(0, currentStudents - 1);
                                  const newStudents = { ...selectedMentorStudents, [mentor.id]: newValue };
                                  if (newValue === 0) {
                                    delete newStudents[mentor.id];
                                  }
                                  setSelectedMentorStudents(newStudents);
                                }}
                                disabled={currentStudents === 0}
                                className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold text-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              >
                                −
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                max={maxForThisMentor}
                                value={currentStudents}
                                onChange={(e) => {
                                  const value = Math.max(0, Math.min(maxForThisMentor, parseInt(e.target.value) || 0));
                                  const newStudents = { ...selectedMentorStudents };
                                  if (value === 0) {
                                    delete newStudents[mentor.id];
                                  } else {
                                    newStudents[mentor.id] = value;
                                  }
                                  setSelectedMentorStudents(newStudents);
                                }}
                                className="flex-1 bg-slate-900 border border-[#00F0FF]/30 rounded-lg px-3 py-2 text-center text-white text-lg font-bold focus:border-[#00F0FF] focus:outline-none transition-all"
                                placeholder="0"
                              />
                              
                              <button
                                onClick={() => {
                                  const newValue = Math.min(maxForThisMentor, currentStudents + 1);
                                  setSelectedMentorStudents({ ...selectedMentorStudents, [mentor.id]: newValue });
                                }}
                                disabled={currentStudents >= maxForThisMentor}
                                className="w-10 h-10 bg-[#00FF94]/20 hover:bg-[#00FF94]/30 text-[#00FF94] rounded-lg font-bold text-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-1">Máx. {maxForThisMentor} alumnos</p>
                          </div>

                          {/* Subtotal si hay alumnos */}
                          {currentStudents > 0 && (
                            <div className="mb-4 pt-3 border-t border-slate-700">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Subtotal:</span>
                                <span className="text-[#00FF94] font-bold flex items-center gap-1">
                                  <Zap className="w-4 h-4" />
                                  {formatCurrency(currentStudents * tarifaDisciplina * (budget.totalCallsPerStudent || 32))}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 text-right">
                                {currentStudents} × {budget.totalCallsPerStudent || 32} llamadas
                              </p>
                            </div>
                          )}

                          {/* Botón ver perfil */}
                          <button
                            onClick={() => window.open(`/dashboard/school-admin/mentores/${mentor.id}?type=user`, '_blank')}
                            className="w-full bg-gradient-to-r from-[#7B2CBF] to-[#9D4EDD] hover:from-[#9D4EDD] hover:to-[#7B2CBF] text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#7B2CBF]/50"
                          >
                            <Info className="w-4 h-4" />
                            Ver Perfil Completo
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer compacto con resumen */}
            <div className="bg-[#0B0E11] border-t border-[#00F0FF]/20 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-8 text-sm">
                  <div>
                    <span className="text-slate-400">Mentores: </span>
                    <span className="text-white font-bold">
                      {Object.keys(selectedMentorStudents).filter(id => selectedMentorStudents[parseInt(id)] > 0).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Alumnos: </span>
                    <span className="text-white font-bold">
                      {Object.values(selectedMentorStudents).reduce((sum, count) => sum + count, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total: </span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7B2CBF] bg-clip-text text-transparent">
                      {formatCurrency(budget.grandTotal)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowMentorCatalog(false)}
                  className="bg-gradient-to-r from-[#00FF94] to-[#00D4FF] hover:from-[#00D4FF] hover:to-[#00FF94] text-[#0B0E11] font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Confirmar Selección
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
