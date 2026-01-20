import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    console.log('[training-stats] User:', user.id, 'OrgId:', orgId, 'Rol:', user.rol, 'Now:', now);

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
    
    console.log('[training-stats] Today UTC:', todayDateUTC.toISOString());

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
      
      console.log('[training-stats] Product check:', p.levelType, 'startDate:', start.toISOString(), 'startsToday:', startsToday, 'isWithinPeriod:', isWithinPeriod, 'isInProgress:', isInProgress);
      
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

    console.log('[training-stats] Current product in course:', currentProduct?.id, currentProduct?.name, currentProduct?.levelType, 'UserRole:', user.rol);

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

    // Obtener la visión activa (la más reciente con productos activos)
    const activeVision = activeProducts.find(p => p.Vision)?.Vision || null;
    
    // Obtener TODOS los productos ADVANCED activos
    const advancedProducts = activeProducts.filter(p => p.levelType === 'ADVANCED');
    const advancedProductIds = advancedProducts.map(p => p.id);
    const advancedVisionIds = advancedProducts.filter(p => p.visionId).map(p => p.visionId as number);
    
    // Obtener producto de BASIC activo
    const basicProduct = activeProducts.find(p => p.levelType === 'BASIC');

    console.log('[training-stats] Advanced Products:', advancedProductIds, 'Vision IDs:', advancedVisionIds);

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
      
      console.log('[training-stats] ADVANCED - Pending:', advancedPending, 'Enrolled:', advancedEnrolled, 'Paid:', advancedPaid, 'TotalPreReg:', totalPreRegistros);
      
      // Usar el mayor entre enrollments y pre-registros pagados
      const enrolled = Math.max(advancedEnrolled, advancedPaid);
      
      advancedStats = {
        pending: advancedPending,
        enrolled: enrolled,
        total: advancedPending + enrolled
      };
      
      console.log('[training-stats] ADVANCED Stats final:', advancedStats);
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
        const basicEnrolledCount = await prisma.vision_enrollments.count({
          where: {
            visionId: currentProduct.visionId,
            level: 'BASIC',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
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
          
          // Enrollments de ADVANCED de la misma visión
          const advEnrolled = await prisma.vision_enrollments.count({
            where: {
              visionId: currentProduct.visionId,
              level: 'ADVANCED',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
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
          
          console.log('[training-stats] NEXT LEVEL (AVANZADO) Stats:', nextLevelStats);
          console.log('[training-stats] Declarados:', declaradosNumerator, '/', declaradosDenominator);
          console.log('[training-stats] Inscritos:', inscritosNumerator, '/', inscritosDenominator);
        } else {
          // No hay producto ADVANCED para esta visión
          declaradosDenominator = basicEnrolledCount;
          nextLevelStats = { pending: 0, enrolled: 0, total: 0 };
          console.log('[training-stats] No hay producto ADVANCED para esta visión');
        }
        
      } else if (currentProduct.levelType === 'ADVANCED') {
        // ESTOY EN AVANZADO → Mostrar estadísticas de pase a LIDERATO (PL)
        nextLevel = 'TU VIDA';
        nextLevelName = currentVisionName;
        
        // Obtener total de inscritos en AVANZADO (denominador para declarados)
        const advancedEnrolledCount = await prisma.vision_enrollments.count({
          where: {
            visionId: currentProduct.visionId,
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        });
        
        // Obtener participantes ADVANCED que DECLARARON ASISTENCIA (confirmaron que van)
        // Primero obtener los enrollments de ADVANCED, luego contar los que tienen tracking con CONFIRMED/ASISTE
        const advancedEnrollmentsWithTracking = await prisma.vision_enrollments.findMany({
          where: {
            visionId: currentProduct.visionId,
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          },
          include: {
            BasicCallTracking: {
              select: { attendanceStatus: true }
            }
          }
        });
        
        const advancedDeclared = advancedEnrollmentsWithTracking.filter(
          e => e.BasicCallTracking?.attendanceStatus === 'CONFIRMED' || 
               e.BasicCallTracking?.attendanceStatus === 'ASISTE'
        ).length;
        
        // Buscar producto PL de la misma visión
        const plProduct = activeProducts.find(
          p => p.levelType === 'PL' && p.visionId === currentProduct.visionId
        );
        
        let plEnrolled = 0;
        let plPending = 0;
        
        if (plProduct) {
          // Pre-registros para PL (usando AdvancedPreRegistration)
          plPending = await prisma.advancedPreRegistration.count({
            where: {
              OR: [
                { targetProductId: plProduct.id },
                { currentProductId: plProduct.id }
              ],
              status: 'PENDING'
            }
          });
          
          const plPaid = await prisma.advancedPreRegistration.count({
            where: {
              OR: [
                { targetProductId: plProduct.id },
                { currentProductId: plProduct.id }
              ],
              status: 'PAID'
            }
          });
          
          // Enrollments de PL
          if (currentProduct.visionId) {
            plEnrolled = await prisma.vision_enrollments.count({
              where: {
                visionId: currentProduct.visionId,
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
              }
            });
          }
          
          plEnrolled = Math.max(plEnrolled, plPaid);
        }
        
        // Widget DECLARADOS: participantes que confirmaron asistencia / total inscritos ADVANCED
        declaradosNumerator = advancedDeclared;
        declaradosDenominator = advancedEnrolledCount;
        
        // Widget INSCRITOS: pagados/inscritos en PL / total declarados ADVANCED
        inscritosNumerator = plEnrolled;
        inscritosDenominator = advancedDeclared > 0 ? advancedDeclared : advancedEnrolledCount;
        
        nextLevelStats = {
          pending: plPending,
          enrolled: plEnrolled,
          total: plPending + plEnrolled
        };
        
        console.log('[training-stats] ADVANCED - Enrolled:', advancedEnrolledCount, 'Declared:', advancedDeclared);
        console.log('[training-stats] NEXT LEVEL (PL) - Enrolled:', plEnrolled);
        console.log('[training-stats] Declarados:', declaradosNumerator, '/', declaradosDenominator);
        console.log('[training-stats] Inscritos:', inscritosNumerator, '/', inscritosDenominator);
        
        if (!plProduct) {
          // No hay producto PL
          console.log('[training-stats] No hay producto PL para esta visión');
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

    console.log('[training-stats] ProductIds:', productIds, 'VisionIds:', visionIds, 'TotalParticipants:', totalParticipants, 'InscritosCount:', inscritosCount);

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

    // Obtener los participantes de visiones activas para filtrar llamadas
    const participantIds = await prisma.vision_enrollments.findMany({
      where: {
        visionId: {
          in: visionIds
        },
        enrollmentStatus: 'ENROLLED'
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
    console.error('Error fetching training stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
