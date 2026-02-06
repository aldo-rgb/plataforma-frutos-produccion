import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Convierte una fecha string a Date de forma segura, evitando problemas de timezone.
 * Cuando se usa solo fecha (YYYY-MM-DD), JavaScript interpreta como medianoche UTC,
 * lo cual puede resultar en el día anterior en zonas horarias negativas (ej: México UTC-6).
 * 
 * Esta función agrega T12:00:00 (mediodía) para evitar este problema.
 */
function toSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Si ya tiene hora, usarlo directamente
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de timezone
  return new Date(`${dateStr}T12:00:00`);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
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

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      nombre,
      colorIdentificador,
      descripcion,
      maxParticipantes,
      enabledLevels,
      basicConfig,
      advancedConfig,
      plConfig,
      currency
    } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar que no exista otra visión con el mismo nombre en la organización
    const existingVision = await prisma.vision.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        organizationId: user.organizationId
      }
    });

    if (existingVision) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una visión con este nombre en tu organización' },
        { status: 400 }
      );
    }

    // Determinar el coordinadorId (prioridad: PL > Advanced > Basic)
    let coordinadorId: number;
    if (plConfig?.coordinatorId) {
      coordinadorId = parseInt(plConfig.coordinatorId.toString());
    } else if (advancedConfig?.coordinatorId) {
      coordinadorId = parseInt(advancedConfig.coordinatorId.toString());
    } else if (basicConfig?.coordinatorId) {
      coordinadorId = parseInt(basicConfig.coordinatorId.toString());
    } else {
      coordinadorId = user.id;
    }

    // Determinar fechas (usar las del nivel básico como base)
    const startDate = toSafeDate(basicConfig?.startDate) || new Date();
    
    // Calcular endDate: usar el último fin de semana de PL si existe, si no usar avanzado, si no usar básico
    let endDate: Date | null = new Date();
    if (plConfig?.weekends && plConfig.weekends.length > 0) {
      const lastWeekend = plConfig.weekends[plConfig.weekends.length - 1];
      if (lastWeekend.endDate) {
        endDate = toSafeDate(lastWeekend.endDate);
      }
    } else if (advancedConfig?.endDate) {
      endDate = toSafeDate(advancedConfig.endDate);
    } else if (basicConfig?.endDate) {
      endDate = toSafeDate(basicConfig.endDate);
    }

    // Crear la visión
    const vision = await prisma.vision.create({
      data: {
        nombre,
        descripcion: descripcion || `Visión ${nombre} - Programa Completo`,
        maxParticipantes: maxParticipantes || 100,
        organizationId: user.organizationId,
        coordinadorId: coordinadorId,
        isActive: true,
        enabledLevels: enabledLevels || ['BASIC', 'ADVANCED', 'PL'],
        
        // Fechas del Nivel Básico
        startDate: toSafeDate(basicConfig?.startDate) || startDate,
        endDate: toSafeDate(basicConfig?.endDate) || endDate,
        
        // Fechas del Nivel Avanzado
        advancedStartDate: toSafeDate(advancedConfig?.startDate),
        advancedEndDate: toSafeDate(advancedConfig?.endDate),
        
        // Fechas de los 3 fines de semana de Liderato
        plWeekend1StartDate: toSafeDate(plConfig?.weekends?.[0]?.startDate),
        plWeekend1EndDate: toSafeDate(plConfig?.weekends?.[0]?.endDate),
        plWeekend2StartDate: toSafeDate(plConfig?.weekends?.[1]?.startDate),
        plWeekend2EndDate: toSafeDate(plConfig?.weekends?.[1]?.endDate),
        plWeekend3StartDate: toSafeDate(plConfig?.weekends?.[2]?.startDate),
        plWeekend3EndDate: toSafeDate(plConfig?.weekends?.[2]?.endDate),
        
        updatedAt: new Date(),
        
        // Áreas obligatorias
        forceFinanzasArea: true,
        forceRelacionesArea: true,
        forceTalentosArea: true,
        forceSaludArea: true,
        forcePazMentalArea: true,
        forceOcioArea: true,
        forceTransformationArea: true,
        transformationGuestsTarget: 4,
        forceCommunityServiceArea: true,
      }
    });

    logger.debug(`✅ Visión completa creada: ${vision.nombre} (ID: ${vision.id})`);
    logger.debug(`   Niveles habilitados: ${vision.enabledLevels.join(', ')}`);
    logger.debug(`   Fechas: ${vision.startDate} - ${vision.endDate}`);

    // Crear los 3 productos asociados a esta visión
    const products = [];

    // 1. Producto BÁSICO
    if (basicConfig) {
      const basicProduct = await prisma.schoolProduct.create({
        data: {
          name: `${nombre} - Básico`,
          description: `Programa Básico de la visión ${nombre}. Inicia el proceso de transformación personal con actividades fundamentales.`,
          imageUrl: null,
          type: 'CORE_TRAINING',
          levelType: 'BASIC',
          basePrice: basicConfig.price || 3500,
          promoPrice: null,
          promoDeadline: null,
          startDate: toSafeDate(basicConfig.startDate),
          endDate: toSafeDate(basicConfig.endDate),
          maxCapacity: maxParticipantes || 100,
          currentEnrollment: 0,
          isActive: true,
          organizationId: user.organizationId,
          visionId: vision.id,
          location: basicConfig.location || null,
          coordinatorId: basicConfig.coordinatorId ? parseInt(basicConfig.coordinatorId.toString()) : null,
          trainerId: basicConfig.trainerId ? parseInt(basicConfig.trainerId.toString()) : null,
          createdBy: user.id,
          updatedAt: new Date(),
        }
      });
      products.push(basicProduct);
      logger.debug(`   ✅ Producto Básico creado: ${basicProduct.name} (ID: ${basicProduct.id})`);
    }

    // 2. Producto AVANZADO
    if (advancedConfig) {
      const advancedProduct = await prisma.schoolProduct.create({
        data: {
          name: `${nombre} - Avanzado`,
          description: `Programa Avanzado de la visión ${nombre}. Profundiza en el desarrollo personal con retos más complejos.`,
          imageUrl: null,
          type: 'CORE_TRAINING',
          levelType: 'ADVANCED',
          basePrice: advancedConfig.price || 5000,
          promoPrice: null,
          promoDeadline: null,
          startDate: toSafeDate(advancedConfig.startDate),
          endDate: toSafeDate(advancedConfig.endDate),
          maxCapacity: maxParticipantes || 100,
          currentEnrollment: 0,
          isActive: true,
          organizationId: user.organizationId,
          visionId: vision.id,
          location: advancedConfig.location || null,
          coordinatorId: advancedConfig.coordinatorId ? parseInt(advancedConfig.coordinatorId.toString()) : null,
          trainerId: advancedConfig.trainerId ? parseInt(advancedConfig.trainerId.toString()) : null,
          createdBy: user.id,
          updatedAt: new Date(),
        }
      });
      products.push(advancedProduct);
      logger.debug(`   ✅ Producto Avanzado creado: ${advancedProduct.name} (ID: ${advancedProduct.id})`);
    }

    // 3. Producto LIDERATO
    if (plConfig) {
      // Crear descripción detallada con los fines de semana
      let plDescription = `Programa de Liderato de la visión ${nombre}. Formación intensiva de líderes en 3 fines de semana:\n`;
      if (plConfig.weekends && plConfig.weekends.length > 0) {
        plConfig.weekends.forEach((weekend: any, index: number) => {
          const startDateStr = weekend.startDate ? toSafeDate(weekend.startDate)?.toLocaleDateString('es-MX') : 'Por definir';
          const endDateStr = weekend.endDate ? toSafeDate(weekend.endDate)?.toLocaleDateString('es-MX') : 'Por definir';
          plDescription += `\n• ${weekend.name}: ${startDateStr} - ${endDateStr}`;
          if (weekend.location) plDescription += ` en ${weekend.location}`;
        });
      }

      // Determinar fechas del producto (primer inicio y último fin)
      let plStartDate = null;
      let plEndDate = null;
      if (plConfig.weekends && plConfig.weekends.length > 0) {
        const firstWeekend = plConfig.weekends[0];
        const lastWeekend = plConfig.weekends[plConfig.weekends.length - 1];
        plStartDate = toSafeDate(firstWeekend.startDate);
        plEndDate = toSafeDate(lastWeekend.endDate);
      }

      // 🆕 Extraer las fechas de los 3 fines de semana
      const weekend1 = plConfig.weekends?.[0];
      const weekend2 = plConfig.weekends?.[1];
      const weekend3 = plConfig.weekends?.[2];

      const plProduct = await prisma.schoolProduct.create({
        data: {
          name: `${nombre} - Liderato`,
          description: plDescription,
          imageUrl: null,
          type: 'CORE_TRAINING',
          levelType: 'PL',
          basePrice: plConfig.price || 7000,
          promoPrice: null,
          promoDeadline: null,
          startDate: plStartDate,
          endDate: plEndDate,
          // 🆕 Guardar las fechas de los 3 fines de semana
          plWeekend1StartDate: toSafeDate(weekend1?.startDate),
          plWeekend1EndDate: toSafeDate(weekend1?.endDate),
          plWeekend2StartDate: toSafeDate(weekend2?.startDate),
          plWeekend2EndDate: toSafeDate(weekend2?.endDate),
          plWeekend3StartDate: toSafeDate(weekend3?.startDate),
          plWeekend3EndDate: toSafeDate(weekend3?.endDate),
          maxCapacity: maxParticipantes || 100,
          currentEnrollment: 0,
          isActive: true,
          organizationId: user.organizationId,
          visionId: vision.id,
          location: plConfig.weekends && plConfig.weekends.length > 0 ? plConfig.weekends[0].location : null,
          coordinatorId: plConfig.coordinatorId ? parseInt(plConfig.coordinatorId.toString()) : null,
          trainerId: plConfig.weekends && plConfig.weekends.length > 0 && plConfig.weekends[0].trainerId 
            ? parseInt(plConfig.weekends[0].trainerId.toString()) 
            : null,
          createdBy: user.id,
          updatedAt: new Date(),
        }
      });
      products.push(plProduct);
      logger.debug(`   ✅ Producto Liderato creado: ${plProduct.name} (ID: ${plProduct.id})`);
      logger.debug(`      📅 Fin de Semana 1: ${weekend1?.startDate || 'N/A'} - ${weekend1?.endDate || 'N/A'}`);
      logger.debug(`      📅 Fin de Semana 2: ${weekend2?.startDate || 'N/A'} - ${weekend2?.endDate || 'N/A'}`);
      logger.debug(`      📅 Fin de Semana 3: ${weekend3?.startDate || 'N/A'} - ${weekend3?.endDate || 'N/A'}`);
    }

    logger.debug(`✅ Total de productos creados: ${products.length}`);

    // 🆕 Crear registros en VisionStaff para que aparezcan en la página de gestión
    const staffRecords = [];

    // Staff del nivel BÁSICO
    if (basicConfig?.coordinatorId) {
      staffRecords.push({
        visionId: vision.id,
        userId: parseInt(basicConfig.coordinatorId.toString()),
        role: 'BASIC_COORDINATOR',
        level: 'BASIC',
        updatedAt: new Date(),
        assignedBy: user.id,
      });
    }
    if (basicConfig?.trainerId) {
      staffRecords.push({
        visionId: vision.id,
        userId: parseInt(basicConfig.trainerId.toString()),
        role: 'BASIC_TRAINER',
        level: 'BASIC',
        updatedAt: new Date(),
        assignedBy: user.id,
      });
    }

    // Staff del nivel AVANZADO
    if (advancedConfig?.coordinatorId) {
      staffRecords.push({
        visionId: vision.id,
        userId: parseInt(advancedConfig.coordinatorId.toString()),
        role: 'ADVANCED_COORDINATOR',
        level: 'ADVANCED',
        updatedAt: new Date(),
        assignedBy: user.id,
      });
    }
    if (advancedConfig?.trainerId) {
      staffRecords.push({
        visionId: vision.id,
        userId: parseInt(advancedConfig.trainerId.toString()),
        role: 'ADVANCED_TRAINER',
        level: 'ADVANCED',
        updatedAt: new Date(),
        assignedBy: user.id,
      });
    }

    // Staff del LIDERATO - Coordinador
    if (plConfig?.coordinatorId) {
      staffRecords.push({
        visionId: vision.id,
        userId: parseInt(plConfig.coordinatorId.toString()),
        role: 'PL_COORDINATOR',
        level: 'PL',
        updatedAt: new Date(),
        assignedBy: user.id,
      });
    }

    // Staff del LIDERATO (3 trainers para 3 fines de semana)
    if (plConfig?.weekends && Array.isArray(plConfig.weekends)) {
      plConfig.weekends.forEach((weekend: any, index: number) => {
        if (weekend.trainerId) {
          staffRecords.push({
            visionId: vision.id,
            userId: parseInt(weekend.trainerId.toString()),
            role: 'PL_TRAINER',
            level: 'PL',
            plWeekendNumber: index + 1, // 1, 2, o 3
            updatedAt: new Date(),
            assignedBy: user.id,
          });
        }
      });
    }

    // Crear todos los registros de staff en una sola operación
    if (staffRecords.length > 0) {
      await prisma.visionStaff.createMany({
        data: staffRecords,
        skipDuplicates: true, // Evitar errores si ya existen
      });
      logger.debug(`✅ Registros de staff creados: ${staffRecords.length}`);
    }

    return NextResponse.json({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        descripcion: vision.descripcion,
        enabledLevels: vision.enabledLevels
      },
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        levelType: p.levelType,
        basePrice: p.basePrice
      }))
    });

  } catch (error) {
    logger.error('❌ Error creating complete vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la visión completa' },
      { status: 500 }
    );
  }
}
