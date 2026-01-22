import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/buddy/scan
 * Escanear QR/NFC de un participante para iniciar buddy request
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { scannedUserId, badgeNumber, nfcId } = body;

    // Determinar el ID del usuario escaneado
    let targetUserId: number | null = null;

    if (scannedUserId) {
      targetUserId = parseInt(scannedUserId);
    } else if (badgeNumber) {
      // Buscar por número de gafete
      const checkIn = await prisma.checkInRecord.findFirst({
        where: { badgeNumber },
        select: { userId: true }
      });
      targetUserId = checkIn?.userId || null;
    } else if (nfcId) {
      // Buscar por NFC ID (podría estar en el badge)
      const checkIn = await prisma.checkInRecord.findFirst({
        where: { badgeNumber: nfcId },
        select: { userId: true }
      });
      targetUserId = checkIn?.userId || null;
    }

    if (!targetUserId) {
      return NextResponse.json({ 
        error: 'No se pudo identificar al participante' 
      }, { status: 400 });
    }

    if (targetUserId === userId) {
      return NextResponse.json({ 
        error: 'No puedes ser tu propio buddy 😅' 
      }, { status: 400 });
    }

    // Obtener visión del usuario actual (ADVANCED o PL)
    const myEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        level: { in: ['ADVANCED', 'PL'] },
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
      select: { visionId: true, level: true },
      orderBy: { level: 'desc' }
    });

    if (!myEnrollment) {
      return NextResponse.json({ 
        error: 'Debes estar en entrenamiento AVANZADO o PL' 
      }, { status: 400 });
    }

    // Verificar que el target esté en la misma visión y nivel ADVANCED o PL
    const targetEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: targetUserId,
        visionId: myEnrollment.visionId,
        level: { in: ['ADVANCED', 'PL'] },
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      }
    });

    if (!targetEnrollment) {
      return NextResponse.json({ 
        error: 'Esta persona no está en tu mismo entrenamiento AVANZADO o PL',
        code: 'DIFFERENT_VISION'
      }, { status: 400 });
    }

    // Verificar que no tenga YA una solicitud pendiente con este mismo usuario
    const existingPairWithTarget = await prisma.buddyPair.findFirst({
      where: {
        visionId: myEnrollment.visionId,
        OR: [
          { initiatorId: userId, receiverId: targetUserId },
          { initiatorId: targetUserId, receiverId: userId }
        ],
        status: { in: ['PENDING', 'MATCHED'] }
      }
    });

    if (existingPairWithTarget) {
      return NextResponse.json({ 
        error: 'Ya tienes una conexión con esta persona',
        code: 'ALREADY_CONNECTED'
      }, { status: 400 });
    }

    // Obtener datos del target para mostrar en el modal de confirmación
    const targetUser = await prisma.usuario.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nombre: true,
        apodo: true,
        profileImage: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      canConnect: true,
      targetUser: {
        id: targetUser.id,
        nombre: targetUser.nombre,
        apodo: targetUser.apodo,
        profileImage: targetUser.profileImage,
      },
      visionId: myEnrollment.visionId,
      message: `Puedes conectar con ${targetUser.apodo || targetUser.nombre}`
    });

  } catch (error) {
    console.error('Error scanning buddy:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
