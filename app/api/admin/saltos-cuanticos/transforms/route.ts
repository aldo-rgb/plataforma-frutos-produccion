import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Crear una transformación del sistema
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRol = session.user.rol;

    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const transform = await prisma.metamorfosisTransform.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        isSystemDefault: true,
        trainerId: null
      }
    });

    return NextResponse.json(transform);
  } catch (error) {
    console.error('Error al crear transformación:', error);
    return NextResponse.json({ error: 'Error al crear transformación' }, { status: 500 });
  }
}
