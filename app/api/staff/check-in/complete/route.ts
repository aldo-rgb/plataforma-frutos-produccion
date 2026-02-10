import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { triggerEnrollmentTaskCompletion } from '@/lib/enrollment-task-trigger';
import logger from '@/lib/logger';

// POST - Completar el check-in: registrar asistencia y consumir licencia
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId, 
      productId, 
      enrollmentId,
      badgePrinted
    } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'Se requiere userId y productId' }, { status: 400 });
    }

    // Buscar el producto con su organización
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) },
      include: {
        Organization: true
      }
    });

    if (!product || !product.Organization) {
      return NextResponse.json({ error: 'Producto o organización no encontrada' }, { status: 404 });
    }

    const organization = product.Organization;

    // Buscar el usuario
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar enrollment - usando el levelType del producto para encontrar el correcto
    let enrollment = null;
    if (enrollmentId) {
      enrollment = await prisma.vision_enrollments.findUnique({
        where: { id: parseInt(enrollmentId) }
      });
    } else if (product.visionId) {
      // Mapear levelType del producto al level del enrollment
      const levelMap: Record<string, string> = {
        'BASIC': 'BASIC',
        'ADVANCED': 'ADVANCED',
        'PL': 'PL',
        'COMBO_FULL': 'BASIC', // Para combo, empezar con BASIC
        'COMBO_ADV_PL': 'ADVANCED',
      };
      const enrollmentLevel = levelMap[product.levelType] || product.levelType;
      
      enrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: parseInt(userId),
          visionId: product.visionId,
          level: enrollmentLevel as any
        }
      });
      
      // Si no encuentra con el level específico, buscar cualquiera
      if (!enrollment) {
        enrollment = await prisma.vision_enrollments.findFirst({
          where: {
            userId: parseInt(userId),
            visionId: product.visionId
          }
        });
      }
    }

    // Obtener el staffId del usuario que hace el check-in
    const staffUser = await prisma.usuario.findUnique({
      where: { email: session.user.email || '' }
    });

    const staffId = staffUser?.id;

    // *** VERIFICAR SI YA EXISTE CHECK-IN HOY ***
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await prisma.checkInRecord.findFirst({
      where: {
        userId: parseInt(userId),
        productId: parseInt(productId),
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Si ya existe check-in, retornar éxito sin duplicar
    if (existingCheckIn) {
      return NextResponse.json({
        success: true,
        message: `¡Bienvenido de nuevo ${user.nombre}!`,
        alreadyCheckedIn: true,
        participant: {
          id: user.id,
          name: user.nombre,
          nickname: user.apodo,
          photoUrl: user.imagen || user.profileImage,
          role: enrollment?.level || 'Participante'
        },
        organization: {
          id: organization.id,
          name: organization.name
        },
        badgePrinted: existingCheckIn.badgePrinted
      });
    }

    // *** CONSUMIR LICENCIA DE LA ORGANIZACIÓN ***
    // Decrementar licensesAvailable (puede quedar negativo)
    let licenseConsumed = false;
    let licensesWentNegative = false;
    
    // Actualizar organización - decrementar licencia disponible
    const updatedOrg = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        licensesAvailable: {
          decrement: 1
        },
        activeLicenses: {
          increment: 1
        }
      }
    });

    licenseConsumed = true;
    
    // Verificar si quedó en negativo
    if (updatedOrg.licensesAvailable < 0) {
      licensesWentNegative = true;
      logger.debug(`⚠️ ALERTA: Organización ${organization.name} tiene ${updatedOrg.licensesAvailable} licencias (NEGATIVO)`);
    }

    // *** CREAR LICENSEASSIGNMENT PARA PARTICIPANTES ***
    // Solo si el usuario tiene rol PARTICIPANTE, GAMECHANGER o LIDER y no tiene asignación previa
    if (['PARTICIPANTE', 'GAMECHANGER', 'LIDER'].includes(user.rol)) {
      const existingAssignment = await prisma.licenseAssignment.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id,
          isActive: true
        }
      });

      if (!existingAssignment) {
        // Generar código de licencia único
        const licenseCode = `LIC-${organization.id}-${user.id}-${Date.now()}`;
        
        await prisma.licenseAssignment.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            visionId: product.visionId,
            licenseCode: licenseCode,
            assignedBy: staffId || user.id,
            isActive: true,
            activatedAt: new Date(),
            notes: `Asignado automáticamente en check-in del producto ${product.name}`
          }
        });
        
        // *** ACTUALIZAR TIER DEL USUARIO A STANDARD ***
        // Al activar licencia en check-in, el usuario obtiene tier STANDARD
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            tier: 'STANDARD',
            subscriptionStatus: 'ACTIVE'
          }
        });
        
        logger.debug(`✅ LicenseAssignment creado para usuario ${user.nombre} (ID: ${user.id}) en org ${organization.name}`);
        logger.debug(`⬆️ Tier actualizado a STANDARD para usuario ${user.nombre}`);
      }
    }

    // Registrar asistencia en ProductAttendance (sesión 1 por defecto)
    if (enrollment) {
      const existingAttendance = await (prisma as any).productAttendance.findFirst({
        where: {
          productId: parseInt(productId),
          enrollmentId: enrollment.id,
          sessionNumber: 1
        }
      });

      if (!existingAttendance) {
        await (prisma as any).productAttendance.create({
          data: {
            productId: parseInt(productId),
            enrollmentId: enrollment.id,
            sessionNumber: 1,
            attended: true,
            attendedAt: new Date(),
            markedBy: staffId
          }
        });
      } else if (!existingAttendance.attended) {
        await (prisma as any).productAttendance.update({
          where: { id: existingAttendance.id },
          data: {
            attended: true,
            attendedAt: new Date(),
            markedBy: staffId
          }
        });
      }

      // *** MARCAR ASISTENCIA AUTOMÁTICAMENTE EN VISION_ENROLLMENTS ***
      // Cuando el participante escanea su gafete, se marca como ATTENDED
      if (enrollment.attendanceStatus !== 'ATTENDED') {
        await prisma.vision_enrollments.update({
          where: { id: enrollment.id },
          data: { 
            attendanceStatus: 'ATTENDED'
          }
        });
        logger.debug(`✅ Asistencia marcada automáticamente para enrollment ${enrollment.id} - Usuario: ${user.nombre}`);

        // *** TRIGGER: Completar tarea de enrolamiento del invitador ***
        // Si este usuario fue invitado por alguien y está asistiendo a BASIC,
        // completar automáticamente una tarea de enrolamiento del invitador
        if (enrollment.level === 'BASIC') {
          try {
            const triggerResult = await triggerEnrollmentTaskCompletion(
              parseInt(userId),
              enrollment.level
            );
            
            if (triggerResult.taskCompleted) {
              logger.debug(`🎉 Tarea de enrolamiento completada: ${triggerResult.inviterName} enroló a ${triggerResult.guestName}`);
            } else {
              logger.debug(`ℹ️ Trigger de enrolamiento: ${triggerResult.message}`);
            }
          } catch (triggerError) {
            // No fallar el check-in si el trigger falla
            logger.error('⚠️ Error en trigger de enrolamiento (no crítico):', triggerError);
          }
        }
      }
    }

    // *** CREAR CHECKINRECORD ***
    await prisma.checkInRecord.create({
      data: {
        userId: parseInt(userId),
        productId: parseInt(productId),
        organizationId: product.organizationId,
        visionId: product.visionId,
        enrollmentId: enrollment?.id,
        checkInTime: new Date(),
        checkInMethod: 'MANUAL_SEARCH',
        checkedInBy: staffId,
        ticketValidated: true,
        medicalFormValidated: true,
        photoValidated: true,
        badgePrinted: badgePrinted || false,
        licenseConsumed: licenseConsumed,
        notes: licensesWentNegative ? 'LICENCIA_NEGATIVA: Organización sin licencias disponibles' : null
      }
    });

    return NextResponse.json({
      success: true,
      message: `¡Bienvenido ${user.nombre}!`,
      participant: {
        id: user.id,
        name: user.nombre,
        nickname: user.apodo,
        photoUrl: user.imagen || user.profileImage,
        role: enrollment?.level || 'Participante'
      },
      organization: {
        id: organization.id,
        name: organization.name,
        licensesAvailable: updatedOrg.licensesAvailable,
        licensesNegative: licensesWentNegative
      },
      licenseConsumed,
      licensesWentNegative,
      badgePrinted: badgePrinted || false
    });

  } catch (error) {
    logger.error('Error completando check-in:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// GET - Obtener estadísticas de check-in del día
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Se requiere productId' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener asistencias del día
    const attendances = await (prisma as any).productAttendance.findMany({
      where: {
        productId: parseInt(productId),
        sessionNumber: 1,
        attended: true,
        attendedAt: {
          gte: today
        }
      },
      include: {
        Enrollment: {
          include: {
            Usuario_vision_enrollments_userIdToUsuario: true
          }
        }
      },
      orderBy: {
        attendedAt: 'desc'
      }
    });

    // Obtener total de participantes esperados
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) }
    });

    let totalExpected = 0;
    if (product?.visionId) {
      const enrollmentsCount = await prisma.vision_enrollments.count({
        where: {
          visionId: product.visionId,
          enrollmentStatus: 'ENROLLED'
        }
      });
      totalExpected = enrollmentsCount;
    }

    return NextResponse.json({
      success: true,
      stats: {
        checkedIn: attendances.length,
        totalExpected,
        percentage: totalExpected > 0 
          ? Math.round((attendances.length / totalExpected) * 100) 
          : 0
      },
      recentCheckIns: attendances.slice(0, 10).map((a: any) => ({
        id: a.id,
        userId: a.Enrollment?.Usuario_vision_enrollments_userIdToUsuario?.id,
        userName: a.Enrollment?.Usuario_vision_enrollments_userIdToUsuario?.nombre,
        userPhoto: a.Enrollment?.Usuario_vision_enrollments_userIdToUsuario?.imagen,
        checkInTime: a.attendedAt
      }))
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
