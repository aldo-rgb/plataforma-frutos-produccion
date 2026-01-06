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
      select: {
        id: true,
        nombre: true,
        email: true,
        jobTitle: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            schoolAdminId: true
          }
        },
        PerfilMentor: {
          select: {
            id: true,
            biografia: true,
            titulo: true,
            profileApprovalStatus: true
          }
        }
      }
    });

    if (!lider || !lider.Organization_Usuario_organizationIdToOrganization) {
      return NextResponse.json(
        { error: 'El líder no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    const organization = lider.Organization_Usuario_organizationIdToOrganization;

    // Verificar que el líder tenga un perfil de mentor
    if (!lider.PerfilMentor) {
      return NextResponse.json(
        { error: 'Debes completar tu perfil antes de solicitar aprobación' },
        { status: 400 }
      );
    }

    const perfil = lider.PerfilMentor;

    // Verificar campos mínimos del perfil para LIDER
    // Los líderes solo necesitan: biografía, título profesional (jobTitle en Usuario) y título de mentor (titulo en PerfilMentor)
    const camposFaltantes: string[] = [];
    
    if (!perfil.biografia || perfil.biografia.length < 50) {
      camposFaltantes.push('Biografía (mínimo 50 caracteres)');
    }
    
    if (!lider.jobTitle || lider.jobTitle.trim() === '') {
      camposFaltantes.push('Título Profesional (Cargo)');
    }
    
    if (!perfil.titulo || perfil.titulo.trim() === '') {
      camposFaltantes.push('Título de Mentor');
    }
    
    if (camposFaltantes.length > 0) {
      return NextResponse.json(
        { 
          error: 'Completa todos los campos requeridos',
          camposFaltantes 
        },
        { status: 400 }
      );
    }

    // Obtener el director de la organización (schoolAdmin)
    const directorId = organization.schoolAdminId;
    
    if (!directorId) {
      return NextResponse.json(
        { error: 'Tu organización no tiene un director asignado. Contacta al administrador.' },
        { status: 400 }
      );
    }

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

    // Actualizar estado del perfil a PENDING
    await prisma.perfilMentor.update({
      where: { usuarioId: liderId },
      data: {
        profileApprovalStatus: 'PENDING',
        profileSubmittedAt: new Date()
      }
    });

    console.log(`✅ Perfil actualizado a PENDING para líder ${liderId}`);

    // Crear notificación para el director
    await prisma.mentorAlert.create({
      data: {
        mentorId: directorId,
        usuarioId: liderId,
        type: 'MILESTONE',
        message: `${lider.nombre} (Líder) de ${organization.name} solicita aprobación de su perfil de mentor`,
        read: false
      }
    });

    console.log(`✅ Notificación creada para director ${directorId}`);

    // Enviar notificaciones por email y push (no bloqueante)
    try {
      await notifyLiderSolicitaAprobacion(
        lider.id,
        directorId,
        organization.name
      );
      console.log(`✅ Notificaciones enviadas por email/push`);
    } catch (notifyError) {
      console.error('⚠️ Error al enviar notificaciones email/push:', notifyError);
      // No bloqueamos la respuesta si falla el envío de notificaciones
    }

    console.log(`✅ Solicitud de aprobación completada: Líder ${lider.nombre} → Director ${director.nombre}`);

    return NextResponse.json({
      success: true,
      message: 'Solicitud de aprobación enviada correctamente',
      director: {
        id: director.id,
        nombre: director.nombre,
        rol: director.rol
      }
    });

  } catch (error) {
    console.error('❌ Error al solicitar aprobación de perfil:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
