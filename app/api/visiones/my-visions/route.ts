import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener visiones donde el usuario es coordinador
    const visions = await prisma.vision.findMany({
      where: {
        coordinadorId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    return NextResponse.json({ visions });
  } catch (error) {
    console.error('Error obteniendo visiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
