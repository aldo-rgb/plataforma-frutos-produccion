import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 });
    }

    // Obtener producto con información de la visión y organización
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productIdNum },
      include: {
        Organization: true,
        Vision: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Contar participantes inscritos en esta visión (ENROLLED)
    let enrolledCount = 0;
    if (product.visionId) {
      enrolledCount = await prisma.vision_enrollments.count({
        where: {
          visionId: product.visionId,
          enrollmentStatus: 'ENROLLED'
        }
      });
    }

    // Contar check-ins de hoy usando CheckInRecord
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkInCount = await prisma.checkInRecord.count({
      where: {
        productId: productIdNum,
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Pendientes = Inscritos - Check-ins de hoy
    const pendingCount = Math.max(0, enrolledCount - checkInCount);

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        visionId: product.visionId,
        visionName: product.Vision?.nombre || 'Sin visión',
        levelType: product.levelType,
        startDate: product.startDate?.toISOString() || null,
        organizationId: product.organizationId,
        organizationName: product.Organization?.name || 'Sin organización',
        logoUrl: product.Organization?.logo || null
      },
      stats: {
        enrolled: enrolledCount,      // Total de participantes inscritos
        checkedIn: checkInCount,      // Asistencias de hoy
        pending: pendingCount         // Pendientes de check-in
      }
    });

  } catch (error) {
    console.error('Error fetching product info:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
