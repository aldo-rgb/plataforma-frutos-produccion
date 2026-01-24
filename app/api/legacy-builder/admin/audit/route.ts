import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// GET - Obtener cola de auditoría (para Admin/Staff)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin y staff pueden ver la cola
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'REQUESTED';
    const organizationId = searchParams.get('organizationId');

    const where: any = {};
    
    if (status !== 'all') {
      where.status = status;
    }

    // Filtrar por organización si no es super admin
    if (session.user.rol !== 'SUPER_ADMIN') {
      const user = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true }
      });
      
      if (user?.organizationId) {
        where.campaign = {
          project: {
            organizationId: user.organizationId
          }
        };
      }
    } else if (organizationId) {
      where.campaign = {
        project: {
          organizationId: parseInt(organizationId)
        }
      };
    }

    const expenses = await prisma.legacyExpense.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            availableAmount: true,
            project: {
              select: {
                id: true,
                title: true,
                organizationId: true
              }
            }
          }
        },
        requestedBy: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        auditedBy: {
          select: {
            id: true,
            nombre: true
          }
        },
        dispersedBy: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'asc' } // FIFO
    });

    // Estadísticas
    const stats = await prisma.legacyExpense.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      expenses,
      stats: stats.reduce((acc, s) => {
        acc[s.status] = {
          count: s._count,
          total: s._sum.amount
        };
        return acc;
      }, {} as Record<string, any>)
    });

  } catch (error) {
    console.error('Error fetching audit queue:', error);
    return NextResponse.json(
      { error: 'Error obteniendo cola de auditoría' },
      { status: 500 }
    );
  }
}

// POST - Acciones de auditoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { expenseId, action, comments, dispersalRef, publicImageUrl } = body;

    if (!expenseId || !action) {
      return NextResponse.json(
        { error: 'expenseId y action son requeridos' },
        { status: 400 }
      );
    }

    const expense = await prisma.legacyExpense.findUnique({
      where: { id: expenseId },
      include: {
        campaign: {
          include: {
            project: true
          }
        },
        requestedBy: {
          select: {
            email: true,
            nombre: true
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'approve':
        // Aprobar el gasto
        if (expense.status !== 'REQUESTED' && expense.status !== 'UNDER_REVIEW') {
          return NextResponse.json({ error: 'Gasto no está pendiente de aprobación' }, { status: 400 });
        }

        // Verificar fondos disponibles
        if (Number(expense.campaign.availableAmount) < Number(expense.amount)) {
          return NextResponse.json({ error: 'Fondos insuficientes en la campaña' }, { status: 400 });
        }

        updateData = {
          status: 'APPROVED',
          auditedById: userId,
          auditedAt: new Date(),
          auditComments: comments || null
        };

        // Reservar el monto (descontar de disponible)
        await prisma.legacyCampaign.update({
          where: { id: expense.campaignId },
          data: {
            availableAmount: { decrement: expense.amount }
          }
        });

        message = 'Gasto aprobado exitosamente';
        break;

      case 'reject':
        // Rechazar el gasto
        if (!comments) {
          return NextResponse.json({ error: 'Se requiere comentario de rechazo' }, { status: 400 });
        }

        updateData = {
          status: 'REJECTED',
          auditedById: userId,
          auditedAt: new Date(),
          auditComments: comments
        };

        message = 'Gasto rechazado';
        
        // Notificar al solicitante
        await sendEmail(
          expense.requestedBy.email,
          `Solicitud de gasto rechazada - ${expense.concept}`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Solicitud Rechazada</h2>
            <p>Hola ${expense.requestedBy.nombre},</p>
            <p>Tu solicitud de gasto ha sido rechazada:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Concepto:</strong> ${expense.concept}</p>
              <p><strong>Monto:</strong> $${expense.amount}</p>
              <p><strong>Motivo del rechazo:</strong></p>
              <p style="color: #ef4444;">${comments}</p>
            </div>
            <p>Puedes corregir y volver a enviar la solicitud.</p>
          </div>
          `
        );
        break;

      case 'disperse':
        // Marcar como dispersado (transferencia realizada)
        if (expense.status !== 'APPROVED') {
          return NextResponse.json({ error: 'El gasto debe estar aprobado primero' }, { status: 400 });
        }

        if (!dispersalRef) {
          return NextResponse.json({ error: 'Se requiere referencia de dispersión' }, { status: 400 });
        }

        updateData = {
          status: 'PAID_OUT',
          dispersedById: userId,
          dispersedAt: new Date(),
          dispersalRef: dispersalRef
        };

        message = 'Dispersión registrada exitosamente';
        break;

      case 'publish':
        // Publicar en transparencia
        if (expense.status !== 'PAID_OUT') {
          return NextResponse.json({ error: 'El gasto debe estar dispersado primero' }, { status: 400 });
        }

        updateData = {
          status: 'PUBLISHED',
          isPublished: true,
          publishedAt: new Date(),
          publicImageUrl: publicImageUrl || expense.invoiceUrl || expense.evidenceUrls[0]
        };

        message = 'Gasto publicado en transparencia';

        // Notificar a los donadores (opcional - TODO)
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    // Actualizar el gasto
    const updatedExpense = await prisma.legacyExpense.update({
      where: { id: expenseId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message,
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Error processing audit action:', error);
    return NextResponse.json(
      { error: 'Error procesando acción de auditoría' },
      { status: 500 }
    );
  }
}
