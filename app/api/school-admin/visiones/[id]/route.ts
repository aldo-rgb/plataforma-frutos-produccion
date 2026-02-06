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

// Roles permitidos para acceder a esta API
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con participantes y coordinador
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true,
          },
        },
      },
    }) as (typeof vision & { enabledLevels?: string[] }) | null;

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la visión pertenece a la organización del usuario o a una del mismo master
    // ADMINISTRADOR tiene acceso global a todas las visiones
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        organizationId: true,
        rol: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: { masterOrganizationId: true }
        }
      },
    });

    // ADMINISTRADOR tiene acceso global
    if (user?.rol === 'ADMINISTRADOR') {
      // Continuar sin restricciones de organización
    } else if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    } else {
      // Obtener el masterOrganizationId de la visión
      const visionOrg = await prisma.organization.findUnique({
        where: { id: vision.organizationId },
        select: { masterOrganizationId: true }
      });

      const userMasterOrgId = user.Organization_Usuario_organizationIdToOrganization?.masterOrganizationId;
      const visionMasterOrgId = visionOrg?.masterOrganizationId;

      // Permitir acceso si:
      // 1. La visión pertenece a la misma organización del usuario, O
      // 2. Ambas organizaciones pertenecen al mismo master
      const sameOrg = vision.organizationId === user.organizationId;
      const sameMaster = userMasterOrgId && visionMasterOrgId && userMasterOrgId === visionMasterOrgId;

      if (!sameOrg && !sameMaster) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a esta visión' },
          { status: 403 }
        );
      }
    }

    // Determinar el nivel activo de la visión basado en los productos
    // Prioridad: IN_PROGRESS > REGISTRATION_OPEN > nivel más alto COMPLETED
    const visionProducts = await prisma.schoolProduct.findMany({
      where: { visionId, type: 'CORE_TRAINING', isActive: true },
      select: { levelType: true, trainingStatus: true },
      orderBy: { levelType: 'desc' } // PL > ADVANCED > BASIC
    });

    // Obtener enabledLevels de la visión para usar como fallback
    const visionWithLevels = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { enabledLevels: true }
    });

    let activeLevel: 'BASIC' | 'ADVANCED' | 'PL' = 'BASIC';
    
    // Buscar primero uno en progreso
    const inProgress = visionProducts.find(p => p.trainingStatus === 'IN_PROGRESS');
    if (inProgress) {
      activeLevel = inProgress.levelType as 'BASIC' | 'ADVANCED' | 'PL';
    } else {
      // Buscar uno en registro abierto
      const registrationOpen = visionProducts.find(p => p.trainingStatus === 'REGISTRATION_OPEN');
      if (registrationOpen) {
        activeLevel = registrationOpen.levelType as 'BASIC' | 'ADVANCED' | 'PL';
      } else {
        // Usar el nivel más alto completado
        const completed = visionProducts.filter(p => p.trainingStatus === 'COMPLETED');
        if (completed.length > 0) {
          activeLevel = completed[0].levelType as 'BASIC' | 'ADVANCED' | 'PL'; // Ya está ordenado desc
        } else if (visionWithLevels?.enabledLevels && visionWithLevels.enabledLevels.length > 0) {
          // Fallback: usar el nivel más alto habilitado en la visión
          const levelPriority = ['PL', 'ADVANCED', 'BASIC'];
          for (const level of levelPriority) {
            if (visionWithLevels.enabledLevels.includes(level)) {
              activeLevel = level as 'BASIC' | 'ADVANCED' | 'PL';
              break;
            }
          }
        }
      }
    }

    logger.debug('📊 Nivel activo de la visión:', activeLevel);

    // Obtener participantes de VisionParticipante (legacy)
    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            CartaFrutos: {
              select: {
                id: true,
                estado: true,
              },
            },
            LicenseAssignment_LicenseAssignment_userIdToUsuario: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
        Usuario_VisionParticipante_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // PRIMERO verificar si hay vision_enrollments (sistema nuevo)
    // Si existen, usarlos como fuente principal y complementar con gameChangerId de VisionParticipante
    const enrollmentsCount = await prisma.vision_enrollments.count({
      where: { 
        visionId,
        level: activeLevel,
        OR: [
          { attendanceStatus: null },
          { attendanceStatus: { notIn: ['DROP', 'BACKLOG', 'MOVED'] } }
        ],
        enrollmentStatus: { notIn: ['MOVED_TO_NEXT', 'CANCELLED', 'DROP'] },
        droppedAt: null,
      }
    });

    let participantes: any[] = [];
    
    // Si hay enrollments, SIEMPRE usarlos como fuente principal
    if (enrollmentsCount > 0) {
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { 
          visionId,
          level: activeLevel,
          // Excluir usuarios DROP, BACKLOG y MOVED de la lista activa
          OR: [
            { attendanceStatus: null },
            { attendanceStatus: { notIn: ['DROP', 'BACKLOG', 'MOVED'] } }
          ],
          // También excluir por enrollmentStatus
          enrollmentStatus: { notIn: ['MOVED_TO_NEXT', 'CANCELLED', 'DROP'] },
          droppedAt: null,
        },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              tier: true,
              assignedMentorId: true,
              Usuario_Usuario_assignedMentorIdToUsuario: {
                select: {
                  id: true,
                  nombre: true,
                  email: true,
                  imagen: true,
                },
              },
              CartaFrutos: {
                select: {
                  id: true,
                  estado: true,
                },
              },
              LicenseAssignment_LicenseAssignment_userIdToUsuario: {
                where: {
                  visionId: visionId,
                  isActive: true
                },
                select: {
                  id: true,
                  licenseCode: true,
                  activatedAt: true,
                  assignedAt: true,
                  expiresAt: true
                },
                take: 1
              }
            },
          },
        },
        orderBy: {
          enrolledAt: 'desc',
        },
      });

      // Obtener VisionParticipante para buscar gameChangerId de cada usuario
      const userIds = enrollments.map(e => e.userId);
      const visionParticipantesForGC = await prisma.visionParticipante.findMany({
        where: { 
          visionId, 
          participanteId: { in: userIds } 
        },
        include: {
          Usuario_VisionParticipante_gameChangerIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
            },
          },
        }
      });
      
      // Crear mapa de gameChanger por participanteId
      const gcMap = new Map(visionParticipantesForGC.map(vp => [
        vp.participanteId, 
        { 
          gameChangerId: vp.gameChangerId, 
          gameChanger: vp.Usuario_VisionParticipante_gameChangerIdToUsuario 
        }
      ]));

      // Transformar enrollments al formato esperado de participantes
      participantes = enrollments.map(e => {
        const gcData = gcMap.get(e.userId);
        return {
          id: e.id,
          participanteId: e.userId,
          gameChangerId: gcData?.gameChangerId || null,
          Usuario_VisionParticipante_participanteIdToUsuario: e.Usuario_vision_enrollments_userIdToUsuario,
          Usuario_VisionParticipante_gameChangerIdToUsuario: gcData?.gameChanger || null,
          createdAt: e.enrolledAt.toISOString(),
          // Campos adicionales del enrollment
          enrollmentStatus: e.enrollmentStatus,
          paymentStatus: e.paymentStatus,
          level: e.level,
        };
      });

      logger.debug(`📋 Usando ${participantes.length} participantes de vision_enrollments (nivel: ${activeLevel})`);
    } else {
      // FALLBACK: Si NO hay vision_enrollments, usar VisionParticipante (sistema legacy)
      participantes = visionParticipantes;
      logger.debug(`📋 Usando ${participantes.length} participantes de VisionParticipante (legacy)`);
    }

    // Obtener game changers de la visión filtrados por el nivel activo
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId, level: activeLevel },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            LicenseAssignment_LicenseAssignment_userIdToUsuario: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtener productos/entrenamientos asociados a esta visión
    const productos = await prisma.schoolProduct.findMany({
      where: { 
        visionId,
        type: 'CORE_TRAINING',
        isActive: true
      },
      include: {
        Trainer: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: [
        { levelType: 'asc' } // BASIC, ADVANCED, PL
      ]
    });

    // Obtener trainers de PL (3 trainers para el programa de liderato)
    const plTrainersData = await prisma.visionStaff.findMany({
      where: {
        visionId,
        role: 'PL_TRAINER',
        level: 'PL'
      },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      },
      orderBy: {
        plWeekendNumber: 'asc' // 1, 2, 3
      }
    });

    // Obtener mentores asignados a esta visión con sus costos
    const mentoresAsignados = await prisma.visionMentor.findMany({
      where: { visionId },
      include: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            rol: true,
            organizationId: true,
            PerfilMentor: {
              select: {
                precioDisciplina: true,
                precioBase: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Verificar cuáles tienen paquetes contratados
    const mentoresIds = mentoresAsignados.map(m => m.mentorId);
    const paquetesContratados = await prisma.mentorPackageOrder.findMany({
      where: {
        mentorId: { in: mentoresIds },
        organizationId: user.organizationId,
        status: 'COMPLETED'
      },
      select: {
        mentorId: true
      }
    });

    const mentoresConPaquete = new Set(paquetesContratados.map(p => p.mentorId));

    logger.debug('👥 Mentores asignados a la visión:', mentoresAsignados.length);
    logger.debug('📦 Mentores con paquetes contratados:', mentoresConPaquete.size);

    // Calcular semanas y costos del ciclo
    let cicloInfo = null;
    if (vision.startDate && vision.endDate) {
      const start = new Date(vision.startDate);
      const end = new Date(vision.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const semanas = Math.floor(diffDays / 7);
      const llamadasDisciplina = semanas * 2; // 2 llamadas por semana

      cicloInfo = {
        semanas,
        llamadasDisciplina,
        diasTotales: diffDays
      };
    }

    // Enriquecer mentores con cálculos de costo y tipo
    const mentoresConCostos = mentoresAsignados.map(mentor => {
      const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
      const precioDisciplina = usuario?.PerfilMentor?.precioDisciplina || 0;
      const precioBase = usuario?.PerfilMentor?.precioBase || 0;
      const esLider = usuario?.rol === 'LIDER' && usuario?.organizationId === user.organizationId;
      const esMentorContratado = usuario?.rol === 'MENTOR' && mentoresConPaquete.has(mentor.mentorId);
      
      let costoTotal = 0;
      if (!esLider && cicloInfo) {
        costoTotal = cicloInfo.llamadasDisciplina * precioDisciplina;
      }

      return {
        ...mentor,
        precioDisciplina,
        precioBase,
        esLider,
        esContratado: esMentorContratado,
        costoTotal: esLider ? 0 : costoTotal
      };
    });

    return NextResponse.json({
      success: true,
      vision: {
        ...vision,
        startDate: vision.startDate ? vision.startDate.toISOString() : null,
        endDate: vision.endDate ? vision.endDate.toISOString() : null,
        advancedStartDate: vision.advancedStartDate ? vision.advancedStartDate.toISOString() : null,
        advancedEndDate: vision.advancedEndDate ? vision.advancedEndDate.toISOString() : null,
        plWeekend1StartDate: vision.plWeekend1StartDate ? vision.plWeekend1StartDate.toISOString() : null,
        plWeekend1EndDate: vision.plWeekend1EndDate ? vision.plWeekend1EndDate.toISOString() : null,
        plWeekend2StartDate: vision.plWeekend2StartDate ? vision.plWeekend2StartDate.toISOString() : null,
        plWeekend2EndDate: vision.plWeekend2EndDate ? vision.plWeekend2EndDate.toISOString() : null,
        plWeekend3StartDate: vision.plWeekend3StartDate ? vision.plWeekend3StartDate.toISOString() : null,
        plWeekend3EndDate: vision.plWeekend3EndDate ? vision.plWeekend3EndDate.toISOString() : null,
      },
      participantes,
      gameChangers,
      activeLevel, // Nivel activo de la visión (para saber qué Game Changers se muestran)
      mentoresAsignados: mentoresConCostos,
      cicloInfo,
      productos: productos.map(p => ({
        ...p,
        // Incluir explícitamente Trainer y Coordinator
        Trainer: p.Trainer,
        Coordinator: p.Coordinator,
        // Si es producto PL, agregar los 3 trainers
        plTrainers: p.levelType === 'PL' ? plTrainersData.map(pt => pt.Usuario_VisionStaff_userIdToUsuario) : undefined,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        plWeekend1StartDate: p.plWeekend1StartDate ? p.plWeekend1StartDate.toISOString() : null,
        plWeekend1EndDate: p.plWeekend1EndDate ? p.plWeekend1EndDate.toISOString() : null,
        plWeekend1StartTime: p.plWeekend1StartTime,
        plWeekend2StartDate: p.plWeekend2StartDate ? p.plWeekend2StartDate.toISOString() : null,
        plWeekend2EndDate: p.plWeekend2EndDate ? p.plWeekend2EndDate.toISOString() : null,
        plWeekend2StartTime: p.plWeekend2StartTime,
        plWeekend3StartDate: p.plWeekend3StartDate ? p.plWeekend3StartDate.toISOString() : null,
        plWeekend3EndDate: p.plWeekend3EndDate ? p.plWeekend3EndDate.toISOString() : null,
        plWeekend3StartTime: p.plWeekend3StartTime,
        // Training control fields
        trainingStartTime: p.trainingStartTime,
        trainingStatus: p.trainingStatus,
        registrationOpenDate: p.registrationOpenDate ? p.registrationOpenDate.toISOString() : null,
        finishedAt: p.finishedAt ? p.finishedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        promoDeadline: p.promoDeadline ? p.promoDeadline.toISOString() : null
      }))
    });
  } catch (error) {
    logger.error('Error fetching vision details:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener detalles de la visión' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    logger.debug('📥 PUT Request Body:', body);

    // Actualizar fechas de la visión principal
    const visionUpdateData: any = {
      updatedAt: new Date(),
    };

    // Fechas de Básico - usar toSafeDate para evitar problemas de timezone
    if (body.startDate !== undefined) {
      visionUpdateData.startDate = toSafeDate(body.startDate);
    }
    if (body.endDate !== undefined) {
      visionUpdateData.endDate = toSafeDate(body.endDate);
    }

    // Fechas de Avanzado
    if (body.advancedStartDate !== undefined) {
      visionUpdateData.advancedStartDate = toSafeDate(body.advancedStartDate);
    }
    if (body.advancedEndDate !== undefined) {
      visionUpdateData.advancedEndDate = toSafeDate(body.advancedEndDate);
    }

    // Fechas de PL - Fin de Semana 1
    if (body.plWeekend1StartDate !== undefined) {
      visionUpdateData.plWeekend1StartDate = toSafeDate(body.plWeekend1StartDate);
    }
    if (body.plWeekend1EndDate !== undefined) {
      visionUpdateData.plWeekend1EndDate = toSafeDate(body.plWeekend1EndDate);
    }

    // Fechas de PL - Fin de Semana 2
    if (body.plWeekend2StartDate !== undefined) {
      visionUpdateData.plWeekend2StartDate = toSafeDate(body.plWeekend2StartDate);
    }
    if (body.plWeekend2EndDate !== undefined) {
      visionUpdateData.plWeekend2EndDate = toSafeDate(body.plWeekend2EndDate);
    }

    // Fechas de PL - Fin de Semana 3
    if (body.plWeekend3StartDate !== undefined) {
      visionUpdateData.plWeekend3StartDate = toSafeDate(body.plWeekend3StartDate);
    }
    if (body.plWeekend3EndDate !== undefined) {
      visionUpdateData.plWeekend3EndDate = toSafeDate(body.plWeekend3EndDate);
    }

    logger.debug('📅 Vision Update Data:', visionUpdateData);

    await prisma.vision.update({
      where: { id: visionId },
      data: visionUpdateData,
    });

    // Actualizar productos: Básico, Avanzado y PL
    const productos = await prisma.schoolProduct.findMany({
      where: {
        visionId,
        type: 'CORE_TRAINING',
      },
    });
    
    logger.debug('📦 Productos encontrados:', productos.length);
    productos.forEach(p => logger.debug(`  - ${p.levelType} (ID: ${p.id})`));

    // Actualizar Producto Básico
    const basicProduct = productos.find(p => p.levelType === 'BASIC');
    if (basicProduct) {
      const basicUpdateData: any = { updatedAt: new Date() };
      if (body.startDate !== undefined) basicUpdateData.startDate = toSafeDate(body.startDate);
      if (body.endDate !== undefined) basicUpdateData.endDate = toSafeDate(body.endDate);
      // Nuevos campos de control de entrenamiento
      if (body.basicStartTime !== undefined) basicUpdateData.trainingStartTime = body.basicStartTime;
      if (body.basicRegistrationOpenDate !== undefined) basicUpdateData.registrationOpenDate = toSafeDate(body.basicRegistrationOpenDate);
      
      await prisma.schoolProduct.update({
        where: { id: basicProduct.id },
        data: basicUpdateData,
      });
    }

    // Actualizar Producto Avanzado
    const advancedProduct = productos.find(p => p.levelType === 'ADVANCED');
    if (advancedProduct) {
      const advancedUpdateData: any = { updatedAt: new Date() };
      if (body.advancedStartDate !== undefined) advancedUpdateData.startDate = toSafeDate(body.advancedStartDate);
      if (body.advancedEndDate !== undefined) advancedUpdateData.endDate = toSafeDate(body.advancedEndDate);
      // Nuevos campos de control de entrenamiento
      if (body.advancedStartTime !== undefined) advancedUpdateData.trainingStartTime = body.advancedStartTime;
      if (body.advancedRegistrationOpenDate !== undefined) advancedUpdateData.registrationOpenDate = toSafeDate(body.advancedRegistrationOpenDate);
      
      await prisma.schoolProduct.update({
        where: { id: advancedProduct.id },
        data: advancedUpdateData,
      });
    }

    // Actualizar Programa Liderato (PL) con las 3 fechas de fines de semana
    const plProduct = productos.find(p => p.levelType === 'PL');
    if (plProduct) {
      logger.debug('👑 Producto PL encontrado, ID:', plProduct.id);
      
      const plUpdateData: any = { updatedAt: new Date() };
      
      // Fin de Semana 1
      if (body.plWeekend1StartDate !== undefined) plUpdateData.plWeekend1StartDate = toSafeDate(body.plWeekend1StartDate);
      if (body.plWeekend1EndDate !== undefined) plUpdateData.plWeekend1EndDate = toSafeDate(body.plWeekend1EndDate);
      if (body.plWeekend1StartTime !== undefined) plUpdateData.plWeekend1StartTime = body.plWeekend1StartTime;
      
      // Fin de Semana 2
      if (body.plWeekend2StartDate !== undefined) plUpdateData.plWeekend2StartDate = toSafeDate(body.plWeekend2StartDate);
      if (body.plWeekend2EndDate !== undefined) plUpdateData.plWeekend2EndDate = toSafeDate(body.plWeekend2EndDate);
      if (body.plWeekend2StartTime !== undefined) plUpdateData.plWeekend2StartTime = body.plWeekend2StartTime;
      
      // Fin de Semana 3 (Graduación)
      if (body.plWeekend3StartDate !== undefined) plUpdateData.plWeekend3StartDate = toSafeDate(body.plWeekend3StartDate);
      if (body.plWeekend3EndDate !== undefined) plUpdateData.plWeekend3EndDate = toSafeDate(body.plWeekend3EndDate);
      if (body.plWeekend3StartTime !== undefined) plUpdateData.plWeekend3StartTime = body.plWeekend3StartTime;
      
      // Nuevos campos de control de entrenamiento
      if (body.plStartTime !== undefined) plUpdateData.trainingStartTime = body.plStartTime;
      if (body.plRegistrationOpenDate !== undefined) plUpdateData.registrationOpenDate = toSafeDate(body.plRegistrationOpenDate);
      
      logger.debug('💾 Datos a actualizar en PL:', plUpdateData);
      
      const updatedPL = await prisma.schoolProduct.update({
        where: { id: plProduct.id },
        data: plUpdateData,
      });
      
      logger.debug('✅ PL actualizado:', updatedPL);
    } else {
      logger.debug('⚠️ NO se encontró producto PL');
    }

    return NextResponse.json({
      success: true,
      message: 'Fechas actualizadas exitosamente',
    });

  } catch (error) {
    logger.error('Error updating vision dates:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar las fechas' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/school-admin/visiones/[id]
 * Elimina una visión (entrenamiento) siempre y cuando no tenga usuarios registrados
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Solo School Admin puede eliminar visiones.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con conteos de usuarios registrados
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        _count: {
          select: {
            vision_enrollments: true,
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true,
            VisionStaff: true,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la visión pertenece a la organización del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: { masterOrganizationId: true }
        }
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Verificar pertenencia a organización
    const userOrg = user.Organization_Usuario_organizationIdToOrganization;
    const masterOrgId = userOrg?.masterOrganizationId;
    
    // Obtener organización de la visión
    const visionOrg = await prisma.organization.findUnique({
      where: { id: vision.organizationId },
      select: { id: true, masterOrganizationId: true }
    });

    const canAccess = vision.organizationId === user.organizationId ||
      (masterOrgId && visionOrg?.masterOrganizationId === masterOrgId) ||
      (masterOrgId && vision.organizationId === masterOrgId);

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Verificar que no tenga usuarios registrados
    const totalUsuarios = 
      vision._count.vision_enrollments + 
      vision._count.VisionParticipante + 
      vision._count.VisionGameChanger + 
      vision._count.VisionMentor + 
      vision._count.VisionStaff;

    if (totalUsuarios > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar la visión porque tiene ${totalUsuarios} usuario(s) registrado(s). Debes eliminar o mover los usuarios primero.`,
          details: {
            enrollments: vision._count.vision_enrollments,
            participantes: vision._count.VisionParticipante,
            gamechangers: vision._count.VisionGameChanger,
            mentores: vision._count.VisionMentor,
            staff: vision._count.VisionStaff
          }
        },
        { status: 400 }
      );
    }

    // Eliminar registros relacionados que no son usuarios (si existen)
    await prisma.$transaction(async (tx) => {
      // Eliminar productos de escuela asociados
      await tx.schoolProduct.deleteMany({
        where: { visionId: visionId }
      });

      // Eliminar configuración de comisiones
      await tx.visionCommissionConfig.deleteMany({
        where: { visionId: visionId }
      });

      // Eliminar coordinator commission config
      await tx.coordinator_commission_config.deleteMany({
        where: { visionId: visionId }
      });

      // Eliminar escrow
      await tx.visionEscrow.deleteMany({
        where: { visionId: visionId }
      });

      // Finalmente eliminar la visión
      await tx.vision.delete({
        where: { id: visionId }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Visión "${vision.nombre}" eliminada exitosamente`
    });

  } catch (error) {
    logger.error('Error eliminando visión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la visión' },
      { status: 500 }
    );
  }
}
