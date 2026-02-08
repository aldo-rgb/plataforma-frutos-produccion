// 💳 Sistema de Gestión de Créditos de Sesiones de Paquetes
import { prisma } from '@/lib/prisma';

/**
 * Crea el registro de créditos al completar la compra de un paquete
 */
export async function createPackageCredits(
  packageOrderId: string,
  totalSessions: number,
  expiresAt?: Date
) {
  try {
    const credits = await prisma.packageSessionCredits.create({
      data: {
        packageOrderId,
        totalSessions,
        remainingSessions: totalSessions,
        usedSessions: 0,
        isActive: true,
        expiresAt,
      },
    });

    console.log(`✅ Créditos creados para paquete ${packageOrderId}: ${totalSessions} sesiones`);
    return credits;
  } catch (error) {
    console.error('❌ Error creando créditos de paquete:', error);
    throw error;
  }
}

/**
 * Valida si un usuario tiene créditos disponibles para agendar una sesión
 */
export async function validateSessionCredits(
  userId: number,
  mentorId: number
): Promise<{
  hasCredits: boolean;
  packageOrderId?: string;
  remainingSessions?: number;
  message: string;
}> {
  try {
    // Buscar paquetes activos del usuario con el mentor
    const activePackage = await prisma.mentorPackageOrder.findFirst({
      where: {
        usuarioId: userId,
        mentorId: mentorId,
        status: 'COMPLETED',
      },
      include: {
        PackageSessionCredits: true,
      },
      orderBy: {
        paidAt: 'desc', // El más reciente
      },
    });

    if (!activePackage) {
      return {
        hasCredits: false,
        message: 'No tienes un paquete activo con este mentor',
      };
    }

    const credits = activePackage.PackageSessionCredits;

    if (!credits) {
      return {
        hasCredits: false,
        message: 'El paquete no tiene créditos registrados',
      };
    }

    if (!credits.isActive) {
      return {
        hasCredits: false,
        message: 'El paquete está inactivo',
      };
    }

    if (credits.expiresAt && new Date() > credits.expiresAt) {
      // Marcar como inactivo si ya expiró
      await prisma.packageSessionCredits.update({
        where: { id: credits.id },
        data: { isActive: false },
      });

      return {
        hasCredits: false,
        message: 'El paquete ha expirado',
      };
    }

    if (credits.remainingSessions <= 0) {
      return {
        hasCredits: false,
        packageOrderId: activePackage.id,
        remainingSessions: 0,
        message: 'Has agotado todas las sesiones del paquete',
      };
    }

    return {
      hasCredits: true,
      packageOrderId: activePackage.id,
      remainingSessions: credits.remainingSessions,
      message: `Tienes ${credits.remainingSessions} sesiones disponibles`,
    };
  } catch (error) {
    console.error('❌ Error validando créditos:', error);
    return {
      hasCredits: false,
      message: 'Error al validar créditos',
    };
  }
}

/**
 * Consume un crédito al agendar una sesión
 */
export async function consumeSessionCredit(packageOrderId: string) {
  try {
    const credits = await prisma.packageSessionCredits.findUnique({
      where: { packageOrderId },
    });

    if (!credits) {
      throw new Error(`No se encontraron créditos para el paquete ${packageOrderId}`);
    }

    if (credits.remainingSessions <= 0) {
      throw new Error('No hay sesiones disponibles en este paquete');
    }

    const updated = await prisma.packageSessionCredits.update({
      where: { packageOrderId },
      data: {
        usedSessions: credits.usedSessions + 1,
        remainingSessions: credits.remainingSessions - 1,
        updatedAt: new Date(),
      },
    });

    console.log(
      `💳 Sesión consumida del paquete ${packageOrderId}. Restantes: ${updated.remainingSessions}`
    );

    return updated;
  } catch (error) {
    console.error('❌ Error consumiendo crédito:', error);
    throw error;
  }
}

/**
 * Libera un crédito al cancelar una sesión
 */
export async function refundSessionCredit(packageOrderId: string) {
  try {
    const credits = await prisma.packageSessionCredits.findUnique({
      where: { packageOrderId },
    });

    if (!credits) {
      throw new Error(`No se encontraron créditos para el paquete ${packageOrderId}`);
    }

    if (credits.usedSessions <= 0) {
      console.warn('⚠️ No hay sesiones usadas para reembolsar');
      return credits;
    }

    const updated = await prisma.packageSessionCredits.update({
      where: { packageOrderId },
      data: {
        usedSessions: credits.usedSessions - 1,
        remainingSessions: credits.remainingSessions + 1,
        updatedAt: new Date(),
      },
    });

    console.log(
      `🔄 Crédito reembolsado al paquete ${packageOrderId}. Restantes: ${updated.remainingSessions}`
    );

    return updated;
  } catch (error) {
    console.error('❌ Error reembolsando crédito:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de créditos de un paquete
 */
export async function getPackageCreditsStatus(packageOrderId: string) {
  try {
    const credits = await prisma.packageSessionCredits.findUnique({
      where: { packageOrderId },
      include: {
        MentorPackageOrder: {
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            Mentor: {
              select: {
                id: true,
                nombre: true,
              },
            },
            CallBooking: {
              where: {
                packageOrderId,
              },
              select: {
                id: true,
                scheduledAt: true,
                status: true,
                completedAt: true,
              },
              orderBy: {
                scheduledAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!credits) {
      return null;
    }

    return {
      ...credits,
      percentageUsed: ((credits.usedSessions / credits.totalSessions) * 100).toFixed(1),
      isExpiringSoon:
        credits.expiresAt && credits.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000, // 7 días
    };
  } catch (error) {
    console.error('❌ Error obteniendo estado de créditos:', error);
    return null;
  }
}

/**
 * Obtiene todos los paquetes activos de un usuario
 */
export async function getUserActivePackages(userId: number) {
  try {
    const packages = await prisma.mentorPackageOrder.findMany({
      where: {
        usuarioId: userId,
        status: 'COMPLETED',
      },
      include: {
        PackageSessionCredits: true,
        Mentor: {
          select: {
            id: true,
            nombre: true,
            PerfilMentor: {
              select: {
                titulo: true,
                especialidad: true,
              },
            },
          },
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    return packages.filter(
      (pkg) =>
        pkg.PackageSessionCredits &&
        pkg.PackageSessionCredits.isActive &&
        pkg.PackageSessionCredits.remainingSessions > 0
    );
  } catch (error) {
    console.error('❌ Error obteniendo paquetes activos:', error);
    return [];
  }
}

/**
 * Verifica y marca paquetes expirados
 */
export async function checkExpiredPackages() {
  try {
    const expiredPackages = await prisma.packageSessionCredits.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    if (expiredPackages.length === 0) {
      console.log('✅ No hay paquetes expirados');
      return [];
    }

    // Marcar como inactivos
    await prisma.packageSessionCredits.updateMany({
      where: {
        id: {
          in: expiredPackages.map((p) => p.id),
        },
      },
      data: {
        isActive: false,
      },
    });

    console.log(`⏰ ${expiredPackages.length} paquetes marcados como expirados`);
    return expiredPackages;
  } catch (error) {
    console.error('❌ Error verificando paquetes expirados:', error);
    return [];
  }
}
