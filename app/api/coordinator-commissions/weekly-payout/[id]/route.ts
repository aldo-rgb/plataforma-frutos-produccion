import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar estado del resumen semanal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Solo admin/director pueden actualizar resumenes' }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status requerido' }, { status: 400 });
    }

    const validStatuses = ['DRAFT', 'APPROVED', 'PAID'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'APPROVED') {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    }

    // Si se marca como PAID, marcar todas las comisiones como pagadas
    if (status === 'PAID') {
      const summary = await prisma.weeklyPayoutSummary.findUnique({
        where: { id: parseInt(params.id) },
        include: {
          summaryData: true
        }
      });

      if (!summary) {
        return NextResponse.json({ error: 'Resumen no encontrado' }, { status: 404 });
      }

      // Obtener las comisiones del periodo
      const commissions = await prisma.coordinatorCommission.findMany({
        where: {
          organizationId: summary.organizationId,
          status: 'AUTHORIZED',
          createdAt: {
            gte: summary.weekStartDate,
            lte: summary.weekEndDate
          },
          ...(summary.visionId ? { visionId: summary.visionId } : {})
        }
      });

      // Actualizar todas las comisiones a PAID
      await Promise.all(
        commissions.map(comm =>
          prisma.coordinatorCommission.update({
            where: { id: comm.id },
            data: {
              status: 'PAID',
              payoutCompletedDate: new Date(),
              updatedAt: new Date()
            }
          })
        )
      );
    }

    const summary = await prisma.weeklyPayoutSummary.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      include: {
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        GeneratedByUser: {
          select: {
            id: true,
            nombre: true
          }
        },
        ApprovedByUser: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Resumen ${status === 'PAID' ? 'marcado como pagado' : status === 'APPROVED' ? 'aprobado' : 'actualizado'} exitosamente`,
      summary
    });

  } catch (error: any) {
    console.error('Error actualizando resumen:', error);
    return NextResponse.json(
      { error: 'Error al actualizar resumen', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Obtener detalle de un resumen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const summary = await prisma.weeklyPayoutSummary.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        GeneratedByUser: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        ApprovedByUser: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!summary) {
      return NextResponse.json({ error: 'Resumen no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error: any) {
    console.error('Error obteniendo detalle del resumen:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle', details: error.message },
      { status: 500 }
    );
  }
}
