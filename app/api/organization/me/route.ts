import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Organization_Organization_schoolAdminIdToUsuario: true,
        Organization_Usuario_organizationIdToOrganization: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si es SCHOOL_ADMIN, devolver su organización
    if (user.rol === 'SCHOOL_ADMIN' && user.Organization_Organization_schoolAdminIdToUsuario) {
      return NextResponse.json(user.Organization_Organization_schoolAdminIdToUsuario);
    }

    // Si pertenece a una organización, devolverla
    if (user.Organization_Usuario_organizationIdToOrganization) {
      return NextResponse.json(user.Organization_Usuario_organizationIdToOrganization);
    }

    return NextResponse.json({ error: 'Usuario no pertenece a ninguna organización' }, { status: 404 });
  } catch (error) {
    logger.error('Error obteniendo organización:', error);
    return NextResponse.json(
      { error: 'Error al obtener organización' },
      { status: 500 }
    );
  }
}
