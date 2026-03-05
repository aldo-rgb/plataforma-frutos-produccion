import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/school-admin/visiones/[id]/assign-gc-to-participant
 * Asigna un Game Changer a un participante
 * 
 * Body: { enrollmentId: number, gameChangerId: number }
 * 
 * Proceso:
 * 1. Verificar que el GC tiene un SmallGroup para esta visión/nivel
 * 2. Si no tiene, crear uno automáticamente (Átomo)
 * 3. Agregar al participante como miembro del SmallGroup
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { enrollmentId, gameChangerId, level = 'BASIC' } = body;

    if (!enrollmentId || !gameChangerId) {
      return NextResponse.json(
        { success: false, error: 'enrollmentId y gameChangerId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { id: true, nombre: true, organizationId: true }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el enrollment existe
    const enrollment = await prisma.vision_enrollments.findUnique({
      where: { id: enrollmentId },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!enrollment || enrollment.visionId !== visionId) {
      return NextResponse.json(
        { success: false, error: 'Enrollment no encontrado o no pertenece a esta visión' },
        { status: 404 }
      );
    }

    // Verificar que el Game Changer existe y está asignado a esta visión
    const gcUser = await prisma.usuario.findUnique({
      where: { id: gameChangerId },
      select: { id: true, nombre: true, email: true, rol: true, esEntrenador: true }
    });

    if (!gcUser) {
      return NextResponse.json(
        { success: false, error: 'Game Changer no encontrado' },
        { status: 404 }
      );
    }

    // Validar que NO sea trainer o admin
    const ROLES_NO_PERMITIDOS_GC = ['TRAINER', 'SCHOOL_ADMIN', 'ADMINISTRADOR'];
    if (ROLES_NO_PERMITIDOS_GC.includes(gcUser.rol) || gcUser.esEntrenador) {
      return NextResponse.json(
        { success: false, error: `${gcUser.nombre} es ${gcUser.rol === 'TRAINER' || gcUser.esEntrenador ? 'Entrenador' : gcUser.rol} y no puede ser asignado como Game Changer` },
        { status: 400 }
      );
    }

    // Verificar que el GC está asignado a esta visión
    const gcAssignment = await prisma.visionGameChanger.findFirst({
      where: {
        gameChangerId: gameChangerId,
        visionId: visionId,
        level: level
      }
    });

    if (!gcAssignment) {
      return NextResponse.json(
        { success: false, error: `${gcUser.nombre} no está asignado como Game Changer en esta visión para el nivel ${level}` },
        { status: 400 }
      );
    }

    // Buscar si el GC ya tiene un SmallGroup (Átomo) para esta visión/nivel
    let smallGroup = await prisma.smallGroup.findFirst({
      where: {
        visionId: visionId,
        leaderId: gameChangerId,
        level: level,
        isActive: true
      },
      include: {
        _count: { select: { members: { where: { isActive: true } } } }
      }
    });

    // Si no tiene, crear uno automáticamente
    if (!smallGroup) {
      smallGroup = await prisma.smallGroup.create({
        data: {
          name: `Átomo ${gcUser.nombre?.split(' ')[0] || 'GC'}`,
          visionId: visionId,
          leaderId: gameChangerId,
          organizationId: vision.organizationId!,
          level: level,
          maxSize: 10,
        },
        include: {
          _count: { select: { members: { where: { isActive: true } } } }
        }
      });

      logger.info(`✅ Átomo creado automáticamente para ${gcUser.nombre} en visión ${vision.nombre}`);
    }

    // Verificar que el grupo no esté lleno
    if (smallGroup._count.members >= smallGroup.maxSize) {
      return NextResponse.json(
        { success: false, error: `El átomo de ${gcUser.nombre} está lleno (${smallGroup._count.members}/${smallGroup.maxSize})` },
        { status: 400 }
      );
    }

    // Verificar si el participante ya está en algún grupo de esta visión/nivel
    const existingMembership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: enrollment.userId,
        isActive: true,
        group: {
          visionId: visionId,
          level: level,
          isActive: true
        }
      },
      include: {
        group: {
          include: {
            leader: { select: { nombre: true } }
          }
        }
      }
    });

    if (existingMembership) {
      // Si ya está en otro grupo, moverlo
      if (existingMembership.groupId !== smallGroup.id) {
        await prisma.smallGroupMember.update({
          where: { id: existingMembership.id },
          data: {
            groupId: smallGroup.id,
            movedBy: user.id,
            movedAt: new Date()
          }
        });

        logger.info(`🔄 Participante ${enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre} movido del átomo de ${existingMembership.group.leader?.nombre} al átomo de ${gcUser.nombre}`);

        return NextResponse.json({
          success: true,
          message: `${enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre} reasignado al átomo de ${gcUser.nombre}`,
          gameChanger: {
            id: gcUser.id,
            nombre: gcUser.nombre
          },
          squadName: smallGroup.name,
          wasMove: true
        });
      } else {
        return NextResponse.json({
          success: true,
          message: `${enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre} ya está en el átomo de ${gcUser.nombre}`,
          gameChanger: {
            id: gcUser.id,
            nombre: gcUser.nombre
          },
          squadName: smallGroup.name,
          alreadyAssigned: true
        });
      }
    }

    // Crear nueva membresía
    await prisma.smallGroupMember.create({
      data: {
        groupId: smallGroup.id,
        userId: enrollment.userId,
        enrollmentId: enrollment.id,
        movedBy: user.id,
        movedAt: new Date()
      }
    });

    logger.info(`✅ Participante ${enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre} asignado al átomo de ${gcUser.nombre}`);

    return NextResponse.json({
      success: true,
      message: `${enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre} asignado al átomo de ${gcUser.nombre}`,
      gameChanger: {
        id: gcUser.id,
        nombre: gcUser.nombre
      },
      squadName: smallGroup.name
    });

  } catch (error) {
    logger.error('Error asignando GC a participante:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar Game Changer' },
      { status: 500 }
    );
  }
}
