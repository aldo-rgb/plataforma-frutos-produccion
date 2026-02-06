import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Guardar encuesta del Trainer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const trainer = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!trainer || trainer.rol !== 'TRAINER') {
      return NextResponse.json({ error: 'Solo trainers pueden enviar esta encuesta' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, salonAmbiente, instalaciones, staff, audioUrl, observaciones } = body;

    if (!productId || !salonAmbiente || !instalaciones || !staff) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validar ratings
    if (![salonAmbiente, instalaciones, staff].every(r => r >= 1 && r <= 5)) {
      return NextResponse.json({ error: 'Las valoraciones deben ser entre 1 y 5' }, { status: 400 });
    }

    // Verificar que el producto existe y el trainer está asignado
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { id: true, trainerId: true, name: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (product.trainerId !== trainer.id) {
      return NextResponse.json({ error: 'No eres el trainer de este entrenamiento' }, { status: 403 });
    }

    // Verificar si ya existe una encuesta
    const existing = await prisma.trainerSurvey.findUnique({
      where: {
        productId_trainerId: {
          productId,
          trainerId: trainer.id
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya completaste la encuesta para este entrenamiento' }, { status: 400 });
    }

    // Crear la encuesta
    const survey = await prisma.trainerSurvey.create({
      data: {
        productId,
        trainerId: trainer.id,
        salonAmbiente,
        instalaciones,
        staff,
        audioUrl,
        observaciones
      }
    });

    logger.debug(`✅ Encuesta Trainer completada: ${trainer.nombre} para "${product.name}"`);

    return NextResponse.json({
      success: true,
      message: 'Encuesta guardada exitosamente',
      survey
    });

  } catch (error: any) {
    logger.error('❌ Error guardando encuesta trainer:', error);
    return NextResponse.json(
      { error: 'Error al guardar encuesta', message: error?.message },
      { status: 500 }
    );
  }
}
