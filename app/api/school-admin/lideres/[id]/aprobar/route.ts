import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * PATCH /api/school-admin/lideres/[id]/aprobar
 * Aprueba un líder y lo activa
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const liderId = parseInt(params.id);

    // Verificar que el líder pertenezca a la misma organización
    const lider = await prisma.usuario.findUnique({
      where: { id: liderId },
      select: {
        rol: true,
        organizationId: true
      }
    });

    if (!lider || lider.rol !== 'LIDER') {
      return NextResponse.json({ error: 'Líder no encontrado' }, { status: 404 });
    }

    if (lider.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'Este líder no pertenece a tu organización' }, { status: 403 });
    }

    // Verificar que el líder tenga su perfil de mentor completo
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: liderId },
      select: {
        especialidad: true,
        biografiaCorta: true,
        biografiaCompleta: true,
        enlaceVideoLlamada: true,
        biografia: true
      }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'El líder debe tener un perfil de mentor creado antes de ser aprobado' 
      }, { status: 400 });
    }

    // Validar campos obligatorios del perfil
    const camposFaltantes: string[] = [];
    
    if (!perfilMentor.especialidad || perfilMentor.especialidad.trim() === '') {
      camposFaltantes.push('Especialidad');
    }
    
    if (!perfilMentor.biografiaCorta && !perfilMentor.biografiaCompleta && !perfilMentor.biografia) {
      camposFaltantes.push('Biografía');
    }
    
    if (!perfilMentor.enlaceVideoLlamada || perfilMentor.enlaceVideoLlamada.trim() === '') {
      camposFaltantes.push('Enlace de videollamada');
    }

    if (camposFaltantes.length > 0) {
      return NextResponse.json({ 
        error: `El perfil del líder está incompleto. Faltan los siguientes campos: ${camposFaltantes.join(', ')}`,
        camposFaltantes
      }, { status: 400 });
    }

    // Aprobar y activar el líder
    await prisma.usuario.update({
      where: { id: liderId },
      data: {
        mentorMarketplaceApproved: true,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Líder aprobado y activado exitosamente'
    });

  } catch (error: any) {
    logger.error('Error aprobando líder:', error);
    return NextResponse.json(
      { error: 'Error al aprobar líder', details: error.message },
      { status: 500 }
    );
  }
}
