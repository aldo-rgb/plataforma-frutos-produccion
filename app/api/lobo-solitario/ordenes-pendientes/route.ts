import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log(`🔍 Buscando órdenes pendientes para usuario ${session.user.id}...`);

    // Buscar órdenes pendientes del usuario (últimos 30 minutos)
    const ordenesPendientes = await prisma.mentorPackageOrder.findMany({
      where: {
        usuarioId: session.user.id,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Últimos 30 minutos
        }
      },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Encontradas ${ordenesPendientes.length} órdenes pendientes`);

    const ordenes = ordenesPendientes.map(orden => ({
      id: orden.id,
      plan: orden.planType,
      frecuencia: orden.frecuencia,
      cantidadSesiones: orden.cantidadSesiones,
      precioTotal: Number(orden.precioTotal),
      mentorNombre: orden.Mentor.nombre,
      createdAt: orden.createdAt.toISOString(),
      expiresAt: new Date(orden.createdAt.getTime() + 30 * 60 * 1000).toISOString() // 30 minutos después de creación
    }));

    return NextResponse.json({
      success: true,
      ordenes
    });
  } catch (error: any) {
    console.error('❌ Error al obtener órdenes pendientes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener órdenes pendientes',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
