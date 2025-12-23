import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyCartaSubmitted } from '@/lib/notifications';
import { validateCartaForSubmission } from '@/lib/validaciones-carta';

/**
 * POST /api/carta/submit
 * Envía la carta para revisión (mentor o admin)
 * ⚠️ VALIDACIÓN DURA: Valida completitud antes de permitir envío
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await req.json();

    // Validar que la carta existe y es del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        id: data.cartaId,
        usuarioId: userId
      },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    console.log('📋 Carta encontrada ID:', carta.id);
    console.log('📊 Total de metas encontradas:', carta.Meta?.length || 0);
    if (carta.Meta && carta.Meta.length > 0) {
      console.log('📝 Metas con acciones:', carta.Meta.map(m => ({
        id: m.id,
        categoria: m.categoria,
        acciones: m.Accion?.length || 0
      })));
    }

    // ========== VALIDACIÓN DURA DE REGLAS DE NEGOCIO ==========
    try {
      validateCartaForSubmission(carta, carta.Meta);
    } catch (validationError: any) {
      console.error('❌ Validación fallida:', validationError.message);
      return NextResponse.json({ 
        error: 'Validación fallida', 
        message: validationError.message,
        hint: 'Completa todos los campos requeridos en los 3 pasos del wizard'
      }, { status: 400 });
    }
    // ==========================================================

    // Obtener información del usuario para determinar el flujo
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { mentorId: true, assignedMentorId: true }
    });

    const mentorId = usuario?.assignedMentorId || usuario?.mentorId;

    // Determinar el estado según si tiene mentor (usando valores del enum EstadoCarta)
    let newStatus: 'EN_REVISION' = 'EN_REVISION';
    
    if (mentorId) {
      // Enviar notificación al mentor
      await notifyCartaSubmitted(userId, mentorId);
      console.log(`📧 Notificación: Carta #${carta.id} pendiente de revisión para mentor #${mentorId}`);
    } else {
      // Enviar notificación a admins
      await notifyCartaSubmitted(userId);
      console.log(`📧 Notificación: Carta #${carta.id} pendiente de revisión para admin (usuario sin mentor)`);
    }

    // Actualizar estado de la carta
    const updatedCarta = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        estado: newStatus,
        fechaActualizacion: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      carta: updatedCarta,
      message: mentorId 
        ? '✅ Carta validada y enviada a tu mentor para revisión' 
        : '✅ Carta validada y enviada a administración para asignación de mentor'
    });

  } catch (error: any) {
    console.error('Error submitting carta:', error);
    return NextResponse.json(
      { error: 'Error al enviar la carta', details: error.message },
      { status: 500 }
    );
  }
}
