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
import PendingMentorReviewsWidget from "@/components/dashboard/PendingMentorReviewsWidget";

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

  // 🆕 Verificar si tiene créditos de Lobo Solitario (PackageSessionCredits)
  const packageCredits = await prisma.packageSessionCredits.findFirst({
    where: {
      MentorPackageOrder: {
        usuarioId: usuario.id,
        status: 'COMPLETED'
      },
      remainingSessions: {
        gt: 0
      },
      isActive: true
    },
    select: {
      id: true,
      totalSessions: true,
      usedSessions: true,
      remainingSessions: true,
      expiresAt: true,
      MentorPackageOrder: {
        select: {
          mentorId: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
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
          CallBooking: true
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
  const programEnrollment = allEnrollments.find(e => e._count.CallBooking > 0) || 
                           allEnrollments.find(e => e.mentorId !== usuario.id && e.cycleType !== 'SOLO') ||
                           allEnrollments[0]; // Fallback al más reciente

  // Usuario tiene programa activo si tiene:
  // 1. disciplineSubscription ACTIVA
  // 2. programEnrollment ACTIVO (Visión)
  // 3. packageCredits activos (Lobo Solitario)
  const hasDisciplineProgram = 
    disciplineSubscription?.status === 'ACTIVE' || 
    !!programEnrollment || 
    !!packageCredits ||
    false;

  console.log('🔍 Verificación de programa:', {
    userId: usuario.id,
    hasDisciplineSubscription: !!disciplineSubscription,
    disciplineStatus: disciplineSubscription?.status,
    totalEnrollments: allEnrollments.length,
    selectedEnrollment: programEnrollment ? {
      id: programEnrollment.id,
      cycleType: programEnrollment.cycleType,
      hasCallBookings: programEnrollment._count.CallBooking > 0,
      isSoloCycle: programEnrollment.cycleType === 'SOLO'
    } : null,
    hasProgramEnrollment: !!programEnrollment,
    enrollmentStatus: programEnrollment?.status,
    hasPackageCredits: !!packageCredits,
    packageCreditsRemaining: packageCredits?.remainingSessions,
    hasDisciplineProgram
  });

  // Obtener información del enrollment para calcular semanas del programa
  const enrollment = programEnrollment;

  // Calcular duración del programa basado en el enrollment o packageCredits
  let totalWeeks = 9; // Default para Lobo Solitario (63 días = 9 semanas)
  let totalCalls = 18; // Default para Lobo Solitario
  
  console.log('📊 Enrollment data:', {
    hasEnrollment: !!enrollment,
    cycleType: enrollment?.cycleType,
    startDate: enrollment?.cycleStartDate,
    endDate: enrollment?.cycleEndDate,
    hasPackageCredits: !!packageCredits,
    packageCreditsTotal: packageCredits?.totalSessions
  });
  
  if (packageCredits) {
    // Lobo Solitario: 63 días (9 semanas) con sesiones variables
    totalWeeks = 9;
    totalCalls = packageCredits.totalSessions;
    
    console.log('✅ Lobo Solitario detected:', {
      totalWeeks,
      totalCalls,
      remainingSessions: packageCredits.remainingSessions,
      usedSessions: packageCredits.usedSessions
    });
  } else if (enrollment && enrollment.cycleStartDate && enrollment.cycleEndDate) {
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
  // Para Lobo Solitario (sin enrollment/visión), solo las 6 áreas personales
  const areasActivas = [
    { key: 'finanzas', active: vision?.forceFinanzasArea ?? true, label: 'Finanzas' },
    { key: 'relaciones', active: vision?.forceRelacionesArea ?? true, label: 'Relaciones' },
    { key: 'talentos', active: vision?.forceTalentosArea ?? true, label: 'Talentos' },
    { key: 'pazMental', active: vision?.forcePazMentalArea ?? true, label: 'Paz Mental' },
    { key: 'ocio', active: vision?.forceOcioArea ?? true, label: 'Ocio' },
    { key: 'salud', active: vision?.forceSaludArea ?? true, label: 'Salud' },
    // Solo incluir áreas comunitarias si hay enrollment (ciclo intensivo)
    ...(programEnrollment ? [
      { key: 'servicioTrans', active: vision?.forceTransformationArea ?? true, label: 'Transformacional' },
      { key: 'servicioComun', active: vision?.forceCommunityServiceArea ?? true, label: 'Comunitaria' },
    ] : [])
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

  if (usuario.rol === "LIDER") {
    redirect("/dashboard/lider");
  }

  if (usuario.rol === "COORDINADOR") {
    redirect("/dashboard/coordinador");
  }

  if (usuario.rol === "GAMECHANGER") {
    redirect("/dashboard/gamechanger");
  }

  // Calcular fechas del ciclo para mostrar en el widget
  let cycleStartDateForWidget = programEnrollment?.cycleStartDate || null;
  let cycleEndDateForWidget = programEnrollment?.cycleEndDate || null;
  let totalWeeksForWidget: number | null = null;
  let totalCallsForWidget: number | null = null;

  // Si no hay enrollment pero tiene carta aprobada (Lobo Solitario - sin visión), calcular fechas desde la carta
  if (!programEnrollment && carta?.estado === 'APROBADA' && carta.fechaActualizacion) {
    // Lobo Solitario (sin visión): 63 días desde la aprobación de la carta
    cycleStartDateForWidget = carta.fechaActualizacion;
    const endDate = new Date(carta.fechaActualizacion);
    endDate.setDate(endDate.getDate() + 63);
    cycleEndDateForWidget = endDate;
    
    // Ciclo estándar: 63 días = 9 semanas con 2 llamadas semanales = 18 llamadas
    totalWeeksForWidget = 9;
    totalCallsForWidget = 18;
    
    console.log('📅 Fechas calculadas para Lobo Solitario (sin visión):', {
      startDate: cycleStartDateForWidget,
      endDate: cycleEndDateForWidget,
      duration: '63 días (9 semanas)',
      calls: '18 llamadas'
    });
  } else if (programEnrollment) {
    // Si hay enrollment, calcular semanas basado en fechas de la visión
    if (programEnrollment.cycleStartDate && programEnrollment.cycleEndDate) {
      const start = new Date(programEnrollment.cycleStartDate);
      const end = new Date(programEnrollment.cycleEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      totalWeeksForWidget = diffWeeks;
      totalCallsForWidget = diffWeeks * 2;
    } else {
      // Por defecto: 9 semanas = 18 llamadas
      totalWeeksForWidget = 9;
      totalCallsForWidget = 18;
    }
  }

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

      {/* WIDGET: NOTIFICACIONES DE CALIFICACIÓN DE MENTOR */}
      {(usuario.role === 'PARTICIPANTE' || usuario.role === 'LIDER') && (
        <PendingMentorReviewsWidget />
      )}

      {/* ============================================ */}
      {/* ZONA SUPERIOR: Hero Section Condicional      */}
      {/* ============================================ */}
      {isAuthorized && (
        // MODO EJECUCIÓN: Barra de Progreso Maestra
        <GlobalProgressHero 
          percent={progressPercent}
          label="Estado total de avance de tus metas"
          totalMetas={totalAreas}
          completedMetas={areasCompletadas}
          areas={areasActivas.map(area => area.label)}
          areaProgress={areaProgress}
          cycleStartDate={cycleStartDateForWidget}
          cycleEndDate={cycleEndDateForWidget}
          totalWeeks={totalWeeksForWidget}
          totalCalls={totalCallsForWidget}
        />
      )}

      {/* ============================================ */}
      {/* ZONA MEDIA: KPIs + Programa Intensivo        */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TARJETA 1: PUNTOS CUÁNTICOS CON RECOMENDACIÓN IA */}
        <QuantumPointsWidget 
          puntosCuanticos={usuario.puntosCuanticos}
          usuario={{
            nombre: usuario.nombre,
            profileImage: usuario.profileImage
          }}
        />

        {/* TARJETA 2: TOP RANKING CON TU POSICIÓN */}
        <RankingWidget />

        {/* TARJETA 3: Condicional - Programa Intensivo Card, Invitación o Enrollment Status */}
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
        ) : hasDisciplineProgram && programData ? (
          // Usuario CON programa pero sin carta aprobada - Mostrar status de enrollment
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Mi Programa</span>
                <a href="/dashboard/program/enroll" className="text-xs text-purple-400 cursor-pointer hover:underline">Ver Detalles</a>
              </div>
            </div>
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Strikes</span>
                <span className={`text-lg font-bold ${programData.missedCalls >= 2 ? 'text-red-400' : programData.missedCalls === 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {programData.missedCalls}/3
                </span>
              </div>
              {programData.nextCallDate ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Próxima Sesión</span>
                  <span className="text-sm font-medium text-slate-100">
                    {new Date(programData.nextCallDate).toLocaleDateString('es-MX', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Estado</span>
                  <span className="text-sm font-medium text-yellow-400">Sin sesiones agendadas</span>
                </div>
              )}
              <div className="pt-2">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
                    style={{ width: `${(programData.currentWeek / programData.totalWeeks) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Semana {programData.currentWeek} de {programData.totalWeeks}</p>
              </div>
            </div>
          </div>
        ) : (
          // MODO ONBOARDING: Usuario sin programa - Botón para inscribirse
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-colors group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Programa</span>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1 text-slate-100 font-bold text-xl mb-3">
                Inscríbete <ArrowRight className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-sm text-slate-400 mb-4">Agenda tus sesiones semanales y comienza tu programa de mentoría.</p>
              <a 
                href="/dashboard/program/enroll"
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all"
              >
                Agendar Sesiones
              </a>
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