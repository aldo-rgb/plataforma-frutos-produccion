import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Guardar encuesta del Game Changer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gc = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!gc || gc.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'Solo Game Changers pueden enviar esta encuesta' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      productId, 
      aireAcondicionado, 
      limpiezaBanos, 
      coffeBreak,
      entrenadorEstrellas,
      entrenadorInspiro,
      coordinadorRespaldo
    } = body;

    // Validaciones
    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    if (!['CONGELADO', 'PERFECTO', 'CALOR'].includes(aireAcondicionado)) {
      return NextResponse.json({ error: 'aireAcondicionado inválido' }, { status: 400 });
    }

    if (typeof limpiezaBanos !== 'number' || limpiezaBanos < 0 || limpiezaBanos > 100) {
      return NextResponse.json({ error: 'limpiezaBanos debe ser entre 0 y 100' }, { status: 400 });
    }

    if (!['A_TIEMPO', 'TARDE_FALTANTE'].includes(coffeBreak)) {
      return NextResponse.json({ error: 'coffeBreak inválido' }, { status: 400 });
    }

    if (typeof entrenadorEstrellas !== 'number' || entrenadorEstrellas < 1 || entrenadorEstrellas > 5) {
      return NextResponse.json({ error: 'entrenadorEstrellas debe ser entre 1 y 5' }, { status: 400 });
    }

    if (typeof entrenadorInspiro !== 'boolean') {
      return NextResponse.json({ error: 'entrenadorInspiro debe ser boolean' }, { status: 400 });
    }

    if (typeof coordinadorRespaldo !== 'number' || coordinadorRespaldo < 0 || coordinadorRespaldo > 100) {
      return NextResponse.json({ error: 'coordinadorRespaldo debe ser entre 0 y 100' }, { status: 400 });
    }

    // Verificar que el producto existe
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, visionId: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe una encuesta
    const existing = await prisma.gameChangerSurvey.findUnique({
      where: {
        productId_gameChangerId: {
          productId,
          gameChangerId: gc.id
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya completaste la encuesta para este entrenamiento' }, { status: 400 });
    }

    // Crear la encuesta
    const survey = await prisma.gameChangerSurvey.create({
      data: {
        productId,
        gameChangerId: gc.id,
        aireAcondicionado,
        limpiezaBanos,
        coffeBreak,
        entrenadorEstrellas,
        entrenadorInspiro,
        coordinadorRespaldo
      }
    });

    // Actualizar el estado de bloqueo
    await prisma.gameChangerLockStatus.upsert({
      where: {
        productId_gameChangerId: {
          productId,
          gameChangerId: gc.id
        }
      },
      update: {
        surveyCompleted: true,
        isLocked: false,
        unlockedAt: new Date()
      },
      create: {
        productId,
        gameChangerId: gc.id,
        isLocked: false,
        unlockedAt: new Date(),
        surveyCompleted: true
      }
    });

    console.log(`✅ Encuesta GC completada: ${gc.nombre} para "${product.name}"`);

    return NextResponse.json({
      success: true,
      message: 'Encuesta guardada exitosamente',
      survey
    });

  } catch (error: any) {
    console.error('❌ Error guardando encuesta GC:', error);
    return NextResponse.json(
      { error: 'Error al guardar encuesta', message: error?.message },
      { status: 500 }
    );
  }
}
