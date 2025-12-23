import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mentor/carta/[id]/review
 * Guarda la revisión granular de una carta (aprobar/rechazar cada meta y acción)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const cartaId = parseInt(params.id);
    const mentorId = session.user.id;

    if (isNaN(cartaId)) {
      return NextResponse.json({ error: 'ID de carta inválido' }, { status: 400 });
    }

    // Verificar que sea mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { rol: true, nombre: true }
    });

    if (!mentor || !['MENTOR', 'ADMIN', 'STAFF', 'COORDINADOR', 'GAMECHANGER'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Obtener body de la petición
    const body = await request.json();
    const { metasReview } = body;

    if (!metasReview || !Array.isArray(metasReview)) {
      return NextResponse.json({ error: 'Datos de revisión inválidos' }, { status: 400 });
    }

    // Verificar que la carta existe y está asignada al mentor
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Usuario: {
          select: {
            id: true,
            mentorId: true,
            assignedMentorId: true
          }
        },
        Meta: true
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    const usuario = carta.Usuario;
    const isAssigned = usuario.mentorId === mentorId || usuario.assignedMentorId === mentorId;
    
    if (!isAssigned && !['ADMIN', 'STAFF', 'COORDINADOR', 'GAMECHANGER'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'Esta carta no está asignada a ti' }, { status: 403 });
    }

    // Actualizar cada meta con su estado y feedback
    const updatePromises = metasReview.map((review: any) => {
      return prisma.meta.update({
        where: { id: review.metaId },
        data: {
          status: review.status, // 'PENDING', 'APPROVED', 'REJECTED'
          mentorFeedback: review.mentorFeedback || null
        }
      });
    });

    await Promise.all(updatePromises);

    // Determinar el nuevo estado de la carta
    const allApproved = metasReview.every((r: any) => r.status === 'APPROVED');
    const hasRejected = metasReview.some((r: any) => r.status === 'REJECTED');

    let newEstado = carta.estado;
    if (allApproved) {
      newEstado = 'APROBADA';
    } else if (hasRejected) {
      newEstado = 'CAMBIOS_REQUERIDOS';
    }

    // Actualizar estado de la carta
    await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: {
        estado: newEstado,
        autorizadoMentor: allApproved,
        fechaActualizacion: new Date()
      }
    });

    // Si todo fue aprobado, generar tareas automáticamente
    if (allApproved) {
      try {
        // Llamar al endpoint de generar tareas
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/generar-tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: usuario.id })
        });
      } catch (error) {
        console.error('Error generando tareas:', error);
        // No fallar la revisión si falla la generación de tareas
      }
    }

    return NextResponse.json({
      success: true,
      newEstado,
      allApproved,
      message: allApproved 
        ? 'Carta aprobada completamente. Tareas generadas.'
        : hasRejected
        ? 'Revisión guardada. El usuario recibirá notificación de los cambios solicitados.'
        : 'Revisión guardada.'
    });

  } catch (error: any) {
    console.error('❌ Error guardando revisión:', error);
    return NextResponse.json(
      { error: 'Error al guardar revisión', details: error.message },
      { status: 500 }
    );
  }
}
