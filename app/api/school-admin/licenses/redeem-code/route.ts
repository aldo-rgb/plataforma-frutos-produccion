import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No hay organización asociada' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { orderId, code } = body;

    if (!orderId || !code) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar la orden pendiente
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (order.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Orden no pertenece a tu organización' },
        { status: 403 }
      );
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Esta orden ya fue procesada' },
        { status: 400 }
      );
    }

    // Buscar el código en CodigoAcceso (códigos institucionales)
    const codigoAcceso = await prisma.codigoAcceso.findFirst({
      where: { codigo: code.toUpperCase() },
    });

    if (!codigoAcceso) {
      return NextResponse.json(
        { success: false, error: 'Código no válido' },
        { status: 400 }
      );
    }

    // Verificar que sea un código de licencias institucionales
    if (codigoAcceso.tipo !== 'LICENCIAS_INSTITUCIONAL') {
      return NextResponse.json(
        { success: false, error: 'Este código no es válido para licencias institucionales' },
        { status: 400 }
      );
    }

    if (codigoAcceso.estado !== 'DISPONIBLE') {
      return NextResponse.json(
        { success: false, error: 'Este código ya fue utilizado o está inactivo' },
        { status: 400 }
      );
    }

    // Verificar que el código tenga suficientes licencias
    const licenciasDisponibles = (codigoAcceso.cantidadLicencias || 0) - (codigoAcceso.licenciasUsadas || 0);
    if (licenciasDisponibles < order.quantity) {
      return NextResponse.json(
        { success: false, error: `Este código solo tiene ${licenciasDisponibles} licencias disponibles, pero la orden es de ${order.quantity}` },
        { status: 400 }
      );
    }

    // El código es válido, procesar el canje en una transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar el código - marcar licencias usadas
      const nuevasLicenciasUsadas = (codigoAcceso.licenciasUsadas || 0) + order.quantity;
      const todasUsadas = nuevasLicenciasUsadas >= (codigoAcceso.cantidadLicencias || 0);
      
      await tx.codigoAcceso.update({
        where: { id: codigoAcceso.id },
        data: {
          licenciasUsadas: nuevasLicenciasUsadas,
          estado: todasUsadas ? 'CANJEADO' : 'DISPONIBLE',
          updatedAt: new Date(),
        },
      });

      // Actualizar la orden como pagada
      await tx.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentMethod: 'code',
          paidAt: new Date(),
          updatedAt: new Date(),
          paymentData: {
            ...(order.paymentData as object || {}),
            codeUsed: code,
            codigoAccesoId: codigoAcceso.id,
          },
        },
      });

      // Agregar créditos a la organización
      const existingCredit = await tx.schoolCredit.findFirst({
        where: { organizationId: user.organizationId! },
      });

      if (existingCredit) {
        await tx.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: { increment: order.quantity },
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.schoolCredit.create({
          data: {
            organizationId: user.organizationId!,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            updatedAt: new Date(),
          },
        });
      }

      // Marcar la orden como créditos generados
      await tx.licenseOrder.update({
        where: { id: orderId },
        data: {
          creditsGenerated: true,
          creditsGeneratedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    logger.debug('✅ Código canjeado exitosamente:', {
      orderId,
      code,
      quantity: order.quantity,
      organization: user.organizationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Código canjeado exitosamente',
      licensesAdded: order.quantity,
    });
  } catch (error) {
    logger.error('Error al canjear código:', error);
    console.error('Error completo:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el código',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
