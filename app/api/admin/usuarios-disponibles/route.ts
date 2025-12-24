import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener usuarios PARTICIPANTE sin ciclo activo (disponibles para asignar a visión)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (usuario?.rol !== 'ADMINISTRADOR' && usuario?.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Buscar usuarios PARTICIPANTE que NO tienen ciclo activo
    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: 'PARTICIPANTE',
        // No tienen enrollment activo
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          none: {
            status: 'ACTIVE'
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json({ usuarios });

  } catch (error) {
    console.error('Error loading usuarios disponibles:', error);
    return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 });
  }
}
