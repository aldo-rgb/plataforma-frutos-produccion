import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Recompensas por nivel de servicio
const SERVICE_REWARDS = {
  CONTRIBUCION_NIVEL_1: 200,
  CONTRIBUCION_NIVEL_2: 500,
  SERVICIO_FIN_SEMANA: 800,
  STAFF_NIVEL_1: 1000,
  STAFF_NIVEL_2: 1500,
  STAFF_NIVEL_3: 2500
};

// Verificar si debe desbloquear Super Nova
async function checkSuperNovaUnlock(userId: number) {
  const progress = await prisma.serviceLadderProgress.findUnique({
    where: { usuarioId: userId }
  });

  if (!progress || progress.superNovaUnlocked) return false;

  // Super Nova requiere al menos 1 evidencia aprobada de cada nivel
  const hasAllLevels = 
    progress.nivel1Count > 0 &&
    progress.nivel2Count > 0 &&
    progress.finDeSemanaCount > 0 &&
    progress.staffNivel1Count > 0 &&
    progress.staffNivel2Count > 0 &&
    progress.staffNivel3Count > 0;

  if (hasAllLevels) {
    await prisma.serviceLadderProgress.update({
      where: { usuarioId: userId },
      data: {
        superNovaUnlocked: true,
        superNovaUnlockedAt: new Date(),
        xpMultiplier: 1.2 // Multiplicador permanente
      }
    });

    // Recompensa masiva Super Nova
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        puntosCuanticos: { increment: 10000 },
        badges: {
          push: 'SUPER_NOVA'
        }
      }
    });

    await prisma.rewardHistory.create({
      data: {
        usuarioId: userId,
        type: 'PC',
        amount: 10000,
        reason: '🌟 SUPER NOVA DESBLOQUEADA - Status Legendario',
        sourceType: 'ACHIEVEMENT',
        rarity: 'LEGENDARY'
      }
    });

    return true;
  }

  return false;
}

// Verificar logro "Servidor Universal"
async function checkAmbassadorBadge(userId: number) {
  const progress = await prisma.serviceLadderProgress.findUnique({
    where: { usuarioId: userId }
  });

  if (!progress || progress.ambassadorBadgeUnlocked) return false;

  // Obtener todas las locations activas
  const totalLocations = await prisma.location.count({ where: { isActive: true } });
  
  // Verificar si tiene al menos 1 evidencia APROBADA en cada location
  const approvedByLocation = await prisma.userServiceContribution.groupBy({
    by: ['locationId'],
    where: {
      usuarioId: userId,
      status: 'APPROVED'
    },
    _count: { locationId: true }
  });

  if (approvedByLocation.length >= totalLocations) {
    await prisma.serviceLadderProgress.update({
      where: { usuarioId: userId },
      data: {
        ambassadorBadgeUnlocked: true,
        xpMultiplier: 1.2 // Si ya tiene Super Nova, se queda en 1.2
      }
    });

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        puntosCuanticos: { increment: 5000 },
        badges: {
          push: 'EMBAJADOR_DE_LUZ'
        }
      }
    });

    await prisma.rewardHistory.create({
      data: {
        usuarioId: userId,
        type: 'PC',
        amount: 5000,
        reason: '✨ EMBAJADOR DE LUZ - Servicio en todas las sucursales',
        sourceType: 'ACHIEVEMENT',
        rarity: 'EPIC'
      }
    });

    return true;
  }

  return false;
}

// GET - Listar contribuciones pendientes (para mentores/coordinadores)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    // Solo MENTOR, COORDINADOR, GAMECHANGER o ADMIN pueden revisar
    if (!user || !['MENTOR', 'COORDINADOR', 'GAMECHANGER', 'ADMINISTRADOR'].includes(user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Coordinadores y superiores ven todas, mentores solo sus asignados
    const esSupervisor = ['COORDINADOR', 'GAMECHANGER', 'ADMINISTRADOR'].includes(user.rol);

    const contributions = await prisma.userServiceContribution.findMany({
      where: {
        status: 'PENDING',
        ...(esSupervisor ? {} : {
          Usuario: {
            OR: [
              { mentorId: userId },
              { assignedMentorId: userId }
            ]
          }
        })
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            vision: true
          }
        },
        Location: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return NextResponse.json({ contributions });

  } catch (error: any) {
    console.error('Error fetching contributions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Aprobar o rechazar contribución
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const reviewerId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const user = await prisma.usuario.findUnique({
      where: { id: reviewerId }
    });

    if (!['MENTOR', 'COORDINADOR', 'GAMECHANGER', 'ADMINISTRADOR'].includes(user?.rol || '')) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { contributionId, action, feedbackMentor } = body;

    if (!contributionId || !action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos o acción inválida" 
      }, { status: 400 });
    }

    const contribution = await prisma.userServiceContribution.findUnique({
      where: { id: contributionId },
      include: { Usuario: true }
    });

    if (!contribution) {
      return NextResponse.json({ error: "Contribución no encontrada" }, { status: 404 });
    }

    if (contribution.status !== 'PENDING') {
      return NextResponse.json({ 
        error: "Esta contribución ya fue revisada" 
      }, { status: 400 });
    }

    const pcGranted = action === 'APPROVED' 
      ? SERVICE_REWARDS[contribution.serviceLevel as keyof typeof SERVICE_REWARDS] 
      : 0;

    // Actualizar contribución
    await prisma.userServiceContribution.update({
      where: { id: contributionId },
      data: {
        status: action,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        feedbackMentor,
        pcGranted
      }
    });

    if (action === 'APPROVED') {
      // Otorgar Puntos Cuánticos
      await prisma.usuario.update({
        where: { id: contribution.usuarioId },
        data: {
          puntosCuanticos: { increment: pcGranted }
        }
      });

      // Registrar en historial
      await prisma.rewardHistory.create({
        data: {
          usuarioId: contribution.usuarioId,
          type: 'PC',
          amount: pcGranted,
          reason: `Servicio ${contribution.serviceLevel}`,
          sourceType: 'SERVICE',
          sourceId: contributionId,
          rarity: pcGranted >= 2000 ? 'LEGENDARY' : pcGranted >= 1000 ? 'EPIC' : 'RARE'
        }
      });

      // Actualizar contadores en Service Ladder
      const fieldMap: Record<string, string> = {
        CONTRIBUCION_NIVEL_1: 'nivel1Count',
        CONTRIBUCION_NIVEL_2: 'nivel2Count',
        SERVICIO_FIN_SEMANA: 'finDeSemanaCount',
        STAFF_NIVEL_1: 'staffNivel1Count',
        STAFF_NIVEL_2: 'staffNivel2Count',
        STAFF_NIVEL_3: 'staffNivel3Count'
      };

      const fieldToIncrement = fieldMap[contribution.serviceLevel];

      let serviceLadder = await prisma.serviceLadderProgress.findUnique({
        where: { usuarioId: contribution.usuarioId }
      });

      if (!serviceLadder) {
        serviceLadder = await prisma.serviceLadderProgress.create({
          data: {
            usuarioId: contribution.usuarioId,
            [fieldToIncrement]: 1,
            totalServiceContributions: 1,
            visitedLocations: []
          }
        });
      } else {
        await prisma.serviceLadderProgress.update({
          where: { usuarioId: contribution.usuarioId },
          data: {
            [fieldToIncrement]: { increment: 1 },
            totalServiceContributions: { increment: 1 }
          }
        });
      }

      // Verificar logros
      const superNovaUnlocked = await checkSuperNovaUnlock(contribution.usuarioId);
      const ambassadorUnlocked = await checkAmbassadorBadge(contribution.usuarioId);

      return NextResponse.json({
        success: true,
        message: `Contribución aprobada. ${contribution.Usuario.nombre} recibió ${pcGranted} PC.`,
        rewards: {
          pcGranted,
          superNovaUnlocked,
          ambassadorUnlocked
        }
      });
    } else {
      // Rechazada
      return NextResponse.json({
        success: true,
        message: "Contribución rechazada."
      });
    }

  } catch (error: any) {
    console.error('Error reviewing contribution:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
