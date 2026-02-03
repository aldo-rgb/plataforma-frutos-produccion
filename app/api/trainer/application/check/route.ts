import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Verificar si el usuario ya tiene una solicitud de entrenador
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Buscar solicitud existente del usuario
    const existingApplication = await prisma.trainerApplication.findFirst({
      where: { usuarioId: userId },
      orderBy: { createdAt: 'desc' },
    });

    // También verificar si ya tiene perfil de entrenador activo
    const existingProfile = await prisma.perfilTrainer.findUnique({
      where: { usuarioId: userId },
    });

    // Verificar si el usuario ya es entrenador
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { esEntrenador: true, rol: true },
    });

    return NextResponse.json({
      hasApplication: !!existingApplication,
      application: existingApplication,
      hasProfile: !!existingProfile,
      isTrainer: usuario?.esEntrenador || usuario?.rol === 'TRAINER',
    });
  } catch (error) {
    console.error('Error checking trainer application:', error);
    return NextResponse.json(
      { error: 'Error al verificar solicitud' },
      { status: 500 }
    );
  }
}
