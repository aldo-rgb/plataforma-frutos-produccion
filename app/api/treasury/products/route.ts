import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/treasury/products
 * Obtiene todos los productos (Visiones y SchoolProducts) de la organización del usuario
 * Para SUPER_ADMIN y DIRECCION_PILAR: muestra de todas las organizaciones de la Master Org
 * Para otros roles: solo muestra los de su propia organización
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Primero obtener el usuario con su rol
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        organizationId: true,
        rol: true
      }
    });

    if (!usuario || !usuario.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    // Obtener la organización del usuario
    const userOrg = await prisma.organization.findUnique({
      where: { id: usuario.organizationId },
      select: {
        id: true,
        name: true,
        masterOrganizationId: true
      }
    });
    
    if (!userOrg) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 400 });
    }

    // Determinar qué organizaciones mostrar según el rol
    let organizationIds: number[] = [userOrg.id];
    
    // Solo SUPER_ADMIN y DIRECCION_PILAR pueden ver todas las organizaciones de la Master Org
    const rolesConAccesoGlobal = ['SUPER_ADMIN', 'DIRECCION_PILAR'];
    
    if (rolesConAccesoGlobal.includes(usuario.rol) && userOrg.masterOrganizationId) {
      const siblingOrgs = await prisma.organization.findMany({
        where: {
          masterOrganizationId: userOrg.masterOrganizationId,
          status: 'ACTIVE'
        },
        select: { id: true, name: true }
      });
      organizationIds = siblingOrgs.map(o => o.id);
    }
    // Para SCHOOL_ADMIN y otros roles, solo ven su propia organización

    // Obtener Visiones activas de todas las organizaciones hermanas
    const visiones = await prisma.vision.findMany({
      where: {
        organizationId: { in: organizationIds },
        isActive: true
      },
      include: {
        Organization: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { nombre: 'asc' }
      ]
    });

    // Obtener SchoolProducts (entrenamientos y talleres) de todas las organizaciones hermanas
    const schoolProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: { in: organizationIds },
        isActive: true
      },
      include: {
        Organization: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'asc' }
      ]
    });

    // Combinar en un formato unificado
    const products = [
      // Visiones
      ...visiones.map(v => ({
        id: `vision-${v.id}`,
        visionId: v.id,
        productId: null,
        name: v.nombre,
        type: 'VISION' as const,
        organizationId: v.organizationId,
        organizationName: v.Organization?.name || 'Sin organización',
        startDate: v.startDate,
        endDate: v.endDate
      })),
      // SchoolProducts
      ...schoolProducts.map(p => ({
        id: `product-${p.id}`,
        visionId: null,
        productId: p.id,
        name: p.name,
        type: p.type === 'CORE_TRAINING' ? 'TRAINING' : 'WORKSHOP',
        organizationId: p.organizationId,
        organizationName: p.Organization?.name || 'Sin organización',
        startDate: p.startDate,
        endDate: p.endDate
      }))
    ];

    return NextResponse.json({
      success: true,
      products,
      // También devolver por separado para compatibilidad
      visiones: visiones.map(v => ({
        id: v.id,
        nombre: v.nombre,
        organizationName: v.Organization?.name
      })),
      schoolProducts: schoolProducts.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        organizationName: p.Organization?.name
      }))
    });

  } catch (error: any) {
    logger.error('Error fetching treasury products:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener productos' },
      { status: 500 }
    );
  }
}
