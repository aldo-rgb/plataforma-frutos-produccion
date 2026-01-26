import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener todos los elementos de metamorfosis (bases, transforms, songs, cunaSongs)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRol = session.user.rol;

    // Verificar que sea TRAINER o ADMIN
    if (!['TRAINER', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener bases (predefinidas del sistema + las del trainer)
    const bases = await prisma.metamorfosisBase.findMany({
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

    // Obtener transformaciones (predefinidas + las del trainer)
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

    // Obtener canciones (predefinidas + las del trainer)
    const songs = await prisma.metamorfosisSong.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystemDefault: true },
          { trainerId: userId }
        ]
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { title: 'asc' }
      ]
    });

    // Obtener canciones de cuna (predefinidas + las del trainer)
    const cunaSongs = await prisma.metamorfosisCunaSong.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystemDefault: true },
          { trainerId: userId }
        ]
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { title: 'asc' }
      ]
    });

    return NextResponse.json({
      bases,
      transforms,
      songs,
      cunaSongs
    });
  } catch (error) {
    console.error('Error al obtener elementos de metamorfosis:', error);
    return NextResponse.json({ error: 'Error al obtener elementos' }, { status: 500 });
  }
}
