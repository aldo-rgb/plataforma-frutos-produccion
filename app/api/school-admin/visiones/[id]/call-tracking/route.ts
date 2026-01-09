import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Obtener todos los registros de seguimiento de llamadas por nivel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);
    
    // Obtener el nivel desde los query parameters (por defecto BASIC)
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'BASIC';
    const excludeUnpaid = searchParams.get('excludeUnpaid') === 'true';

    // Obtener todos los enrollments del nivel especificado con su tracking info
    // @ts-ignore - Prisma relations exist but TypeScript doesn't recognize them
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionId,
        level: level as 'BASIC' | 'ADVANCED' | 'PL',
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apodo: true,
            email: true,
            telefono: true,
            horarioLlamada: true,
            expectations: true,
            invitedByText: true,
            invitedBy: true,
            Organization_Usuario_organizationIdToOrganization: {
              select: {
                id: true,
                name: true,
              },
            },
            Ticket_TicketOwner: {
              select: {
                id: true,
                paymentStatus: true,
                level: true,
              },
            },
          },
        },
        Usuario_vision_enrollments_invitedByToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
        Usuario_vision_enrollments_coordinatorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        BasicCallTracking: {
          include: {
            CallInteractionLog: {
              include: {
                Usuario: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    // Obtener los IDs únicos de los usuarios invitadores
    const inviterIds = enrollments
      .map((e: any) => e.Usuario_vision_enrollments_userIdToUsuario.invitedBy)
      .filter((id: number | null) => id !== null);

    // Buscar los nombres y visiones de los invitadores desde vision_enrollments
    const inviters = inviterIds.length > 0 
      ? await prisma.usuario.findMany({
          where: { id: { in: inviterIds } },
          select: { 
            id: true, 
            nombre: true,
            telefono: true,
            vision_enrollments_vision_enrollments_userIdToUsuario: {
              select: {
                Vision: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1, // Tomar solo el enrollment más reciente
              orderBy: {
                enrolledAt: 'desc',
              },
            },
          },
        })
      : [];

    // Crear un mapa de invitadores con nombre, visión y teléfono
    const inviterMap = new Map(
      inviters.map((inv: any) => [
        inv.id, 
        { 
          nombre: inv.nombre, 
          vision: inv.vision_enrollments_vision_enrollments_userIdToUsuario?.[0]?.Vision?.nombre || null,
          telefono: inv.telefono || null
        }
      ])
    );

    // Función para determinar el estado de pago del usuario
    const getPaymentStatus = (tickets: any[]) => {
      if (!tickets || tickets.length === 0) return 'NO_TICKET';
      const hasUnpaid = tickets.some(t => t.paymentStatus === 'UNPAID');
      const hasPartial = tickets.some(t => t.paymentStatus === 'PARTIAL');
      const allPaid = tickets.every(t => t.paymentStatus === 'PAID');
      if (allPaid) return 'PAID';
      if (hasPartial) return 'PARTIAL';
      if (hasUnpaid) return 'UNPAID';
      return 'PENDING';
    };

    // Filtrar enrollments si excludeUnpaid está activo
    let filteredEnrollments = enrollments;
    if (excludeUnpaid) {
      filteredEnrollments = enrollments.filter((enrollment: any) => {
        const tickets = enrollment.Usuario_vision_enrollments_userIdToUsuario.Ticket_TicketOwner || [];
        const status = getPaymentStatus(tickets);
        return status !== 'UNPAID' && status !== 'NO_TICKET';
      });
    }

    // Formatear la respuesta con toda la información necesaria
    // @ts-ignore - Prisma relations work at runtime despite TypeScript errors
    const formattedData = filteredEnrollments.map((enrollment: any) => {
      const tickets = enrollment.Usuario_vision_enrollments_userIdToUsuario.Ticket_TicketOwner || [];
      const paymentStatus = getPaymentStatus(tickets);
      
      return {
        id: enrollment.id,
        userId: enrollment.userId,
        visionId: enrollment.visionId,
        enrolledAt: enrollment.enrolledAt,
        enrollmentStatus: enrollment.enrollmentStatus,
        
        // Usuario info
        usuario: {
          id: enrollment.Usuario_vision_enrollments_userIdToUsuario.id,
          nombre: enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre,
          apodo: enrollment.Usuario_vision_enrollments_userIdToUsuario.apodo,
          email: enrollment.Usuario_vision_enrollments_userIdToUsuario.email,
          telefono: enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
          horarioLlamada: enrollment.Usuario_vision_enrollments_userIdToUsuario.horarioLlamada,
          expectations: enrollment.Usuario_vision_enrollments_userIdToUsuario.expectations,
          invitedByText: enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedByText,
          invitedByUser: enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedBy 
            ? { 
                id: enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedBy, 
                nombre: inviterMap.get(enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedBy)?.nombre || null,
                vision: inviterMap.get(enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedBy)?.vision || null,
                telefono: inviterMap.get(enrollment.Usuario_vision_enrollments_userIdToUsuario.invitedBy)?.telefono || null
              }
            : null,
          organizacion: enrollment.Usuario_vision_enrollments_userIdToUsuario.Organization_Usuario_organizationIdToOrganization,
          paymentStatus: paymentStatus,
        },
        
        // Ángel de enrolamiento (quien invitó)
        angelEnrolamiento: enrollment.Usuario_vision_enrollments_invitedByToUsuario,
        
        // Coordinador asignado
        coordinador: enrollment.Usuario_vision_enrollments_coordinatorIdToUsuario,
        
        // Call tracking info
        tracking: enrollment.BasicCallTracking ? {
          id: enrollment.BasicCallTracking.id,
          nickname: enrollment.BasicCallTracking.nickname,
          phone: enrollment.BasicCallTracking.phone || enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
          preferredCallTimeStart: enrollment.BasicCallTracking.preferredCallTimeStart,
          preferredCallTimeEnd: enrollment.BasicCallTracking.preferredCallTimeEnd,
          attendanceStatus: enrollment.BasicCallTracking.attendanceStatus,
          callAttempts: enrollment.BasicCallTracking.callAttempts,
          lastInteractionAt: enrollment.BasicCallTracking.lastInteractionAt,
          interactions: enrollment.BasicCallTracking.CallInteractionLog,
        } : null,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching call tracking data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de seguimiento' },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar tracking de llamadas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, trackingData } = body;

    // Verificar si ya existe tracking para este enrollment
    // @ts-ignore - BasicCallTracking model exists in Prisma schema
    const existingTracking = await prisma.basicCallTracking.findUnique({
      where: { enrollmentId },
    });

    if (existingTracking) {
      // Actualizar tracking existente
      // @ts-ignore
      const updated = await prisma.basicCallTracking.update({
        where: { enrollmentId },
        data: {
          ...trackingData,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    } else {
      // Crear nuevo tracking
      // @ts-ignore
      const created = await prisma.basicCallTracking.create({
        data: {
          enrollmentId,
          ...trackingData,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error('Error saving call tracking:', error);
    return NextResponse.json(
      { error: 'Error al guardar seguimiento' },
      { status: 500 }
    );
  }
}
