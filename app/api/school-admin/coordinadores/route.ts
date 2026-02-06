import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles permitidos para acceder a esta API
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

/**
 * GET /api/school-admin/coordinadores
 * Obtiene la lista de coordinadores de la organización del director
 * Query params:
 *   - visionId: (opcional) ID de la visión para obtener coordinadores de su organización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario tiene un rol permitido
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Determinar qué organización usar
    let targetOrganizationId = user.organizationId;

    // Si es ADMINISTRADOR global sin organización, obtener de la visión
    if (!targetOrganizationId && user.rol === 'ADMINISTRADOR') {
      const visionId = request.nextUrl.searchParams.get('visionId');
      
      if (visionId) {
        const vision = await prisma.vision.findUnique({
          where: { id: parseInt(visionId) },
          select: { organizationId: true }
        });
        targetOrganizationId = vision?.organizationId || null;
      }
    }

    if (!targetOrganizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada. Agrega ?visionId=X para especificar la visión.' },
        { status: 400 }
      );
    }

    // Obtener coordinadores y trainers de la misma organización
    // Incluir COORDINATOR_BASIC, COORDINATOR_ADVANCED, TRAINER, COORDINADOR, y SCHOOL_ADMIN
    const coordinadores = await prisma.usuario.findMany({
      where: {
        organizationId: targetOrganizationId,
        rol: {
          in: ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN']
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    logger.debug(`✅ Coordinadores encontrados para organización ${targetOrganizationId}:`, coordinadores.length);

    return NextResponse.json({
      success: true,
      coordinadores
    });
  } catch (error) {
    logger.error('Error obteniendo coordinadores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener coordinadores' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/school-admin/coordinadores
 * Actualiza el rol de un coordinador
 * Body: { userId: number, newRole: string }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es SCHOOL_ADMIN o ADMINISTRADOR
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        nombre: true
      },
    });

    if (!user || !['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Solo School Admin puede cambiar roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { success: false, error: 'userId y newRole son requeridos' },
        { status: 400 }
      );
    }

    // Roles válidos para cambiar
    const VALID_ROLES = [
      'COORDINATOR_BASIC',
      'COORDINATOR_ADVANCED', 
      'COORDINADOR',
      'TRAINER',
      'GAMECHANGER',
      'PARTICIPANTE'
    ];

    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json(
        { success: false, error: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Obtener el usuario a modificar
    const targetUser = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        organizationId: true
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario pertenece a la misma organización
    if (targetUser.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No puedes modificar usuarios de otra organización' },
        { status: 403 }
      );
    }

    // No permitir cambiar el rol del SCHOOL_ADMIN
    if (targetUser.rol === 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No puedes cambiar el rol del School Admin' },
        { status: 403 }
      );
    }

    const previousRole = targetUser.rol;

    // Actualizar el rol
    const updatedUser = await prisma.usuario.update({
      where: { id: targetUser.id },
      data: { rol: newRole },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    logger.debug(`✅ Rol actualizado: ${targetUser.nombre} (${targetUser.email}) - ${previousRole} → ${newRole} por ${user.nombre}`);

    return NextResponse.json({
      success: true,
      message: `Rol de ${updatedUser.nombre} actualizado de ${previousRole} a ${newRole}`,
      user: updatedUser,
      previousRole
    });

  } catch (error) {
    logger.error('Error actualizando rol:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el rol' },
      { status: 500 }
    );
  }
}
