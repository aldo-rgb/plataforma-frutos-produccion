import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Cron job para gestionar el ciclo de vida de los entrenamientos
// Se ejecuta cada hora para:
// 1. Abrir registros cuando llegue registrationOpenDate
// 2. Cambiar a IN_PROGRESS cuando llegue startDate
// 3. Auto-finalizar a las 11 PM del endDate

export async function POST(request: NextRequest) {
  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'frutos-cron-secret-2026';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      const { searchParams } = new URL(request.url);
      const manualKey = searchParams.get('key');
      if (manualKey !== cronSecret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    const results = {
      registrationOpened: 0,
      trainingStarted: 0,
      trainingFinished: 0,
      notificationsSent: 0,
      errors: [] as string[]
    };

    // ========================================
    // 1. ABRIR REGISTROS
    // Cuando llegue registrationOpenDate
    // ========================================
    const productsToOpenRegistration = await prisma.schoolProduct.findMany({
      where: {
        trainingStatus: 'PENDING',
        registrationOpenDate: {
          lte: now
        },
        isActive: true
      },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    for (const product of productsToOpenRegistration) {
      try {
        await prisma.schoolProduct.update({
          where: { id: product.id },
          data: {
            trainingStatus: 'REGISTRATION_OPEN',
            updatedAt: now
          }
        });
        results.registrationOpened++;
        logger.debug(`📋 Registro abierto para: ${product.name}`);

        // Enviar notificaciones por correo si no se han enviado
        if (!product.registrationNotifiedAt) {
          await sendRegistrationOpenNotifications(product);
          
          await prisma.schoolProduct.update({
            where: { id: product.id },
            data: { registrationNotifiedAt: now }
          });
          results.notificationsSent++;
        }
      } catch (error: any) {
        results.errors.push(`Error abriendo registro ${product.id}: ${error.message}`);
      }
    }

    // ========================================
    // 2. INICIAR ENTRENAMIENTOS
    // Cuando llegue startDate + trainingStartTime
    // ========================================
    const productsToStart = await prisma.schoolProduct.findMany({
      where: {
        trainingStatus: 'REGISTRATION_OPEN',
        startDate: {
          lte: now
        },
        isActive: true
      }
    });

    for (const product of productsToStart) {
      try {
        // Verificar si ya pasó la hora de inicio
        const startTime = product.trainingStartTime || '08:30';
        const [startHour, startMinute] = startTime.split(':').map(Number);
        
        const productStartDateTime = new Date(product.startDate!);
        productStartDateTime.setHours(startHour, startMinute, 0, 0);

        if (now >= productStartDateTime) {
          await prisma.schoolProduct.update({
            where: { id: product.id },
            data: {
              trainingStatus: 'IN_PROGRESS',
              updatedAt: now
            }
          });
          results.trainingStarted++;
          logger.debug(`🏃 Entrenamiento iniciado: ${product.name}`);
        }
      } catch (error: any) {
        results.errors.push(`Error iniciando entrenamiento ${product.id}: ${error.message}`);
      }
    }

    // ========================================
    // 2.5 INICIAR ENTRENAMIENTOS SIN registrationOpenDate
    // Si registrationOpenDate es NULL y ya pasó startDate + 10:00 AM
    // Cambiar directamente de PENDING a IN_PROGRESS
    // ========================================
    const productsWithoutRegistrationDate = await prisma.schoolProduct.findMany({
      where: {
        trainingStatus: 'PENDING',
        registrationOpenDate: null,
        startDate: {
          lte: now
        },
        isActive: true
      }
    });

    for (const product of productsWithoutRegistrationDate) {
      try {
        // Para productos sin registrationOpenDate, iniciar a las 10:00 AM del startDate
        const productStartDateTime = new Date(product.startDate!);
        productStartDateTime.setHours(10, 0, 0, 0);

        if (now >= productStartDateTime) {
          await prisma.schoolProduct.update({
            where: { id: product.id },
            data: {
              trainingStatus: 'IN_PROGRESS',
              updatedAt: now
            }
          });
          results.trainingStarted++;
          logger.debug(`🏃 Entrenamiento iniciado (sin registrationOpenDate): ${product.name}`);
        }
      } catch (error: any) {
        results.errors.push(`Error iniciando entrenamiento ${product.id}: ${error.message}`);
      }
    }

    // ========================================
    // 3. AUTO-FINALIZAR A LAS 11 PM
    // Solo si el TRAINER no lo ha hecho manualmente
    // ========================================
    if (currentHour >= 23) { // 11 PM o más
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Buscar productos BASIC/ADVANCED que terminan hoy
      const productsToAutoFinish = await prisma.schoolProduct.findMany({
        where: {
          trainingStatus: 'IN_PROGRESS',
          isActive: true,
          OR: [
            // BASIC y ADVANCED usan endDate
            {
              levelType: { in: ['BASIC', 'ADVANCED', 'INTERMEDIATE'] },
              endDate: {
                gte: today,
                lte: todayEnd
              }
            },
            // PL usa plWeekend3EndDate
            {
              levelType: 'PL',
              plWeekend3EndDate: {
                gte: today,
                lte: todayEnd
              }
            }
          ]
        }
      });

      for (const product of productsToAutoFinish) {
        try {
          await prisma.schoolProduct.update({
            where: { id: product.id },
            data: {
              trainingStatus: 'COMPLETED',
              finishedAt: now,
              // finishedBy queda null para indicar que fue auto-finalizado
              updatedAt: now
            }
          });
          results.trainingFinished++;
          logger.debug(`✅ Entrenamiento auto-finalizado: ${product.name}`);
        } catch (error: any) {
          results.errors.push(`Error auto-finalizando ${product.id}: ${error.message}`);
        }
      }
    }

    logger.debug('📊 Resultado del cron de entrenamientos:', results);

    return NextResponse.json({
      success: true,
      message: 'Ciclo de entrenamientos procesado',
      results,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    logger.error('❌ Error en cron de entrenamientos:', error);
    return NextResponse.json(
      { error: 'Error procesando entrenamientos', message: error?.message },
      { status: 500 }
    );
  }
}

// Función para enviar notificaciones de apertura de registro
async function sendRegistrationOpenNotifications(product: any) {
  try {
    // Buscar participantes potenciales (usuarios de la organización)
    // o participantes de la visión asociada
    
    if (product.visionId) {
      // Buscar usuarios que deberían ser notificados
      // Por ahora, notificar a los coordinadores y participantes previos
      const vision = await prisma.vision.findUnique({
        where: { id: product.visionId },
        select: { organizationId: true, nombre: true }
      });

      if (vision) {
        // Crear notificaciones en el sistema
        const usersToNotify = await prisma.usuario.findMany({
          where: {
            organizationId: vision.organizationId,
            isActive: true,
            rol: { in: ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN'] }
          },
          select: { id: true, email: true, nombre: true }
        });

        for (const user of usersToNotify) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM_ALERT',
              title: '📋 Registro Abierto',
              message: `El registro para "${product.name}" ya está abierto. Los participantes pueden inscribirse.`,
              relatedId: product.id
            }
          });
        }

        // TODO: Enviar emails usando Resend
        // Por ahora solo creamos notificaciones en el sistema
        logger.debug(`📧 Notificaciones enviadas para apertura de ${product.name}`);
      }
    }
  } catch (error) {
    logger.error('Error enviando notificaciones:', error);
  }
}

// GET para verificar estado
export async function GET() {
  const now = new Date();
  
  const stats = await prisma.schoolProduct.groupBy({
    by: ['trainingStatus'],
    _count: { id: true },
    where: { isActive: true }
  });

  return NextResponse.json({
    status: 'ok',
    description: 'Cron de gestión de ciclo de entrenamientos',
    currentTime: now.toISOString(),
    currentHour: now.getHours(),
    stats: stats.reduce((acc, s) => {
      acc[s.trainingStatus || 'UNKNOWN'] = s._count.id;
      return acc;
    }, {} as Record<string, number>),
    actions: [
      'PENDING → REGISTRATION_OPEN: Cuando llega registrationOpenDate',
      'REGISTRATION_OPEN → IN_PROGRESS: Cuando llega startDate + hora',
      'IN_PROGRESS → COMPLETED: A las 11 PM del endDate (auto) o por TRAINER (manual)'
    ]
  });
}
