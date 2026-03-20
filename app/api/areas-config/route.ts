import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const DEFAULT_AREAS = [
  'finanzas',
  'salud',
  'relaciones',
  'talentos',
  'pazMental',
  'ocio',
  'servicioTrans',
  'servicioComun'
];

/**
 * GET /api/areas-config
 * Obtiene la configuración de áreas para el usuario
 * Query params: userId (opcional, solo para admin/coordinador)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    // Obtener usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Determinar qué usuario consultar
    let userId = currentUser.id;
    
    if (targetUserId) {
      // Solo admin/coordinador pueden consultar otros usuarios
      if (currentUser.rol !== 'ADMINISTRADOR' && currentUser.rol !== 'COORDINADOR') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      userId = parseInt(targetUserId);
    }

    // Obtener configuración existente
    const configs = await prisma.areaConfig.findMany({
      where: { usuarioId: userId }
    });

    // Obtener info del usuario target y verificar si pertenece a una visión
    // Primero buscar por VisionParticipante (agregado por coordinador)
    const targetUser = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        Organization_Usuario_organizationIdToOrganization: {
          select: { brandColor: true }
        },
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                endDate: true,
                transformationGuestsTarget: true,
                forceFinanzasArea: true,
                forceRelacionesArea: true,
                forceTalentosArea: true,
                forceSaludArea: true,
                forcePazMentalArea: true,
                forceOcioArea: true,
                forceTransformationArea: true,
                forceCommunityServiceArea: true
              }
            }
          },
          take: 1
        }
      }
    });
    
    // Obtener tier del usuario
    const userTier = targetUser?.tier || 'FREE';
    
    // Obtener brandColor de la organización
    const brandColor = targetUser?.Organization_Usuario_organizationIdToOrganization?.brandColor || '#6366F1';

    let visionParticipante = targetUser?.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0];
    let visionConfig = visionParticipante?.Vision;
    
    // =====================================================
    // IMPORTANTE: Usuarios con tier FREE (perdieron licencia)
    // NO deben ser tratados como "pertenece a grupo"
    // Esto permite que graduados sin licencia puedan configurar sus áreas
    // =====================================================
    const isTierFree = userTier === 'FREE';
    let perteneceAGrupo = isTierFree ? false : !!visionParticipante;
    
    if (isTierFree && visionParticipante) {
      logger.debug('⚠️ Usuario tiene tier FREE - se trata como usuario independiente aunque tenga VisionParticipante');
    }

    // Si no es VisionParticipante, verificar si tiene vision_enrollments (inscrito al programa)
    // También obtener el nivel del usuario para filtrar áreas
    // IMPORTANTE: El nivel debe ser el del entrenamiento ACTUALMENTE EN CURSO (trainingStatus = IN_PROGRESS)
    let userLevel: string | null = null;
    
    if (!perteneceAGrupo) {
      // Primero, obtener todos los enrollments del usuario
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          userId,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              transformationGuestsTarget: true,
              endDate: true,
              forceFinanzasArea: true,
              forceRelacionesArea: true,
              forceTalentosArea: true,
              forceSaludArea: true,
              forcePazMentalArea: true,
              forceOcioArea: true,
              forceTransformationArea: true,
              forceCommunityServiceArea: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      });

      if (enrollments.length > 0 && !isTierFree) {
        // Solo considerar como grupo si NO es tier FREE
        const firstEnrollment = enrollments[0];
        const visionId = firstEnrollment.visionId;
        
        logger.debug('🔍 Usuario tiene enrollment en Vision:', firstEnrollment.Vision?.nombre);
        perteneceAGrupo = true;
        visionConfig = firstEnrollment.Vision;
        
        // Determinar el nivel ACTIVO basándose en el SchoolProduct con trainingStatus = IN_PROGRESS
        // Buscar productos activos (IN_PROGRESS) para esta visión
        const activeProduct = await prisma.schoolProduct.findFirst({
          where: {
            visionId: visionId,
            trainingStatus: 'IN_PROGRESS',
            isActive: true
          },
          select: { levelType: true },
          orderBy: { 
            // Prioridad: BASIC > ADVANCED > PL (el más básico primero)
            levelType: 'asc' 
          }
        });
        
        if (activeProduct) {
          // Verificar que el usuario tenga enrollment para ese nivel
          const hasEnrollmentForLevel = enrollments.some(e => e.level === activeProduct.levelType);
          if (hasEnrollmentForLevel) {
            userLevel = activeProduct.levelType;
            logger.debug('📊 Nivel del usuario basado en entrenamiento activo (IN_PROGRESS):', userLevel);
          } else {
            // El usuario no tiene enrollment para el nivel en progreso
            // Usar el nivel más bajo que tenga el usuario
            const levelPriority = ['BASIC', 'ADVANCED', 'PL'];
            for (const level of levelPriority) {
              if (enrollments.some(e => e.level === level)) {
                userLevel = level;
                break;
              }
            }
            logger.debug('📊 Nivel del usuario (sin entrenamiento activo para su nivel):', userLevel);
          }
        } else {
          // No hay entrenamiento IN_PROGRESS, usar el nivel más bajo del usuario
          const levelPriority = ['BASIC', 'ADVANCED', 'PL'];
          for (const level of levelPriority) {
            if (enrollments.some(e => e.level === level)) {
              userLevel = level;
              break;
            }
          }
          logger.debug('📊 Nivel del usuario (sin entrenamiento IN_PROGRESS):', userLevel);
        }
      }
    } else {
      // Si es VisionParticipante, buscar su enrollment para obtener el nivel
      // También verificar el trainingStatus del producto activo
      const visionId = visionParticipante?.visionId;
      
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { userId },
        select: { level: true }
      });
      
      if (visionId && enrollments.length > 0) {
        // Buscar producto en progreso
        const activeProduct = await prisma.schoolProduct.findFirst({
          where: {
            visionId: visionId,
            trainingStatus: 'IN_PROGRESS',
            isActive: true
          },
          select: { levelType: true }
        });
        
        if (activeProduct && enrollments.some(e => e.level === activeProduct.levelType)) {
          userLevel = activeProduct.levelType;
        } else {
          // Usar el nivel más bajo
          const levelPriority = ['BASIC', 'ADVANCED', 'PL'];
          for (const level of levelPriority) {
            if (enrollments.some(e => e.level === level)) {
              userLevel = level;
              break;
            }
          }
        }
      } else {
        const enrollment = await prisma.vision_enrollments.findFirst({
          where: { userId },
          orderBy: { enrolledAt: 'asc' }, // El más antiguo (nivel más bajo)
          select: { level: true }
        });
        userLevel = enrollment?.level || null;
      }
      logger.debug('📊 Nivel del usuario (VisionParticipante):', userLevel);
    }
    
    // Si no encontramos nivel en enrollment, usar currentVisionLevel del usuario
    if (!userLevel) {
      const userWithLevel = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { currentVisionLevel: true }
      });
      userLevel = userWithLevel?.currentVisionLevel || null;
      logger.debug('📊 Nivel del usuario desde currentVisionLevel:', userLevel);
    }

    // Si pertenece a una Vision, SIEMPRE usar la configuración de la Vision
    // (ignorar cualquier configuración previa en areaConfig)
    if (perteneceAGrupo && visionConfig) {
      const areasFromVision = [];
      
      logger.debug('🔍 Usuario pertenece a Vision:', visionConfig.nombre);
      logger.debug('📋 Construyendo áreas desde configuración de Vision...');
      
      if (visionConfig.forceFinanzasArea) {
        logger.debug('  ✅ FINANZAS enabled');
        areasFromVision.push({ areaKey: 'finanzas', enabled: true });
      }
      if (visionConfig.forceRelacionesArea) {
        logger.debug('  ✅ RELACIONES enabled');
        areasFromVision.push({ areaKey: 'relaciones', enabled: true });
      }
      if (visionConfig.forceTalentosArea) {
        logger.debug('  ✅ TALENTOS enabled');
        areasFromVision.push({ areaKey: 'talentos', enabled: true });
      }
      if (visionConfig.forceSaludArea) {
        logger.debug('  ✅ SALUD enabled');
        areasFromVision.push({ areaKey: 'salud', enabled: true });
      }
      if (visionConfig.forcePazMentalArea) {
        logger.debug('  ✅ PAZ MENTAL enabled');
        areasFromVision.push({ areaKey: 'pazMental', enabled: true });
      }
      if (visionConfig.forceOcioArea) {
        logger.debug('  ✅ OCIO enabled');
        areasFromVision.push({ areaKey: 'ocio', enabled: true });
      }
      
      // =====================================================
      // FILTRO POR NIVEL: Áreas de servicio para usuarios PL
      // Se muestra si: userLevel === 'PL' O si tiene asistencia en PL (attendanceStatus = 'ATTENDED')
      // =====================================================
      const isPLLevel = userLevel === 'PL';
      
      // Verificar si tiene asistencia en PL aunque no esté activo el entrenamiento
      const plEnrollments = await prisma.vision_enrollments.findMany({
        where: { userId, level: 'PL' },
        select: { attendanceStatus: true }
      });
      const hasPLAttendance = plEnrollments.some(e => e.attendanceStatus === 'ATTENDED');
      
      const canAccessServiceAreas = isPLLevel || hasPLAttendance;
      logger.debug(`📊 Nivel actual: ${userLevel} | Es PL: ${isPLLevel} | Tiene asistencia PL: ${hasPLAttendance} | Acceso a áreas servicio: ${canAccessServiceAreas}`);
      
      if (canAccessServiceAreas) {
        if (visionConfig.forceTransformationArea) {
          logger.debug('  ✅ SERVICIO TRANS enabled (nivel PL o asistencia PL)');
          areasFromVision.push({ areaKey: 'servicioTrans', enabled: true });
        }
        if (visionConfig.forceCommunityServiceArea) {
          logger.debug('  ✅ SERVICIO COMUN enabled (nivel PL o asistencia PL)');
          areasFromVision.push({ areaKey: 'servicioComun', enabled: true });
        }
      } else {
        logger.debug('  ⛔ SERVICIO TRANS/COMUN ocultos (nivel BASIC/ADVANCED sin asistencia PL)');
      }

      logger.debug(`📋 Total áreas habilitadas: ${areasFromVision.length}`);
      logger.debug('📤 Áreas finales:', areasFromVision.map(a => a.areaKey));

      return NextResponse.json({
        areas: areasFromVision,
        perteneceAGrupo: true,
        isDefault: false,
        visionName: visionConfig.nombre,
        transformationGuestsTarget: visionConfig.transformationGuestsTarget,
        visionEndDate: visionConfig.endDate,
        userLevel, // Incluir nivel del usuario en la respuesta
        userTier, // Incluir tier del usuario
        brandColor // Color corporativo de la organización
      });
    }

    // Si NO tiene configuración Y NO pertenece a visión, crear defaults
    if (configs.length === 0) {
      // Usuario orgánico: excluir áreas de servicio
      const defaultAreas = DEFAULT_AREAS.filter(a => a !== 'servicioTrans' && a !== 'servicioComun');

      const defaultConfigs = defaultAreas.map(areaKey => ({
        areaKey,
        enabled: true
      }));

      return NextResponse.json({
        areas: defaultConfigs,
        perteneceAGrupo: false,
        isDefault: true,
        userTier,
        brandColor
      });
    }

    // Retornar configuración existente
    return NextResponse.json({
      areas: configs.map(c => ({ areaKey: c.areaKey, enabled: c.enabled })),
      perteneceAGrupo,
      isDefault: false,
      userTier,
      brandColor
    });

  } catch (error: any) {
    logger.error('Error getting areas config:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/areas-config
 * Actualiza la configuración de áreas
 * Body: { userId?: number, areas: { areaKey: string, enabled: boolean }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { userId: targetUserId, areas } = body;

    // Obtener usuario actual incluyendo su tier
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, tier: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Determinar qué usuario modificar y verificar si pertenece a visión
    let userId = currentUser.id;
    
    // =====================================================
    // IMPORTANTE: Usuarios con tier FREE (perdieron licencia)
    // pueden modificar sus propias áreas aunque tengan historial de visión
    // =====================================================
    const isTierFree = currentUser.tier === 'FREE' || !currentUser.tier;
    
    // Verificar si el usuario actual pertenece a una visión ACTIVA
    const currentUserVision = await prisma.usuario.findUnique({
      where: { id: currentUser.id },
      select: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: {
            Vision: {
              isActive: true
            }
          },
          select: { 
            id: true,
            Vision: {
              select: { nombre: true }
            }
          },
          take: 1
        }
      }
    });
    
    const visionActiva = currentUserVision?.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0];
    
    // Si el usuario tiene tier FREE, NO se considera como "pertenece a grupo"
    // Esto permite que graduados sin licencia puedan configurar sus áreas
    const perteneceAGrupo = isTierFree ? false : !!visionActiva;
    
    logger.debug('🔍 POST /api/areas-config - Usuario:', currentUser.id);
    logger.debug('💳 Tier del usuario:', currentUser.tier || 'FREE');
    logger.debug('📋 Visión activa encontrada:', visionActiva ? visionActiva.Vision.nombre : 'Ninguna');
    logger.debug('🎯 Pertenece a grupo (considerando tier):', perteneceAGrupo);
    
    if (isTierFree && visionActiva) {
      logger.debug('⚠️ Usuario tiene tier FREE - puede modificar sus áreas aunque tenga VisionParticipante');
    }
    
    if (targetUserId) {
      // Solo admin/coordinador pueden modificar otros usuarios
      if (currentUser.rol !== 'ADMINISTRADOR' && currentUser.rol !== 'COORDINADOR') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      userId = parseInt(targetUserId);
    } else {
      // Usuarios SIN grupo o con tier FREE pueden modificar sus propias áreas
      // Usuarios CON grupo y con licencia activa NO pueden modificar (solo admin/coordinador)
      if (perteneceAGrupo) {
        logger.debug('❌ Usuario pertenece a grupo activo con licencia, no puede modificar sus áreas');
        return NextResponse.json({ 
          error: 'Los usuarios de grupo deben solicitar cambios a su coordinador' 
        }, { status: 403 });
      }
      logger.debug('✅ Usuario puede modificar sus áreas (lobo solitario o tier FREE)');
    }

    // Obtener info del usuario target para validación
    const targetUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: {
            Vision: {
              isActive: true
            }
          },
          select: { id: true },
          take: 1
        }
      }
    });

    const targetVisionActiva = targetUser?.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0];
    const targetPerteneceAGrupo = !!targetVisionActiva;

    // Validar mínimo de áreas habilitadas según tipo de usuario
    const enabledCount = areas.filter((a: any) => a.enabled).length;
    const minAreas = targetPerteneceAGrupo ? 1 : 1; // Cambiar a 1 mínimo para todos
    
    if (enabledCount < minAreas) {
      return NextResponse.json({ 
        error: `Debe mantener al menos ${minAreas} área${minAreas > 1 ? 's' : ''} habilitada${minAreas > 1 ? 's' : ''}` 
      }, { status: 400 });
    }

    // Actualizar o crear configuraciones
    await prisma.$transaction(
      areas.map((area: any) =>
        prisma.areaConfig.upsert({
          where: {
            usuarioId_areaKey: {
              usuarioId: userId,
              areaKey: area.areaKey
            }
          },
          update: {
            enabled: area.enabled,
            updatedAt: new Date()
          },
          create: {
            usuarioId: userId,
            areaKey: area.areaKey,
            enabled: area.enabled,
            updatedAt: new Date()
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      message: 'Configuración actualizada correctamente'
    });

  } catch (error: any) {
    logger.error('Error updating areas config:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error.message },
      { status: 500 }
    );
  }
}
