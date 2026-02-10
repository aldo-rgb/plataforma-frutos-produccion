import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Asignar múltiples participantes a un mentor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { mentorId, userIds } = body; // userIds es un array de IDs

    if (isNaN(visionId) || !mentorId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos. Se requiere mentorId y un array de userIds.' },
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
        isActive: true,
        esMentor: true
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

    // 🚫 VALIDAR LÍMITE DE PAQUETES PARA MENTORES PROFESIONALES (no LIDER)
    if (mentor.rol !== 'LIDER') {
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

      // Si no hay paquetes contratados para mentores profesionales, no permitir
      if (totalPaquetes === 0) {
        return NextResponse.json(
          { 
            error: `No hay paquetes contratados para el mentor "${mentor.nombre}" en esta visión.`,
            details: { mentorNombre: mentor.nombre, paquetesContratados: 0 }
          },
          { status: 400 }
        );
      }

      // Verificar que no se exceda el límite
      const espaciosDisponibles = totalPaquetes - usuariosAsignados;
      if (userIds.length > espaciosDisponibles) {
        return NextResponse.json(
          { 
            error: `El mentor "${mentor.nombre}" solo tiene ${espaciosDisponibles} espacio(s) disponible(s), pero intentas asignar ${userIds.length} participante(s).`,
            details: {
              mentorNombre: mentor.nombre,
              paquetesContratados: totalPaquetes,
              usuariosAsignados,
              espaciosDisponibles,
              intentandoAsignar: userIds.length
            }
          },
          { status: 400 }
        );
      }
    }

    // Asignar mentor a todos los usuarios
    const results = {
      success: [] as { userId: number; nombre: string }[],
      errors: [] as { userId: number; error: string }[]
    };

    for (const userId of userIds) {
      try {
        // Verificar que el usuario existe y está en la visión
        const usuario = await prisma.usuario.findUnique({
          where: { id: userId },
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true
          }
        });

        if (!usuario) {
          results.errors.push({ userId, error: 'Usuario no encontrado' });
          continue;
        }

        // Verificar que está en la visión
        const enVision = await prisma.visionParticipante.findFirst({
          where: { visionId, participanteId: userId }
        }) || await prisma.visionGameChanger.findFirst({
          where: { visionId, gameChangerId: userId }
        });

        if (!enVision) {
          results.errors.push({ userId, error: `${usuario.nombre} no está en esta visión` });
          continue;
        }

        // Si ya tiene este mentor asignado, saltar
        if (usuario.assignedMentorId === mentorId) {
          results.success.push({ userId, nombre: usuario.nombre });
          continue;
        }

        // Cancelar llamadas pendientes si tenía otro mentor
        if (usuario.assignedMentorId) {
          await prisma.callBooking.updateMany({
            where: {
              studentId: userId,
              type: 'DISCIPLINE',
              status: 'PENDING',
              scheduledAt: { gte: new Date() }
            },
            data: { status: 'CANCELLED' }
          });
        }

        // Actualizar el assignedMentorId del usuario
        await prisma.usuario.update({
          where: { id: userId },
          data: { assignedMentorId: mentorId }
        });

        // Crear o actualizar ProgramEnrollment si no existe
        const existingEnrollment = await prisma.programEnrollment.findFirst({
          where: {
            userId,
            status: { in: ['ACTIVE', 'ENROLLED'] }
          }
        });

        if (existingEnrollment) {
          await prisma.programEnrollment.update({
            where: { id: existingEnrollment.id },
            data: { mentorId }
          });
        }

        // Crear notificación para el participante
        await prisma.notification.create({
          data: {
            usuarioId: userId,
            titulo: '🎉 Mentor Asignado',
            mensaje: `Se te ha asignado al mentor ${mentor.nombre} para tus llamadas de disciplina.`,
            tipo: 'MENTOR_ASSIGNED',
            leida: false
          }
        });

        results.success.push({ userId, nombre: usuario.nombre });
        logger.info(`✅ Mentor ${mentor.nombre} asignado a ${usuario.nombre}`);
      } catch (error: any) {
        logger.error(`Error asignando mentor a usuario ${userId}:`, error);
        results.errors.push({ userId, error: error.message || 'Error desconocido' });
      }
    }

    // Notificar al mentor
    if (results.success.length > 0) {
      const nombresAsignados = results.success.map(s => s.nombre).join(', ');
      await prisma.notification.create({
        data: {
          usuarioId: mentorId,
          titulo: '👥 Nuevos Participantes Asignados',
          mensaje: `Se te han asignado ${results.success.length} nuevo(s) participante(s): ${nombresAsignados}`,
          tipo: 'NEW_STUDENT',
          leida: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Se asignaron ${results.success.length} participante(s) al mentor ${mentor.nombre}`,
      results
    });

  } catch (error) {
    logger.error('Error en assign-participants-to-mentor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
