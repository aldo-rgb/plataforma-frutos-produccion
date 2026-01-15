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

    // Obtener productos activos de la organización (BASIC y ADVANCED)
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        levelType: {
          in: ['BASIC', 'ADVANCED']
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

    // Encontrar el producto EN CURSO (startDate <= now <= endDate)
    const currentProduct = activeProducts.find(p => {
      if (!p.startDate) return false;
      const start = new Date(p.startDate);
      const end = p.endDate ? new Date(p.endDate) : new Date('2099-12-31');
      return start <= now && now <= end;
    });

    console.log('[training-stats] Current product in course:', currentProduct?.id, currentProduct?.name, currentProduct?.levelType);

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
    
    if (currentProduct) {
      currentVisionName = currentProduct.Vision?.nombre || currentProduct.name;
      currentLevel = currentProduct.levelType === 'BASIC' ? 'BÁSICO' : 'AVANZADO';
      
      if (currentProduct.levelType === 'BASIC' && currentProduct.visionId) {
        // ESTOY EN BÁSICO → Mostrar estadísticas de AVANZADO de la misma visión
        nextLevel = 'AVANZADO';
        nextLevelName = currentVisionName;
        
        // Buscar el producto AVANZADO de la misma visión
        const advancedProductForVision = activeProducts.find(
          p => p.levelType === 'ADVANCED' && p.visionId === currentProduct.visionId
        );
        
        if (advancedProductForVision) {
          // Pre-registros PENDING para ese AVANZADO específico
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
          
          nextLevelStats = {
            pending: advPending,
            enrolled: enrolled,
            total: advPending + enrolled
          };
          
          console.log('[training-stats] NEXT LEVEL (AVANZADO) Stats:', nextLevelStats);
        } else {
          // No hay producto ADVANCED para esta visión, usar advancedStats global
          nextLevelStats = advancedStats;
          console.log('[training-stats] NEXT LEVEL usando advancedStats global:', nextLevelStats);
        }
        
      } else if (currentProduct.levelType === 'ADVANCED') {
        // ESTOY EN AVANZADO → Mostrar estadísticas de PASE A LIDERATO (PL)
        nextLevel = 'PASE A LIDERATO';
        nextLevelName = currentVisionName;
        
        // Buscar producto PL de la misma visión
        const plProduct = activeProducts.find(
          p => p.levelType === 'PL' && p.visionId === currentProduct.visionId
        );
        
        if (plProduct) {
          // Pre-registros para PL (usando AdvancedPreRegistration)
          const plPending = await prisma.advancedPreRegistration.count({
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
          let plEnrolled = 0;
          if (currentProduct.visionId) {
            plEnrolled = await prisma.vision_enrollments.count({
              where: {
                visionId: currentProduct.visionId,
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
              }
            });
          }
          
          const enrolled = Math.max(plEnrolled, plPaid);
          
          nextLevelStats = {
            pending: plPending,
            enrolled: enrolled,
            total: plPending + enrolled
          };
          
          console.log('[training-stats] NEXT LEVEL (PL) Stats:', nextLevelStats);
        } else {
          // No hay producto PL, mostrar 0s
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
        nextLevelName
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
