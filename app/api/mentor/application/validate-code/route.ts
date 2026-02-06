import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    // Limpiar el código (convertir a mayúsculas y trim)
    const cleanCode = code.toUpperCase().trim();

    // Buscar el código en la tabla CodigoAcceso (donde se guardan desde el dashboard de admin)
    const codigoAcceso = await prisma.codigoAcceso.findUnique({
      where: { codigo: cleanCode }
    });

    if (!codigoAcceso) {
      return NextResponse.json({ 
        error: 'Código no válido',
        message: 'El código ingresado no existe o ha expirado'
      }, { status: 404 });
    }

    // Verificar si el código ya fue usado
    if (codigoAcceso.estado === 'CANJEADO') {
      return NextResponse.json({ 
        error: 'Código ya utilizado',
        message: 'Este código ya ha sido usado previamente'
      }, { status: 400 });
    }

    // Verificar si el código ha expirado
    if (codigoAcceso.estado === 'EXPIRADO') {
      return NextResponse.json({ 
        error: 'Código expirado',
        message: 'Este código ha expirado'
      }, { status: 400 });
    }

    // Verificar el tipo de código
    if (codigoAcceso.tipo !== 'MEMBRESIA_MENTOR') {
      return NextResponse.json({ 
        error: 'Tipo de código inválido',
        message: 'Este código no es válido para membresía de mentor'
      }, { status: 400 });
    }

    // Buscar al usuario y su solicitud más reciente
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar la solicitud más reciente del usuario
    const application = await prisma.mentorApplication.findFirst({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!application) {
      return NextResponse.json({ 
        error: 'No hay solicitud pendiente',
        message: 'No se encontró una solicitud de mentor pendiente de pago'
      }, { status: 404 });
    }

    if (application.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: 'Solicitud ya procesada',
        message: 'Tu solicitud ya fue procesada anteriormente'
      }, { status: 400 });
    }

    // Iniciar transacción para actualizar todo
    await prisma.$transaction(async (tx) => {
      // 1. Marcar el código como canjeado en CodigoAcceso
      await tx.codigoAcceso.update({
        where: { id: codigoAcceso.id },
        data: {
          estado: 'CANJEADO',
          canjeadoEn: new Date(),
          canjeadoPorId: user.id,
          updatedAt: new Date()
        }
      });

      // 2. Actualizar la aplicación a PENDING
      await tx.mentorApplication.update({
        where: { id: application.id },
        data: {
          status: 'PENDING',
          paidAt: new Date(),
          paymentMethod: 'LICENSE_CODE',
          updatedAt: new Date()
        }
      });

      // 3. Crear notificación para el usuario
      await tx.notification.create({
        data: {
          userId: user.id,
          title: '¡Código aplicado con éxito!',
          message: 'Tu código de licencia ha sido validado. Tu solicitud de mentor está ahora en revisión.',
          type: 'SYSTEM_ALERT',
          isRead: false
        }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: '¡Código validado exitosamente! Tu solicitud está ahora en revisión.'
    });

  } catch (error) {
    logger.error('Error validando código:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: 'Hubo un error al validar el código'
    }, { status: 500 });
  }
}
