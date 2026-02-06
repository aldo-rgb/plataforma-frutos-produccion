import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'Solo coordinadores pueden asignar condecoraciones' },
        { status: 403 }
      );
    }

    const { usuarioId, condecoracionId } = await req.json();

    if (!usuarioId || !condecoracionId) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece a la organización del coordinador
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { organizationId: true }
    });

    if (!usuario || usuario.organizationId !== coordinador.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado o no pertenece a tu organización' },
        { status: 404 }
      );
    }

    // Obtener o crear perfil completo
    let perfilCompleto = await prisma.perfilCompleto.findUnique({
      where: { usuarioId }
    });

    if (!perfilCompleto) {
      perfilCompleto = await prisma.perfilCompleto.create({
        data: { usuarioId }
      });
    }

    // Agregar condecoración si no la tiene
    const condecoraciones = perfilCompleto.condecoraciones || [];
    if (!condecoraciones.includes(condecoracionId)) {
      condecoraciones.push(condecoracionId);
      
      await prisma.perfilCompleto.update({
        where: { usuarioId },
        data: { condecoraciones }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Condecoración asignada exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ Error en POST /api/coordinador/condecoraciones/asignar:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al asignar condecoración' },
      { status: 500 }
    );
  }
}
