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
      where: { email: session.user.email }
    });

    if (!usuario || usuario.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener visiones donde el coordinador es el coordinador asignado
    const visiones = await prisma.vision.findMany({
      where: {
        coordinadorId: usuario.id
      },
      include: {
        _count: {
          select: {
            Participantes: true,
            GameChangers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      visiones
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo visiones del coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener visiones',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
