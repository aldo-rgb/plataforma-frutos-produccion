import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


// POST - Asignar mentor a participante o game changer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { userId, mentorId, userType } = body; // userType: 'PARTICIPANTE' o 'GAMECHANGER'

    if (isNaN(visionId) || !userId || !mentorId || !userType) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: { Organization: true }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el mentor existe y está activo
    const mentor = await prisma.usuario.findFirst({
      where: {
        id: mentorId,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        rol: true,
        organizationId: true,
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      }
    });

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado o no está activo' },
        { status: 404 }
      );
    }

    if (mentor.CallAvailability.length === 0) {
      return NextResponse.json(
        { error: 'El mentor no tiene horarios de llamadas de disciplina configurados' },
        { status: 400 }
      );
    }

    // 🚫 VALIDAR LÍMITE DE PAQUETES PARA MENTORES PROFESIONALES
    if (mentor.rol === 'MENTOR') {
      // Obtener paquetes contratados para este mentor en esta visión
      const paquetesContratados = await prisma.mentorPackageOrder.findMany({
        where: {
          visionId,
          mentorId,
          status: 'COMPLETED'
        },
        select: { cantidad: true }
      });

      const totalPaquetes = paquetesContratados.reduce((sum, p) => sum + p.cantidad, 0);

      // Contar usuarios ya asignados a este mentor en esta visión
      const usuariosAsignados = await prisma.vision_enrollments.count({
        where: {
          visionId,
          level: 'PL',
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] },
          Usuario_vision_enrollments_userIdToUsuario: {
            assignedMentorId: mentorId
          }
        }
      });

      // Si el usuario actual ya tiene este mentor asignado, no contar (es un cambio)
      const usuarioActual = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { assignedMentorId: true }
      });

      const esReasignacion = usuarioActual?.assignedMentorId === mentorId;

      if (!esReasignacion && totalPaquetes > 0 && usuariosAsignados >= totalPaquetes) {
        return NextResponse.json(
          { 
            error: `El mentor "${mentor.nombre}" ya tiene ${usuariosAsignados} usuarios asignados y solo se contrataron ${totalPaquetes} paquete(s). Contrata más paquetes para asignar más usuarios.`,
            details: {
              mentorNombre: mentor.nombre,
              paquetesContratados: totalPaquetes,
              usuariosAsignados
            }
          },
          { status: 400 }
        );
      }

      // Si no hay paquetes contratados, no permitir asignar
      if (totalPaquetes === 0) {
        return NextResponse.json(
          { 
            error: `No hay paquetes contratados para el mentor "${mentor.nombre}" en esta visión. Debes contratar paquetes primero.`,
            details: {
              mentorNombre: mentor.nombre,
              paquetesContratados: 0
            }
          },
          { status: 400 }
        );
      }
    }

    // Verificar que el usuario existe y tiene licencia
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        licenseCode: true,
        rol: true,
        assignedMentorId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario ya tenía un mentor asignado (cambio de mentor)
    const hadPreviousMentor = usuario.assignedMentorId !== null;
    let cancelledCalls = 0;
    let remainingWeeks = 0;

    // Si había un mentor anterior, cancelar llamadas programadas y calcular semanas restantes
    if (hadPreviousMentor) {
      const now = new Date();
      
      // Cancelar llamadas de disciplina programadas
      const cancelResult = await prisma.callBooking.updateMany({
        where: {
          studentId: userId,
          type: 'DISCIPLINE',
          status: 'PENDING',
          scheduledAt: {
            gte: now
          }
        },
        data: {
          status: 'CANCELLED'
        }
      });
      cancelledCalls = cancelResult.count;

      // Calcular semanas restantes del ciclo
      const enrollment = await prisma.programEnrollment.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE'
        },
        select: {
          cycleEndDate: true,
          cycleType: true
        }
      });

      if (enrollment?.cycleEndDate) {
        const cycleEnd = new Date(enrollment.cycleEndDate);
        const diffTime = cycleEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        remainingWeeks = Math.ceil(diffDays / 7);
      }

      // Crear notificación si hay llamadas canceladas
      if (cancelledCalls > 0 && remainingWeeks > 0) {
        await prisma.notification.create({
          data: {
            userId: userId,
            type: 'MENTOR_ASSIGNMENT',
            title: 'Cambio de Mentor - Reagenda tus Llamadas',
            message: `Tu mentor ha cambiado. Se han cancelado ${cancelledCalls} llamada(s) de disciplina programada(s). Tienes ${remainingWeeks} semana(s) restante(s) en tu ciclo. Por favor, agenda nuevamente tus llamadas de disciplina con tu nuevo mentor lo antes posible.`,
            isRead: false
          }
        });
      }
    }

    // Actualizar el usuario con el mentor asignado
    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: {
        assignedMentorId: mentorId
      },
      include: {
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      }
    });

    // Actualizar también en la tabla de relación si es participante
    if (userType === 'PARTICIPANTE') {
      await prisma.visionParticipante.updateMany({
        where: {
          visionId,
          participanteId: userId
        },
        data: {
          gameChangerId: mentorId // Usamos este campo para trackear el mentor
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: hadPreviousMentor 
        ? `Mentor cambiado exitosamente. ${cancelledCalls > 0 ? `Se cancelaron ${cancelledCalls} llamada(s) y se notificó al usuario.` : ''}`
        : 'Mentor asignado exitosamente',
      user: updatedUser,
      cancelledCalls,
      remainingWeeks,
      hadPreviousMentor
    });

  } catch (error) {
    logger.error('Error al asignar mentor:', error);
    return NextResponse.json(
      { error: 'Error al asignar mentor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover mentor asignado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '');
    const userType = searchParams.get('userType') || '';

    if (isNaN(visionId) || isNaN(userId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Obtener información del usuario y su programa
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        assignedMentorId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Cancelar todas las llamadas de disciplina programadas futuras
    const now = new Date();
    const cancelledCalls = await prisma.callBooking.updateMany({
      where: {
        studentId: userId,
        type: 'DISCIPLINE',
        status: 'PENDING',
        scheduledAt: {
          gte: now
        }
      },
      data: {
        status: 'CANCELLED'
      }
    });

    // Calcular semanas restantes del ciclo
    let remainingWeeks = 0;
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE'
      },
      select: {
        cycleEndDate: true,
        cycleType: true
      }
    });
    
    if (enrollment?.cycleEndDate) {
      const cycleEnd = new Date(enrollment.cycleEndDate);
      const diffTime = cycleEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      remainingWeeks = Math.ceil(diffDays / 7);
    }

    // Crear notificación para el usuario
    if (cancelledCalls.count > 0 && remainingWeeks > 0) {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'MENTOR_ASSIGNMENT',
          title: 'Cambio de Mentor - Reagenda tus Llamadas',
          message: `Tu mentor ha sido removido. Se han cancelado ${cancelledCalls.count} llamada(s) de disciplina programada(s). Tienes ${remainingWeeks} semana(s) restante(s) en tu ciclo. Por favor, agenda nuevamente tus llamadas de disciplina lo antes posible para continuar con tu programa.`,
          isRead: false
        }
      });
    }

    // Remover mentor asignado
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        assignedMentorId: null
      }
    });

    // Limpiar también en la tabla de relación si es participante
    if (userType === 'PARTICIPANTE') {
      await prisma.visionParticipante.updateMany({
        where: {
          visionId,
          participanteId: userId
        },
        data: {
          gameChangerId: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Mentor removido exitosamente',
      cancelledCalls: cancelledCalls.count,
      remainingWeeks
    });

  } catch (error) {
    logger.error('Error al remover mentor:', error);
    return NextResponse.json(
      { error: 'Error al remover mentor' },
      { status: 500 }
    );
  }
}
