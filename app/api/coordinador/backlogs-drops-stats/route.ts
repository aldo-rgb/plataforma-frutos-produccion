import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles permitidos
const ALLOWED_ROLES = [
  'COORDINADOR',
  'COORDINATOR_BASIC',
  'COORDINATOR_ADVANCED',
  'TRAINER',
  'ADMINISTRADOR',
  'SCHOOL_ADMIN'
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!usuario || !ALLOWED_ROLES.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    if (!usuario.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización asignada' }, { status: 400 });
    }

    // Contar backlogs de todas las visiones de la organización
    const totalBacklogs = await prisma.vision_enrollments.count({
      where: {
        Vision: {
          organizationId: usuario.organizationId
        },
        attendanceStatus: 'BACKLOG'
      }
    });

    // Contar drops de todas las visiones de la organización
    const totalDrops = await prisma.vision_enrollments.count({
      where: {
        Vision: {
          organizationId: usuario.organizationId
        },
        attendanceStatus: 'DROP'
      }
    });

    // Contar tickets de cortesía pendientes (SCHOLARSHIP con amountPaid = 0)
    const pendingTickets = await prisma.ticket.count({
      where: {
        organizationId: usuario.organizationId,
        type: 'SCHOLARSHIP',
        amountPaid: 0,
        status: {
          in: ['ACTIVE', 'PENDING_PAYMENT']
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalBacklogs,
        totalDrops,
        pendingTickets
      }
    });

  } catch (error: any) {
    logger.error('Error obteniendo stats de backlogs/drops:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', message: error?.message },
      { status: 500 }
    );
  }
}
