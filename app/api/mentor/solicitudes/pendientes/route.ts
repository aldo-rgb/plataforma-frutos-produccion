import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/mentor/solicitudes/pendientes
 * Obtiene el número de solicitudes pendientes del mentor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({
        success: true,
        count: 0
      });
    }

    // Contar solicitudes pendientes
    const count = await prisma.solicitudMentoria.count({
      where: {
        perfilMentorId: perfilMentor.id,
        estado: 'PENDIENTE'
      }
    });

    return NextResponse.json({
      success: true,
      count
    });

  } catch (error: any) {
    console.error('❌ Error al contar pendientes:', error);
    
    return NextResponse.json(
      { 
        success: true,
        count: 0
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}
