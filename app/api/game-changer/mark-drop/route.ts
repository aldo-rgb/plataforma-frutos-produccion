import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { releaseMentorScheduleOnDrop } from '@/lib/mentor-schedule';

// API para que el GameChanger marque a un participante como DROP (abandonó el entrenamiento)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gameChanger = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!gameChanger) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo GameChangers y Trainers pueden usar esta función
    if (!['GAMECHANGER', 'TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'].includes(gameChanger.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, reason } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId es requerido' }, { status: 400 });
    }

    // Buscar el miembro del grupo
    const member = await prisma.smallGroupMember.findUnique({
      where: { id: memberId },
      include: {
        SmallGroup: {
          select: { 
            id: true, 
            leaderId: true, 
            visionId: true,
            name: true,
            level: true  // Necesitamos el nivel del grupo
          }
        },
        Usuario_SmallGroupMember_userIdToUsuario: {
          select: { id: true, nombre: true, email: true }
        },
        vision_enrollments: {
          select: { id: true, attendanceStatus: true, level: true, visionId: true }
        }
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
    }

    // Verificar que el GC sea el líder del grupo
    if (gameChanger.rol === 'GAMECHANGER' || gameChanger.rol === 'TRAINER') {
      if (member.SmallGroup.leaderId !== gameChanger.id) {
        return NextResponse.json({ 
          error: 'No eres el líder de este grupo' 
        }, { status: 403 });
      }
    }

    // ⚠️ IMPORTANTE: Buscar el enrollment CORRECTO basado en el nivel del grupo
    // No usar member.enrollmentId porque puede estar desactualizado o ser de otro nivel
    const groupLevel = member.SmallGroup.level; // BASIC, ADVANCED, o PL
    const visionId = member.SmallGroup.visionId;

    // Buscar el enrollment del usuario en el nivel y visión correctos
    const correctEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: member.Usuario_SmallGroupMember_userIdToUsuario.id,
        visionId: visionId,
        level: groupLevel
      }
    });

    if (!correctEnrollment) {
      return NextResponse.json({ 
        error: `No se encontró enrollment de ${groupLevel} para este participante en esta visión` 
      }, { status: 404 });
    }

    // Actualizar el enrollment correcto a DROP
    await prisma.vision_enrollments.update({
      where: { id: correctEnrollment.id },
      data: { 
        attendanceStatus: 'DROP',
        droppedAt: new Date()
      }
    });

    // Crear notificación de auditoría para el GC
    await prisma.notification.create({
      data: {
        userId: gameChanger.id,
        type: 'OTHER',
        title: 'Participante Marcado como DROP',
        message: `Marcaste a ${member.Usuario_SmallGroupMember_userIdToUsuario.nombre} como DROP en ${groupLevel} (grupo "${member.SmallGroup.name}"). Razón: ${reason || 'No especificada'}`,
        relatedId: correctEnrollment.id
      }
    });

    // Crear notificación para el participante
    await prisma.notification.create({
      data: {
        userId: member.Usuario_SmallGroupMember_userIdToUsuario.id,
        type: 'SYSTEM_ALERT',
        title: 'Estado de Inscripción Actualizado',
        message: `Tu inscripción en el entrenamiento ${groupLevel} ha sido marcada como DROP por tu Game Changer. Contacta a tu coordinador para más información.`,
        relatedId: correctEnrollment.id
      }
    });

    // Marcar el miembro del grupo como inactivo
    await prisma.smallGroupMember.update({
      where: { id: memberId },
      data: { 
        isActive: false,
        removedAt: new Date(),
        removedReason: reason || 'Abandonó el entrenamiento'
      }
    });

    // ========================================
    // LIBERAR ESPACIOS DE MENTOR
    // Cancelar todas las llamadas pendientes del usuario con su mentor
    // ========================================
    const mentorScheduleResult = await releaseMentorScheduleOnDrop(
      member.Usuario_SmallGroupMember_userIdToUsuario.id,
      visionId
    );
    
    if (mentorScheduleResult.success && mentorScheduleResult.callsCancelled > 0) {
      logger.debug(`📅 ${mentorScheduleResult.callsCancelled} llamada(s) de mentor canceladas para usuario ${member.Usuario_SmallGroupMember_userIdToUsuario.id}`);
    }

    logger.debug(`🚫 Participante ${member.Usuario_SmallGroupMember_userIdToUsuario.nombre} marcado como DROP en ${groupLevel} por GC ${gameChanger.nombre}`);

    return NextResponse.json({
      success: true,
      message: `Participante marcado como DROP en ${groupLevel} correctamente`,
      participant: {
        id: member.Usuario_SmallGroupMember_userIdToUsuario.id,
        nombre: member.Usuario_SmallGroupMember_userIdToUsuario.nombre,
        status: 'DROP',
        level: groupLevel
      },
      mentorSchedule: {
        callsCancelled: mentorScheduleResult.callsCancelled,
        mentorsAffected: mentorScheduleResult.mentorsAffected
      }
    });

  } catch (error: any) {
    logger.error('❌ Error marcando DROP:', error);
    return NextResponse.json(
      { error: 'Error al marcar participante como DROP', message: error?.message },
      { status: 500 }
    );
  }
}
