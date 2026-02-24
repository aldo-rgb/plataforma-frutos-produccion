import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting para APIs públicas
    const { response } = rateLimit(request, RateLimitPresets.public);
    if (response) {
      logger.warn('Rate limit exceeded on public/referral');
      return response;
    }

    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código de referido requerido' },
        { status: 400 }
      );
    }

    // Limpiar el código: remover espacios, emojis y texto extra
    // El código real es solo la parte alfanumérica antes del primer espacio
    const cleanCode = code
      .split(' ')[0]  // Tomar solo la primera parte antes de espacios
      .split('%20')[0]  // En caso de URL encoding parcial
      .replace(/[^\w]/g, '')  // Remover cualquier carácter no alfanumérico
      .toUpperCase();

    logger.debug('🔍 Original code:', code);
    logger.debug('🧹 Cleaned code:', cleanCode);

    if (!cleanCode || cleanCode.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Código de referido inválido' },
        { status: 400 }
      );
    }

    // Buscar usuario por código de referido
    const user = await prisma.usuario.findFirst({
      where: {
        referralCode: cleanCode,
      },
      select: {
        id: true,
        nombre: true,
        referralCode: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            brandColor: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Código de referido no válido' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        referralCode: user.referralCode,
        organizationId: user.organizationId,
      },
      organization: user.Organization_Usuario_organizationIdToOrganization,
    });
  } catch (error) {
    logger.error('Error validating referral code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código de referido' },
      { status: 500 }
    );
  }
}
