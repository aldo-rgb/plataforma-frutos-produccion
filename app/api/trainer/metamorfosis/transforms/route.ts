import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Crear una nueva transformación de metamorfosis
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userRol = session.user.rol;

    if (!['TRAINER', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const transform = await prisma.metamorfosisTransform.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        trainerId: userRol === 'ADMINISTRADOR' ? null : userId,
        isSystemDefault: userRol === 'ADMINISTRADOR',
        isActive: true
      }
    });

    return NextResponse.json(transform);
  } catch (error) {
    logger.error('Error al crear transformación:', error);
    return NextResponse.json({ error: 'Error al crear elemento' }, { status: 500 });
  }
}

// GET - Obtener todas las transformaciones de metamorfosis
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const transforms = await prisma.metamorfosisTransform.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystemDefault: true },
          { trainerId: userId }
        ]
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(transforms);
  } catch (error) {
    logger.error('Error al obtener transformaciones:', error);
    return NextResponse.json({ error: 'Error al obtener elementos' }, { status: 500 });
  }
}
