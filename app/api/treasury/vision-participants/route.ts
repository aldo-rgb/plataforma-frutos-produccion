import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/treasury/vision-participants
 * Obtiene la lista de participantes de una visión específica
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    // Obtener el usuario actual con su organización
    const currentUser = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) },
      select: { 
        organizationId: true,
        rol: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: { masterOrganizationId: true }
        }
      }
    });

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    // Verificar que la visión pertenezca a la misma master org
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: {
        id: true,
        nombre: true,
        organizationId: true,
        Organization: {
          select: { masterOrganizationId: true }
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar que pertenezca a la misma master org
    const userMasterOrgId = currentUser.Organization_Usuario_organizationIdToOrganization?.masterOrganizationId;
    const visionMasterOrgId = vision.Organization?.masterOrganizationId;
    
    if (userMasterOrgId !== visionMasterOrgId) {
      return NextResponse.json({ error: 'No tienes acceso a esta visión' }, { status: 403 });
    }

    // Obtener participantes de la visión con información del usuario
    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: {
        visionId: parseInt(visionId)
      },
      select: {
        id: true,
        participanteId: true,
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true
          }
        }
      }
    });

    // Obtener tickets de la visión para ver saldos
    const tickets = await prisma.ticket.findMany({
      where: {
        visionId: parseInt(visionId)
      },
      select: {
        id: true,
        ownerId: true,
        purchasePrice: true,
        paymentStatus: true,
        amountPaid: true
      }
    });

    // Mapear participantes con su saldo
    const participantesConSaldo = visionParticipantes.map(vp => {
      const user = vp.Usuario_VisionParticipante_participanteIdToUsuario;
      if (!user) return null;

      // Buscar ticket del usuario
      const ticket = tickets.find(t => t.ownerId === user.id);
      const purchasePrice = ticket?.purchasePrice ? Number(ticket.purchasePrice) : 0;
      const amountPaid = ticket?.amountPaid ? Number(ticket.amountPaid) : 0;
      
      // Calcular saldo pendiente basado en el paymentStatus
      const saldoPendiente = ticket?.paymentStatus === 'PAID' || ticket?.paymentStatus === 'GIFT'
        ? 0 
        : purchasePrice - amountPaid;

      return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        totalPagado: amountPaid,
        saldoPendiente: Math.max(0, saldoPendiente),
        ticketStatus: ticket?.paymentStatus || 'NONE'
      };
    }).filter(p => p !== null);

    // Ordenar por nombre
    participantesConSaldo.sort((a, b) => a!.nombre.localeCompare(b!.nombre));

    return NextResponse.json({
      success: true,
      participants: participantesConSaldo,
      visionName: vision.nombre,
      total: participantesConSaldo.length
    });

  } catch (error) {
    console.error('Error fetching vision participants:', error);
    return NextResponse.json(
      { error: 'Error al obtener participantes' },
      { status: 500 }
    );
  }
}
