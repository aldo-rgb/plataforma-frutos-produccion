import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * API para obtener información del usuario actual
 * Incluye datos básicos y organización
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener organización por separado
    let organization = null;
    if (usuario.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: usuario.organizationId },
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      });
      organization = org;
    }

    return NextResponse.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      organizationId: usuario.organizationId,
      organization
    });

  } catch (error) {
    logger.error('❌ Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del usuario' },
      { status: 500 }
    );
  }
}
