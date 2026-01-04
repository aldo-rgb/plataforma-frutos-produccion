import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mentor/application/simulate-payment
 * Simula el pago y actualiza la solicitud a PENDING (solo para desarrollo)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId es requerido' },
        { status: 400 }
      );
    }

    // Buscar la aplicación
    const application = await prisma.mentorApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea dueño de la solicitud o sea admin
    const user = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) }
    });

    const isAdmin = user?.rol && ['ADMIN', 'DIRECTOR', 'ADMINISTRADOR'].includes(user.rol);
    const isOwner = application.usuarioId === Number(session.user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar esta solicitud' },
        { status: 403 }
      );
    }

    // Actualizar el estado a PENDING y marcar como PAID
    const updated = await prisma.mentorApplication.update({
      where: { id: applicationId },
      data: {
        status: 'PENDING',
        paymentStatus: 'PAID',
        amountPaid: 99900, // $999 MXN en centavos
        updatedAt: new Date()
      }
    });

    console.log(`✅ [SIMULACIÓN] Pago procesado para solicitud ${applicationId}`);
    console.log(`   Usuario ID: ${application.usuarioId}`);
    console.log(`   Estado: ${application.status} → ${updated.status}`);
    console.log(`   Pago: ${application.paymentStatus} → ${updated.paymentStatus}`);

    return NextResponse.json({
      success: true,
      message: 'Pago simulado exitosamente',
      application: updated
    });

  } catch (error) {
    console.error('Error simulando pago:', error);
    return NextResponse.json(
      { error: 'Error al simular pago' },
      { status: 500 }
    );
  }
}
