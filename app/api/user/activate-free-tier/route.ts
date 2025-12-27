import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/activate-free-tier
 * Activa el tier FREE para el usuario actual
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Actualizar usuario a tier FREE
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        tier: 'FREE',
        suscripcion: 'ACTIVO', // Activar "suscripción" para desbloquear funcionalidades básicas
        wizardCompleted: false // Permitir completar wizard
      }
    });

    console.log('✅ Usuario activado en tier FREE:', userId);

    return NextResponse.json({
      success: true,
      message: 'Tier FREE activado exitosamente',
      tier: 'FREE'
    });

  } catch (error: any) {
    console.error('Error activando tier FREE:', error);
    return NextResponse.json(
      { error: 'Error al activar tier FREE', details: error.message },
      { status: 500 }
    );
  }
}
