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

    // ========== VALIDACIÓN DE SUSCRIPCIÓN/TIER PARA PARTICIPANTES ==========
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        rol: true, 
        suscripcion: true,
        tier: true,
        mentorId: true, 
        assignedMentorId: true 
      }
    });

    // 🎫 VERIFICAR PRIMERO SI TIENE LICENCIA ASIGNADA (mayor prioridad)
    const licenseAssignment = await prisma.licenseAssignment.findFirst({
      where: {
        userId: userId,
        isActive: true,
        activatedAt: null // Licencia no activada aún
      },
      include: {
        Vision: true
      }
    });

    // Solo validar suscripción si es PARTICIPANTE
    if (usuario?.rol === 'PARTICIPANTE') {
      const userTier = usuario.tier || 'FREE';
      
      // Usuarios FREE pueden enviar sin suscripción (auto-aprobación)
      if (userTier === 'FREE') {
        console.log('🆓 Usuario FREE - Procesando auto-aprobación');
        
        // Auto-aprobar la carta (estado APROBADO)
        const autoApprovedCarta = await prisma.cartaFrutos.update({
          where: { id: carta.id },
          data: {
            estado: 'APROBADO',
            fechaActualizacion: new Date(),
            comentariosMentor: 'Carta auto-aprobada - Plan FREE (sin mentor asignado)'
          }
        });

        // Marcar wizard como completado
        await prisma.usuario.update({
          where: { id: userId },
          data: { wizardCompleted: true }
        });

        // 🎫 ACTIVAR LICENCIA si existe (ya verificada arriba)
        if (licenseAssignment) {
          await prisma.licenseAssignment.update({
            where: { id: licenseAssignment.id },
            data: {
              activatedAt: new Date(),
              expiresAt: null
            }
          });
          console.log('🎫 Licencia activada para usuario FREE:', userId);
        }

        console.log('✅ Carta auto-aprobada para usuario FREE');
        console.log('✅ Wizard marcado como completado');
        
        return NextResponse.json({
          success: true,
          carta: autoApprovedCarta,
          autoApproved: true,
          message: '✅ Tu carta ha sido guardada. Como usuario FREE, puedes comenzar a trabajar en tus metas inmediatamente.',
          tier: 'FREE'
        });
      }
      
      // 🎫 Si tiene LICENCIA ASIGNADA, permitir envío y activar licencia
      if (licenseAssignment) {
        console.log('🎫 Usuario tiene licencia asignada - Activando licencia al enviar carta');
        // La licencia se activará después de validar y enviar la carta
      } else {
        // STANDARD y PREMIUM SIN licencia requieren pago
        // Verificar si tiene suscripción activa como fallback
        const tieneAcceso = usuario.suscripcion === 'ACTIVO' || usuario.suscripcion === 'PRUEBA';
        
        if (!tieneAcceso) {
          console.log('❌ Usuario sin licencia ni suscripción - Requiere pago');
          return NextResponse.json({ 
            error: 'Licencia requerida',
            message: 'Necesitas adquirir una licencia para enviar tu carta a revisión',
            requiresPayment: true,
            redirectTo: '/pricing' // Frontend debe redirigir aquí
          }, { status: 402 }); // 402 Payment Required
        }
      }
    }
    // ==================================================================

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

    // Marcar wizard como completado
    await prisma.usuario.update({
      where: { id: userId },
      data: { wizardCompleted: true }
    });

    // 🎫 ACTIVAR LICENCIA: Marcar la licencia como activada (ya verificada arriba)
    if (licenseAssignment) {
      await prisma.licenseAssignment.update({
        where: { id: licenseAssignment.id },
        data: {
          activatedAt: new Date(),
          expiresAt: null // Ya no expira porque fue activada
        }
      });
      console.log('🎫 Licencia activada para usuario:', userId, '- Vision:', licenseAssignment.Vision?.nombre || 'N/A');
    }

    console.log('✅ Wizard marcado como completado para usuario:', userId);

    return NextResponse.json({
      success: true,
      carta: updatedCarta,
      message: mentorId 
        ? '✅ Carta validada y enviada a tu mentor para revisión' 
        : '✅ Carta validada y enviada a mentor para Autorizacion'
    });

  } catch (error: any) {
    console.error('Error submitting carta:', error);
    return NextResponse.json(
      { error: 'Error al enviar la carta', details: error.message },
      { status: 500 }
    );
  }
}
