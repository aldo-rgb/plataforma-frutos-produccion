import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/lideres
 * Obtiene todos los líderes de la organización del school admin
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    if (!admin.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 400 });
    }

    // Obtener todos los líderes de la organización
    const lideres = await prisma.usuario.findMany({
      where: {
        rol: 'LIDER',
        organizationId: admin.organizationId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        isActive: true,
        createdAt: true,
        profileImage: true,
        mentorMarketplaceApproved: true,
        organizationId: true,
        PerfilMentor: {
          select: {
            profileApprovalStatus: true,
            profileSubmittedAt: true,
            especialidad: true,
            biografia: true,
            biografiaCompleta: true
          }
        },
        // Contar mentorados asignados
        _count: {
          select: {
            other_Usuario_Usuario_assignedMentorIdToUsuario: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Obtener visiones asignadas para cada líder
    const lideresConVisiones = await Promise.all(
      lideres.map(async (lider) => {
        const visiones = await prisma.visionMentor.findMany({
          where: {
            mentorId: lider.id
          },
          select: {
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          distinct: ['visionId']
        });

        // Verificar si tiene perfil de mentor completo desde el query principal
        const perfilMentor = lider.PerfilMentor;

        const perfilCompleto = perfilMentor && 
          perfilMentor.especialidad && 
          perfilMentor.especialidad.trim() !== '' &&
          perfilMentor.biografia &&
          perfilMentor.biografia.trim() !== '';

        // Verificar si tiene horarios de llamadas configurados
        const horarios = await prisma.callAvailability.findMany({
          where: {
            mentorId: lider.id,
            type: 'DISCIPLINE',
            isActive: true
          }
        });

        const tieneHorarios = horarios.length > 0;

        return {
          ...lider,
          totalMentorados: lider._count.other_Usuario_Usuario_assignedMentorIdToUsuario,
          totalVisiones: visiones.length,
          perfilCompleto,
          tieneHorarios,
          profileApprovalStatus: perfilMentor?.profileApprovalStatus || 'DRAFT',
          profileSubmittedAt: perfilMentor?.profileSubmittedAt,
          VisionesAsignadas: visiones.map((v: any) => ({
            id: v.Vision.id,
            nombre: v.Vision.nombre
          }))
        };
      })
    );

    return NextResponse.json({
      success: true,
      lideres: lideresConVisiones
    });

  } catch (error: any) {
    logger.error('Error obteniendo líderes:', error);
    return NextResponse.json(
      { error: 'Error al obtener líderes', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-admin/lideres
 * Crea un nuevo mentor privado de la organización
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    if (!admin.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, email, password } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar que la organización tenga licencias disponibles
    const organization = await prisma.organization.findUnique({
      where: { id: admin.organizationId },
      select: {
        id: true,
        name: true,
        totalLicenses: true,
        activeLicenses: true
      }
    });

    if (!organization) {
      logger.debug(`⚠️ Organización no encontrada: ${admin.organizationId}`);
      return NextResponse.json(
        { 
          error: 'Organización no encontrada', 
          details: `Organización ID: ${admin.organizationId}` 
        },
        { status: 400 }
      );
    }

    const availableLicenses = organization.totalLicenses - organization.activeLicenses;

    if (availableLicenses <= 0) {
      logger.debug(`⚠️ Sin licencias disponibles. Total: ${organization.totalLicenses}, Activas: ${organization.activeLicenses}`);
      return NextResponse.json(
        { 
          error: 'No hay licencias disponibles', 
          details: `Licencias totales: ${organization.totalLicenses}, Asignadas: ${organization.activeLicenses}. Contacta al administrador para comprar más licencias.` 
        },
        { status: 400 }
      );
    }

    // Generar código de licencia estándar para líder
    const standardLicenseCode = `LDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Crear el líder
    const nuevoLider = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: 'LIDER',
        organizationId: admin.organizationId,
        isActive: true,
        mentorMarketplaceApproved: false, // Requiere aprobación del director
        visibleInMentorshipMarketplace: false, // NO visible en marketplace
        requirePasswordChange: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      }
    });

    // Crear la licencia estándar (consume 1 licencia de la organización)
    await prisma.licenseAssignment.create({
      data: {
        userId: nuevoLider.id,
        licenseCode: standardLicenseCode,
        isActive: true,
        organizationId: admin.organizationId,
        assignedBy: session.user.id,
        assignedAt: new Date(),
      }
    });

    // Incrementar activeLicenses en la organización
    await prisma.organization.update({
      where: { id: admin.organizationId },
      data: {
        activeLicenses: {
          increment: 1
        }
      }
    });

    logger.debug(`✅ Líder creado con licencia estándar: ${standardLicenseCode}`);
    logger.debug(`📊 Licencias - Organización: ${organization.name}, Total: ${organization.totalLicenses}, Activas: ${organization.activeLicenses + 1}, Disponibles: ${availableLicenses - 1}`);

    return NextResponse.json({
      success: true,
      lider: {
        id: nuevoLider.id,
        nombre: nuevoLider.nombre,
        email: nuevoLider.email,
        licenseCode: standardLicenseCode
      },
      message: `Líder creado exitosamente. Licencia estándar asignada. Licencias disponibles: ${availableLicenses - 1} de ${organization.totalLicenses}`
    });

  } catch (error: any) {
    logger.error('Error creando líder:', error);
    return NextResponse.json(
      { error: 'Error al crear líder', details: error.message },
      { status: 500 }
    );
  }
}
