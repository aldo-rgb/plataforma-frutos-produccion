import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Guardar auditoría del Director
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const director = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!director || !['COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN', 'ADMIN'].includes(director.rol)) {
      return NextResponse.json({ error: 'Solo coordinadores pueden enviar auditorías' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      productId,
      // Tarjeta 1: Momentos de Verdad
      auditRegistro,
      auditRegistroNota,
      auditConcentracion,
      auditConcentracionNota,
      auditBreakLargo,
      auditBreakLargoNota,
      auditEnrolamiento,
      auditEnrolamientoNota,
      auditSalaActiva,
      auditSalaActivaNota,
      auditBreakCorto,
      auditBreakCortoNota,
      // Tarjeta 2: Excelencia del Salón
      limpiezaGeneral,
      equipoSonido,
      visualesPantalla,
      materialesRotafolio,
      insumosBaul,
      cumplimientoTareas,
      mesaControl,
      // Tarjeta 3: Excelencia de Instalaciones
      climaAire,
      banosLimpieza,
      sillasEstado,
      pinturaParedes,
      brandingVinilos,
      // Tarjeta 4: Imagen Profesional
      liderazgoCapitanias,
      disciplinaPuntualidad,
      imagenStaff,
      imagenEntrenador,
      actitudEntrenador,
      alineacionEntrenador,
      // Cierre
      observaciones
    } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    // Verificar que el producto existe
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, organizationId: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe una auditoría
    const existing = await prisma.directorAudit.findUnique({
      where: { productId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una auditoría para este entrenamiento' }, { status: 400 });
    }

    // Validar valores de 3 estados
    const validThreeStates = ['EXCELENTE', 'ACEPTABLE', 'FALLA', null];
    const threeStateFields = [
      limpiezaGeneral, equipoSonido, visualesPantalla, materialesRotafolio,
      insumosBaul, cumplimientoTareas, mesaControl, climaAire, banosLimpieza,
      sillasEstado, pinturaParedes, brandingVinilos, disciplinaPuntualidad,
      imagenStaff, imagenEntrenador, actitudEntrenador, alineacionEntrenador
    ];

    for (const field of threeStateFields) {
      if (field !== undefined && !validThreeStates.includes(field)) {
        return NextResponse.json({ error: 'Valor de estado inválido' }, { status: 400 });
      }
    }

    // Crear la auditoría
    const audit = await prisma.directorAudit.create({
      data: {
        productId,
        directorId: director.id,
        // Tarjeta 1
        auditRegistro,
        auditRegistroNota,
        auditConcentracion,
        auditConcentracionNota,
        auditBreakLargo,
        auditBreakLargoNota,
        auditEnrolamiento,
        auditEnrolamientoNota,
        auditSalaActiva,
        auditSalaActivaNota,
        auditBreakCorto,
        auditBreakCortoNota,
        // Tarjeta 2
        limpiezaGeneral,
        equipoSonido,
        visualesPantalla,
        materialesRotafolio,
        insumosBaul,
        cumplimientoTareas,
        mesaControl,
        // Tarjeta 3
        climaAire,
        banosLimpieza,
        sillasEstado,
        pinturaParedes,
        brandingVinilos,
        // Tarjeta 4
        liderazgoCapitanias,
        disciplinaPuntualidad,
        imagenStaff,
        imagenEntrenador,
        actitudEntrenador,
        alineacionEntrenador,
        // Cierre
        observaciones,
        certifiedAt: new Date()
      }
    });

    // Crear notificación al coordinador y trainer del producto
    if (product.organizationId) {
      await prisma.notification.create({
        data: {
          userId: director.id,
          type: 'OTHER',
          title: 'Auditoría Certificada',
          message: `Has certificado la auditoría de calidad para "${product.name}"`,
          relatedId: productId
        }
      });
    }

    logger.debug(`✅ Auditoría certificada: ${director.nombre} para "${product.name}"`);

    return NextResponse.json({
      success: true,
      message: 'Auditoría certificada exitosamente',
      audit
    });

  } catch (error: any) {
    logger.error('❌ Error guardando auditoría:', error);
    return NextResponse.json(
      { error: 'Error al guardar auditoría', message: error?.message },
      { status: 500 }
    );
  }
}

// GET - Obtener auditoría de un producto
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    const audit = await prisma.directorAudit.findUnique({
      where: { productId: parseInt(productId) },
      include: {
        Director: {
          select: { nombre: true }
        }
      }
    });

    return NextResponse.json({ audit });

  } catch (error: any) {
    logger.error('❌ Error obteniendo auditoría:', error);
    return NextResponse.json(
      { error: 'Error al obtener auditoría', message: error?.message },
      { status: 500 }
    );
  }
}
