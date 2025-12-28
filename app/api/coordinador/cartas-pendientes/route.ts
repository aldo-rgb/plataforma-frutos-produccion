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

    // Obtener usuarios de las visiones del coordinador
    let whereClause: any = {};
    
    if (coordinador.organizationId) {
      whereClause.organizationId = coordinador.organizationId;
    } else {
      whereClause.coordinadorId = coordinador.id;
    }

    // Obtener IDs de usuarios
    const usuarios = await prisma.usuario.findMany({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      },
      select: { id: true }
    });
    const usuarioIds = usuarios.map(u => u.id);

    // Obtener cartas pendientes (BORRADOR, EN_REVISION, PENDIENTE)
    const cartas = await prisma.cartaFrutos.findMany({
      where: {
        usuarioId: { in: usuarioIds },
        estado: {
          in: ['BORRADOR', 'EN_REVISION', 'PENDIENTE']
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Mentor: {
          select: {
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      cartas: cartas.map(c => ({
        id: c.id,
        usuarioId: c.usuarioId,
        usuario: {
          nombre: c.Usuario.nombre,
          email: c.Usuario.email
        },
        mentor: c.Mentor ? {
          nombre: c.Mentor.nombre,
          email: c.Mentor.email
        } : null,
        estado: c.estado,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cartas pendientes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener cartas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
