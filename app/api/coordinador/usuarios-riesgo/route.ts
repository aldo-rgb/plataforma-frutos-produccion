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

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener usuarios en riesgo
    let whereClause: any = {};
    
    if (coordinador.organizationId) {
      whereClause.organizationId = coordinador.organizationId;
    } else {
      whereClause.coordinadorId = coordinador.id;
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
        llamadasPerdidas: {
          gte: 2
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        llamadasPerdidas: true,
        strikes: true
      },
      orderBy: {
        llamadasPerdidas: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      usuarios
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo usuarios en riesgo:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener usuarios',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
