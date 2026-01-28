import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo ADMINISTRADOR puede agregar participantes manualmente
    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Solo ADMINISTRADOR puede realizar esta acción' }, { status: 403 });
    }

    const visionId = parseInt(params.id);
    if (isNaN(visionId)) {
      return NextResponse.json({ success: false, error: 'ID de visión inválido' }, { status: 400 });
    }

    const { nombre, email, telefono } = await request.json();

    if (!nombre?.trim() || !email?.trim()) {
      return NextResponse.json({ success: false, error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: { Organization: true }
    });

    if (!vision) {
      return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    }

    // Buscar si el usuario ya existe por email
    let user = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase().trim() }
    });

    // Si no existe, crear el usuario
    if (!user) {
      user = await prisma.usuario.create({
        data: {
          nombre: nombre.trim(),
          email: email.toLowerCase().trim(),
          telefono: telefono?.trim() || null,
          password: 'Quantum123', // Contraseña temporal
          rol: 'PARTICIPANTE',
          organizationId: vision.organizationId,
          isActive: true,
        }
      });
    }

    // Verificar si ya está inscrito en esta visión
    const existingEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        visionId: visionId
      }
    });

    if (existingEnrollment) {
      return NextResponse.json({ 
        success: false, 
        error: `El usuario ${nombre} ya está inscrito en esta visión` 
      }, { status: 400 });
    }

    // Crear la inscripción con nivel BASIC
    // Usar el coordinador de la visión o el admin actual como coordinador
    const coordinatorId = vision.coordinadorId || Number(session.user.id);
    
    const enrollment = await prisma.vision_enrollments.create({
      data: {
        userId: user.id,
        visionId: visionId,
        coordinatorId: coordinatorId,
        level: 'BASIC',
        enrolledAt: new Date(),
        updatedAt: new Date(),
        enrollmentStatus: 'ENROLLED',
      }
    });

    // Crear el ticket de BASIC con la estructura correcta del modelo
    const ticket = await prisma.ticket.create({
      data: {
        ownerId: user.id,
        organizationId: vision.organizationId!,
        visionId: visionId,
        level: 'BASIC',
        type: 'STANDARD',
        status: 'ACTIVE',
        paymentStatus: 'GIFT', // Marcado como regalo/cortesía del admin
        isTransferable: false, // No transferible porque es asignación directa
        amountPaid: 0,
      }
    });

    return NextResponse.json({
      success: true,
      message: `Participante ${nombre} agregado exitosamente con ticket BÁSICO`,
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email
        },
        enrollment: {
          id: enrollment.id,
          level: enrollment.level
        },
        ticket: {
          id: ticket.id,
          level: ticket.level
        }
      }
    });

  } catch (error: any) {
    console.error('Error adding participant:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al agregar participante' 
    }, { status: 500 });
  }
}
