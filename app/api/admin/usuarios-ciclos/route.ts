import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Listar usuarios por tipo de ciclo
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (usuario?.rol !== 'ADMIN' && usuario?.rol !== 'STAFF') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ALL'; // ALL, SOLO, VISION

    /*
    // Cuando la migración esté ejecutada, usar esta consulta:
    let whereClause: any = {};

    if (type === 'SOLO') {
      whereClause.visionId = null;
    } else if (type === 'VISION') {
      whereClause.visionId = { not: null };
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        visionId: true,
        vision: {
          select: {
            name: true
          }
        },
        ProgramEnrollment: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            cycleType: true,
            cycleStartDate: true,
            cycleEndDate: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ usuarios });
    */

    // Por ahora, retornar usuarios básicos sin la info de ciclo
    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: 'PARTICIPANTE'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({ 
      usuarios: usuarios.map(u => ({
        ...u,
        visionId: null,
        vision: null,
        ProgramEnrollment: []
      })),
      message: 'Sistema de ciclos pendiente de migración. Los datos de ciclo no están disponibles aún.'
    });

  } catch (error) {
    console.error('Error loading usuarios:', error);
    return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 });
  }
}
