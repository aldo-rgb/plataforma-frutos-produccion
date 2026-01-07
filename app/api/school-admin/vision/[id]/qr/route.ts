import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const visionId = parseInt(params.id);

    // Aquí se generaría el QR code
    // Por ahora retornamos una URL de ejemplo
    const qrUrl = `/qr/vision-${visionId}.png`;

    return NextResponse.json({
      success: true,
      qrUrl,
      message: 'QR generado exitosamente',
    });

  } catch (error) {
    console.error('❌ Error generating QR:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar el QR' },
      { status: 500 }
    );
  }
}
