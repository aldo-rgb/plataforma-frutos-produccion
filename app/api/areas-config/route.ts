import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const targetUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
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

    const visionParticipante = targetUser?.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0];
    const perteneceAGrupo = !!visionParticipante;
    const visionConfig = visionParticipante?.Vision;

    // Si pertenece a una Vision, SIEMPRE usar la configuración de la Vision
    // (ignorar cualquier configuración previa en areaConfig)
    if (perteneceAGrupo && visionConfig) {
      const areasFromVision = [];
      
      console.log('🔍 Usuario pertenece a Vision:', visionConfig.nombre);
      console.log('📋 Construyendo áreas desde configuración de Vision...');
      
      if (visionConfig.forceFinanzasArea) {
        console.log('  ✅ FINANZAS enabled');
        areasFromVision.push({ areaKey: 'finanzas', enabled: true });
      }
      if (visionConfig.forceRelacionesArea) {
        console.log('  ✅ RELACIONES enabled');
        areasFromVision.push({ areaKey: 'relaciones', enabled: true });
      }
      if (visionConfig.forceTalentosArea) {
        console.log('  ✅ TALENTOS enabled');
        areasFromVision.push({ areaKey: 'talentos', enabled: true });
      }
      if (visionConfig.forceSaludArea) {
        console.log('  ✅ SALUD enabled');
        areasFromVision.push({ areaKey: 'salud', enabled: true });
      }
      if (visionConfig.forcePazMentalArea) {
        console.log('  ✅ PAZ MENTAL enabled');
        areasFromVision.push({ areaKey: 'pazMental', enabled: true });
      }
      if (visionConfig.forceOcioArea) {
        console.log('  ✅ OCIO enabled');
        areasFromVision.push({ areaKey: 'ocio', enabled: true });
      }
      if (visionConfig.forceTransformationArea) {
        console.log('  ✅ SERVICIO TRANS enabled');
        areasFromVision.push({ areaKey: 'servicioTrans', enabled: true });
      }
      if (visionConfig.forceCommunityServiceArea) {
        console.log('  ✅ SERVICIO COMUN enabled');
        areasFromVision.push({ areaKey: 'servicioComun', enabled: true });
      }

      console.log(`📋 Total áreas habilitadas: ${areasFromVision.length}`);
      console.log('📤 Áreas finales:', areasFromVision.map(a => a.areaKey));

      return NextResponse.json({
        areas: areasFromVision,
        perteneceAGrupo: true,
        isDefault: false,
        visionName: visionConfig.nombre,
        transformationGuestsTarget: visionConfig.transformationGuestsTarget,
        visionEndDate: visionConfig.endDate
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
        isDefault: true
      });
    }

    // Retornar configuración existente
    return NextResponse.json({
      areas: configs.map(c => ({ areaKey: c.areaKey, enabled: c.enabled })),
      perteneceAGrupo,
      isDefault: false
    });

  } catch (error: any) {
    console.error('Error getting areas config:', error);
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

    // Obtener usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Determinar qué usuario modificar y verificar si pertenece a visión
    let userId = currentUser.id;
    
    // Verificar si el usuario actual pertenece a una visión
    const currentUserVision = await prisma.usuario.findUnique({
      where: { id: currentUser.id },
      select: {
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          select: { id: true },
          take: 1
        }
      }
    });
    const perteneceAGrupo = !!(currentUserVision?.VisionParticipante_VisionParticipante_participanteIdToUsuario && currentUserVision.VisionParticipante_VisionParticipante_participanteIdToUsuario.length > 0);
    
    if (targetUserId) {
      // Solo admin/coordinador pueden modificar otros usuarios
      if (currentUser.rol !== 'ADMINISTRADOR' && currentUser.rol !== 'COORDINADOR') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      userId = parseInt(targetUserId);
    } else {
      // Usuarios SIN grupo pueden modificar sus propias áreas
      // Usuarios CON grupo NO pueden modificar (solo admin/coordinador)
      if (perteneceAGrupo) {
        return NextResponse.json({ 
          error: 'Los usuarios de grupo deben solicitar cambios a su coordinador' 
        }, { status: 403 });
      }
    }

    // Obtener info del usuario target para validación
    const targetUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          select: { id: true },
          take: 1
        }
      }
    });

    const targetPerteneceAGrupo = !!(targetUser?.VisionParticipante_VisionParticipante_participanteIdToUsuario && targetUser.VisionParticipante_VisionParticipante_participanteIdToUsuario.length > 0);

    // Validar mínimo de áreas habilitadas según tipo de usuario
    const enabledCount = areas.filter((a: any) => a.enabled).length;
    const minAreas = targetPerteneceAGrupo ? 1 : 4;
    
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
            enabled: area.enabled
          },
          create: {
            usuarioId: userId,
            areaKey: area.areaKey,
            enabled: area.enabled
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      message: 'Configuración actualizada correctamente'
    });

  } catch (error: any) {
    console.error('Error updating areas config:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error.message },
      { status: 500 }
    );
  }
}
