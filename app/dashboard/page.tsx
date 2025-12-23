import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { redirect } from "next/navigation";
import { Zap, Trophy, Target, ArrowRight } from "lucide-react";
import ProgramStatusWidget from "@/components/dashboard/ProgramStatusWidget";
import AlertaReagendamiento from "@/components/dashboard/AlertaReagendamiento";
import CartaWizardWidget from "@/components/dashboard/CartaWizardWidget";
import ZonaEjecucionDiaria from "@/components/dashboard/ZonaEjecucionDiaria";
import GlobalProgressHero from "@/components/dashboard/GlobalProgressHero";
import IntensiveProgramCard from "@/components/dashboard/IntensiveProgramCard";

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

  // Calcular progreso real de las metas F.R.U.T.O.S.
  // Las 6 áreas principales son: Finanzas, Relaciones, Talentos, PazMental, Ocio, Salud
  const areasCompletadas = carta ? [
    !!carta.finanzasDeclaracion,
    !!carta.relacionesDeclaracion,
    !!carta.talentosDeclaracion,
    !!carta.pazMentalDeclaracion,
    !!carta.ocioDeclaracion,
    !!carta.saludDeclaracion
  ].filter(Boolean).length : 0;
  
  const progressPercent = carta ? Math.round((areasCompletadas / 6) * 100) : 0;

  // 2. Redirección automática según el rol
  if (usuario.rol === "ADMINISTRADOR") {
    redirect("/dashboard/admin");
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
          totalMetas={6}
          completedMetas={areasCompletadas}
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
        {/* TARJETA 1: PUNTOS CUÁNTICOS (REALES) */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Puntos Cuánticos</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {usuario.puntosCuanticos.toLocaleString()} <span className="text-lg text-slate-500 font-normal">PC</span>
          </div>
        </div>

        {/* TARJETA 2: POSICIÓN (Aún simulada hasta que hagamos el ranking real) */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
              <Trophy className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tu Posición</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            #12 <span className="text-lg text-slate-500 font-normal">Global</span>
          </div>
        </div>

        {/* TARJETA 3: Condicional - Programa Intensivo Card o Meta Global */}
        {isAuthorized ? (
          // MODO EJECUCIÓN: Programa Intensivo (Card Compacta)
          <IntensiveProgramCard 
            week={4}
            totalWeeks={17}
            nextCall="Mié 24 Dic - 06:00"
            attendance={[
              { attended: true, date: new Date('2025-12-18') },
              { attended: true, date: new Date('2025-12-19') },
              { attended: false, date: new Date('2025-12-20') },
              { attended: true, date: new Date('2025-12-21') }
            ]}
            missedCalls={1}
          />
        ) : (
          // MODO ONBOARDING: Meta Global (Widget estático)
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

      {/* Aquí abajo irían tus Widgets de "Avance General" y "Evidencias" */}
      {/* ... */}
    </div>
  );
}