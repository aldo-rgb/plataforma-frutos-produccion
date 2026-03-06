import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

/**
 * GET /api/buddy
 * Obtiene el estado del buddy del usuario actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener la visión activa del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        apodo: true,
        telefono: true,
        profileImage: true,
        currentVisionLevel: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar enrollment activo en ADVANCED o PL
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        level: { in: ['ADVANCED', 'PL'] },
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      select: { visionId: true, level: true },
      orderBy: { level: 'desc' } // PL tiene prioridad si tiene ambos
    });

    if (!enrollment) {
      return NextResponse.json({
        success: true,
        status: 'NOT_IN_ADVANCED',
        message: 'Debes estar en entrenamiento AVANZADO o PL'
      });
    }

    const visionId = enrollment.visionId;

    // Buscar TODOS los buddy pairs (puede tener múltiples)
    const buddyPairs = await prisma.buddyPair.findMany({
      where: {
        visionId,
        OR: [
          { initiatorId: userId },
          { receiverId: userId }
        ],
        status: { in: ['PENDING', 'MATCHED'] }
      },
      include: {
        Usuario_BuddyPair_initiatorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apodo: true,
            profileImage: true,
            telefono: true,
          }
        },
        Usuario_BuddyPair_receiverIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apodo: true,
            profileImage: true,
            telefono: true,
          }
        }
      }
    });

    // Mapear para compatibilidad
    const mappedPairs = buddyPairs.map(p => ({
      ...p,
      initiator: p.Usuario_BuddyPair_initiatorIdToUsuario,
      receiver: p.Usuario_BuddyPair_receiverIdToUsuario
    }));

    // Procesar todos los buddy pairs
    const matchedBuddies: any[] = [];
    const pendingRequests: any[] = [];
    const pendingToAccept: any[] = [];

    for (const pair of mappedPairs) {
      const isInitiator = pair.initiatorId === userId;
      const buddy = isInitiator ? pair.receiver : pair.initiator;

      if (pair.status === 'MATCHED') {
        matchedBuddies.push({
          buddyPairId: pair.id,
          matchedAt: pair.matchedAt,
          buddy: {
            id: buddy.id,
            nombre: buddy.nombre,
            apodo: buddy.apodo,
            profileImage: buddy.profileImage,
            telefono: isInitiator ? pair.receiverPhone : pair.initiatorPhone,
          }
        });
      } else if (pair.status === 'PENDING') {
        if (isInitiator) {
          pendingRequests.push({
            buddyPairId: pair.id,
            buddy: {
              id: buddy.id,
              nombre: buddy.nombre,
              apodo: buddy.apodo,
              profileImage: buddy.profileImage,
            }
          });
        } else {
          pendingToAccept.push({
            buddyPairId: pair.id,
            buddy: {
              id: buddy.id,
              nombre: buddy.nombre,
              apodo: buddy.apodo,
              profileImage: buddy.profileImage,
            }
          });
        }
      }
    }

    // Determinar el status general
    let status = 'NO_BUDDY';
    if (matchedBuddies.length > 0) status = 'HAS_BUDDIES';
    else if (pendingToAccept.length > 0) status = 'PENDING_ACCEPT';
    else if (pendingRequests.length > 0) status = 'PENDING_RESPONSE';

    return NextResponse.json({
      success: true,
      status,
      visionId,
      matchedBuddies,
      pendingRequests,
      pendingToAccept,
      totalBuddies: matchedBuddies.length,
      message: matchedBuddies.length > 0 
        ? `Tienes ${matchedBuddies.length} buddy${matchedBuddies.length > 1 ? 's' : ''}`
        : 'En este camino no vas solo. Encuentra a tu Buddy.'
    });

  } catch (error) {
    logger.error('Error getting buddy:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/buddy
 * Acciones: initiate, accept, reject
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { action, targetUserId, buddyPairId, phone, address } = body;

    // Obtener visión del usuario (ADVANCED o PL)
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        level: { in: ['ADVANCED', 'PL'] },
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      select: { visionId: true, level: true },
      orderBy: { level: 'desc' }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'Debes estar en entrenamiento AVANZADO o PL para usar el Buddy System' 
      }, { status: 400 });
    }

    const visionId = enrollment.visionId;

    // =====================
    // ACCIÓN: INICIAR SOLICITUD
    // =====================
    if (action === 'initiate') {
      if (!targetUserId || !phone) {
        return NextResponse.json({ 
          error: 'Datos incompletos' 
        }, { status: 400 });
      }

      // Verificar que el target esté en ADVANCED o PL (cualquier visión)
      const targetEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: targetUserId,
          level: { in: ['ADVANCED', 'PL'] },
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        select: { visionId: true, level: true },
        orderBy: { level: 'desc' } // Priorizar PL
      });

      if (!targetEnrollment) {
        return NextResponse.json({ 
          error: 'Esta persona no está en entrenamiento AVANZADO o PL',
          code: 'NOT_IN_ADVANCED'
        }, { status: 400 });
      }

      // Verificar que no tenga ya una conexión con este mismo usuario
      const existingPairWithTarget = await prisma.buddyPair.findFirst({
        where: {
          OR: [
            { initiatorId: userId, receiverId: targetUserId },
            { initiatorId: targetUserId, receiverId: userId }
          ],
          status: { in: ['PENDING', 'MATCHED'] }
        }
      });

      if (existingPairWithTarget) {
        return NextResponse.json({ 
          error: 'Ya tienes una conexión con esta persona' 
        }, { status: 400 });
      }

      // Crear el BuddyPair con la visión del iniciador
      const newPair = await prisma.buddyPair.create({
        data: {
          id: crypto.randomUUID(),
          visionId,
          initiatorId: userId,
          receiverId: targetUserId,
          initiatorAccepted: true,
          initiatorSharedAt: new Date(),
          initiatorPhone: phone,
          status: 'PENDING'
        },
        include: {
          Usuario_BuddyPair_receiverIdToUsuario: {
            select: { nombre: true, apodo: true }
          }
        }
      });

      const receiver = newPair.Usuario_BuddyPair_receiverIdToUsuario;

      // TODO: Enviar notificación push al receiver

      return NextResponse.json({
        success: true,
        buddyPairId: newPair.id,
        message: `Solicitud enviada a ${receiver.apodo || receiver.nombre}`
      });
    }

    // =====================
    // ACCIÓN: ACEPTAR SOLICITUD
    // =====================
    if (action === 'accept') {
      if (!buddyPairId || !phone) {
        return NextResponse.json({ 
          error: 'Datos incompletos' 
        }, { status: 400 });
      }

      const pair = await prisma.buddyPair.findUnique({
        where: { id: buddyPairId }
      });

      if (!pair || pair.receiverId !== userId || pair.status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Solicitud no válida' 
        }, { status: 400 });
      }

      // Actualizar a MATCHED
      const updatedPair = await prisma.buddyPair.update({
        where: { id: buddyPairId },
        data: {
          receiverAccepted: true,
          receiverSharedAt: new Date(),
          receiverPhone: phone,
          status: 'MATCHED',
          matchedAt: new Date()
        },
        include: {
          Usuario_BuddyPair_initiatorIdToUsuario: {
            select: { nombre: true, apodo: true }
          }
        }
      });

      const initiator = updatedPair.Usuario_BuddyPair_initiatorIdToUsuario;

      // TODO: Enviar notificación al initiator

      return NextResponse.json({
        success: true,
        status: 'MATCHED',
        message: `¡Compromiso sellado con ${initiator.apodo || initiator.nombre}!`
      });
    }

    // =====================
    // ACCIÓN: RECHAZAR SOLICITUD
    // =====================
    if (action === 'reject') {
      if (!buddyPairId) {
        return NextResponse.json({ 
          error: 'Datos incompletos' 
        }, { status: 400 });
      }

      const pair = await prisma.buddyPair.findUnique({
        where: { id: buddyPairId }
      });

      if (!pair || pair.receiverId !== userId || pair.status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Solicitud no válida' 
        }, { status: 400 });
      }

      await prisma.buddyPair.update({
        where: { id: buddyPairId },
        data: {
          status: 'REJECTED'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitud rechazada'
      });
    }

    // =====================
    // ACCIÓN: ROMPER PACTO
    // =====================
    if (action === 'break') {
      if (!buddyPairId) {
        return NextResponse.json({ 
          error: 'Datos incompletos' 
        }, { status: 400 });
      }

      const pair = await prisma.buddyPair.findUnique({
        where: { id: buddyPairId }
      });

      if (!pair || (pair.initiatorId !== userId && pair.receiverId !== userId)) {
        return NextResponse.json({ 
          error: 'No tienes permiso para esta acción' 
        }, { status: 403 });
      }

      await prisma.buddyPair.update({
        where: { id: buddyPairId },
        data: {
          status: 'BROKEN',
          brokenAt: new Date(),
          brokenBy: userId,
          brokenReason: body.reason || 'Pacto roto por usuario'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Pacto roto'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    logger.error('Error in buddy action:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
