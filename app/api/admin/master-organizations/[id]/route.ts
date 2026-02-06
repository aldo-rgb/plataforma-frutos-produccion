import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// PUT: Actualizar organización master
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, logoUrl, isActive } = body;

    const masterOrg = await prisma.masterOrganization.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(masterOrg);
  } catch (error: any) {
    logger.error('Error actualizando master organization:', error);
    return NextResponse.json(
      { error: 'Error al actualizar organización master' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar organización master (solo si no tiene organizaciones asignadas)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que no tenga organizaciones asignadas
    const orgCount = await prisma.organization.count({
      where: { masterOrganizationId: id }
    });

    if (orgCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Tiene ${orgCount} organizaciones asignadas` },
        { status: 400 }
      );
    }

    await prisma.masterOrganization.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error eliminando master organization:', error);
    return NextResponse.json(
      { error: 'Error al eliminar organización master' },
      { status: 500 }
    );
  }
}
