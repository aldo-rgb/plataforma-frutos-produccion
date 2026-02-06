import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener todos los elementos del sistema
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRol = session.user.rol;

    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todos los elementos del sistema
    const [bases, transforms, songs, cunaSongs] = await Promise.all([
      prisma.metamorfosisBase.findMany({
        where: { isSystemDefault: true },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { Assignments: true } }
        }
      }),
      prisma.metamorfosisTransform.findMany({
        where: { isSystemDefault: true },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { Assignments: true } }
        }
      }),
      prisma.metamorfosisSong.findMany({
        where: { isSystemDefault: true },
        orderBy: { title: 'asc' },
        include: {
          _count: { select: { Assignments: true } }
        }
      }),
      prisma.metamorfosisCunaSong.findMany({
        where: { isSystemDefault: true },
        orderBy: { title: 'asc' },
        include: {
          _count: { select: { Assignments: true } }
        }
      })
    ]);

    return NextResponse.json({
      bases,
      transforms,
      songs,
      cunaSongs
    });
  } catch (error) {
    logger.error('Error al obtener elementos:', error);
    return NextResponse.json({ error: 'Error al obtener elementos' }, { status: 500 });
  }
}
