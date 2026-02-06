import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener notificaciones de capitanías y votaciones pendientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // 1. Obtener notificaciones de capitanías pendientes (no leídas)
    const captaincyNotifications = await prisma.captaincyNotification.findMany({
      where: {
        userId: userId,
        isRead: false
      },
      include: {
        assignment: {
          include: {
            captaincy: {
              include: {
                vision: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 2. Obtener las visiones donde el usuario participa
    // Usar múltiples fuentes: TribeMemberSize, TicketPurchase activos, VisionStaff, TribeCaptainAssignment, vision_enrollments (PL)
    const [memberSizes, ticketPurchases, staffAssignments, captainAssignments, visionEnrollments] = await Promise.all([
      // Visiones donde tiene talla registrada
      prisma.tribeMemberSize.findMany({
        where: { userId },
        select: { visionId: true }
      }),
      // Visiones donde compró ticket (COMPLETED o APPROVED)
      prisma.ticketPurchase.findMany({
        where: { 
          userId: userId,
          status: { in: ['COMPLETED', 'REFUNDED'] } // COMPLETED significa pagado
        },
        select: { visionId: true }
      }),
      // Visiones donde es staff
      prisma.visionStaff.findMany({
        where: { userId },
        select: { visionId: true }
      }),
      // Visiones donde es capitán
      prisma.tribeCaptainAssignment.findMany({
        where: { 
          userId,
          status: 'ACCEPTED'
        },
        include: {
          captaincy: {
            select: { visionId: true }
          }
        }
      }),
      // Visiones donde es participante de PL (vision_enrollments)
      prisma.vision_enrollments.findMany({
        where: { userId },
        select: { visionId: true }
      })
    ]);

    // Combinar todas las visiones únicas
    const visionIdsSet = new Set<number>();
    memberSizes.forEach(m => visionIdsSet.add(m.visionId));
    ticketPurchases.forEach(t => visionIdsSet.add(t.visionId));
    staffAssignments.forEach(s => visionIdsSet.add(s.visionId));
    captainAssignments.forEach(c => visionIdsSet.add(c.captaincy.visionId));
    visionEnrollments.forEach(e => visionIdsSet.add(e.visionId));

    const visionIds = Array.from(visionIdsSet);

    // Obtener votaciones activas donde el usuario NO ha votado
    const pendingPolls = visionIds.length > 0 ? await prisma.tribePoll.findMany({
      where: {
        visionId: { in: visionIds },
        status: 'ACTIVE',
        // Solo votaciones que están en período activo
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } }
            ]
          }
        ],
        // Excluir votaciones donde el usuario ya votó
        votes: {
          none: {
            userId: userId
          }
        }
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        options: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) : [];

    // Formatear notificaciones de capitanías
    const formattedCaptaincyNotifications = captaincyNotifications.map(notif => ({
      id: notif.id,
      type: 'CAPTAINCY_NOMINATION' as const,
      title: notif.title,
      message: notif.message,
      roleType: notif.assignment.captaincy.roleType,
      visionId: notif.assignment.captaincy.visionId,
      visionName: notif.assignment.captaincy.vision.nombre,
      assignmentId: notif.assignmentId,
      createdAt: notif.createdAt.toISOString()
    }));

    // Formatear votaciones pendientes
    const formattedPendingPolls = pendingPolls.map(poll => ({
      id: poll.id,
      type: 'PENDING_VOTE' as const,
      title: `¡Tu voto es importante!`,
      message: poll.title,
      category: poll.category,
      visionId: poll.visionId,
      visionName: poll.vision.nombre,
      optionsCount: poll.options.length,
      votesCount: poll._count.votes,
      endDate: poll.endDate?.toISOString() || null,
      createdAt: poll.createdAt.toISOString()
    }));

    // 3. Verificar pagos pendientes de playeras
    // Buscar visiones donde el usuario votó en encuesta LOGO con talla pero NO ha pagado
    const pendingShirtPayments: Array<{
      id: number;
      type: 'PENDING_SHIRT_PAYMENT';
      title: string;
      message: string;
      visionId: number;
      visionName: string;
      size: string;
      amount: number;
      treasurerName: string | null;
      treasurerPhone: string | null;
      createdAt: string;
    }> = [];

    // Para cada visión donde participa, verificar si tiene talla y no ha pagado
    for (const visId of visionIds) {
      // Buscar voto con talla en encuesta LOGO
      const voteWithSize = await prisma.tribePollVote.findFirst({
        where: {
          userId,
          shirtSize: { not: null },
          poll: {
            visionId: visId,
            category: 'LOGO'
          }
        },
        include: {
          poll: {
            include: {
              vision: {
                select: { id: true, nombre: true }
              }
            }
          }
        }
      });

      if (voteWithSize && voteWithSize.shirtSize) {
        // Verificar si ya pagó (tiene orden de playera)
        const existingOrder = await prisma.tribeShirtOrder.findFirst({
          where: {
            visionId: visId,
            userId,
            status: { not: 'CANCELLED' }
          }
        });

        if (!existingOrder) {
          // Obtener precio de la cotización desde bankAccount.referenceNote
          const bankAccount = await prisma.tribeBankAccount.findUnique({
            where: { visionId: visId }
          });

          let shirtPrice = 0;
          if (bankAccount?.referenceNote) {
            try {
              const config = JSON.parse(bankAccount.referenceNote);
              shirtPrice = config.shirtPrice || 0;
            } catch (e) {}
          }

          // Solo agregar si hay cotización configurada (shirtPrice > 0)
          if (shirtPrice > 0) {
            // Buscar al tesorero de esta visión
            const treasurerAssignment = await prisma.tribeCaptainAssignment.findFirst({
              where: {
                captaincy: {
                  visionId: visId,
                  roleType: 'TREASURER'
                },
                status: 'ACCEPTED'
              },
              include: {
                user: {
                  select: {
                    nombre: true,
                    telefono: true
                  }
                }
              }
            });

            pendingShirtPayments.push({
              id: voteWithSize.id,
              type: 'PENDING_SHIRT_PAYMENT',
              title: '👕 Pago de playera pendiente',
              message: `Tu playera talla ${voteWithSize.shirtSize} está pendiente de pago`,
              visionId: visId,
              visionName: voteWithSize.poll.vision.nombre,
              size: voteWithSize.shirtSize,
              amount: shirtPrice,
              treasurerName: treasurerAssignment?.user?.nombre || null,
              treasurerPhone: treasurerAssignment?.user?.telefono || null,
              createdAt: voteWithSize.votedAt.toISOString()
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      captaincyNotifications: formattedCaptaincyNotifications,
      pendingPolls: formattedPendingPolls,
      pendingShirtPayments,
      totalCount: formattedCaptaincyNotifications.length + formattedPendingPolls.length + pendingShirtPayments.length
    });

  } catch (error) {
    logger.error('Error al obtener notificaciones de tribu:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Marcar notificación de capitanía como leída
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId requerido' }, { status: 400 });
    }

    // Marcar como leída
    await prisma.captaincyNotification.updateMany({
      where: {
        id: notificationId,
        userId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error al marcar notificación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
