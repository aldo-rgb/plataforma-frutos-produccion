import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener registros de un producto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN' && session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { productId } = await params;

    // Obtener el producto
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        startDate: true,
        location: true,
        maxCapacity: true,
        currentEnrollment: true,
        organizationId: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar que el admin pertenece a la organización (si no es ADMINISTRADOR global)
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });

      if (admin?.organizationId !== product.organizationId) {
        return NextResponse.json({ success: false, error: 'Sin acceso a este producto' }, { status: 403 });
      }
    }

    // Obtener registros con información del usuario que invitó
    const registrations = await prisma.eventRegistration.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { createdAt: 'desc' },
      include: {
        InvitedByUser: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    // Mapear registros para incluir el nombre del invitador
    const mappedRegistrations = registrations.map(reg => ({
      ...reg,
      comoTeEnteraste: reg.InvitedByUser 
        ? reg.InvitedByUser.nombre
        : reg.comoTeEnteraste,
    }));

    return NextResponse.json({
      success: true,
      product,
      registrations: mappedRegistrations,
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
