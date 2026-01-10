import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Guardar foto de perfil capturada en check-in
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, imageData } = body;

    if (!userId || !imageData) {
      return NextResponse.json({ error: 'Se requiere userId e imageData' }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar el campo imagen del usuario con la foto capturada
    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(userId) },
      data: { 
        imagen: imageData,
        profileImage: imageData
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Foto guardada correctamente',
      photoUrl: imageData,
      user: {
        id: updatedUser.id,
        nombre: updatedUser.nombre,
        imagen: updatedUser.imagen
      }
    });

  } catch (error) {
    console.error('Error guardando foto:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
