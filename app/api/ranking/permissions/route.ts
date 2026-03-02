import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ranking/permissions
 * Obtiene los permisos y opciones disponibles para el usuario según su rol
 */
export async function GET() {
  try {
    console.log('🔍 Iniciando GET /api/ranking/permissions');
    
    const session = await getServerSession(authOptions);
    console.log('🔍 Session:', session?.user?.id ? 'Autenticado' : 'No autenticado');
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    console.log('🔍 User ID:', userId);
    
    // Obtener información básica del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true
          }
        }
      }
    });
    console.log('🔍 Usuario encontrado:', usuario ? 'Sí' : 'No');

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const rol = usuario.rol;
    const org = usuario.Organization_Usuario_organizationIdToOrganization;
    console.log('🔍 Rol:', rol);
    
    // Permisos simplificados - todos pueden ver global
    const permissions: any = {
      role: rol,
      canViewGlobal: true,
      canViewSchool: ['COORDINADOR', 'DIRECTOR', 'ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(rol),
      canViewSchoolWar: ['ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(rol),
      canViewVision: true,
      canViewMentors: true,
      availableSchools: org ? [{
        id: org.id,
        name: org.name,
        logo: org.logoUrl,
        brandColor: org.brandColor
      }] : [],
      availableVisions: [] as any[],
      userOrganizationId: usuario.organizationId,
      userVisionId: null
    };

    console.log('🔍 Permisos base creados');

    // Para admins, cargar todas las escuelas
    if (['ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(rol)) {
      console.log('🔍 Cargando escuelas para admin...');
      const allSchools = await prisma.organization.findMany({
        select: { id: true, name: true, logoUrl: true, brandColor: true },
        orderBy: { name: 'asc' }
      });
      permissions.availableSchools = allSchools.map(s => ({
        id: s.id, name: s.name, logo: s.logoUrl, brandColor: s.brandColor
      }));
      console.log('🔍 Escuelas cargadas:', allSchools.length);
    }

    // Cargar visiones disponibles
    console.log('🔍 Cargando visiones...');
    const visions = await prisma.vision.findMany({
      where: { isActive: true },
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: 'asc' }
    });
    permissions.availableVisions = visions;
    console.log('🔍 Visiones cargadas:', visions.length);

    console.log('✅ Retornando permisos');
    return NextResponse.json(permissions);

  } catch (error) {
    console.error('❌ ERROR en /api/ranking/permissions:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo permisos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
