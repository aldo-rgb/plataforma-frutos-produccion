import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true
      }
    });

    if (!usuario || usuario.rol !== 'COORDINATOR_BASIC') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!usuario.organizationId) {
      return NextResponse.json({
        success: true,
        productos: []
      });
    }

    // Buscar todos los productos activos de la organización (todos los niveles y tipos)
    // para los próximos 60 días
    const now = new Date();
    const in60Days = new Date(now);
    in60Days.setDate(in60Days.getDate() + 60);
    in60Days.setHours(23, 59, 59, 999);

    const productos = await prisma.schoolProduct.findMany({
      where: {
        OR: [
          {
            // Productos vinculados a través de Vision
            Vision: {
              organizationId: usuario.organizationId
            }
          },
          {
            // Productos vinculados directamente a la organización
            organizationId: usuario.organizationId
          }
        ],
        isActive: true,
        startDate: { 
          gte: now,
          lte: in60Days
        }
      },
      orderBy: {
        startDate: 'asc' // Más próximo primero
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        levelType: true,
        startDate: true,
        endDate: true,
        maxCapacity: true,
        currentEnrollment: true,
        visionId: true,
        location: true,
        videoUrl: true
      }
    });

    console.log('📦 Productos encontrados:', productos.length, productos);

    return NextResponse.json({
      success: true,
      productos
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo productos activos:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener productos',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
