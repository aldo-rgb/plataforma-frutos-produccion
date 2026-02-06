import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Obtener precios predeterminados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Buscar usuario para obtener organizationId
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 400 });
    }

    // Buscar precios predeterminados para esta organización
    const prices = await prisma.defaultPrice.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { levelType: 'asc' },
    });

    return NextResponse.json({ success: true, prices });
  } catch (error) {
    logger.error('Error fetching default prices:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar precios predeterminados' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un precio predeterminado
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Buscar usuario para obtener organizationId
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 400 });
    }

    const body = await request.json();
    const { levelType, basePrice, promoPrice, promoDeadline, currency } = body;

    logger.debug('📥 Received data:', { levelType, basePrice, promoPrice, promoDeadline, currency });
    logger.debug('📥 Data types:', { 
      levelType: typeof levelType, 
      basePrice: typeof basePrice,
      promoPrice: typeof promoPrice,
      currency: typeof currency 
    });

    if (!levelType || basePrice === undefined || basePrice === null) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validar y convertir basePrice a número
    const basePriceNum = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice);
    if (isNaN(basePriceNum)) {
      return NextResponse.json({ success: false, error: 'Precio base inválido' }, { status: 400 });
    }

    // Validar y convertir promoPrice si existe
    let promoPriceNum = null;
    if (promoPrice !== null && promoPrice !== undefined && promoPrice !== '') {
      promoPriceNum = typeof promoPrice === 'number' ? promoPrice : parseFloat(promoPrice);
      if (isNaN(promoPriceNum)) {
        promoPriceNum = null;
      }
    }

    logger.debug('💾 Saving price:', { levelType, basePrice: basePriceNum, promoPrice: promoPriceNum, promoDeadline, currency });

    // Primero buscar si existe el precio
    const existingPrice = await prisma.defaultPrice.findFirst({
      where: {
        organizationId: user.organizationId,
        levelType,
      },
    });

    let price;
    if (existingPrice) {
      // Actualizar existente
      price = await prisma.defaultPrice.update({
        where: { id: existingPrice.id },
        data: {
          basePrice: basePriceNum,
          promoPrice: promoPriceNum,
          promoDeadline: promoDeadline ? new Date(promoDeadline) : null,
          currency: currency || 'MXN',
        },
      });
      logger.debug('✅ Price updated:', price);
    } else {
      // Crear nuevo
      price = await prisma.defaultPrice.create({
        data: {
          organizationId: user.organizationId,
          levelType,
          basePrice: basePriceNum,
          promoPrice: promoPriceNum,
          promoDeadline: promoDeadline ? new Date(promoDeadline) : null,
          currency: currency || 'MXN',
        },
      });
      logger.debug('✅ Price created:', price);
    }

    return NextResponse.json({ success: true, price });
  } catch (error) {
    logger.error('❌ Error updating default price:', error);
    logger.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { success: false, error: 'Error al actualizar precio predeterminado', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
