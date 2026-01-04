import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/participante/crear-orden-paquete
 * 
 * Crea una orden de compra para un paquete de 18 sesiones con un mentor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { visionId, mentorId, cantidad, precioTotal, metodoPago } = body;

    // Validaciones
    if (!visionId || !mentorId || !cantidad || !precioTotal || !metodoPago) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener datos del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { 
        id: true, 
        organizationId: true,
        nombre: true,
        email: true
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el mentor existe y está disponible
    const mentor = await prisma.usuario.findFirst({
      where: {
        id: mentorId,
        rol: 'MENTOR',
        PerfilMentor: {
          disponible: true,
        },
      },
      include: {
        PerfilMentor: true,
      },
    });

    if (!mentor || !mentor.PerfilMentor) {
      return NextResponse.json(
        { error: 'Mentor no disponible' },
        { status: 404 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Crear la orden en tabla MentorPackageOrder
    const orden = await prisma.mentorPackageOrder.create({
      data: {
        usuarioId: usuario.id,
        mentorId: mentor.id,
        visionId: visionId,
        organizationId: usuario.organizationId,
        cantidad: cantidad,
        precioUnitario: Math.round(precioTotal / cantidad),
        precioTotal: precioTotal,
        metodoPago: metodoPago,
        status: 'PENDING',
        currency: 'MXN',
      },
    });

    console.log(`✅ Orden de paquete creada: ${orden.id}`);
    console.log(`   Usuario: ${usuario.nombre} (${usuario.email})`);
    console.log(`   Mentor: ${mentor.nombre}`);
    console.log(`   Cantidad: ${cantidad} sesiones`);
    console.log(`   Total: $${precioTotal} MXN`);

    return NextResponse.json({
      success: true,
      ordenId: orden.id,
      mensaje: 'Orden creada exitosamente',
    });
  } catch (error: any) {
    console.error('❌ Error al crear orden de paquete:', error);
    return NextResponse.json(
      {
        error: 'Error al crear la orden',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
