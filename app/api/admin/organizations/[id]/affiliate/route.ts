import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const organizationId = parseInt(params.id);
    if (isNaN(organizationId)) {
      return NextResponse.json(
        { error: 'ID de organización inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { masterOrganizationId } = body;

    // Validar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Si se proporciona masterOrganizationId, validar que existe
    if (masterOrganizationId !== null && masterOrganizationId !== undefined) {
      const masterExists = await prisma.masterOrganization.findUnique({
        where: { id: masterOrganizationId }
      });

      if (!masterExists) {
        return NextResponse.json(
          { error: 'Agrupación master no encontrada' },
          { status: 404 }
        );
      }
    }

    // Actualizar la afiliación
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        masterOrganizationId: masterOrganizationId || null
      },
      include: {
        MasterOrganization: true,
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
      message: masterOrganizationId 
        ? 'Organización afiliada correctamente' 
        : 'Organización desafiliada correctamente'
    });

  } catch (error) {
    console.error('Error updating organization affiliation:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la afiliación' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
