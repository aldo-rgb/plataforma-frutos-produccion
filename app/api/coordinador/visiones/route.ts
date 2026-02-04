import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    // Roles válidos de coordinador y admin
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'SCHOOL_ADMIN'];
    
    // Permitir tanto coordinadores como SCHOOL_ADMIN que actúan como coordinadores
    if (!usuario || !allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('🔍 Buscando visiones para coordinador:', {
      usuarioId: usuario.id,
      coordinadorId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      organizationId: usuario.organizationId
    });

    // Buscar visiones donde el usuario está asignado como staff coordinador
    const visionStaff = await prisma.visionStaff.findMany({
      where: {
        userId: usuario.id,
        role: {
          in: ['BASIC_COORDINATOR', 'ADVANCED_COORDINATOR', 'PL_COORDINATOR']
        }
      },
      select: {
        visionId: true
      }
    });

    const visionIds = visionStaff.map(vs => vs.visionId);

    console.log('📋 Visiones asignadas en VisionStaff:', visionIds);

    // Construir condiciones de búsqueda
    const orConditions: any[] = [
      { coordinadorId: usuario.id },
      { id: { in: visionIds.length > 0 ? visionIds : [0] } }
    ];

    // Para rol COORDINADOR, también incluir visiones de su organización
    if (usuario.rol === 'COORDINADOR' && usuario.organizationId) {
      orConditions.push({ organizationId: usuario.organizationId });
      console.log('📋 Incluyendo visiones de organización:', usuario.organizationId);
    }

    // Obtener visiones donde el coordinador es el coordinador asignado
    // O donde está asignado en VisionStaff
    // O donde pertenece a la misma organización (solo para COORDINADOR)
    const visiones = await prisma.vision.findMany({
      where: {
        OR: orConditions
      },
      include: {
        _count: {
          select: {
            VisionGameChanger: true,
            // Contar SOLO participantes de Liderato (PL) activos
            vision_enrollments: {
              where: {
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar los datos para mantener compatibilidad con el widget
    const visionesConConteo = visiones.map(v => ({
      ...v,
      _count: {
        VisionParticipante: v._count.vision_enrollments, // Usar el conteo de enrollments
        VisionGameChanger: v._count.VisionGameChanger
      }
    }));

    console.log('✅ Visiones encontradas:', visionesConConteo.length);
    if (visionesConConteo.length > 0) {
      console.log('📋 Lista de visiones:', visionesConConteo.map(v => ({
        id: v.id,
        nombre: v.nombre,
        coordinadorId: v.coordinadorId,
        participantes: v._count.VisionParticipante
      })));
    }

    return NextResponse.json({
      success: true,
      visiones: visionesConConteo
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo visiones del coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener visiones',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
