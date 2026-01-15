import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
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
import PersonalQRWidget from "@/components/dashboard/PersonalQRWidget";
import SquadManagerWidget from "@/components/dashboard/SquadManagerWidget";
import { ElCruceAccessWidget } from "@/components/el-cruce";
import VisionHistoryWidget from "@/components/widgets/VisionHistoryWidget";
import GCPendingSurveyBanner from "@/components/dashboard/GCPendingSurveyBanner";

export default async function GameChangerDashboardPage() {
  // 1. Obtener sesión y datos frescos
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
  });

  if (!usuario) return null;

  // Verificar que sea GAMECHANGER
  if (usuario.rol !== "GAMECHANGER") {
    redirect("/dashboard");
  }

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
          CallBooking: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const programEnrollment = allEnrollments.find(e => e._count.CallBooking > 0) || 
                           allEnrollments.find(e => e.mentorId !== usuario.id && e.cycleType !== 'SOLO') ||
                           allEnrollments[0];

  const hasDisciplineProgram = 
    disciplineSubscription?.status === 'ACTIVE' || 
    !!programEnrollment || 
    false;

  const enrollment = programEnrollment;
  let totalWeeks = 17;
  let totalCalls = 34;
  
  if (enrollment && enrollment.cycleStartDate && enrollment.cycleEndDate) {
    const startDate = new Date(enrollment.cycleStartDate);
    const endDate = new Date(enrollment.cycleEndDate);
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    totalWeeks = Math.ceil(diffInDays / 7);
    totalCalls = totalWeeks * 2;
  } else if (enrollment) {
    if (enrollment.cycleType === 'INTENSIVE_6_MONTHS') {
      totalWeeks = 26;
      totalCalls = 52;
    } else if (enrollment.cycleType === 'INTENSIVE_17_WEEKS') {
      totalWeeks = 17;
      totalCalls = 34;
    } else if (enrollment.cycleType === 'STANDARD') {
      totalWeeks = 12;
      totalCalls = 24;
    } else {
      totalWeeks = 8;
      totalCalls = 16;
    }
  }

  // Obtener datos reales del programa si está inscrito
  let programData = null;
  if (hasDisciplineProgram && enrollment) {
    const now = new Date();
    const startDate = enrollment.cycleStartDate ? new Date(enrollment.cycleStartDate) : now;
    const diffInDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.max(1, Math.min(Math.ceil(diffInDays / 7), totalWeeks));

    const nextCall = await prisma.callBooking.findFirst({
      where: {
        programEnrollmentId: enrollment.id,
        scheduledAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true }
    });

    const missedCallsCount = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id,
        status: 'MISSED'
      }
    });

    const recentCalls = await prisma.callBooking.findMany({
      where: {
        programEnrollmentId: enrollment.id,
        scheduledAt: { lt: now }
      },
      orderBy: { scheduledAt: 'desc' },
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
              where: { usuarioId: usuario.id }
            }
          }
        }
      }
    });

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

  const areasCompletadas = areaProgress.filter(a => a.hasDeclaration).length;
  const totalAreas = areasActivas.length;
  const totalTasks = areaProgress.reduce((sum, area) => sum + area.tasksTotal, 0);
  const completedTasks = areaProgress.reduce((sum, area) => sum + area.tasksCompleted, 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* NOTIFICACIONES IMPORTANTES */}
      <NotificationBanner />

      {/* BANNER DE ENCUESTAS PENDIENTES */}
      <GCPendingSurveyBanner />

      {/* ALERTA DE RE-AGENDAMIENTO */}
      <AlertaReagendamiento />

      {/* WIDGET: CARTA F.R.U.T.O.S. */}
      <CartaWizardWidget 
        hasCompletedCarta={hasCompletedCarta}
        cartaStatus={carta?.estado as any}
      />

      {/* ============================================ */}
      {/* QR PERSONAL - WIDGET PARA INVITAR            */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PersonalQRWidget 
          userName={usuario.nombre}
          userId={usuario.id}
          userEmail={usuario.email}
          referralCode={usuario.referralCode || undefined}
          organizationId={usuario.organizationId}
        />
      </div>

      {/* ZONA SUPERIOR: Hero Section */}
      {isAuthorized && (
        <GlobalProgressHero 
          percent={progressPercent}
          label="Estado total de avance de tus metas"
          totalMetas={totalAreas}
          completedMetas={areasCompletadas}
          areas={areasActivas.map(area => area.label)}
          areaProgress={areaProgress}
        />
      )}

      {/* ZONA MEDIA: KPIs + Programa Intensivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuantumPointsWidget puntosCuanticos={usuario.puntosCuanticos} />
        <RankingWidget />

        {isAuthorized && hasDisciplineProgram && programData ? (
          <IntensiveProgramCard 
            week={programData.currentWeek}
            totalWeeks={programData.totalWeeks}
            nextCallDate={programData.nextCallDate}
            attendance={programData.attendance}
            missedCalls={programData.missedCalls}
          />
        ) : isAuthorized && !hasDisciplineProgram ? (
          <IntensiveProgramInvite totalWeeks={totalWeeks} totalCalls={totalCalls} />
        ) : null}
      </div>

      {/* HISTORIAL DE VISIONES (MIS ÁTOMOS) */}
      <VisionHistoryWidget />

      {/* SQUAD MANAGER + EL CRUCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SquadManagerWidget />
        <ElCruceAccessWidget 
          userRole={usuario.rol}
          organizationId={usuario.organizationId || undefined}
        />
      </div>

      {/* ZONA DE EJECUCIÓN DIARIA */}
      <ZonaEjecucionDiaria />

      {/* PROGRAMA INTENSIVO BANNER (Solo Onboarding) */}
      {!isAuthorized && <ProgramStatusWidget />}

      {/* MODAL DE CAMBIO DE ORGANIZACIÓN */}
      <OrganizationChangeModal />
    </div>
  );
}
