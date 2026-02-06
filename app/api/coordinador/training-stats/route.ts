import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/coordinador/training-stats
 * Obtiene estadísticas del entrenamiento en curso de la organización
 * - Total de participantes en productos activos
 * - Pre-registros pendientes y pagados
 * - Llamadas pendientes del día
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario y su organización
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        organizationId: true,
        rol: true
      }
    });

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 404 });
    }

    // Verificar rol de coordinador (todos los tipos)
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN', 'TRAINER'];
    if (!allowedRoles.includes(user.rol || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const orgId = user.organizationId;
    const now = new Date();
    logger.debug('[training-stats] User:', user.id, 'OrgId:', orgId, 'Rol:', user.rol, 'Now:', now);

    // Obtener productos activos de la organización (BASIC, ADVANCED y PL)
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        levelType: {
          in: ['BASIC', 'ADVANCED', 'PL']
        }
      },
      select: {
        id: true,
        name: true,
        levelType: true,
        startDate: true,
        endDate: true,
        visionId: true,
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Helper: obtener solo la fecha (sin hora) en UTC para comparaciones consistentes
    const getDateOnlyUTC = (date: Date) => {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    };
    const todayDateUTC = getDateOnlyUTC(now);
    
    logger.debug('[training-stats] Today UTC:', todayDateUTC.toISOString());

    // Función para determinar si un producto está activo/en curso
    const isProductActive = (p: any) => {
      if (!p.startDate) return false;
      const start = new Date(p.startDate);
      const startDateOnly = getDateOnlyUTC(start);
      const end = p.endDate ? new Date(p.endDate) : new Date('2099-12-31');
      const endDateOnly = getDateOnlyUTC(end);
      
      // Está en curso si: (inicio <= ahora <= fin) O (hoy es el día de inicio) O (estamos dentro del período de fechas)
      const isInProgress = start <= now && now <= end;
      const startsToday = startDateOnly.getTime() === todayDateUTC.getTime();
      const isWithinPeriod = todayDateUTC >= startDateOnly && todayDateUTC <= endDateOnly;
      
      logger.debug('[training-stats] Product check:', p.levelType, 'startDate:', start.toISOString(), 'startsToday:', startsToday, 'isWithinPeriod:', isWithinPeriod, 'isInProgress:', isInProgress);
      
      return isInProgress || startsToday || isWithinPeriod;
    };

    // Determinar el nivel preferido según el rol del usuario
    let preferredLevel = 'BASIC';
    if (user.rol === 'COORDINATOR_ADVANCED') {
      preferredLevel = 'ADVANCED';
    }

    // Encontrar el producto EN CURSO que coincida con el nivel del coordinador
    // Primero buscar por nivel preferido, luego cualquier producto activo
    let currentProduct = activeProducts.find(p => p.levelType === preferredLevel && isProductActive(p));
    
    // Si no hay producto del nivel preferido activo, buscar cualquier producto activo
    if (!currentProduct) {
      currentProduct = activeProducts.find(p => isProductActive(p));
    }

    logger.debug('[training-stats] Current product in course:', currentProduct?.id, currentProduct?.name, currentProduct?.levelType, 'UserRole:', user.rol);

    const productIds = activeProducts.map(p => p.id);
    const visionIds = activeProducts.filter(p => p.visionId).map(p => p.visionId as number);

    // Contar participantes totales en las visiones asociadas (enrollments activos)
    const totalParticipants = await prisma.vision_enrollments.count({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: {
          in: ['ENROLLED', 'ACTIVE']
        }
      }
    });

    // Contar participantes inscritos (ENROLLED o ACTIVE) - estos son los que ya pagaron y están en el entrenamiento
    // Contamos todos los que tienen ENROLLED o ACTIVE porque ya están en el sistema
    const inscritosCount = await prisma.vision_enrollments.count({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: {
          in: ['ENROLLED', 'ACTIVE']
        }
      }
    });

    // Obtener la visión activa según el rol del usuario
    // COORDINADOR maneja PL, COORDINATOR_BASIC maneja BASIC, COORDINATOR_ADVANCED maneja ADVANCED
    // Primero intentamos encontrar una visión que tenga enrollments del nivel correspondiente
    let activeVision = null;
    
    if (user.rol === 'COORDINADOR') {
      // Para COORDINADOR, buscar la visión con producto PL que tenga enrollments de PL
      const plProducts = activeProducts.filter(p => p.levelType === 'PL' && p.Vision);
      logger.debug('[training-stats] PL Products for org', orgId, ':', plProducts.map(p => ({ id: p.id, name: p.name, visionId: p.visionId })));
      
      // Verificar cuál tiene enrollments de PL
      for (const plProduct of plProducts) {
        if (plProduct.visionId) {
          const plCount = await prisma.vision_enrollments.count({
            where: { visionId: plProduct.visionId, level: 'PL' }
          });
          logger.debug('[training-stats] Vision', plProduct.visionId, 'has', plCount, 'PL enrollments');
          if (plCount > 0) {
            activeVision = plProduct.Vision;
            logger.debug('[training-stats] Found PL vision with', plCount, 'enrollments:', plProduct.visionId);
            break;
          }
        }
      }
      // Fallback: usar el primer producto PL disponible
      if (!activeVision) {
        activeVision = plProducts[0]?.Vision || activeProducts.find(p => p.Vision)?.Vision || null;
        logger.debug('[training-stats] Using fallback vision:', activeVision?.id);
      }
    } else if (user.rol === 'COORDINATOR_ADVANCED') {
      // Para COORDINATOR_ADVANCED, buscar la visión con producto ADVANCED activo
      const advProduct = activeProducts.find(p => p.levelType === 'ADVANCED' && p.Vision);
      activeVision = advProduct?.Vision || activeProducts.find(p => p.Vision)?.Vision || null;
    } else {
      // Para otros roles, usar la primera visión disponible
      activeVision = activeProducts.find(p => p.Vision)?.Vision || null;
    }
    logger.debug('[training-stats] Active vision for role', user.rol, ':', activeVision?.id, activeVision?.nombre);
    
    // Obtener TODOS los productos ADVANCED activos
    const advancedProducts = activeProducts.filter(p => p.levelType === 'ADVANCED');
    const advancedProductIds = advancedProducts.map(p => p.id);
    const advancedVisionIds = advancedProducts.filter(p => p.visionId).map(p => p.visionId as number);
    
    // Obtener producto de BASIC activo
    const basicProduct = activeProducts.find(p => p.levelType === 'BASIC');

    logger.debug('[training-stats] Advanced Products:', advancedProductIds, 'Vision IDs:', advancedVisionIds);

    // Conteos específicos por nivel ADVANCED (sumando todos los productos ADVANCED)
    let advancedStats = { pending: 0, enrolled: 0, total: 0 };
    if (advancedProductIds.length > 0) {
      // Total declarados para ADVANCED (pre-registros pendientes en CUALQUIER producto ADVANCED)
      const advancedPending = await prisma.advancedPreRegistration.count({
        where: {
          OR: [
            { targetProductId: { in: advancedProductIds } },
            { currentProductId: { in: advancedProductIds } }
          ],
          status: 'PENDING'
        }
      });
      
      // Total inscritos en ADVANCED (ya pagaron) - buscar en TODAS las visiones con productos ADVANCED
      let advancedEnrolled = 0;
      if (advancedVisionIds.length > 0) {
        advancedEnrolled = await prisma.vision_enrollments.count({
          where: {
            visionId: { in: advancedVisionIds },
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        });
      }
      
      // También contar los pre-registros PAID como inscritos
      const advancedPaid = await prisma.advancedPreRegistration.count({
        where: {
          OR: [
            { targetProductId: { in: advancedProductIds } },
            { currentProductId: { in: advancedProductIds } }
          ],
          status: 'PAID'
        }
      });
      
      // Total de pre-registros (todos los status)
      const totalPreRegistros = await prisma.advancedPreRegistration.count({
        where: {
          OR: [
            { targetProductId: { in: advancedProductIds } },
            { currentProductId: { in: advancedProductIds } }
          ]
        }
      });
      
      logger.debug('[training-stats] ADVANCED - Pending:', advancedPending, 'Enrolled:', advancedEnrolled, 'Paid:', advancedPaid, 'TotalPreReg:', totalPreRegistros);
      
      // Usar el mayor entre enrollments y pre-registros pagados
      const enrolled = Math.max(advancedEnrolled, advancedPaid);
      
      advancedStats = {
        pending: advancedPending,
        enrolled: enrolled,
        total: advancedPending + enrolled
      };
      
      logger.debug('[training-stats] ADVANCED Stats final:', advancedStats);
    }
    
    // Obtener el nombre de la visión del primer producto ADVANCED para mostrar
    const advancedProduct = advancedProducts[0];

    // Conteos específicos por nivel BASIC
    let basicStats = { pending: 0, enrolled: 0, total: 0 };
    if (basicProduct?.visionId) {
      // Total inscritos en BASIC
      const basicEnrolled = await prisma.vision_enrollments.count({
        where: {
          visionId: basicProduct.visionId,
          level: 'BASIC',
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        }
      });
      
      // Para BASIC, los pending serían los que están en proceso de pago
      const basicPending = await prisma.vision_enrollments.count({
        where: {
          visionId: basicProduct.visionId,
          level: 'BASIC',
          enrollmentStatus: 'PENDING'
        }
      });
      
      basicStats = {
        pending: basicPending,
        enrolled: basicEnrolled,
        total: basicPending + basicEnrolled
      };
    }

    // ========== ESTADÍSTICAS DEL SIGUIENTE NIVEL (lo que queremos promover) ==========
    // Si estoy en BÁSICO → mostrar pre-registros para AVANZADO de la misma visión
    // Si estoy en AVANZADO → mostrar pre-registros para LIDERATO
    let nextLevelStats = { pending: 0, enrolled: 0, total: 0 };
    let nextLevelName = '';
    let currentVisionName = '';
    let currentLevel = '';
    let nextLevel = '';
    
    // Variables para widgets correctos
    // Declarados: pre-registros pendientes / total del nivel actual
    // Inscritos: pagados del siguiente nivel / total pre-registros
    let declaradosNumerator = 0;
    let declaradosDenominator = 0;
    let inscritosNumerator = 0;
    let inscritosDenominator = 0;
    
    if (currentProduct) {
      currentVisionName = currentProduct.Vision?.nombre || currentProduct.name;
      currentLevel = currentProduct.levelType === 'BASIC' ? 'BÁSICO' : 'AVANZADO';
      
      if (currentProduct.levelType === 'BASIC' && currentProduct.visionId) {
        // ESTOY EN BÁSICO → Mostrar estadísticas de pase a AVANZADO
        nextLevel = 'AVANZADO';
        nextLevelName = currentVisionName;
        
        // Obtener total de inscritos en BÁSICO (denominador para declarados)
        // Solo contar los que tienen pago completo
        const basicEnrolledCount = await prisma.vision_enrollments.count({
          where: {
            visionId: currentProduct.visionId,
            level: 'BASIC',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
            paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
          }
        });
        
        // Buscar el producto AVANZADO de la misma visión
        const advancedProductForVision = activeProducts.find(
          p => p.levelType === 'ADVANCED' && p.visionId === currentProduct.visionId
        );
        
        if (advancedProductForVision) {
          // Pre-registros PENDING para ese AVANZADO específico (numerador declarados)
          const advPending = await prisma.advancedPreRegistration.count({
            where: {
              OR: [
                { targetProductId: advancedProductForVision.id },
                { currentProductId: advancedProductForVision.id }
              ],
              status: 'PENDING'
            }
          });
          
          // Pre-registros PAID para ese AVANZADO específico
          const advPaid = await prisma.advancedPreRegistration.count({
            where: {
              OR: [
                { targetProductId: advancedProductForVision.id },
                { currentProductId: advancedProductForVision.id }
              ],
              status: 'PAID'
            }
          });
          
          // Enrollments de ADVANCED de la misma visión - SOLO CON PAGO COMPLETO
          const advEnrolled = await prisma.vision_enrollments.count({
            where: {
              visionId: currentProduct.visionId,
              level: 'ADVANCED',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
              paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
            }
          });
          
          const enrolled = Math.max(advEnrolled, advPaid);
          const totalPreRegistros = advPending + advPaid;
          
          // Widget DECLARADOS: pre-registros pendientes / inscritos en básico
          declaradosNumerator = advPending;
          declaradosDenominator = basicEnrolledCount;
          
          // Widget INSCRITOS: pagados de avanzado / total pre-registros
          inscritosNumerator = enrolled;
          inscritosDenominator = totalPreRegistros > 0 ? totalPreRegistros : advPending;
          
          nextLevelStats = {
            pending: advPending,
            enrolled: enrolled,
            total: totalPreRegistros
          };
          
          logger.debug('[training-stats] NEXT LEVEL (AVANZADO) Stats:', nextLevelStats);
          logger.debug('[training-stats] Declarados:', declaradosNumerator, '/', declaradosDenominator);
          logger.debug('[training-stats] Inscritos:', inscritosNumerator, '/', inscritosDenominator);
        } else {
          // No hay producto ADVANCED para esta visión
          declaradosDenominator = basicEnrolledCount;
          nextLevelStats = { pending: 0, enrolled: 0, total: 0 };
          logger.debug('[training-stats] No hay producto ADVANCED para esta visión');
        }
        
      } else if (currentProduct.levelType === 'ADVANCED') {
        // ESTOY EN AVANZADO → Mostrar estadísticas de pase a LIDERATO (PL)
        nextLevel = 'Liderato';
        nextLevelName = currentVisionName;
        
        // Obtener total de inscritos en AVANZADO (denominador para declarados)
        // Solo contar los que tienen pago completo
        const advancedEnrolledCount = await prisma.vision_enrollments.count({
          where: {
            visionId: currentProduct.visionId,
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
            paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
          }
        });
        
        // Buscar producto PL de la misma visión
        const plProduct = activeProducts.find(
          p => p.levelType === 'PL' && p.visionId === currentProduct.visionId
        );
        
        let plEnrolled = 0;
        let plPending = 0;
        
        // DECLARADOS = Pre-registros a PL (PENDING + PAID, los que pasaron por El Cruce)
        // INSCRITOS = Ya inscritos en PL (vision_enrollments con level='PL') CON PAGO COMPLETO
        
        if (plProduct) {
          // Pre-registros PENDING para PL
          plPending = await prisma.advancedPreRegistration.count({
            where: {
              currentProductId: currentProduct.id, // Vienen de ADVANCED
              status: 'PENDING'
            }
          });
          
          // Enrollments de PL (ya pagaron y están inscritos) - SOLO CON PAGO COMPLETO
          if (currentProduct.visionId) {
            plEnrolled = await prisma.vision_enrollments.count({
              where: {
                visionId: currentProduct.visionId,
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
                paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
              }
            });
          }
        } else {
          // Sin producto PL, buscar pre-registros desde este producto ADVANCED hacia cualquier PL
          plPending = await prisma.advancedPreRegistration.count({
            where: {
              currentProductId: currentProduct.id,
              status: 'PENDING'
            }
          });
          
          // Inscritos en PL de la misma visión - SOLO CON PAGO COMPLETO
          if (currentProduct.visionId) {
            plEnrolled = await prisma.vision_enrollments.count({
              where: {
                visionId: currentProduct.visionId,
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
                paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
              }
            });
          }
        }
        
        // Total de DECLARADOS = Pre-registros pendientes + Ya inscritos en PL
        const totalDeclarados = plPending + plEnrolled;
        
        // Widget DECLARADOS: total que declararon ir a PL / total inscritos ADVANCED
        declaradosNumerator = totalDeclarados;
        declaradosDenominator = advancedEnrolledCount;
        
        // Widget INSCRITOS: ya inscritos en PL / total declarados
        inscritosNumerator = plEnrolled;
        inscritosDenominator = totalDeclarados > 0 ? totalDeclarados : advancedEnrolledCount;
        
        nextLevelStats = {
          pending: plPending,
          enrolled: plEnrolled,
          total: totalDeclarados
        };
        
        logger.debug('[training-stats] ADVANCED - Enrolled:', advancedEnrolledCount);
        logger.debug('[training-stats] NEXT LEVEL (PL) - Pending:', plPending, 'Enrolled:', plEnrolled, 'TotalDeclarados:', totalDeclarados);
        logger.debug('[training-stats] Declarados:', declaradosNumerator, '/', declaradosDenominator);
        logger.debug('[training-stats] Inscritos:', inscritosNumerator, '/', inscritosDenominator);
        
        if (!plProduct) {
          logger.debug('[training-stats] No hay producto PL para esta visión');
        }
      }
    }

    // Contar pre-registros por estado (declarados para avanzado)
    const preRegistroStats = await prisma.advancedPreRegistration.groupBy({
      by: ['status'],
      where: {
        currentProductId: {
          in: productIds
        }
      },
      _count: {
        id: true
      }
    });

    // Procesar estadísticas de pre-registro
    const preRegistros = {
      pending: 0,
      paid: inscritosCount, // Usar enrollments inscritos como "pagados/inscritos"
      expired: 0,
      cancelled: 0,
      total: 0
    };

    logger.debug('[training-stats] ProductIds:', productIds, 'VisionIds:', visionIds, 'TotalParticipants:', totalParticipants, 'InscritosCount:', inscritosCount);

    preRegistroStats.forEach(stat => {
      const count = stat._count.id;
      preRegistros.total += count;
      switch (stat.status) {
        case 'PENDING':
          preRegistros.pending = count;
          break;
        case 'PAID':
          preRegistros.paid = count;
          break;
        case 'EXPIRED':
          preRegistros.expired = count;
          break;
        case 'CANCELLED':
          preRegistros.cancelled = count;
          break;
      }
    });

    // Contar llamadas pendientes del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Determinar qué nivel de enrollments filtrar según el rol
    let enrollmentLevelFilter: any = {};
    if (user.rol === 'COORDINADOR') {
      // Para rol COORDINADOR, solo mostrar llamadas de Liderato (PL)
      enrollmentLevelFilter = { level: 'PL' };
    } else if (user.rol === 'COORDINATOR_BASIC') {
      enrollmentLevelFilter = { level: 'BASIC' };
    } else if (user.rol === 'COORDINATOR_ADVANCED') {
      enrollmentLevelFilter = { level: 'ADVANCED' };
    }

    // Obtener los participantes de visiones activas para filtrar llamadas
    const participantIds = await prisma.vision_enrollments.findMany({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
        ...enrollmentLevelFilter
      },
      select: {
        userId: true
      }
    });

    const userIds = participantIds.map(p => p.userId);

    // Contar llamadas GC pendientes de hoy
    const pendingCallsToday = await prisma.gCCallSlot.count({
      where: {
        participantId: {
          in: userIds
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });

    // Total de llamadas del día (incluyendo completadas)
    const totalCallsToday = await prisma.gCCallSlot.count({
      where: {
        participantId: {
          in: userIds
        },
        scheduledDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        community: {
          total: totalParticipants,
          products: activeProducts.length
        },
        preRegistros: {
          total: preRegistros.total,
          pending: preRegistros.pending,
          paid: preRegistros.paid,
          expired: preRegistros.expired,
          cancelled: preRegistros.cancelled
        },
        calls: {
          pending: pendingCallsToday,
          total: totalCallsToday
        },
        activeProducts: activeProducts.map(p => ({
          id: p.id,
          name: p.name,
          levelType: p.levelType,
          visionId: p.visionId,
          visionName: p.Vision?.nombre || null
        })),
        // Nueva información de visión activa
        activeVision: activeVision ? {
          id: activeVision.id,
          nombre: activeVision.nombre
        } : null,
        // Estadísticas por nivel
        advancedStats,
        basicStats,
        // Producto actualmente EN CURSO (basado en fechas)
        currentProduct: currentProduct ? {
          id: currentProduct.id,
          name: currentProduct.name,
          levelType: currentProduct.levelType,
          visionId: currentProduct.visionId,
          visionName: currentVisionName,
          level: currentLevel
        } : null,
        // Estadísticas del SIGUIENTE NIVEL (lo que queremos promover)
        // Si BÁSICO en curso → stats de AVANZADO
        // Si AVANZADO en curso → stats de LIDERATO
        nextLevelStats,
        nextLevel,
        nextLevelName,
        // Widgets con numerador/denominador correctos
        // Declarados: pre-registros pendientes / total del nivel actual
        // Inscritos: pagados del siguiente nivel / total pre-registros
        widgetStats: {
          declarados: {
            numerator: declaradosNumerator,
            denominator: declaradosDenominator
          },
          inscritos: {
            numerator: inscritosNumerator,
            denominator: inscritosDenominator
          }
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching training stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
