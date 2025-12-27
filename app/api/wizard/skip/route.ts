import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/wizard/skip
 * Marca el wizard como "saltado" para que no vuelva a aparecer automáticamente
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Marcar wizardCompleted = true para que no vuelva a redirigir
    await prisma.usuario.update({
      where: { id: userId },
      data: { 
        wizardCompleted: true 
      }
    });

    console.log('✅ Usuario saltó el wizard:', userId);

    return NextResponse.json({ 
      success: true,
      message: 'Wizard marcado como completado. Puedes acceder cuando quieras desde el dashboard.' 
    });

  } catch (error: any) {
    console.error('❌ Error al saltar wizard:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
