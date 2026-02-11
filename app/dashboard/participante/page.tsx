import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Zap, Trophy, Target, ArrowRight } from "lucide-react";
import ProgramStatusWidget from "@/components/dashboard/ProgramStatusWidget";
import AlertaReagendamiento from "@/components/dashboard/AlertaReagendamiento";
import NotificationBanner from "@/components/dashboard/NotificationBanner";
import TribeNotificationsWidget from "@/components/dashboard/TribeNotificationsWidget";
import CartaWizardWidget from "@/components/dashboard/CartaWizardWidget";
import ZonaEjecucionDiaria from "@/components/dashboard/ZonaEjecucionDiaria";
import GlobalProgressHero from "@/components/dashboard/GlobalProgressHero";
import IntensiveProgramCard from "@/components/dashboard/IntensiveProgramCard";
import IntensiveProgramInvite from "@/components/dashboard/IntensiveProgramInvite";
import QuantumPointsWidget from "@/components/dashboard/QuantumPointsWidget";
import RankingWidget from "@/components/dashboard/RankingWidget";
import MedicalFormWidget from "@/components/dashboard/MedicalFormWidget";
import IdentityHeroSection from "@/components/dashboard/identity/IdentityHeroSection";
import BitacoraAlertWidget from "@/components/dashboard/BitacoraAlertWidget";
import ParticipantSurveyBanner from "@/components/surveys/ParticipantSurveyBanner";

export default async function ParticipanteDashboardPage() {
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
  const isCartaAuthorized = carta?.estado === 'APROBADA';

  // Obtener información del enrollment del programa
  const programEnrollment = await prisma.programEnrollment.findFirst({
    where: { 
      userId: usuario.id,
      status: { in: ['ACTIVE', 'ENROLLED'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Verificar si tiene una visión activa
  const visionParticipacion = await prisma.visionParticipante.findFirst({
    where: { participanteId: usuario.id },
    include: {
      Vision: {
        select: {
          id: true,
          nombre: true,
          startDate: true,
          endDate: true,
          isActive: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Verificar si tiene enrollment en visión
  const visionEnrollment = await prisma.vision_enrollments.findFirst({
    where: { 
      userId: usuario.id,
      enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
    },
    include: {
      Vision: {
        select: {
          id: true,
          nombre: true,
          startDate: true,
          endDate: true,
          isActive: true,
        }
      }
    },
    orderBy: { enrolledAt: 'desc' }
  });

  // Obtener el mentor asignado
  const mentorAsignado = usuario.assignedMentorId ? await prisma.usuario.findUnique({
    where: { id: usuario.assignedMentorId },
    select: {
      id: true,
      nombre: true,
      email: true,
      imagen: true,
    }
  }) : null;

  // Obtener próximas llamadas
  const proximasLlamadas = await prisma.callBooking.findMany({
    where: {
      studentId: usuario.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() }
    },
    orderBy: { scheduledAt: 'asc' },
    take: 3,
    include: {
      Usuario_CallBooking_mentorIdToUsuario: {
        select: { nombre: true, imagen: true }
      }
    }
  });

  // Datos para el widget de programa
  const visionActiva = visionEnrollment?.Vision || visionParticipacion?.Vision;
  const tieneVision = !!visionActiva;
  const tieneMentor = !!mentorAsignado;
  const tieneCartaAprobada = isCartaAuthorized;

  // Calcular semanas del ciclo
  let currentWeek = 1;
  let totalWeeks = 10;
  
  if (visionActiva?.startDate) {
    const startDate = new Date(visionActiva.startDate);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    currentWeek = Math.min(Math.max(1, Math.floor(diffDays / 7) + 1), totalWeeks);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Banner de Participante */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Hola, {usuario.nombre?.split(' ')[0] || 'Participante'}
              </h1>
              <p className="text-slate-400">
                Vista de Participante • {tieneVision ? visionActiva?.nombre : 'Programa Individual'}
              </p>
            </div>
          </div>
        </div>

        {/* Widget de Estado del Programa */}
        {(tieneVision || tieneMentor || tieneCartaAprobada) && (
          <ProgramStatusWidget
            hasVision={tieneVision}
            visionName={visionActiva?.nombre}
            hasMentor={tieneMentor}
            mentorName={mentorAsignado?.nombre}
            hasApprovedCarta={tieneCartaAprobada}
            currentWeek={currentWeek}
            totalWeeks={totalWeeks}
            upcomingCalls={proximasLlamadas.length}
          />
        )}

        {/* Survey Banner */}
        <ParticipantSurveyBanner userId={usuario.id} />

        {/* Zona de Ejecución Diaria */}
        <ZonaEjecucionDiaria userId={usuario.id} />

        {/* Widget de Carta */}
        {!tieneCartaAprobada && (
          <CartaWizardWidget 
            userId={usuario.id}
            hasCompletedCarta={hasCompletedCarta}
            cartaEstado={carta?.estado}
          />
        )}

        {/* Grid de Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Puntos Cuánticos */}
          <QuantumPointsWidget 
            puntos={usuario.puntosCuanticos || 0}
            userId={usuario.id}
          />

          {/* Ranking */}
          <RankingWidget userId={usuario.id} />

          {/* Alerta de Bitácora */}
          <BitacoraAlertWidget userId={usuario.id} />
        </div>

        {/* Próximas Llamadas */}
        {proximasLlamadas.length > 0 && (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Próximas Llamadas
            </h3>
            <div className="space-y-3">
              {proximasLlamadas.map((llamada) => (
                <div key={llamada.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {llamada.Usuario_CallBooking_mentorIdToUsuario?.nombre?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {llamada.Usuario_CallBooking_mentorIdToUsuario?.nombre || 'Mentor'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {new Date(llamada.scheduledAt).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notificaciones de Tribu */}
        <TribeNotificationsWidget userId={usuario.id} />

      </div>
    </div>
  );
}
