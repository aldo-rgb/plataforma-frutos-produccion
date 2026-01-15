import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Roles permitidos
const ALLOWED_ROLES = [
  'COORDINADOR',
  'COORDINATOR_BASIC',
  'COORDINATOR_ADVANCED',
  'TRAINER',
  'ADMINISTRADOR',
  'SCHOOL_ADMIN'
];

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type') || 'ALL'; // ALL, BACKLOG, DROP
    const filterLevel = searchParams.get('level') || 'ALL'; // ALL, BASIC, ADVANCED, PL

    // Construir where dinámicamente
    const whereClause: any = {
      Vision: {
        organizationId: usuario.organizationId
      }
    };

    // Filtro de attendanceStatus
    if (filterType === 'ALL') {
      whereClause.attendanceStatus = { in: ['BACKLOG', 'DROP'] };
    } else {
      whereClause.attendanceStatus = filterType;
    }

    // Filtro de level
    if (filterLevel !== 'ALL') {
      whereClause.level = filterLevel;
    }

    // Obtener enrollments con BACKLOG o DROP
    const enrollments = await prisma.vision_enrollments.findMany({
      where: whereClause,
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            imagen: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: [
        { attendanceStatus: 'asc' },
        { updatedAt: 'desc' }
      ]
    });

    // Para cada enrollment, verificar si tiene ticket de cortesía
    const enrollmentsWithTickets = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const ticket = await prisma.ticket.findFirst({
          where: {
            ownerId: enrollment.userId,
            type: 'SCHOLARSHIP',
            amountPaid: 0,
            level: 'BASIC'
          },
          include: {
            vision: {
              select: {
                nombre: true,
                startDate: true
              }
            }
          }
        });

        return {
          id: enrollment.id,
          level: enrollment.level,
          attendanceStatus: enrollment.attendanceStatus,
          updatedAt: enrollment.updatedAt,
          usuario: enrollment.Usuario_vision_enrollments_userIdToUsuario,
          vision: enrollment.Vision,
          courtesyTicket: ticket ? {
            id: ticket.id,
            status: ticket.status,
            targetVision: ticket.vision?.nombre || 'Pendiente de asignar',
            targetStartDate: ticket.vision?.startDate,
            validUntil: ticket.validUntil
          } : null
        };
      })
    );

    // Estadísticas por tipo y nivel
    const stats = {
      byType: {
        BACKLOG: enrollmentsWithTickets.filter(e => e.attendanceStatus === 'BACKLOG').length,
        DROP: enrollmentsWithTickets.filter(e => e.attendanceStatus === 'DROP').length
      },
      byLevel: {
        BASIC: enrollmentsWithTickets.filter(e => e.level === 'BASIC').length,
        ADVANCED: enrollmentsWithTickets.filter(e => e.level === 'ADVANCED').length,
        PL: enrollmentsWithTickets.filter(e => e.level === 'PL').length
      },
      withTicket: enrollmentsWithTickets.filter(e => e.courtesyTicket).length,
      withoutTicket: enrollmentsWithTickets.filter(e => !e.courtesyTicket).length
    };

    return NextResponse.json({
      success: true,
      enrollments: enrollmentsWithTickets,
      stats,
      total: enrollmentsWithTickets.length
    });

  } catch (error: any) {
    console.error('Error obteniendo lista de backlogs/drops:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos', message: error?.message },
      { status: 500 }
    );
  }
}
