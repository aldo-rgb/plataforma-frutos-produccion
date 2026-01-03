import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyLiderSolicitaAprobacion } from '@/lib/notifications';

/**
 * POST /api/lider/perfil/solicitar-aprobacion
 * 
 * Permite a un líder enviar su perfil completo a revisión del director de su organización.
 * Crea una notificación para el director/school_admin.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea LIDER
    if (session.user.rol !== 'LIDER') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo los líderes pueden usar esta función.' },
        { status: 403 }
      );
    }

    const liderId = session.user.id;

    // Obtener el perfil del líder con su organización
    const lider = await prisma.usuario.findUnique({
      where: { id: liderId },
      include: {
        Organization: true
      }
    });

    if (!lider) {
      return NextResponse.json(
        { error: 'Líder no encontrado' },
        { status: 404 }
      );
    }

    if (!lider.organizationId || !lider.Organization) {
      return NextResponse.json(
        { error: 'El líder no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener el perfil del líder
    const perfil = await prisma.perfilMentor.findUnique({
      where: { usuarioId: liderId }
    });

    // Verificar que el líder tenga un perfil de mentor
    if (!perfil) {
      return NextResponse.json(
        { error: 'Debes completar tu perfil antes de solicitar aprobación' },
        { status: 400 }
      );
    }

    // Verificar campos mínimos del perfil
    if (!perfil.biografia || perfil.biografia.length < 50) {
      return NextResponse.json(
        { error: 'Tu biografía debe tener al menos 50 caracteres' },
        { status: 400 }
      );
    }

    // Obtener el director de la organización (schoolAdmin)
    const directorId = lider.Organization.schoolAdminId;
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { id: true, nombre: true, email: true, rol: true }
    });

    if (!director) {
      return NextResponse.json(
        { error: 'No se encontró el director de la organización' },
        { status: 400 }
      );
    }

    // Crear notificación para el director
    await prisma.mentorAlert.create({
      data: {
        mentorId: directorId,
        usuarioId: liderId, // Campo requerido en el schema
        type: 'MILESTONE',
        message: `${lider.nombre} (Líder) de ${lider.Organization.name} solicita aprobación de su perfil de mentor`,
        read: false
      }
    });

    // Enviar notificaciones por email y push
    await notifyLiderSolicitaAprobacion(
      lider.id,
      directorId,
      lider.Organization.name
    );

    console.log(`✅ Solicitud de aprobación enviada: Líder ${lider.nombre} → Director ${director.nombre}`);

    return NextResponse.json({
      success: true,
      message: 'Solicitud de aprobación enviada al director',
      director: {
        id: director.id,
        nombre: director.nombre,
        rol: director.rol
      }
    });

  } catch (error) {
    console.error('Error al solicitar aprobación de perfil:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
