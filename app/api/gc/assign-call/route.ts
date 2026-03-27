import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Asignar llamada de seguimiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gc = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true, esGameChanger: true }
    });

    // Permitir si es rol GAMECHANGER o tiene flag esGameChanger (mentores que son GC)
    if (!gc || (gc.rol !== 'GAMECHANGER' && !gc.esGameChanger)) {
      return NextResponse.json({ error: 'Solo Game Changers pueden asignar llamadas' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, participantId, callDate, callTime } = body;

    if (!productId || !participantId || !callDate || !callTime) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Verificar que el participante está asignado a este GC
    const participante = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: participantId,
        gameChangerId: gc.id
      }
    });

    if (!participante) {
      // También buscar en vision_enrollments
      const enrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: participantId,
          // Verificar que el GC tiene acceso
        }
      });

      if (!enrollment) {
        return NextResponse.json({ error: 'Este participante no está asignado a ti' }, { status: 403 });
      }
    }

    // Crear o actualizar el slot de llamada
    const existingSlot = await prisma.gCCallSlot.findFirst({
      where: {
        participantId,
        gameChangerId: gc.id,
        // Dentro del rango de fechas del entrenamiento
      }
    });

    const scheduledDateTime = new Date(callDate);
    const [hours, minutes] = callTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    if (existingSlot) {
      await prisma.gCCallSlot.update({
        where: { id: existingSlot.id },
        data: {
          scheduledAt: scheduledDateTime,
          status: 'SCHEDULED'
        }
      });
    } else {
      await prisma.gCCallSlot.create({
        data: {
          participantId,
          gameChangerId: gc.id,
          scheduledAt: scheduledDateTime,
          status: 'SCHEDULED',
          callType: 'FOLLOW_UP'
        }
      });
    }

    logger.debug(`✅ Llamada asignada: GC ${gc.nombre} -> Participante ${participantId} para ${callDate} ${callTime}`);

    return NextResponse.json({
      success: true,
      message: 'Llamada asignada exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ Error asignando llamada:', error);
    return NextResponse.json(
      { error: 'Error al asignar llamada', message: error?.message },
      { status: 500 }
    );
  }
}

// GET - Verificar llamadas pendientes (para el bloqueo)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gc = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, esGameChanger: true }
    });

    // Permitir si es rol GAMECHANGER o tiene flag esGameChanger (mentores que son GC)
    if (!gc || (gc.rol !== 'GAMECHANGER' && !gc.esGameChanger)) {
      return NextResponse.json({ error: 'Solo Game Changers' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    // Obtener participantes asignados a este GC para este producto/visión
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) },
      select: { visionId: true }
    });

    if (!product?.visionId) {
      return NextResponse.json({ pendingCount: 0, participants: [] });
    }

    // Obtener participantes de la visión asignados a este GC
    const participantes = await prisma.visionParticipante.findMany({
      where: {
        visionId: product.visionId,
        gameChangerId: gc.id
      },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: { id: true, nombre: true, email: true, telefono: true }
        }
      }
    });

    // Verificar cuáles tienen llamadas asignadas
    const participantIds = participantes.map(p => p.participanteId);
    
    const callsAssigned = await prisma.gCCallSlot.findMany({
      where: {
        participantId: { in: participantIds },
        gameChangerId: gc.id,
        status: 'SCHEDULED'
      },
      select: { participantId: true, scheduledAt: true }
    });

    const callsMap = new Map(callsAssigned.map(c => [c.participantId, c.scheduledAt]));

    const participantsWithStatus = participantes.map(p => ({
      id: p.Usuario_VisionParticipante_participanteIdToUsuario.id,
      nombre: p.Usuario_VisionParticipante_participanteIdToUsuario.nombre,
      email: p.Usuario_VisionParticipante_participanteIdToUsuario.email,
      telefono: p.Usuario_VisionParticipante_participanteIdToUsuario.telefono,
      callAssigned: callsMap.has(p.participanteId) 
        ? { 
            date: callsMap.get(p.participanteId)!.toISOString(),
            time: callsMap.get(p.participanteId)!.toTimeString().slice(0, 5)
          }
        : null
    }));

    const pendingCount = participantsWithStatus.filter(p => !p.callAssigned).length;

    return NextResponse.json({
      pendingCount,
      participants: participantsWithStatus
    });

  } catch (error: any) {
    logger.error('❌ Error verificando llamadas:', error);
    return NextResponse.json(
      { error: 'Error al verificar llamadas', message: error?.message },
      { status: 500 }
    );
  }
}
