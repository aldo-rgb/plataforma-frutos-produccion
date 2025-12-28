import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { redirect } from "next/navigation";
import { Zap, Trophy, Target, ArrowRight } from "lucide-react";
import ProgramStatusWidget from "@/components/dashboard/ProgramStatusWidget";
import AlertaReagendamiento from "@/components/dashboard/AlertaReagendamiento";
import NotificationBanner from "@/components/dashboard/NotificationBanner";
import CartaWizardWidget from "@/components/dashboard/CartaWizardWidget";
import ZonaEjecucionDiaria from "@/components/dashboard/ZonaEjecucionDiaria";
import GlobalProgressHero from "@/components/dashboard/GlobalProgressHero";
import IntensiveProgramCard from "@/components/dashboard/IntensiveProgramCard";
import IntensiveProgramInvite from "@/components/dashboard/IntensiveProgramInvite";
import OrganizationChangeModal from "@/components/OrganizationChangeModal";
import QuantumPointsWidget from "@/components/dashboard/QuantumPointsWidget";
import RankingWidget from "@/components/dashboard/RankingWidget";

export default async function DashboardPage() {
  // 1. Obtener sesión y datos frescos
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
  });

  if (!usuario) return null;

  // Obtener información de la carta para el widget
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: usuario.id },
  });

  const hasCompletedCarta = !!carta && (
    !!carta.finanzasDeclaracion || 
    !!carta.saludDeclaracion
  );

  // Verificar si la carta está autorizada (APROBADA en el sistema actual)
  const isAuthorized = carta?.estado === 'APROBADA';

  // Verificar si tiene suscripción activa al programa de disciplina
  // Esto verifica tanto DisciplineSubscription (viejo) como ProgramEnrollment (nuevo)
  const disciplineSubscription = await prisma.disciplineSubscription.findUnique({
    where: { studentId: usuario.id },
    select: { status: true }
  });

  // Buscar enrollments activos, priorizando los que tienen llamadas agendadas
  const allEnrollments = await prisma.programEnrollment.findMany({
    where: {
      userId: usuario.id,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      status: true,
      cycleStartDate: true,
      cycleEndDate: true,
      cycleType: true,
      mentorId: true,
      _count: {
        select: {
          CallBookings: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Priorizar enrollments que:
  // 1. Tienen llamadas agendadas (programa intensivo con mentor)
  // 2. No son ciclos SOLO (tienen un mentor diferente al usuario)
  const programEnrollment = allEnrollments.find(e => e._count.CallBookings > 0) || 
                           allEnrollments.find(e => e.mentorId !== usuario.id && e.cycleType !== 'SOLO') ||
                           allEnrollments[0]; // Fallback al más reciente

  // Usuario tiene programa activo si tiene disciplineSubscription ACTIVA O programEnrollment ACTIVO
  const hasDisciplineProgram = 
    disciplineSubscription?.status === 'ACTIVE' || 
    !!programEnrollment || 
    false;

  console.log('🔍 Verificación de programa:', {
    userId: usuario.id,
    hasDisciplineSubscription: !!disciplineSubscription,
    disciplineStatus: disciplineSubscription?.status,
    totalEnrollments: allEnrollments.length,
    selectedEnrollment: programEnrollment ? {
      id: programEnrollment.id,
      cycleType: programEnrollment.cycleType,
      hasCallBookings: programEnrollment._count.CallBookings > 0,
      isSoloCycle: programEnrollment.cycleType === 'SOLO'
    } : null,
    hasProgramEnrollment: !!programEnrollment,
    enrollmentStatus: programEnrollment?.status,
    hasDisciplineProgram
  });

  // Obtener información del enrollment para calcular semanas del programa
  const enrollment = programEnrollment;

  // Calcular duración del programa basado en el enrollment
  let totalWeeks = 17; // Default
  let totalCalls = 34; // Default (2 llamadas por semana x 17 semanas)
  
  console.log('📊 Enrollment data:', {
    hasEnrollment: !!enrollment,
    cycleType: enrollment?.cycleType,
    startDate: enrollment?.cycleStartDate,
    endDate: enrollment?.cycleEndDate
  });
  
  if (enrollment && enrollment.cycleStartDate && enrollment.cycleEndDate) {
    // Calcular la diferencia en días entre start y end
    const startDate = new Date(enrollment.cycleStartDate);
    const endDate = new Date(enrollment.cycleEndDate);
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular semanas reales (redondear hacia arriba)
    totalWeeks = Math.ceil(diffInDays / 7);
    
    // Total de llamadas = semanas * 2 (dos llamadas por semana)
    totalCalls = totalWeeks * 2;
    
    console.log('✅ Calculated from dates:', {
      diffInDays,
      totalWeeks,
      totalCalls
    });
  } else if (enrollment) {
    // Fallback a cycleType si no hay fechas
    if (enrollment.cycleType === 'INTENSIVE_6_MONTHS') {
      totalWeeks = 26;
      totalCalls = 52;
    } else if (enrollment.cycleType === 'INTENSIVE_17_WEEKS') {
      totalWeeks = 17;
      totalCalls = 34;
    } else if (enrollment.cycleType === 'STANDARD') {
      totalWeeks = 12;
      totalCalls = 24;
    } else if (enrollment.cycleType === 'SOLO') {
      // SOLO es el programa individual de 8 semanas
      totalWeeks = 8;
      totalCalls = 16;
    } else if (enrollment.cycleType === 'PAREJA') {
      // PAREJA es el programa en pareja de 8 semanas
      totalWeeks = 8;
      totalCalls = 16;
    } else {
      // Default para cualquier otro tipo no reconocido
      totalWeeks = 8;
      totalCalls = 16;
    }
    
    console.log('✅ Calculated from cycleType:', {
      cycleType: enrollment.cycleType,
      totalWeeks,
      totalCalls
    });
  } else {
    console.log('⚠️ Using default values (no enrollment found)');
  }

  // Obtener datos reales del programa si está inscrito
  let programData = null;
  if (hasDisciplineProgram && enrollment) {
    // Calcular semana actual
    const now = new Date();
    const startDate = enrollment.cycleStartDate ? new Date(enrollment.cycleStartDate) : now;
    const diffInDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.max(1, Math.min(Math.ceil(diffInDays / 7), totalWeeks));

    // Obtener próxima llamada
    const nextCall = await prisma.callBooking.findFirst({
      where: {
        programEnrollmentId: enrollment.id,
        scheduledAt: {
          gte: now
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      select: {
        scheduledAt: true
      }
    });

    // Obtener faltas registradas (llamadas con status MISSED)
    const missedCallsCount = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id,
        status: 'MISSED'
      }
    });

    // Obtener últimas 4 llamadas para historial de asistencia
    const recentCalls = await prisma.callBooking.findMany({
      where: {
        programEnrollmentId: enrollment.id,
        scheduledAt: {
          lt: now
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      },
      take: 4,
      select: {
        scheduledAt: true,
        status: true
      }
    });

    programData = {
      currentWeek,
      totalWeeks,
      nextCallDate: nextCall?.scheduledAt,
      missedCalls: missedCallsCount,
      attendance: recentCalls.reverse().map(call => ({
        attended: call.status === 'COMPLETED',
        date: call.scheduledAt
      }))
    };

    console.log('📊 Program data prepared:', programData);
  }

  // Obtener la configuración de la visión del usuario
  const visionParticipante = await prisma.visionParticipante.findFirst({
    where: { participanteId: usuario.id },
    include: {
      Vision: {
        select: {
          forceFinanzasArea: true,
          forceRelacionesArea: true,
          forceTalentosArea: true,
          forceSaludArea: true,
          forcePazMentalArea: true,
          forceOcioArea: true,
          forceTransformationArea: true,
          forceCommunityServiceArea: true,
        }
      }
    }
  });

  const vision = visionParticipante?.Vision;

  // Definir qué áreas están activas en la visión
  const areasActivas = [
    { key: 'finanzas', active: vision?.forceFinanzasArea ?? true, label: 'Finanzas' },
    { key: 'relaciones', active: vision?.forceRelacionesArea ?? true, label: 'Relaciones' },
    { key: 'talentos', active: vision?.forceTalentosArea ?? true, label: 'Talentos' },
    { key: 'pazMental', active: vision?.forcePazMentalArea ?? true, label: 'Paz Mental' },
    { key: 'ocio', active: vision?.forceOcioArea ?? true, label: 'Ocio' },
    { key: 'salud', active: vision?.forceSaludArea ?? true, label: 'Salud' },
    { key: 'servicioTrans', active: vision?.forceTransformationArea ?? true, label: 'Transformacional' },
    { key: 'servicioComun', active: vision?.forceCommunityServiceArea ?? true, label: 'Comunitaria' },
  ].filter(area => area.active);

  // Si hay carta, obtener las metas y contar tareas por área
  let areaProgress: Array<{
    key: string;
    label: string;
    tasksCompleted: number;
    tasksTotal: number;
    percent: number;
    hasDeclaration: boolean;
  }> = [];

  if (carta) {
    const metas = await prisma.meta.findMany({
      where: { cartaId: carta.id },
      include: {
        Accion: {
          include: {
            TaskInstance: {
              where: {
                usuarioId: usuario.id
              }
            }
          }
        }
      }
    });

    // Mapeo de categorías de Meta a áreas
    const categoriaToArea: Record<string, string> = {
      'FINANZAS': 'finanzas',
      'RELACIONES': 'relaciones',
      'TALENTOS': 'talentos',
      'PAZ_MENTAL': 'pazMental',
      'OCIO': 'ocio',
      'SALUD': 'salud',
      'SERVICIO_TRANSFORMACIONAL': 'servicioTrans',
      'SERVICIO_COMUNITARIO': 'servicioComun',
    };

    // Calcular progreso por área
    areaProgress = areasActivas.map(area => {
      const metasDeArea = metas.filter(m => categoriaToArea[m.categoria] === area.key);
      
      let tasksTotal = 0;
      let tasksCompleted = 0;

      metasDeArea.forEach(meta => {
        meta.Accion.forEach(accion => {
          const instances = accion.TaskInstance || [];
          tasksTotal += instances.length;
          tasksCompleted += instances.filter(t => t.status === 'COMPLETED').length;
        });
      });

      // Verificar si tiene declaración en esta área
      const hasDeclaration = !!(carta as any)[`${area.key}Declaracion`];

      return {
        key: area.key,
        label: area.label,
        tasksCompleted,
        tasksTotal,
        percent: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0,
        hasDeclaration
      };
    });
  }

  // Calcular áreas completadas y progreso general
  // Contamos cuántas áreas tienen declaración para el contador "X/Y áreas"
  const areasCompletadas = areaProgress.filter(a => a.hasDeclaration).length;
  const totalAreas = areasActivas.length;
  
  // Para el porcentaje, calculamos basado en tareas completadas vs tareas totales
  const totalTasks = areaProgress.reduce((sum, area) => sum + area.tasksTotal, 0);
  const completedTasks = areaProgress.reduce((sum, area) => sum + area.tasksCompleted, 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Redirección automática según el rol
  if (usuario.rol === "ADMINISTRADOR") {
    redirect("/dashboard/admin");
  }

  if (usuario.rol === "SCHOOL_ADMIN") {
    redirect("/dashboard/school-admin");
  }

  if (usuario.rol === "MENTOR") {
    redirect("/dashboard/mentor");
  }

  if (usuario.rol === "COORDINADOR") {
    redirect("/dashboard/coordinador");
  }

  // 3. Lógica visual según el Rol - Solo PARTICIPANTE, LIDER o GAMECHANGER llegan aquí
  const mensajeBienvenida = usuario.rol === "GAMECHANGER" 
    ? "El panel de control maestro está listo." 
    : "Tu transformación ha comenzado.";

  return (
    <div className="space-y-6">
      {/* NOTIFICACIONES IMPORTANTES (Cambio de Mentor, etc.) */}
      <NotificationBanner />

      {/* ALERTA DE RE-AGENDAMIENTO */}
      <AlertaReagendamiento />

      {/* WIDGET: CARTA F.R.U.T.O.S. */}
      <CartaWizardWidget 
        hasCompletedCarta={hasCompletedCarta}
        cartaStatus={carta?.estado as any}
      />

      {/* ============================================ */}
      {/* ZONA SUPERIOR: Hero Section Condicional      */}
      {/* ============================================ */}
      {isAuthorized ? (
        // MODO EJECUCIÓN: Barra de Progreso Maestra
        <GlobalProgressHero 
          percent={progressPercent}
          label="Estado total de avance de tus metas F.R.U.T.O.S."
          totalMetas={totalAreas}
          completedMetas={areasCompletadas}
          areas={areasActivas.map(area => area.label)}
          areaProgress={areaProgress}
        />
      ) : (
        // MODO ONBOARDING: Banner de Bienvenida
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 shadow-lg shadow-blue-900/20">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">
              Hola, {usuario.nombre}
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              {mensajeBienvenida}
            </p>
            <button className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg">
              Ver mis Metas de Hoy
            </button>
          </div>
          {/* Decoración de fondo */}
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 blur-xl" />
        </div>
      )}

      {/* ============================================ */}
      {/* ZONA MEDIA: KPIs + Programa Intensivo        */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TARJETA 1: PUNTOS CUÁNTICOS CON RECOMENDACIÓN IA */}
        <QuantumPointsWidget puntosCuanticos={usuario.puntosCuanticos} />

        {/* TARJETA 2: TOP RANKING CON TU POSICIÓN */}
        <RankingWidget />

        {/* TARJETA 3: Condicional - Programa Intensivo Card, Invitación o Meta Global */}
        {isAuthorized && hasDisciplineProgram && programData ? (
          // MODO EJECUCIÓN: Programa Intensivo (Card Compacta) - Solo si tiene suscripción activa
          <IntensiveProgramCard 
            week={programData.currentWeek}
            totalWeeks={programData.totalWeeks}
            nextCallDate={programData.nextCallDate}
            attendance={programData.attendance}
            missedCalls={programData.missedCalls}
          />
        ) : isAuthorized && !hasDisciplineProgram ? (
          // Usuario con carta aprobada pero SIN programa intensivo - Mostrar invitación
          <IntensiveProgramInvite totalWeeks={totalWeeks} totalCalls={totalCalls} />
        ) : (
          // MODO ONBOARDING: Meta Global (Widget estático) - Usuario sin carta aprobada
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Meta Global</span>
                <span className="text-xs text-purple-400 cursor-pointer hover:underline">Ver Detalles</span>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1 text-slate-100 font-bold text-xl mb-2">
                Progreso <ArrowRight className="w-4 h-4 text-purple-500" />
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[65%]" />
              </div>
              <p className="text-xs text-slate-500 mt-2">Haz clic para gestionar tus metas F.R.U.T.O.S.</p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ZONA DE EJECUCIÓN DIARIA (Siempre visible)  */}
      {/* ============================================ */}
      <ZonaEjecucionDiaria />

      {/* ============================================ */}
      {/* PROGRAMA INTENSIVO BANNER (Solo Onboarding)  */}
      {/* ============================================ */}
      {!isAuthorized && <ProgramStatusWidget />}

      {/* ============================================ */}
      {/* MODAL DE CAMBIO DE ORGANIZACIÓN             */}
      {/* ============================================ */}
      <OrganizationChangeModal />

      {/* Aquí abajo irían tus Widgets de "Avance General" y "Evidencias" */}
      {/* ... */}
    </div>
  );
}