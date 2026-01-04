import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/application/check
 * Verifica si el usuario ya tiene una solicitud de mentor
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verificar si ya tiene una solicitud
    const existingApplication = await prisma.mentorApplication.findUnique({
      where: { usuarioId: userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        paymentStatus: true
      }
    });

    if (existingApplication) {
      return NextResponse.json({
        hasApplication: true,
        application: existingApplication
      });
    }

    return NextResponse.json({
      hasApplication: false
    });

  } catch (error) {
    console.error('Error checking application:', error);
    return NextResponse.json(
      { error: 'Error al verificar solicitud' },
      { status: 500 }
    );
  }
}
