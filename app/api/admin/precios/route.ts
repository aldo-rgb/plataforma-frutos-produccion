import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener precios actuales (público para que participantes vean los precios)
export async function GET() {
  try {
    // No requerimos autenticación para GET - los precios deben ser públicos
    const precios = await prisma.pricingConfig.findMany({
      orderBy: [{ plan: 'asc' }, { currency: 'asc' }, { period: 'asc' }]
    });

    // Transformar a la estructura del frontend
    const preciosFormateados = {
      free: {
        mxn: { nombre: 'Free', precio: 0 },
        usd: { nombre: 'Free', precio: 0 }
      },
      standard: {
        mxn: { bimestral: 2000, anual: 10000 },
        usd: { bimestral: 150, anual: 800 }
      },
      premium: {
        mxn: { bimestral: 4000, anual: 25000 },
        usd: { bimestral: 300, anual: 1800 }
      },
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
      if (p.plan === 'standard' || p.plan === 'premium') {
        const currency = p.currency.toLowerCase() as 'mxn' | 'usd';
        const period = p.period?.toLowerCase() as 'bimestral' | 'anual';
        if (period) {
          (preciosFormateados[p.plan as 'standard' | 'premium'][currency] as any)[period] = p.price;
        }
      } else if (p.plan === 'institucional') {
        const currency = p.currency.toLowerCase() as 'mxn' | 'usd';
        preciosFormateados.institucional[currency].licencia = p.price;
      } else if (p.plan === 'disciplina') {
        const currency = p.currency.toLowerCase() as 'mxn' | 'usd';
        preciosFormateados.disciplina[currency].llamada = p.price;
      }
    });

    return NextResponse.json(preciosFormateados);
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    return NextResponse.json({ error: 'Error al obtener precios' }, { status: 500 });
  }
}

// POST: Guardar precios
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMINISTRADOR', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { precios } = body;

    // Función helper para upsert que maneja búsqueda manual
    const upsertPrice = async (plan: string, currency: string, period: string | null, price: number) => {
      const existing = await prisma.pricingConfig.findFirst({
        where: { plan, currency, period }
      });

      if (existing) {
        return prisma.pricingConfig.update({
          where: { id: existing.id },
          data: { price }
        });
      } else {
        return prisma.pricingConfig.create({
          data: { plan, currency, period, price }
        });
      }
    };

    // Preparar todas las operaciones
    const updates = [
      // Standard MXN
      upsertPrice('standard', 'MXN', 'bimestral', precios.standard.mxn.bimestral),
      upsertPrice('standard', 'MXN', 'anual', precios.standard.mxn.anual),
      // Standard USD
      upsertPrice('standard', 'USD', 'bimestral', precios.standard.usd.bimestral),
      upsertPrice('standard', 'USD', 'anual', precios.standard.usd.anual),
      // Premium MXN
      upsertPrice('premium', 'MXN', 'bimestral', precios.premium.mxn.bimestral),
      upsertPrice('premium', 'MXN', 'anual', precios.premium.mxn.anual),
      // Premium USD
      upsertPrice('premium', 'USD', 'bimestral', precios.premium.usd.bimestral),
      upsertPrice('premium', 'USD', 'anual', precios.premium.usd.anual),
      // Institucional
      upsertPrice('institucional', 'MXN', 'licencia', precios.institucional.mxn.licencia),
      upsertPrice('institucional', 'USD', 'licencia', precios.institucional.usd.licencia),
      // Disciplina
      upsertPrice('disciplina', 'MXN', 'llamada', precios.disciplina.mxn.llamada),
      upsertPrice('disciplina', 'USD', 'llamada', precios.disciplina.usd.llamada),
      // Free plans
      upsertPrice('free', 'MXN', null, 0),
      upsertPrice('free', 'USD', null, 0),
    ];

    await Promise.all(updates);

    return NextResponse.json({ 
      success: true, 
      message: 'Precios actualizados correctamente',
      count: updates.length
    });

  } catch (error) {
    console.error('Error guardando precios:', error);
    return NextResponse.json({ 
      error: 'Error al guardar precios',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
