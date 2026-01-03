import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/paquetes-lobo-solitario
 * Obtiene todos los paquetes contratados por lobos solitarios
 * Solo para ADMIN y DIRECTOR
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar rol de administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!usuario || (usuario.role !== 'ADMIN' && usuario.role !== 'DIRECTOR')) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Obtener todos los paquetes de lobos solitarios
    const paquetes = await prisma.mentorPackageOrder.findMany({
      where: {
        metadata: {
          path: ['tipoCliente'],
          equals: 'LOBO_SOLITARIO',
        },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        mentor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        PackageSessionCredits: {
          select: {
            creditosInicial: true,
            creditosUsados: true,
            creditosRestantes: true,
            expiresAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mapear a formato del frontend
    const paquetesFormateados = paquetes.map((paquete) => {
      const metadata = paquete.metadata as any;
      const creditos = paquete.PackageSessionCredits?.[0];

      return {
        id: paquete.id,
        usuario: {
          nombre: paquete.usuario.nombre,
          email: paquete.usuario.email,
        },
        mentor: {
          nombre: paquete.mentor.nombre,
          email: paquete.mentor.email,
        },
        plan: metadata?.plan || 'STANDARD',
        frecuencia: metadata?.frecuencia || 'BIMESTRAL',
        cantidadSesiones: paquete.cantidad,
        sesionesUsadas: creditos?.creditosUsados || 0,
        sesionesRestantes: creditos?.creditosRestantes || paquete.cantidad,
        precioTotal: paquete.precioTotal,
        status: paquete.status,
        metodoPago: paquete.metodoPago || 'N/A',
        fechaCompra: paquete.createdAt.toISOString(),
        expiresAt: creditos?.expiresAt?.toISOString() || null,
      };
    });

    // Calcular estadísticas
    const stats = {
      total: paquetes.length,
      completados: paquetes.filter((p) => p.status === 'COMPLETED').length,
      pendientes: paquetes.filter((p) => p.status === 'PENDING').length,
      fallidos: paquetes.filter((p) => p.status === 'FAILED').length,
      sesionesTotales: paquetes.reduce((sum, p) => sum + p.cantidad, 0),
      ingresosTotales: paquetes
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.precioTotal, 0),
    };

    return NextResponse.json({
      paquetes: paquetesFormateados,
      stats,
    });
  } catch (error) {
    console.error('Error al obtener paquetes lobo solitario:', error);
    return NextResponse.json(
      { error: 'Error al obtener los paquetes' },
      { status: 500 }
    );
  }
}
