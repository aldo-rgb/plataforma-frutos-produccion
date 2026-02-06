import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Reiniciar declaraciones del usuario (wizard completo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del usuario incluyendo el tier
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        tier: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si el usuario está en una visión activa
    const visionParticipacion = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: session.user.id
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            isActive: true
          }
        }
      }
    });

    // Si está en una visión activa Y NO es tier FREE, no puede reiniciar
    // Usuarios FREE pueden reiniciar siempre, incluso en visión activa
    const isFreeTier = usuario.tier === 'FREE';
    if (visionParticipacion && visionParticipacion.Vision.isActive && !isFreeTier) {
      return NextResponse.json({
        success: false,
        error: 'No puedes reiniciar tus declaraciones mientras estés en una visión activa',
        details: {
          visionName: visionParticipacion.Vision.nombre
        }
      }, { status: 400 });
    }

    // Si es usuario individual (PARTICIPANTE sin visión activa), puede reiniciar siempre
    // Si está en visión pero el ciclo terminó, también puede reiniciar

    // Obtener la carta actual
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: session.user.id }
    });

    if (!carta) {
      return NextResponse.json({
        success: false,
        error: 'No tienes una carta creada aún'
      }, { status: 404 });
    }

    // REINICIAR DECLARACIONES: Limpiar campos del wizard
    await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        // PASO 1: Declaraciones del Ser
        finanzasDeclaracion: null,
        relacionesDeclaracion: null,
        talentosDeclaracion: null,
        pazMentalDeclaracion: null,
        ocioDeclaracion: null,
        saludDeclaracion: null,

        // Estado: volver a BORRADOR
        estado: 'BORRADOR'
      }
    });

    // Buscar enrollment activo
    const activeEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    });
    if (activeEnrollment) {
      await prisma.programEnrollment.update({
        where: { id: activeEnrollment.id },
        data: {
          status: 'PENDING_CARTA'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Declaraciones reiniciadas correctamente. Puedes comenzar de nuevo.',
      data: {
        cartaId: carta.id,
        wasInEnrollment: !!activeEnrollment
      }
    });
  } catch (error) {
    logger.error('Error al reiniciar declaraciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno al reiniciar declaraciones'
    }, { status: 500 });
  }
}

// GET - Verificar si el usuario puede reiniciar sus declaraciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        tier: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Usuarios FREE siempre pueden reiniciar, incluso en visión activa
    const isFreeTier = usuario.tier === 'FREE';
    
    if (isFreeTier) {
      return NextResponse.json({
        success: true,
        canReset: true,
        reason: 'Puedes reiniciar tus declaraciones',
        activeVision: null
      });
    }

    // Para usuarios con tier pagado, verificar si está en visión activa
    const visionParticipacion = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: session.user.id
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            isActive: true
          }
        }
      }
    });

    const isInActiveVision = visionParticipacion && visionParticipacion.Vision.isActive;

    return NextResponse.json({
      success: true,
      canReset: !isInActiveVision,
      reason: isInActiveVision
        ? `Estás en un ciclo activo de "${visionParticipacion?.Vision.nombre}". Espera a que termine para reiniciar.`
        : 'Puedes reiniciar tus declaraciones',
      activeVision: isInActiveVision && visionParticipacion ? {
        name: visionParticipacion.Vision.nombre
      } : null
    });
  } catch (error) {
    logger.error('Error al verificar reinicio:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno'
    }, { status: 500 });
  }
}
