import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const organizationId = parseInt(id);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        License: {
          orderBy: { createdAt: 'desc' }
        },
        Usuario_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            vision: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      organization
    });
  } catch (error) {
    logger.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Error al obtener organización' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const organizationId = parseInt(id);
    const body = await req.json();

    const {
      name,
      contactEmail,
      schoolAdminEmail,
      logoUrl,
      brandColor,
      status,
      isGeofenced,
      campusLatitude,
      campusLongitude,
      geofenceRadius,
      standardLicensePrice,
      premiumLicensePrice,
      renewalOfferDiscount
    } = body;

    // ✅ VALIDACIÓN: No se puede dejar una organización sin coordinador
    const currentOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { schoolAdminId: true }
    });

    if (!currentOrg) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Actualizar organización
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name && { name }),
        ...(contactEmail && { contactEmail }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(brandColor && { brandColor }),
        ...(status && { status }),
        ...(isGeofenced !== undefined && { isGeofenced }),
        ...(campusLatitude !== undefined && { campusLatitude }),
        ...(campusLongitude !== undefined && { campusLongitude }),
        ...(geofenceRadius && { geofenceRadius }),
        ...(standardLicensePrice !== undefined && { standardLicensePrice: parseFloat(standardLicensePrice) }),
        ...(premiumLicensePrice !== undefined && { premiumLicensePrice: parseFloat(premiumLicensePrice) }),
        ...(renewalOfferDiscount !== undefined && { renewalOfferDiscount: parseFloat(renewalOfferDiscount) })
      },
      include: {
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // Si se proporcionó un nuevo email de School Admin, actualizar o crear
    if (schoolAdminEmail) {
      const existingAdmin = await prisma.usuario.findUnique({
        where: { email: schoolAdminEmail }
      });

      if (existingAdmin) {
        // Actualizar rol, relación y organización
        await prisma.usuario.update({
          where: { email: schoolAdminEmail },
          data: {
            rol: 'SCHOOL_ADMIN',
            organizationId: organizationId
          }
        });

        await prisma.organization.update({
          where: { id: organizationId },
          data: { schoolAdminId: existingAdmin.id }
        });
      } else {
        // Crear nuevo admin con licencia administrativa
        const bcrypt = require('bcryptjs');
        const tempPassword = await bcrypt.hash('admin123', 10);
        
        // Generar código de licencia administrativa para director (no consume créditos)
        const adminLicenseCode = `DIRECTOR-ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const newAdmin = await prisma.usuario.create({
          data: {
            email: schoolAdminEmail,
            nombre: `Director de ${name}`,
            password: tempPassword,
            rol: 'SCHOOL_ADMIN',
            tier: 'PREMIUM',
            isActive: true,
            subscriptionStatus: 'ACTIVE',
            organizationId: organizationId,
            requirePasswordChange: true, // Forzar cambio de contraseña en primer login
            // Asignar licencia administrativa (no consume créditos de la organización)
            LicenseAssignments: {
              create: {
                licenseCode: adminLicenseCode,
                isActive: true,
                organizationId: organizationId,
                assignedBy: session.user.id,
                assignedAt: new Date(),
                // Esta licencia no tiene visionId porque es administrativa
              }
            }
          }
        });

        logger.debug(`✅ School Admin creado con licencia administrativa: ${adminLicenseCode}`);

        await prisma.organization.update({
          where: { id: organizationId },
          data: { schoolAdminId: newAdmin.id }
        });
      }
    }

    return NextResponse.json({
      success: true,
      organization: updated,
      message: 'Organización actualizada correctamente'
    });
  } catch (error) {
    logger.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Error al actualizar organización' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const organizationId = parseInt(params.id);

    // Verificar si hay usuarios o licencias asociadas
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            Users: true,
            Licenses: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    if (organization._count.Users > 0 || organization._count.Licenses > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar una organización con usuarios o licencias asociadas. Considere desactivarla en su lugar.'
        },
        { status: 400 }
      );
    }

    // Eliminar organización
    await prisma.organization.delete({
      where: { id: organizationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Organización eliminada correctamente'
    });
  } catch (error) {
    logger.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Error al eliminar organización' },
      { status: 500 }
    );
  }
}
