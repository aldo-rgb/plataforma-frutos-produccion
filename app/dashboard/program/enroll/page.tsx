'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Loader2, PhoneOff, Zap, CreditCard, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MentorAsignado {
  id: number;
  nombre: string;
  profileImage?: string;
  imagen?: string;
  email: string;
  PerfilMentor?: {
    especialidad?: string;
    nivel?: string;
  };
}

interface EnrollmentInfo {
  hasEnrollment: boolean;
  enrollment?: {
    id: number;
    cycleType: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  vision?: {
    id: number;
    nombre: string;
    startDate: string;
    endDate: string;
  } | null;
  stats?: {
    totalWeeks: number;
    remainingWeeks: number;
    totalSessions: number;
    completedSessions: number;
    remainingSessions: number;
    missedCalls: number;
    maxMissedAllowed: number;
  };
}

interface MentorDisponible {
  id: number;
  nombre: string;
  profileImage?: string;
  email: string;
  PerfilMentor: {
    especialidad?: string;
    nivel?: string;
    biografia?: string;
  };
  tieneDisciplina: boolean;
}

interface Slot {
  dayOfWeek: number;
  time: string;
}

interface DisponibilidadMentor {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface SlotsDisponibles {
  [key: number]: string[];
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProgramEnrollPage() {
  const [mentorAsignado, setMentorAsignado] = useState<MentorAsignado | null>(null);
  const [mentoresDisponibles, setMentoresDisponibles] = useState<MentorDisponible[]>([]);
  const [mostrarSeleccionMentor, setMostrarSeleccionMentor] = useState(false);
  const [mentorSeleccionado, setMentorSeleccionado] = useState<number | null>(null);
  const [mostrarPagoLicencia, setMostrarPagoLicencia] = useState(false);
  const [disponibilidadMentor, setDisponibilidadMentor] = useState<DisponibilidadMentor[]>([]);
  const [slotsDisponibles, setSlotsDisponibles] = useState<SlotsDisponibles>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('FREE');

  // Slots seleccionados
  const [slot1, setSlot1] = useState<Slot>({ dayOfWeek: -1, time: '' });
  const [slot2, setSlot2] = useState<Slot>({ dayOfWeek: -1, time: '' });

  useEffect(() => {
    // Verificar si viene de un pago exitoso
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'select-mentor') {
      // El usuario acaba de pagar, mostrar selección de mentores
      cargarMentoresDisponibles();
      setMostrarSeleccionMentor(true);
      setMostrarPagoLicencia(false);
    } else {
      // Flujo normal
      cargarEnrollmentInfo();
    }
  }, []);

  const cargarEnrollmentInfo = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Cargando información de enrollment...');
      
      // Primero, verificar si ya tiene un enrollment activo
      const enrollResponse = await fetch('/api/program/enroll');
      if (enrollResponse.ok) {
        const enrollData = await enrollResponse.json();
        console.log('📊 Enrollment data recibido:', enrollData);
        setEnrollmentInfo(enrollData);
        setUserTier(enrollData.userTier || 'FREE');
        setUserTier(enrollData.userTier || 'FREE');
        
        // Caso 1: Tiene enrollment completo con sesiones agendadas
        if (enrollData.hasEnrollment) {
          console.log('✅ Usuario tiene enrollment activo con sesiones agendadas');
          
          // Si tiene enrollment y mentor, cargar la info del mentor
          if (enrollData.mentor) {
            console.log('👨‍🏫 Mentor encontrado en enrollment:', enrollData.mentor);
            setMentorAsignado(enrollData.mentor);
          } else {
            console.log('⚠️ Enrollment activo pero sin mentor asignado');
          }
          
          // Ya tiene programa activo, no necesita inscribirse
          setIsLoading(false);
          return;
        }
        
        // Caso 2: Enrollment ACTIVE pero sin sesiones (mentor fue cambiado)
        if (enrollData.needsReschedule && enrollData.mentor) {
          console.log('🔄 Enrollment necesita reagendar - mentor fue actualizado');
          console.log('👨‍🏫 Nuevo mentor asignado:', enrollData.mentor);
          
          // Asignar el nuevo mentor
          setMentorAsignado(enrollData.mentor);
          
          // Cargar slots disponibles del nuevo mentor
          const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${enrollData.mentor.id}`);
          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json();
            setSlotsDisponibles(slotsData.slotsDisponibles || {});
            
            // Preseleccionar horarios si hay disponibles
            const diasDisponibles = Object.keys(slotsData.slotsDisponibles).map(Number).sort();
            if (diasDisponibles.length >= 2) {
              const dia1 = diasDisponibles[0];
              const dia2 = diasDisponibles[1];
              const horarios1 = slotsData.slotsDisponibles[dia1];
              const horarios2 = slotsData.slotsDisponibles[dia2];
              
              if (horarios1?.length > 0 && horarios2?.length > 0) {
                setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
                setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
              }
            }
          }
          
          setIsLoading(false);
          return;
        }
      }
      
      console.log('📝 No tiene enrollment, continuando con flujo de inscripción...');
      // No tiene enrollment, continuar con el flujo normal
      await cargarMentorAsignado();
    } catch (error) {
      console.error('❌ Error en cargarEnrollmentInfo:', error);
      await cargarMentorAsignado();
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMentorAsignado = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Iniciando cargarMentorAsignado...');
      
      // Primero intentar obtener el mentor desde el enrollment
      const enrollmentResponse = await fetch('/api/program/enroll');
      
      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json();
        console.log('📊 Datos de enrollment:', {
          hasEnrollment: enrollmentData.hasEnrollment,
          hasLoboSolitario: enrollmentData.hasLoboSolitario,
          hasMentor: !!enrollmentData.mentor,
          mentorData: enrollmentData.mentor
        });
        
        // CASO 1: Tiene enrollment con mentor asignado
        if (enrollmentData.hasEnrollment && enrollmentData.mentor) {
          console.log('✅ Mentor encontrado en enrollment:', enrollmentData.mentor);
          setMentorAsignado(enrollmentData.mentor);
          
          // Cargar slots disponibles del mentor
          const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${enrollmentData.mentor.id}`);
          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json();
            setSlotsDisponibles(slotsData.slotsDisponibles || {});
            
            // Preseleccionar horarios si hay disponibles
            const diasDisponibles = Object.keys(slotsData.slotsDisponibles).map(Number).sort();
            if (diasDisponibles.length >= 2) {
              const dia1 = diasDisponibles[0];
              const dia2 = diasDisponibles[1];
              const horarios1 = slotsData.slotsDisponibles[dia1];
              const horarios2 = slotsData.slotsDisponibles[dia2];
              
              if (horarios1?.length > 0 && horarios2?.length > 0) {
                setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
                setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
              }
            }
          }
          
          setIsLoading(false);
          return;
        }
        
        // CASO 2: Tiene Lobo Solitario con mentor asignado
        if (enrollmentData.hasLoboSolitario && enrollmentData.mentor) {
          console.log('✅ Mentor encontrado en Lobo Solitario:', enrollmentData.mentor);
          setMentorAsignado(enrollmentData.mentor);
          
          // Si necesita agendar horarios, cargar los slots disponibles
          if (enrollmentData.needsScheduling) {
            console.log('📅 Usuario de Lobo Solitario necesita agendar horarios');
            const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${enrollmentData.mentor.id}`);
            if (slotsResponse.ok) {
              const slotsData = await slotsResponse.json();
              setSlotsDisponibles(slotsData.slotsDisponibles || {});
              
              // Preseleccionar horarios si hay disponibles
              const diasDisponibles = Object.keys(slotsData.slotsDisponibles).map(Number).sort();
              if (diasDisponibles.length >= 2) {
                const dia1 = diasDisponibles[0];
                const dia2 = diasDisponibles[1];
                const horarios1 = slotsData.slotsDisponibles[dia1];
                const horarios2 = slotsData.slotsDisponibles[dia2];
                
                if (horarios1?.length > 0 && horarios2?.length > 0) {
                  setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
                  setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
                }
              }
            }
          }
          setEnrollmentInfo(enrollmentData);
          setIsLoading(false);
          return;
        }
      }
      
      // Si no tiene enrollment o mentor en enrollment, verificar assignedMentorId
      console.log('⚠️ No se encontró mentor en enrollment, verificando assignedMentorId...');
      const profileResponse = await fetch('/api/user/profile');
      if (!profileResponse.ok) throw new Error('Error al cargar perfil');
      
      const profileData = await profileResponse.json();
      setUserRole(profileData.user?.rol || null);
      
      console.log('👤 Datos de perfil:', {
        hasUser: !!profileData.user,
        assignedMentorId: profileData.user?.assignedMentorId,
        rol: profileData.user?.rol
      });
      
      // Verificar que tenga mentor asignado
      // GAMECHANGER con mentor asignado no necesita pagar
      if (!profileData.user?.assignedMentorId && profileData.user?.rol !== 'GAMECHANGER') {
        console.log('❌ NO tiene assignedMentorId y no es GAMECHANGER, mostrando pago de licencia');
        // No tiene mentor asignado y no es GAMECHANGER, cargar lista de mentores disponibles
        await cargarMentoresDisponibles();
        setMostrarPagoLicencia(true);
        setIsLoading(false);
        return;
      }
      
      // Si es GAMECHANGER sin mentor, también debe poder ver mentores disponibles pero sin pago
      if (!profileData.user?.assignedMentorId && profileData.user?.rol === 'GAMECHANGER') {
        console.log('⚡ GAMECHANGER sin mentor asignado, mostrando selección de mentores sin pago');
        await cargarMentoresDisponibles();
        setMostrarSeleccionMentor(true);
        setMostrarPagoLicencia(false);
        setIsLoading(false);
        return;
      }

      console.log('🔍 Buscando mentor con ID:', profileData.user.assignedMentorId);
      // Obtener datos del mentor
      const mentorResponse = await fetch(`/api/usuarios`);
      if (!mentorResponse.ok) throw new Error('Error al cargar mentor');
      
      const mentorData = await mentorResponse.json();
      const mentor = mentorData.usuarios.find((u: any) => u.id === profileData.user.assignedMentorId);
      
      if (!mentor) {
        setError('No se pudo cargar la información de tu mentor.');
        setIsLoading(false);
        return;
      }

      setMentorAsignado(mentor);

      // Cargar slots disponibles (excluye los ya reservados)
      const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${profileData.user.assignedMentorId}`);
      if (!slotsResponse.ok) throw new Error('Error al cargar slots disponibles');
      
      const slotsData = await slotsResponse.json();
      setDisponibilidadMentor(slotsData.disponibilidad || []);
      setSlotsDisponibles(slotsData.slotsDisponibles || {});

      // Auto-seleccionar primeros slots disponibles si existen
      const diasDisponibles = Object.keys(slotsData.slotsDisponibles || {}).map(Number).sort();
      if (diasDisponibles.length >= 2) {
        const dia1 = diasDisponibles[0];
        const dia2 = diasDisponibles[1];
        const horarios1 = slotsData.slotsDisponibles[dia1];
        const horarios2 = slotsData.slotsDisponibles[dia2];
        
        if (horarios1?.length > 0 && horarios2?.length > 0) {
          setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
          setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar información del mentor');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMentoresDisponibles = async () => {
    try {
      const response = await fetch('/api/mentor/disponibles-disciplina');
      if (!response.ok) throw new Error('Error al cargar mentores');
      
      const data = await response.json();
      setMentoresDisponibles(data.mentores || []);
    } catch (error) {
      console.error('Error cargando mentores:', error);
      setError('Error al cargar mentores disponibles');
    }
  };

  const seleccionarMentor = async (mentorId: number) => {
    setMentorSeleccionado(mentorId);
    
    try {
      // 1. Asignar el mentor al usuario
      const assignResponse = await fetch('/api/user/assign-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId })
      });

      if (!assignResponse.ok) {
        throw new Error('Error al asignar mentor');
      }

      // 2. Cargar slots disponibles del mentor seleccionado
      const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${mentorId}`);
      if (!slotsResponse.ok) throw new Error('Error al cargar slots disponibles');
      
      const slotsData = await slotsResponse.json();
      setDisponibilidadMentor(slotsData.disponibilidad || []);
      setSlotsDisponibles(slotsData.slotsDisponibles || {});
      
      // 3. Auto-seleccionar primeros slots disponibles
      const diasDisponibles = Object.keys(slotsData.slotsDisponibles || {}).map(Number).sort();
      if (diasDisponibles.length >= 2) {
        const dia1 = diasDisponibles[0];
        const dia2 = diasDisponibles[1];
        const horarios1 = slotsData.slotsDisponibles[dia1];
        const horarios2 = slotsData.slotsDisponibles[dia2];
        
        if (horarios1?.length > 0 && horarios2?.length > 0) {
          setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
          setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
        }
      }
      
      // 4. Cargar información del mentor asignado
      const mentorData = mentoresDisponibles.find(m => m.id === mentorId);
      if (mentorData) {
        setMentorAsignado(mentorData);
      }
      
      // 5. Ocultar UI de selección
      setMostrarSeleccionMentor(false);
      setMostrarPagoLicencia(false);
      
    } catch (error) {
      console.error('Error:', error);
      setError('Error al seleccionar mentor. Por favor intenta de nuevo.');
    }
  };

  // Obtener días disponibles
  const getDiasDisponibles = (): number[] => {
    return Object.keys(slotsDisponibles).map(Number).sort();
  };

  // Obtener horarios disponibles para un día específico
  const getHorariosDisponibles = (dayOfWeek: number): string[] => {
    return slotsDisponibles[dayOfWeek] || [];
  };

  const handleEnroll = async () => {
    if (!mentorAsignado) {
      setError('No tienes un mentor asignado');
      return;
    }

    // Validar que los días sean diferentes
    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      setError('⚠️ Debes seleccionar días diferentes para cada sesión semanal');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const response = await fetch('/api/program/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorAsignado.id,
          slot1,
          slot2,
          totalWeeks: enrollmentInfo?.stats?.totalWeeks || 8
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al inscribirse al programa');
        return;
      }

      setSuccess(true);

      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);

    } catch (error) {
      console.error('Error al inscribirse:', error);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    const totalWeeks = enrollmentInfo?.stats?.totalWeeks || 17;
    const totalSessions = enrollmentInfo?.stats?.totalSessions || 34;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-green-500/30 rounded-2xl p-8 max-w-md text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
            <CheckCircle2 className="text-green-400" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">¡Inscripción Exitosa!</h2>
          <p className="text-slate-300 mb-2">
            Te has inscrito al {enrollmentInfo?.vision ? enrollmentInfo.vision.nombre : `Programa Intensivo de ${totalWeeks} Semanas`}.
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Se han generado {totalSessions} sesiones programadas (2 por semana).
          </p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
              <PhoneOff className="text-green-400" size={20} />
              <span>{enrollmentInfo?.stats?.maxMissedAllowed || 3} Oportunidades</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Sistema de seguimiento activado
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            Serás redirigido al dashboard en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  // Calcular semanas y sesiones según la visión
  // Por defecto: 9 semanas / 18 sesiones para todos
  // Solo cambia si hay una visión con fechas específicas
  const totalWeeksDisplay = enrollmentInfo?.stats?.totalWeeks || 9;
  const totalSessionsDisplay = totalWeeksDisplay * 2;
  const programName = enrollmentInfo?.vision 
    ? enrollmentInfo.vision.nombre 
    : 'Programa de Seguimiento (Lobo Solitario)';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
            <Calendar className="text-purple-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {programName}
          </h1>
          <p className="text-purple-300 text-lg font-semibold mb-2">
            {totalWeeksDisplay} Semanas · {totalSessionsDisplay} Sesiones
          </p>
          <p className="text-slate-400">
            {enrollmentInfo?.vision 
              ? 'Inscríbete al programa de disciplina con llamadas semanales programadas'
              : 'Ciclo de 63 días (9 semanas) con llamadas semanales - Modalidad Lobo Solitario'}
          </p>
          {enrollmentInfo?.vision && enrollmentInfo.vision.endDate && (
            <p className="text-purple-400 text-sm mt-2">
              📅 Finaliza: {new Date(enrollmentInfo.vision.endDate).toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>

        {/* Opciones de Pago - Solo si no tiene mentor asignado */}
        {mostrarPagoLicencia && !mentorAsignado && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            {userRole === 'GAMECHANGER' && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-400" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Acceso Especial GameChanger</h3>
                    <p className="text-slate-300 text-sm">
                      Como GameChanger, tienes acceso directo sin costo adicional. Selecciona tu mentor para continuar.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="text-purple-400" size={28} />
              Selecciona tu Licencia
            </h2>
            <p className="text-slate-400 mb-6">
              Para inscribirte al programa intensivo, necesitas una licencia activa
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Licencia STANDARD */}
              <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">STANDARD</h3>
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold">
                    Básica
                  </div>
                </div>
                <div className="text-3xl font-black text-white mb-4">
                  $800 <span className="text-lg text-slate-400 font-normal">MXN</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Pago anual · <span className="text-green-400">Ahorras $388</span> vs mensual
                </p>
                <p className="text-xs text-slate-600 mb-4">
                  (Mensual: $99/mes = $1,188/año)
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Acceso completo al sistema
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Mentor asignado para disciplina
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    18 sesiones programadas (9 semanas)
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Seguimiento de progreso
                  </li>
                </ul>
                <Link
                  href="/dashboard/suscripcion?plan=STANDARD&returnUrl=/dashboard/program/enroll&action=select-mentor"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight size={18} />
                </Link>
              </div>

              {/* Licencia PREMIUM */}
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500/50 rounded-xl p-6 hover:border-purple-400 transition-all relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  SOLO ANUAL
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">PREMIUM</h3>
                  <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-semibold">
                    Avanzada
                  </div>
                </div>
                <div className="text-3xl font-black text-white mb-4">
                  $2,500 <span className="text-lg text-slate-400 font-normal">MXN</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Pago anual único</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Todo lo de STANDARD
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    <strong>2 Mentorías 1-a-1 al año</strong>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Llamadas de disciplina programadas
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Soporte prioritario
                  </li>
                  <li className="flex items-start gap-2 text-slate-300 text-sm">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    Acceso a eventos exclusivos
                  </li>
                </ul>
                <Link
                  href="/dashboard/suscripcion?plan=PREMIUM&returnUrl=/dashboard/program/enroll&action=select-mentor"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Selección de Mentor - Después de pagar o para GAMECHANGER */}
        {mostrarSeleccionMentor && mentoresDisponibles.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            {userRole === 'GAMECHANGER' && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-400" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Selección Exclusiva GameChanger</h3>
                    <p className="text-slate-300 text-sm">
                      Tu licencia STANDARD está incluida. Selecciona tu mentor para comenzar el programa intensivo.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Users className="text-purple-400" size={28} />
              Selecciona tu Mentor
            </h2>
            <p className="text-slate-400 mb-6">
              Elige el mentor que te acompañará durante el programa intensivo
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {mentoresDisponibles.map((mentor) => (
                <div
                  key={mentor.id}
                  onClick={() => setMentorSeleccionado(mentor.id)}
                  className={`
                    bg-slate-800/50 border-2 rounded-xl p-5 cursor-pointer transition-all hover:scale-105
                    ${mentorSeleccionado === mentor.id 
                      ? 'border-purple-500 bg-purple-900/20 shadow-lg shadow-purple-500/30' 
                      : 'border-slate-700 hover:border-purple-500/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={mentor.profileImage || '/default-avatar.svg'}
                      alt={mentor.nombre}
                      className={`
                        w-20 h-20 rounded-full object-cover mb-3 border-2
                        ${mentorSeleccionado === mentor.id ? 'border-purple-500' : 'border-slate-600'}
                      `}
                    />
                    <h3 className="text-white font-bold text-lg mb-1">{mentor.nombre}</h3>
                    <p className="text-slate-400 text-xs mb-2">{mentor.email}</p>
                    
                    {mentor.PerfilMentor && (
                      <div className="space-y-1 w-full">
                        {mentor.PerfilMentor.especialidad && (
                          <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-semibold">
                            {mentor.PerfilMentor.especialidad}
                          </div>
                        )}
                        {mentor.PerfilMentor.nivel && (
                          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                            Nivel {mentor.PerfilMentor.nivel}
                          </div>
                        )}
                      </div>
                    )}

                    {mentor.tieneDisciplina && (
                      <div className="mt-3 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Horarios de disciplina</span>
                      </div>
                    )}

                    {mentorSeleccionado === mentor.id && (
                      <div className="mt-3 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        Seleccionado
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {mentorSeleccionado && (
              <button
                onClick={() => seleccionarMentor(mentorSeleccionado)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 text-lg"
              >
                Confirmar Mentor y Continuar
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        )}

        {/* Características del Programa */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="text-purple-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">
              {enrollmentInfo?.stats ? 
                `${enrollmentInfo.stats.remainingSessions || enrollmentInfo.stats.totalSessions} Sesiones ${enrollmentInfo.stats.remainingSessions ? 'Restantes' : ''}` 
                : `${totalSessionsDisplay} Sesiones`}
            </h3>
            <p className="text-slate-500 text-sm">
              {enrollmentInfo?.stats ? 
                `${enrollmentInfo.stats.remainingWeeks || enrollmentInfo.stats.totalWeeks} de ${enrollmentInfo.stats.totalWeeks} semanas · 2 llamadas/semana` 
                : `${totalWeeksDisplay} semanas · 2 llamadas/semana`}
            </p>
            {enrollmentInfo?.vision && (
              <p className="text-purple-400 text-xs mt-2 font-semibold">
                📍 Visión: {enrollmentInfo.vision.nombre}
              </p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <PhoneOff className="text-orange-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">
              {enrollmentInfo?.stats ? 
                `${(enrollmentInfo.stats.maxMissedAllowed || 3) - (enrollmentInfo.stats.missedCalls || 0)} Oportunidades` 
                : '3 Oportunidades'}
            </h3>
            <p className="text-slate-500 text-sm">
              {enrollmentInfo?.stats ? 
                `${enrollmentInfo.stats.missedCalls || 0} llamadas perdidas` 
                : 'Llamadas que puedes elegir no tomar'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="text-blue-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">Horario Fijo</h3>
            <p className="text-slate-500 text-sm">Mismos días y horas cada semana</p>
          </div>
        </div>

        {/* Mentor Asignado */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={24} />
            Tu Mentor Asignado
          </h2>
          
          {mentorAsignado ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
              <img
                src={mentorAsignado.profileImage || mentorAsignado.imagen || '/default-avatar.svg'}
                alt={mentorAsignado.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
              />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{mentorAsignado.nombre}</h3>
                <p className="text-slate-400 text-sm">{mentorAsignado.email}</p>
              </div>
              <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 size={16} />
                Asignado
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-slate-900/50 border-2 border-purple-500/40 rounded-xl p-6">
              <div className="text-center mb-4">
                <AlertTriangle className="text-yellow-400 mx-auto mb-3" size={40} />
                <p className="text-yellow-300 font-bold text-lg mb-2">No tienes un mentor asignado</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <p className="text-white text-sm mb-3">
                  🎯 <strong>¡Desbloquea tu potencial con un mentor personal!</strong>
                </p>
                <p className="text-slate-300 text-sm mb-3">
                  Con los planes <span className="text-blue-400 font-semibold">STANDARD</span> o <span className="text-purple-400 font-semibold">PREMIUM</span> obtendrás:
                </p>
                <ul className="text-slate-300 text-sm space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Mentor dedicado</strong> que guiará tu crecimiento personal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Llamadas</strong> personalizadas cada semana</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Retroalimentación experta</strong> en tus cartas y evidencias</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Seguimiento continuo</strong> de tu progreso y metas</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="/dashboard/suscripcion" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <CreditCard size={18} />
                  <span>Ver Licencias</span>
                </a>
                
                <button
                  onClick={() => {
                    // Redirigir a selección de mentor con visionId si existe
                    const visionId = enrollmentInfo?.vision?.id || 1;
                    window.location.href = `/dashboard/participante/seleccionar-mentor/${visionId}`;
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <Users size={18} />
                  <span>Seleccionar Mentor</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selección de Horarios */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Selecciona tus Horarios Semanales</h2>
          <p className="text-slate-400 text-sm mb-6">
            Elige 2 días diferentes con horarios fijos para tus sesiones programadas
          </p>

          {/* Selector Visual de Horarios */}
          <div className="space-y-8">
            {/* Slot 1 */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                Primera Sesión Semanal
              </h3>

              {/* Días */}
              <div>
                <label className="block text-slate-400 text-sm mb-3">Selecciona el día</label>
                <div className="grid grid-cols-7 gap-2">
                  {getDiasDisponibles().map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => {
                        const horariosDisponibles = getHorariosDisponibles(dayIndex);
                        setSlot1({ 
                          dayOfWeek: dayIndex, 
                          time: horariosDisponibles[0] || '' 
                        });
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${slot1.dayOfWeek === dayIndex 
                          ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/50' 
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-purple-500/50 hover:text-white'
                        }
                      `}
                    >
                      <div className="text-xs font-medium">{DIAS_SEMANA_CORTO[dayIndex]}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{DIAS_SEMANA[dayIndex]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horarios */}
              {slot1.dayOfWeek !== -1 && (
                <div>
                  <label className="block text-slate-400 text-sm mb-3">Selecciona la hora</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {getHorariosDisponibles(slot1.dayOfWeek).map((hora) => (
                      <button
                        key={hora}
                        onClick={() => setSlot1({ ...slot1, time: hora })}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${slot1.time === hora 
                            ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/50' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-white'
                          }
                        `}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-sm font-semibold">{hora}</div>
                      </button>
                    ))}
                  </div>
                  {getHorariosDisponibles(slot1.dayOfWeek).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No hay horarios disponibles para este día
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Slot 2 */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                Segunda Sesión Semanal
              </h3>

              {/* Días */}
              <div>
                <label className="block text-slate-400 text-sm mb-3">Selecciona el día</label>
                <div className="grid grid-cols-7 gap-2">
                  {getDiasDisponibles().map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => {
                        const horariosDisponibles = getHorariosDisponibles(dayIndex);
                        setSlot2({ 
                          dayOfWeek: dayIndex, 
                          time: horariosDisponibles[0] || '' 
                        });
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${slot2.dayOfWeek === dayIndex 
                          ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/50' 
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-blue-500/50 hover:text-white'
                        }
                      `}
                    >
                      <div className="text-xs font-medium">{DIAS_SEMANA_CORTO[dayIndex]}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{DIAS_SEMANA[dayIndex]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horarios */}
              {slot2.dayOfWeek !== -1 && (
                <div>
                  <label className="block text-slate-400 text-sm mb-3">Selecciona la hora</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {getHorariosDisponibles(slot2.dayOfWeek).map((hora) => (
                      <button
                        key={hora}
                        onClick={() => setSlot2({ ...slot2, time: hora })}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${slot2.time === hora 
                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/50' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-white'
                          }
                        `}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-sm font-semibold">{hora}</div>
                      </button>
                    ))}
                  </div>
                  {getHorariosDisponibles(slot2.dayOfWeek).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No hay horarios disponibles para este día
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning si son el mismo día */}
          {slot1.dayOfWeek !== -1 && slot2.dayOfWeek !== -1 && slot1.dayOfWeek === slot2.dayOfWeek && (
            <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-300 font-semibold text-sm">Días duplicados</p>
                <p className="text-yellow-400/80 text-xs mt-1">
                  Debes seleccionar días diferentes para cada sesión semanal
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Resumen de tu Inscripción</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Mentor:</span>
              <span className="text-white font-semibold">
                {mentorAsignado?.nombre || 'No asignado'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Primera sesión semanal:</span>
              <span className="text-white font-semibold">
                {slot1.dayOfWeek !== -1 && slot1.time 
                  ? `${DIAS_SEMANA[slot1.dayOfWeek]} a las ${slot1.time}`
                  : 'No seleccionado'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Segunda sesión semanal:</span>
              <span className="text-white font-semibold">
                {slot2.dayOfWeek !== -1 && slot2.time 
                  ? `${DIAS_SEMANA[slot2.dayOfWeek]} a las ${slot2.time}`
                  : 'No seleccionado'
                }
              </span>
            </div>
            
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total de sesiones:</span>
                <span className="text-white font-bold">
                  {enrollmentInfo?.stats ? 
                    `${enrollmentInfo.stats.totalSessions} sesiones` 
                    : `${(enrollmentInfo?.stats?.totalWeeks || 8) * 2} sesiones`}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-400">Duración del programa:</span>
                <span className="text-white font-bold">
                  {enrollmentInfo?.stats ? 
                    `${enrollmentInfo.stats.totalWeeks} semanas` 
                    : `${enrollmentInfo?.stats?.totalWeeks || 8} semanas`}
                </span>
              </div>
              {enrollmentInfo?.vision && (
                <div className="flex justify-between mt-2">
                  <span className="text-slate-400">Visión:</span>
                  <span className="text-purple-400 font-bold">
                    {enrollmentInfo.vision.nombre}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Botón de Inscripción */}
        <button
          onClick={handleEnroll}
          disabled={
            isEnrolling || 
            !mentorAsignado || 
            slot1.dayOfWeek === -1 || 
            slot2.dayOfWeek === -1 || 
            !slot1.time || 
            !slot2.time || 
            slot1.dayOfWeek === slot2.dayOfWeek
          }
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnrolling ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Inscribiendo al Programa...
            </>
          ) : (
            <>
              <CheckCircle2 size={24} />
              Confirmar Inscripción
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          Al inscribirte, aceptas comprometerte a asistir a las {enrollmentInfo?.stats ? `${enrollmentInfo.stats.totalWeeks * 2}` : '34'} sesiones programadas
        </p>
      </div>
    </div>
  );
}
