import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/check-expired-memberships
 * Cron job que se ejecuta diariamente para:
 * 1. Desactivar mentores con membresía expirada
 * 2. Enviar notificaciones de expiración próxima
 */
export async function GET(req: Request) {
  try {
    // Verificar que la petición venga de Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      deactivated: 0,
      notifications: {
        thirtyDays: 0,
        sevenDays: 0,
        oneDay: 0
      }
    };

    // 1. Desactivar mentores con membresía expirada
    const expiredMentors = await prisma.perfilMentor.findMany({
      where: {
        membershipActive: true,
        membershipExpiryDate: {
          lte: now
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            email: true,
            nombre: true
          }
        }
      }
    });

    for (const mentor of expiredMentors) {
      await prisma.perfilMentor.update({
        where: { id: mentor.id },
        data: {
          membershipActive: false,
          disponible: false,
          acceptingNewClients: false
        }
      });

      // Actualizar registro de renovación
      const lastRenewal = await prisma.mentorMembershipRenewal.findFirst({
        where: { mentorId: mentor.id },
        orderBy: { createdAt: 'desc' }
      });

      if (lastRenewal && lastRenewal.status === 'ACTIVE') {
        await prisma.mentorMembershipRenewal.update({
          where: { id: lastRenewal.id },
          data: { status: 'EXPIRED' }
        });
      }

      // TODO: Enviar email de membresía expirada
      console.log(`Membresía expirada para mentor ${mentor.id} - ${mentor.Usuario.email}`);
      results.deactivated++;
    }

    // 2. Enviar notificaciones de expiración próxima
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Mentores que expiran en 30 días
    const expiring30Days = await prisma.perfilMentor.findMany({
      where: {
        membershipActive: true,
        membershipExpiryDate: {
          gte: new Date(thirtyDaysFromNow.setHours(0, 0, 0, 0)),
          lte: new Date(thirtyDaysFromNow.setHours(23, 59, 59, 999))
        }
      },
      include: {
        Usuario: true
      }
    });

    for (const mentor of expiring30Days) {
      // TODO: Enviar email recordatorio 30 días
      console.log(`Recordatorio 30 días para ${mentor.Usuario.email}`);
      results.notifications.thirtyDays++;
    }

    // Mentores que expiran en 7 días
    const expiring7Days = await prisma.perfilMentor.findMany({
      where: {
        membershipActive: true,
        membershipExpiryDate: {
          gte: new Date(sevenDaysFromNow.setHours(0, 0, 0, 0)),
          lte: new Date(sevenDaysFromNow.setHours(23, 59, 59, 999))
        }
      },
      include: {
        Usuario: true
      }
    });

    for (const mentor of expiring7Days) {
      // TODO: Enviar email recordatorio 7 días
      console.log(`Recordatorio 7 días para ${mentor.Usuario.email}`);
      results.notifications.sevenDays++;
    }

    // Mentores que expiran en 1 día
    const expiring1Day = await prisma.perfilMentor.findMany({
      where: {
        membershipActive: true,
        membershipExpiryDate: {
          gte: new Date(oneDayFromNow.setHours(0, 0, 0, 0)),
          lte: new Date(oneDayFromNow.setHours(23, 59, 59, 999))
        }
      },
      include: {
        Usuario: true
      }
    });

    for (const mentor of expiring1Day) {
      // TODO: Enviar email recordatorio 1 día
      console.log(`Recordatorio 1 día para ${mentor.Usuario.email}`);
      results.notifications.oneDay++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error) {
    console.error('Error checking expired memberships:', error);
    return NextResponse.json(
      { error: 'Error al verificar membresías' },
      { status: 500 }
    );
  }
}
