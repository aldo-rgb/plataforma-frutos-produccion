import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, TrendingUp, Target, Zap } from "lucide-react";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";

// Crear instancia de Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Mapeo de áreas con sus emojis
const AREA_CONFIG: Record<string, { emoji: string; color: string; gradient: string }> = {
  'Finanzas': { emoji: '💰', color: 'text-green-400', gradient: 'from-green-500 to-emerald-500' },
  'Relaciones': { emoji: '❤️', color: 'text-red-400', gradient: 'from-red-500 to-pink-500' },
  'Talentos': { emoji: '🎨', color: 'text-purple-400', gradient: 'from-purple-500 to-violet-500' },
  'Salud': { emoji: '💪', color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
  'Paz Mental': { emoji: '🧘', color: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-500' },
  'Ocio': { emoji: '🎮', color: 'text-yellow-400', gradient: 'from-yellow-500 to-orange-500' },
  'Servicio Transformacional': { emoji: '🌟', color: 'text-amber-400', gradient: 'from-amber-500 to-yellow-500' },
  'Servicio Comunitario': { emoji: '🤝', color: 'text-teal-400', gradient: 'from-teal-500 to-cyan-500' },
};

interface AreaProgress {
  key: string;
  label: string;
  tasksCompleted: number;
  tasksTotal: number;
  percent: number;
  hasDeclaration: boolean;
}

export default async function ProgresoFrutosPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
  });

  if (!usuario) {
    redirect("/login");
  }

  // Obtener la carta del usuario
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: usuario.id },
  });

  if (!carta || carta.estado !== 'APROBADA') {
    redirect("/dashboard");
  }

  // Obtener configuración de áreas del usuario (desde la base de datos)
  const visionParticipante = await prisma.visionParticipante.findFirst({
    where: { participanteId: usuario.id },
    include: {
      Vision: true,
    },
  });

  // Definir todas las áreas posibles
  const ALL_AREAS = [
    { key: 'finanzas', label: 'Finanzas', forceField: 'forceFinanzasArea' },
    { key: 'relaciones', label: 'Relaciones', forceField: 'forceRelacionesArea' },
    { key: 'talentos', label: 'Talentos', forceField: 'forceTalentosArea' },
    { key: 'salud', label: 'Salud', forceField: 'forceSaludArea' },
    { key: 'pazMental', label: 'Paz Mental', forceField: 'forcePazMentalArea' },
    { key: 'ocio', label: 'Ocio', forceField: 'forceOcioArea' },
    { key: 'servicioTrans', label: 'Servicio Transformacional', forceField: 'forceTransformationArea' },
    { key: 'servicioComun', label: 'Servicio Comunitario', forceField: 'forceCommunityServiceArea' },
  ];

  // Filtrar áreas activas según la configuración de la Visión
  let areasActivas = ALL_AREAS;
  
  if (visionParticipante?.Vision) {
    const vision = visionParticipante.Vision;
    areasActivas = ALL_AREAS.filter(area => {
      const fieldValue = vision[area.forceField as keyof typeof vision];
      return fieldValue === true;
    });
  } else {
    // Si no hay configuración de visión, usar todas las áreas excepto servicios
    areasActivas = ALL_AREAS.filter(area => 
      area.key !== 'servicioTrans' && area.key !== 'servicioComun'
    );
  }

  // Calcular progreso por área
  const areaProgress: AreaProgress[] = await Promise.all(
    areasActivas.map(async (area) => {
      const declaracionField = `${area.key}Declaracion` as keyof typeof carta;
      const hasDeclaration = !!carta[declaracionField];

      // Obtener TODAS las metas de esta carta primero (sin filtrar por categoría)
      const todasLasMetas = await prisma.meta.findMany({
        where: {
          cartaId: carta.id,
        },
        include: {
          Accion: true,
          EvidenciaAccion: true,
        },
      });

      // Filtrar metas que coincidan con esta área (buscar por categoría o por la key del área)
      const metas = todasLasMetas.filter(meta => 
        meta.categoria === area.label || 
        meta.categoria?.toLowerCase().includes(area.key.toLowerCase()) ||
        area.label.toLowerCase().includes(meta.categoria?.toLowerCase() || '')
      );

      // Calcular tareas completadas basadas en evidencias
      let tareasCompletadas = 0;
      let tareasTotal = 0;

      metas.forEach(meta => {
        // Contar acciones como tareas
        tareasTotal += meta.Accion.length;
        
        // Contar evidencias aprobadas para esta meta
        const evidenciasAprobadas = meta.EvidenciaAccion.filter(
          e => e.status === 'APROBADA'
        ).length;
        
        // Si hay evidencias aprobadas, contar las acciones como completadas
        if (evidenciasAprobadas > 0 && meta.Accion.length > 0) {
          tareasCompletadas += meta.Accion.length;
        }
      });

      const percent = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0;

      return {
        key: area.key,
        label: area.label,
        tasksCompleted: tareasCompletadas,
        tasksTotal: tareasTotal,
        percent,
        hasDeclaration,
      };
    })
  );

  // Calcular progreso total
  const totalTareas = areaProgress.reduce((sum, area) => sum + area.tasksTotal, 0);
  const tareasCompletadas = areaProgress.reduce((sum, area) => sum + area.tasksCompleted, 0);
  const progresoTotal = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
  const areasCompletadas = areaProgress.filter(a => a.percent === 100).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto p-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Volver al Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                <Target className="text-purple-400" />
                Progreso F.R.U.T.O.S.
              </h1>
              <p className="text-slate-400 mt-2">
                Seguimiento detallado de tu maestría en cada área de vida
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Resumen Global */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progreso Total */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full mb-4 border-4 border-purple-500/30">
                <span className="text-4xl font-black text-white">{progresoTotal}%</span>
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-1">Progreso Total</h3>
              <p className="text-sm text-slate-500">Completado en todas las áreas</p>
            </div>

            {/* Áreas Maestradas */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full mb-4 border-4 border-green-500/30">
                <span className="text-4xl font-black text-white">{areasCompletadas}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-1">Áreas Maestradas</h3>
              <p className="text-sm text-slate-500">De {areasActivas.length} áreas totales</p>
            </div>

            {/* Tareas Completadas */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full mb-4 border-4 border-amber-500/30">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{tareasCompletadas}</div>
                  <div className="text-xs text-slate-400">de {totalTareas}</div>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-1">Tareas Completadas</h3>
              <p className="text-sm text-slate-500">Acciones realizadas</p>
            </div>
          </div>

          {/* Barra de Progreso Global */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full transition-all duration-1000 shadow-lg shadow-purple-500/50"
                style={{ width: `${progresoTotal}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por Área */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-purple-400" />
            Desglose por Área
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {areaProgress.map((area) => {
              const config = AREA_CONFIG[area.label] || { 
                emoji: '⭐', 
                color: 'text-slate-400', 
                gradient: 'from-slate-500 to-slate-600' 
              };
              const isCompleted = area.percent === 100;

              return (
                <Link
                  href="/dashboard/hoy"
                  key={area.key}
                  className={`group relative bg-gradient-to-br from-slate-900 to-slate-800 border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer block ${
                    isCompleted 
                      ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                      : 'border-slate-700 hover:border-purple-500/50'
                  }`}
                >
                  {/* Header del Área */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-4xl p-3 bg-gradient-to-br ${config.gradient} bg-opacity-10 rounded-xl`}>
                        {config.emoji}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{area.label}</h3>
                        <p className="text-sm text-slate-400">
                          {area.tasksCompleted} de {area.tasksTotal} tareas
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    )}
                  </div>

                  {/* Progreso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progreso</span>
                      <span className={`font-bold ${config.color}`}>
                        {area.percent}%
                      </span>
                    </div>
                    <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-1000`}
                        style={{ width: `${area.percent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      </div>
                    </div>
                  </div>

                  {/* Estado de Declaración */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-sm">
                      {area.hasDeclaration ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Declaración definida</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-500">Sin declaración</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Efecto hover */}
                  {!isCompleted && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl">
                      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        {progresoTotal < 100 && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 text-center">
            <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              ¡Sigue avanzando!
            </h3>
            <p className="text-slate-300 mb-4">
              Completa tus tareas diarias para aumentar tu progreso en cada área
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              Ir a Tareas del Día
            </Link>
          </div>
        )}

        {/* Mensaje de Completado */}
        {progresoTotal === 100 && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              ¡Felicidades! Has alcanzado el 100%
            </h3>
            <p className="text-slate-300 text-lg">
              Has maestrado todas tus áreas F.R.U.T.O.S.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
