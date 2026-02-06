import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateSessionCredits, getUserActivePackages } from '@/lib/packageSessionManager';
import logger from '@/lib/logger';

/**
 * GET /api/participante/package-credits
 * 
 * Obtiene los paquetes activos del usuario con sus créditos disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    // Si se proporciona mentorId, validar créditos con ese mentor
    if (mentorId) {
      const validation = await validateSessionCredits(
        session.user.id,
        parseInt(mentorId)
      );

      return NextResponse.json({
        success: true,
        validation,
      });
    }

    // Si no, devolver todos los paquetes activos
    const activePackages = await getUserActivePackages(session.user.id);

    return NextResponse.json({
      success: true,
      packages: activePackages.map((pkg) => ({
        id: pkg.id,
        mentorId: pkg.mentorId,
        mentorName: pkg.Mentor.nombre,
        mentorPhoto: pkg.Mentor.PerfilMentor?.fotoPerfil,
        visionId: pkg.visionId,
        visionName: pkg.Vision.nombre,
        totalSessions: pkg.PackageSessionCredits?.totalSessions || 0,
        usedSessions: pkg.PackageSessionCredits?.usedSessions || 0,
        remainingSessions: pkg.PackageSessionCredits?.remainingSessions || 0,
        expiresAt: pkg.PackageSessionCredits?.expiresAt,
        paidAt: pkg.paidAt,
        precioTotal: pkg.precioTotal,
        currency: pkg.currency,
      })),
    });
  } catch (error: any) {
    logger.error('❌ Error obteniendo créditos de paquetes:', error);
    return NextResponse.json(
      { error: 'Error al obtener créditos', details: error.message },
      { status: 500 }
    );
  }
}
