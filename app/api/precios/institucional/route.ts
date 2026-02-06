import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// GET: Obtener precios institucionales (público)
export async function GET() {
  try {
    const precios = await prisma.pricingConfig.findMany({
      where: {
        OR: [
          { plan: 'institucional' },
          { plan: 'disciplina' }
        ]
      }
    });

    // Valores por defecto
    const preciosFormateados = {
      institucional: {
        mxn: { licencia: 2400 },
        usd: { licencia: 150 }
      },
      disciplina: {
        mxn: { llamada: 150 },
        usd: { llamada: 10 }
      }
    };

    // Llenar con datos de BD si existen
    precios.forEach(p => {
      if (p.plan === 'institucional') {
        const currency = p.currency.toLowerCase() as 'mxn' | 'usd';
        preciosFormateados.institucional[currency].licencia = p.price;
      } else if (p.plan === 'disciplina') {
        const currency = p.currency.toLowerCase() as 'mxn' | 'usd';
        preciosFormateados.disciplina[currency].llamada = p.price;
      }
    });

    return NextResponse.json(preciosFormateados);
  } catch (error) {
    logger.error('Error obteniendo precios institucionales:', error);
    return NextResponse.json({ error: 'Error al obtener precios' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
